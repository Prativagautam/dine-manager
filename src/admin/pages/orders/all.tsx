declare const RestaurantManagementSystemLocalize: {
  rest_url: string;
  nonce: string;
};

/* WordPress */
import { useEffect, useMemo, useState } from "@wordpress/element";

/* Library */
import {
  Alert,
  Badge,
  Center,
  Divider,
  Drawer,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";

/* Local */
import PageWrapper from "../../components/organisms/page-wrapper";
import SearchableTable, {
  SearchableTableColumn,
} from "../../components/organisms/searchable-table";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled";

interface OrderItem {
  menu_item_id: number;
  item_title: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

interface Order {
  id: number;
  title: string;
  status: OrderStatus;
  order_type: "dine_in" | "takeout";
  order_source: "staff_pos" | "customer_portal";
  items: OrderItem[];
  total_amount: number;
  table_id: number;
  customer_id: number;
  created_by: number;
  created_at: string;
}

type OrderLookupResponse = {
  id: number | string;
  title: string;
  capacity: number | string;
  section?: string;
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "reserved",
  confirmed: "occupied",
  preparing: "brand",
  ready: "available",
  delivered: "available",
  cancelled: "attention",
};

const formatCurrency = (amount: number) => `$${Number(amount || 0).toFixed(2)}`;

const formatDateTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const AllOrders = () => {
  const theme = useMantineTheme();

  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<OrderLookupResponse[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch tables.
   *
   * Table names are only used as a display enhancement for dine-in orders.
   * Failure here should not prevent orders from loading.
   */
  useEffect(() => {
    const fetchTables = async () => {
      const { rest_url: restUrl, nonce } = RestaurantManagementSystemLocalize;

      try {
        const response = await fetch(`${restUrl}rms/v1/tables`, {
          headers: {
            "X-WP-Nonce": nonce,
          },
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as OrderLookupResponse[];

        setTables(data);
      } catch {
        // Table names are a display enhancement only.
      }
    };

    fetchTables();
  }, []);

  /**
   * Fetch orders.
   *
   * SearchableTable handles client-side searching and pagination.
   */
  useEffect(() => {
    const fetchOrders = async () => {
      const { rest_url: restUrl, nonce } = RestaurantManagementSystemLocalize;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${restUrl}rms/v1/orders?per_page=100`, {
          headers: {
            "X-WP-Nonce": nonce,
          },
        });

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const data = (await response.json()) as Order[];

        setOrders(data);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load orders.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  /**
   * Map table IDs to table names.
   */
  const tableNamesById = useMemo(
    () => new Map(tables.map((table) => [Number(table.id), table.title])),
    [tables],
  );

  /**
   * Get a human-readable order location.
   */
  const getLocationLabel = (order: Order) => {
    if (!order.table_id) {
      return "Takeout";
    }

    return (
      tableNamesById.get(Number(order.table_id)) || `Table #${order.table_id}`
    );
  };

  /**
   * Table columns.
   */
  const columns: SearchableTableColumn<Order>[] = [
    {
      key: "order",
      label: "Order",
      render: (order) => (
        <Group gap={6} wrap="nowrap">
          <Text fw={600}>#{order.id}</Text>

          {order.status === "cancelled" ? (
            <Badge color="attention" variant="filled" size="xs">
              Cancelled
            </Badge>
          ) : null}
        </Group>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (order) =>
        order.order_type === "dine_in" ? "Dine in" : "Takeout",
    },
    {
      key: "location",
      label: "Location",
      render: (order) => getLocationLabel(order),
    },
    {
      key: "items",
      label: "Items",
      render: (order) => order.items?.length ?? 0,
    },
    {
      key: "total",
      label: "Total",
      render: (order) => formatCurrency(order.total_amount),
    },
    {
      key: "status",
      label: "Status",
      render: (order) => (
        <Badge color={STATUS_COLORS[order.status]} variant="light" radius="xs">
          {STATUS_LABELS[order.status]}
        </Badge>
      ),
    },
    {
      key: "created",
      label: "Created",
      render: (order) => formatDateTime(order.created_at),
    },
  ];

  /**
   * Loading state.
   */
  if (isLoading && !orders.length) {
    return (
      <PageWrapper>
        <Center h={200}>
          <Loader color="brand" />
        </Center>
      </PageWrapper>
    );
  }

  /**
   * Error state.
   */
  if (error) {
    return (
      <PageWrapper>
        <Alert color="attention" title="Failed to load orders">
          {error}
        </Alert>
      </PageWrapper>
    );
  }

  return (
    <>
      <Stack gap="lg" maw={1440} mx="auto">
        <div>
          <Title order={1} ff="'Source Serif 4', serif">
            All Orders
          </Title>

          <Text c="dimmed" size="lg" mt={4}>
            Click an order to view details, including items, total, and status.
          </Text>
        </div>

        <Paper
          p="lg"
          radius="md"
          bg={theme.other.surfaceContainerLowest}
          withBorder
        >
          <SearchableTable
            data={orders}
            columns={columns}
            rowKey={(order) => order.id}
            getSearchableText={(order) =>
              `${order.id} ${order.title} ${
                order.order_type
              } ${getLocationLabel(order)} ${STATUS_LABELS[order.status]}`
            }
            searchLabel="Search orders"
            searchPlaceholder="Order #, type, table, or status"
            emptyMessage="No orders found."
            minWidth={800}
            defaultPageSize={20}
            onRowClick={(order) => setSelectedOrder(order)}
          />
        </Paper>
      </Stack>

      <Drawer
        opened={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        position="right"
        size={420}
        padding="lg"
        title="Order details"
        styles={{
          content: {
            backgroundColor: theme.other.surface,
          },
        }}
      >
        {selectedOrder ? (
          <Stack gap="lg">
            <Group justify="space-between" align="flex-start">
              <div>
                <Title order={2}>Order #{selectedOrder.id}</Title>

                <Text size="sm" c="dimmed" mt={4}>
                  {formatDateTime(selectedOrder.created_at)}
                </Text>
              </div>

              <Badge
                color={STATUS_COLORS[selectedOrder.status]}
                variant="light"
                radius="xs"
              >
                {STATUS_LABELS[selectedOrder.status]}
              </Badge>
            </Group>

            <Divider />

            <Group grow align="flex-start">
              <div>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                  Type
                </Text>

                <Text fw={600} mt={2}>
                  {selectedOrder.order_type === "dine_in"
                    ? "Dine in"
                    : "Takeout"}
                </Text>
              </div>

              <div>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                  Location
                </Text>

                <Text fw={600} mt={2}>
                  {getLocationLabel(selectedOrder)}
                </Text>
              </div>
            </Group>

            <Divider />

            <Stack gap="sm">
              <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                Items
              </Text>

              {selectedOrder.items?.length ? (
                selectedOrder.items.map((item) => (
                  <Group
                    key={`${item.menu_item_id}-${item.item_title}`}
                    justify="space-between"
                    align="flex-start"
                    gap="sm"
                  >
                    <div>
                      <Text fw={600}>{item.item_title}</Text>

                      <Text size="xs" c="dimmed">
                        {item.quantity} × {formatCurrency(item.unit_price)}
                      </Text>
                    </div>

                    <Text fw={600}>{formatCurrency(item.line_total)}</Text>
                  </Group>
                ))
              ) : (
                <Text size="sm" c="dimmed">
                  No items found.
                </Text>
              )}
            </Stack>

            <Divider />

            <Group justify="space-between">
              <Text fw={700}>Total</Text>

              <Text size="xl" fw={700} ff="'Source Serif 4', serif">
                {formatCurrency(selectedOrder.total_amount)}
              </Text>
            </Group>
          </Stack>
        ) : null}
      </Drawer>
    </>
  );
};

export default AllOrders;
