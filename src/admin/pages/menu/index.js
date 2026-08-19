/* WordPress */
import { useState, useEffect, useMemo } from "@wordpress/element";

/* Library */
import {
  Badge,
  Group,
  Text,
  Loader,
  Center,
  Alert,
  Paper,
  Title,
  Stack,
  Avatar,
  Switch,
  Button,
  Tabs,
  ActionIcon,
  useMantineTheme,
} from "@mantine/core";
import { Pencil, Trash2 } from "lucide-react";

/* Local */
import PageWrapper from "../../components/organisms/page-wrapper";
import SearchableTable, {
  SearchableTableColumn,
} from "../../components/organisms/searchable-table";
import ConfirmDeleteModal from "../../components/organisms/confirm-delete-modal";
import MenuItemForm from "./create";

const EMPTY_FORM_VALUES = {
  title: "",
  description: "",
  price: 0,
  prep_time_minutes: 0,
  is_available: true,
  is_featured: false,
  menu_category: [],
  dietary_tag: [],
};

/**
 * Convert a fetched menu item (API shape) into the form's edit shape.
 *
 * NOTE: item.description is HTML (server runs it through the
 * `the_content` filter), but the form's Textarea is plain text — editing
 * an existing item will show raw <p> tags. Not fixed here; needs a
 * decision (rich text editor vs. stripping tags) before it's correct.
 */
const itemToFormValues = (item) => ({
  title: item.title,
  description: item.description,
  price: item.price,
  prep_time_minutes: item.prep_time_minutes,
  is_available: item.is_available,
  is_featured: item.is_featured,
  menu_category: item.menu_category,
  dietary_tag: item.dietary_tag,
});

const MenuManagement = () => {
  const theme = useMantineTheme();
  const canManage =RestaurantManagementSystemLocalize.capabilities?.manage_rms_menu_items;
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [formDefaults, setFormDefaults] = useState(EMPTY_FORM_VALUES);
  const [editingId, setEditingId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const fetchItems = () => {
    const { rest_url: restUrl, nonce } = RestaurantManagementSystemLocalize;

    setIsLoading(true);

    return fetch(`${restUrl}rms/v1/menu-items?per_page=100`, {
      headers: { "X-WP-Nonce": nonce },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        setItems(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const categories = useMemo(() => {
    const set = new Set();
    items.forEach((item) => item.menu_category.forEach((cat) => set.add(cat)));
    return Array.from(set);
  }, [items]);

  // Category filter stays page-specific — narrows the dataset BEFORE it
  // reaches SearchableTable, which then owns search + pagination on top
  // of whatever this filter leaves behind. Same role as the section
  // filter on Tables and the date-range tabs on Reservations.
  const categoryFilteredItems = useMemo(() => {
    if (activeCategory === "all") {
      return items;
    }
    return items.filter((item) => item.menu_category.includes(activeCategory));
  }, [items, activeCategory]);

  const openCreateForm = () => {
    setFormMode("create");
    setEditingId(null);
    setFormDefaults(EMPTY_FORM_VALUES);
    setFormError(null);
    setFormOpen(true);
  };

  const openEditForm = (item) => {
    setFormMode("edit");
    setEditingId(item.id);
    setFormDefaults(itemToFormValues(item));
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (!formLoading) {
      setFormOpen(false);
      setFormError(null);
    }
  };

  const submitForm = async (values) => {
    const { rest_url: restUrl, nonce } = RestaurantManagementSystemLocalize;
    setFormLoading(true);
    setFormError(null);

    const isEdit = formMode === "edit";
    const url = isEdit
      ? `${restUrl}rms/v1/menu-items/${editingId}`
      : `${restUrl}rms/v1/menu-items`;

    try {
      const response = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": nonce,
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || `Request failed: ${response.status}`);
      }

      setFormOpen(false);
      await fetchItems();
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setFormLoading(false);
    }
  };

  const toggleAvailability = async (item) => {
    const { rest_url: restUrl, nonce } = RestaurantManagementSystemLocalize;
    const nextAvailable = !item.is_available;

    // Optimistic update so the switch feels instant; rolled back below
    // on failure so the UI never shows a state the server didn't accept.
    setItems((current) =>
      current.map((candidate) =>
        candidate.id === item.id
          ? { ...candidate, is_available: nextAvailable }
          : candidate,
      ),
    );

    try {
      const response = await fetch(`${restUrl}rms/v1/menu-items/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": nonce,
        },
        body: JSON.stringify({ is_available: nextAvailable }),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
    } catch (requestError) {
      setItems((current) =>
        current.map((candidate) =>
          candidate.id === item.id
            ? { ...candidate, is_available: item.is_available }
            : candidate,
        ),
      );
      setError(requestError.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    const { rest_url: restUrl, nonce } = RestaurantManagementSystemLocalize;
    setDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(
        `${restUrl}rms/v1/menu-items/${deleteTarget.id}`,
        {
          method: "DELETE",
          headers: { "X-WP-Nonce": nonce },
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || `Request failed: ${response.status}`);
      }

      setDeleteTarget(null);
      await fetchItems();
    } catch (requestError) {
      setDeleteError(requestError.message);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: "image",
      label: "Image",
      render: (item) => (
        <Avatar src={item.featured_image_url} radius="md" size={56}>
          {item.title.charAt(0)}
        </Avatar>
      ),
    },
    {
      key: "details",
      label: "Item Details",
      render: (item) => <Text fw={700}>{item.title}</Text>,
    },
    {
      key: "category",
      label: "Category",
      render: (item) => (
        <Group gap="xs">
          {item.menu_category.map((cat) => (
            <Badge key={cat} color="brand" variant="light" tt="capitalize">
              {cat}
            </Badge>
          ))}
        </Group>
      ),
    },
    {
      key: "price",
      label: "Price",
      render: (item) => <Text fw={600}>${item.price.toFixed(2)}</Text>,
    },
    {
      key: "dietary",
      label: "Dietary",
      render: (item) => (
        <Group gap="xs">
          {item.dietary_tag.map((tag) => (
            <Badge
              key={tag}
              color="available"
              variant="outline"
              size="sm"
              tt="capitalize"
            >
              {tag}
            </Badge>
          ))}
        </Group>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item) => (
        <Switch
          checked={item.is_available}
          onChange={() => toggleAvailability(item)}
          color="brand"
          label="Available"
        />
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (item) => (
        <Group gap="xs">
          <ActionIcon
            variant="light"
            color="brand"
            onClick={() => openEditForm(item)}
            aria-label="Edit menu item"
            disabled={!canManage}
          >
            <Pencil size={16} />
          </ActionIcon>
          <ActionIcon
            variant="light"
            color="attention"
            onClick={() => setDeleteTarget(item)}
            aria-label="Delete menu item"
            disabled={!canManage}
          >
            <Trash2 size={16} />
          </ActionIcon>
        </Group>
      ),
    },
  ];

  if (isLoading) {
    return (
      <PageWrapper>
        <Center h={200}>
          <Loader color="brand" />
        </Center>
      </PageWrapper>
    );
  }

  if (error && !items.length) {
    return (
      <PageWrapper>
        <Alert color="attention" title="Failed to load menu items">
          {error}
        </Alert>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Stack gap="lg" maw={1440} mx="auto">
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={1} ff="'Source Serif 4', serif">
              Menu Management
            </Title>
            <Text c="dimmed" size="lg" mt={4}>
              Configure and monitor your restaurant's digital menu items.
            </Text>
          </div>
          <Button color="brand" radius="lg" onClick={openCreateForm} disabled={!canManage}>
            + Add Menu Item
          </Button>
        </Group>

        {error ? (
          <Alert color="attention" title="Something went wrong">
            {error}
          </Alert>
        ) : null}

        {/* Tabs + table grouped under a tighter gap so they read as one
				    connected block rather than two separate stacked sections. */}
        <Stack gap="xs">
          <Tabs
            value={activeCategory}
            onChange={(value) => setActiveCategory(value || "all")}
            color="brand"
            variant="outline"
          >
            <Tabs.List>
              <Tabs.Tab value="all">All Items</Tabs.Tab>
              {categories.map((cat) => (
                <Tabs.Tab key={cat} value={cat} tt="capitalize">
                  {cat}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>

          <Paper
            withBorder
            radius="md"
            p="lg"
            bg={theme.other.surfaceContainerLowest}
          >
            <SearchableTable
              data={categoryFilteredItems}
              columns={columns}
              rowKey={(item) => item.id}
              getSearchableText={(item) =>
                `${item.title} ${item.menu_category.join(
                  " ",
                )} ${item.dietary_tag.join(" ")}`
              }
              searchLabel="Search menu items"
              searchPlaceholder="Item name, category, or dietary tag"
              emptyMessage="No menu items found."
              defaultPageSize={10}
            />
          </Paper>
        </Stack>
      </Stack>

      <MenuItemForm
        opened={formOpen}
        mode={formMode}
        defaultValues={formDefaults}
        loading={formLoading}
        error={formError}
        onClose={closeForm}
        onSubmit={submitForm}
      />

      <ConfirmDeleteModal
        opened={Boolean(deleteTarget)}
        title="Delete menu item"
        message={`Move "${deleteTarget?.title}" to trash? This item will be removed from the menu and order picker.`}
        loading={deleting}
        error={deleteError}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </PageWrapper>
  );
};

export default MenuManagement;
