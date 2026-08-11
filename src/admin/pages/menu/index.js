/* WordPress */
import { useState, useEffect, useMemo, useCallback } from '@wordpress/element';

/* Library */
import {
	Table,
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
	Modal,
	useMantineTheme,
} from '@mantine/core';

/* Local */
import PageWrapper from '../../components/organisms/page-wrapper';
import PaginationFooter from '../../components/organisms/pagination-footer';
import MenuItemForm from './create';
import { Pencil, Trash2 } from 'lucide-react';
import ConfirmDeleteModal from '../../components/organisms/confirm-delete-modal';

const ITEMS_PER_PAGE = 10;

const EMPTY_FORM_VALUES = {
	title: '',
	description: '',
	price: 0,
	prep_time_minutes: 0,
	is_available: true,
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
	menu_category: item.menu_category,
	dietary_tag: item.dietary_tag,
});

const MenuManagement = () => {
	const theme = useMantineTheme();
	const [items, setItems] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [activeCategory, setActiveCategory] = useState('all');
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalItems, setTotalItems] = useState(0);

	const [formOpen, setFormOpen] = useState(false);
	const [formMode, setFormMode] = useState('create');
	const [formDefaults, setFormDefaults] = useState(EMPTY_FORM_VALUES);
	const [editingId, setEditingId] = useState(null);
	const [formLoading, setFormLoading] = useState(false);
	const [formError, setFormError] = useState(null);

	const [deleteTarget, setDeleteTarget] = useState(null);
	const [deleting, setDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState(null);

	const fetchItems = useCallback(() => {
		const { rest_url: restUrl, nonce } = RestaurantManagementSystemLocalize;

		setIsLoading(true);

		return fetch(
			`${restUrl}rms/v1/menu-items?page=${page}&per_page=${ITEMS_PER_PAGE}`,
			{ headers: { 'X-WP-Nonce': nonce } }
		)
			.then((response) => {
				if (!response.ok) {
					throw new Error(`Request failed: ${response.status}`);
				}
				setTotalPages(parseInt(response.headers.get('X-WP-TotalPages') || '1', 10));
				setTotalItems(parseInt(response.headers.get('X-WP-Total') || '0', 10));
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
	}, [page]);

	useEffect(() => {
		fetchItems();
	}, [fetchItems]);

	const categories = useMemo(() => {
		const set = new Set();
		items.forEach((item) => item.menu_category.forEach((cat) => set.add(cat)));
		return Array.from(set);
	}, [items]);

	const filteredItems = useMemo(() => {
		if (activeCategory === 'all') {
			return items;
		}
		return items.filter((item) => item.menu_category.includes(activeCategory));
	}, [items, activeCategory]);

	const openCreateForm = () => {
		setFormMode('create');
		setEditingId(null);
		setFormDefaults(EMPTY_FORM_VALUES);
		setFormError(null);
		setFormOpen(true);
	};

	const openEditForm = (item) => {
		setFormMode('edit');
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

		const isEdit = formMode === 'edit';
		const url = isEdit
			? `${restUrl}rms/v1/menu-items/${editingId}`
			: `${restUrl}rms/v1/menu-items`;

		try {
			const response = await fetch(url, {
				method: isEdit ? 'PATCH' : 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-WP-Nonce': nonce,
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
				candidate.id === item.id ? { ...candidate, is_available: nextAvailable } : candidate
			)
		);

		try {
			const response = await fetch(`${restUrl}rms/v1/menu-items/${item.id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					'X-WP-Nonce': nonce,
				},
				body: JSON.stringify({ is_available: nextAvailable }),
			});

			if (!response.ok) {
				throw new Error(`Request failed: ${response.status}`);
			}
		} catch (requestError) {
			setItems((current) =>
				current.map((candidate) =>
					candidate.id === item.id ? { ...candidate, is_available: item.is_available } : candidate
				)
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
			const response = await fetch(`${restUrl}rms/v1/menu-items/${deleteTarget.id}`, {
				method: 'DELETE',
				headers: { 'X-WP-Nonce': nonce },
			});

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
					<Button color="brand" radius="lg" onClick={openCreateForm}>
						+ Add Menu Item
					</Button>
				</Group>

				{error ? (
					<Alert color="attention" title="Something went wrong">
						{error}
					</Alert>
				) : null}

				<Tabs value={activeCategory} onChange={setActiveCategory} color="brand" variant="outline">
					<Tabs.List>
						<Tabs.Tab value="all">All Items</Tabs.Tab>
						{categories.map((cat) => (
							<Tabs.Tab key={cat} value={cat} tt="capitalize">
								{cat}
							</Tabs.Tab>
						))}
					</Tabs.List>
				</Tabs>

				<Paper withBorder radius="md" p={0} bg={theme.other.surfaceContainerLowest}>
					<Table striped highlightOnHover verticalSpacing="md">
						<Table.Thead bg={theme.other.surfaceContainerLow}>
							<Table.Tr>
								<Table.Th>Image</Table.Th>
								<Table.Th>Item Details</Table.Th>
								<Table.Th>Category</Table.Th>
								<Table.Th>Price</Table.Th>
								<Table.Th>Dietary</Table.Th>
								<Table.Th>Status</Table.Th>
								<Table.Th>Actions</Table.Th>
							</Table.Tr>
						</Table.Thead>
						<Table.Tbody>
							{filteredItems.map((item) => (
								<Table.Tr key={item.id}>
									<Table.Td>
										<Avatar src={item.featured_image_url} radius="md" size={56}>
											{item.title.charAt(0)}
										</Avatar>
									</Table.Td>
									<Table.Td>
										<Text fw={700}>{item.title}</Text>
									</Table.Td>
									<Table.Td>
										<Group gap="xs">
											{item.menu_category.map((cat) => (
												<Badge key={cat} color="brand" variant="light" tt="capitalize">
													{cat}
												</Badge>
											))}
										</Group>
									</Table.Td>
									<Table.Td>
										<Text fw={600}>${item.price.toFixed(2)}</Text>
									</Table.Td>
									<Table.Td>
										<Group gap="xs">
											{item.dietary_tag.map((tag) => (
												<Badge key={tag} color="available" variant="outline" size="sm" tt="capitalize">
													{tag}
												</Badge>
											))}
										</Group>
									</Table.Td>
									<Table.Td>
										<Switch
											checked={item.is_available}
											onChange={() => toggleAvailability(item)}
											color="brand"
											label="Available"
										/>
									</Table.Td>
									<Table.Td>
	<Group gap="xs">
		<ActionIcon
			variant="light"
			color="brand"
			onClick={() => openEditForm(item)}
			aria-label="Edit menu item"
		>
			<Pencil size={16} />
		</ActionIcon>
		<ActionIcon
			variant="light"
			color="attention"
			onClick={() => setDeleteTarget(item)}
			aria-label="Delete menu item"
		>
			<Trash2 size={16} />
		</ActionIcon>
	</Group>
</Table.Td>
		
									
								</Table.Tr>
							))}
						</Table.Tbody>
					</Table>

					<PaginationFooter
						page={page}
						totalPages={totalPages}
						totalItems={totalItems}
						rangeStart={items.length ? (page - 1) * ITEMS_PER_PAGE + 1 : 0}
						rangeEnd={(page - 1) * ITEMS_PER_PAGE + items.length}
						onChange={setPage}
					/>
				</Paper>
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