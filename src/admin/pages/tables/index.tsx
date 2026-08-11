declare const RestaurantManagementSystemLocalize: {
	rest_url: string;
	nonce: string;
	root_id: string;
	store: string;
};

/* WordPress */
import { useEffect, useMemo, useState } from '@wordpress/element';

/* Library */
import {
	Badge,
	Button,
	Center,
	Group,
	Loader,
	Paper,
	Stack,
	Table,
	Tabs,
	Text,
	Title,
	Alert,
	useMantineTheme,
	ActionIcon,
} from '@mantine/core';

/* Local */
import PageWrapper from '../../components/organisms/page-wrapper';
import PaginationFooter from '../../components/organisms/pagination-footer';
import TableForm, { TableFormValues } from './create';
import { Pencil, Trash2 } from 'lucide-react';
import ConfirmDeleteModal from '../../components/organisms/confirm-delete-modal';

type TableMode = 'create' | 'edit';

interface TableItem extends TableFormValues {
	id: number;
	section?: string;
	status?: string;
}

const initialFormState: TableFormValues = {
	title: '',
	capacity: 1,
	section: '',
	status: 'Available',
	grid_x: 0,
	grid_y: 0,
};

const ITEMS_PER_PAGE = 10;

const TableManagement = () => {
	const theme = useMantineTheme();
	const [tables, setTables] = useState<TableItem[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [activeSection, setActiveSection] = useState<string>('all');
	const [page, setPage] = useState<number>(1);
	const [formOpen, setFormOpen] = useState<boolean>(false);
	const [formMode, setFormMode] = useState<TableMode>('create');
	const [editingTableId, setEditingTableId] = useState<number | null>(null);
	const [formData, setFormData] = useState<TableFormValues>(initialFormState);
	const [formLoading, setFormLoading] = useState<boolean>(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<TableItem | null>(null);
    const [deleting, setDeleting] = useState<boolean>(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

	const fetchTables = async () => {
		const { rest_url: restUrl, nonce } = RestaurantManagementSystemLocalize;

		setIsLoading(true);

		try {
			const response = await fetch(`${restUrl}rms/v1/tables`, {
				headers: {
					'X-WP-Nonce': nonce,
				},
			});

			if (!response.ok) {
				throw new Error(`Request failed: ${response.status}`);
			}

			const data = (await response.json()) as TableItem[];
			setTables(data);
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchTables();
	}, []);

	const sections = useMemo(() => {
		const uniqueSections = new Set<string>();
		tables.forEach((table) => {
			if (table.section) {
				uniqueSections.add(table.section);
			}
		});
		return Array.from(uniqueSections);
	}, [tables]);

	const filteredTables = useMemo(() => {
		if (activeSection === 'all') {
			return tables;
		}

		return tables.filter((table) => table.section === activeSection);
	}, [activeSection, tables]);

	const totalPages = useMemo(
		() => Math.max(1, Math.ceil(filteredTables.length / ITEMS_PER_PAGE)),
		[filteredTables.length]
	);

	const paginatedTables = useMemo(
		() => filteredTables.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
		[filteredTables, page]
	);

	useEffect(() => {
		if (page > totalPages) {
			setPage(1);
		}
	}, [page, totalPages]);

	const counts = useMemo(
		(): { available: number; occupied: number; reserved: number } => {
			return tables.reduce(
				(acc, table) => {
					const status = (table.status || 'Available').toLowerCase();
					if (status === 'occupied') {
						acc.occupied += 1;
					} else if (status === 'reserved') {
						acc.reserved += 1;
					} else {
						acc.available += 1;
					}
					return acc;
				},
				{ available: 0, occupied: 0, reserved: 0 }
			);
		},
		[tables]
	);

	const getStatusColor = (status?: string): 'red' | 'yellow' | 'green' => {
		const normalized = (status || 'available').toLowerCase();
		if (normalized === 'occupied') {
			return 'red';
		}
		if (normalized === 'reserved') {
			return 'yellow';
		}
		return 'green';
	};

	const openCreateForm = () => {
		setFormMode('create');
		setEditingTableId(null);
		setFormData(initialFormState);
		setFormError(null);
		setFormOpen(true);
	};

	const openEditForm = (table: TableItem) => {
		setFormMode('edit');
		setEditingTableId(table.id);
		setFormData({
			title: table.title || '',
			capacity: table.capacity || 1,
			section: table.section || '',
			status: table.status || 'Available',
			grid_x: table.grid_x ?? 0,
			grid_y: table.grid_y ?? 0,
		});
		setFormError(null);
		setFormOpen(true);
	};

	const closeForm = () => {
		setFormOpen(false);
		setFormError(null);
	};

	const submitForm = async (values: TableFormValues) => {
		setFormLoading(true);
		setFormError(null);

		const { rest_url: restUrl, nonce } = RestaurantManagementSystemLocalize;
		const payload = {
			title: values.title.trim(),
			capacity: Number(values.capacity),
			section: (values.section || '').trim(),
			status: values.status,
			grid_x: Number(values.grid_x),
			grid_y: Number(values.grid_y),
		};

		const endpoint = `${restUrl}rms/v1/tables${formMode === 'edit' && editingTableId ? `/${editingTableId}` : ''}`;
		const response = await fetch(endpoint, {
			method: formMode === 'edit' ? 'PATCH' : 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-WP-Nonce': nonce,
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const body = (await response.json().catch(() => null)) as { message?: string } | null;
			setFormError(body?.message || `Request failed: ${response.status}`);
			setFormLoading(false);
			return;
		}

		await fetchTables();
		setFormLoading(false);
		setFormOpen(false);
	};

	const confirmDeleteTable = async () => {
	if (!deleteTarget) {
		return;
	}

	const { rest_url: restUrl, nonce } = RestaurantManagementSystemLocalize;
	setDeleting(true);
	setDeleteError(null);

	try {
		const response = await fetch(`${restUrl}rms/v1/tables/${deleteTarget.id}`, {
			method: 'DELETE',
			headers: { 'X-WP-Nonce': nonce },
		});

		if (!response.ok) {
			const body = (await response.json().catch(() => null)) as { message?: string } | null;
			throw new Error(body?.message || `Request failed: ${response.status}`);
		}

		setDeleteTarget(null);
		await fetchTables();
	} catch (requestError) {
		setDeleteError((requestError as Error).message);
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

	if (error) {
		return (
			<PageWrapper>
				<Alert color="attention" title="Failed to load tables">
					{error}
				</Alert>
			</PageWrapper>
		);
	}

	return (
		<PageWrapper>
			<Stack gap="lg" maw={1440} mx="auto">
				<Group justify="space-between" align="flex-end" spacing="xl">
					<div>
						<Title order={1} ff="'Source Serif 4', serif">
							Table Management
						</Title>
						<Text c="dimmed" size="lg" mt={4}>
							Live floor status and table availability.
						</Text>
					</div>
					<Button color="brand" radius="lg" onClick={openCreateForm}>
						+ Add Table
					</Button>
				</Group>

				<Group spacing="xs" align="center">
					<Button size="xs" radius="xl" color="green" variant="light" compact>
						Available {counts.available}
					</Button>
					<Button size="xs" radius="xl" color="yellow" variant="light" compact>
						Occupied {counts.occupied}
					</Button>
					<Button size="xs" radius="xl" color="red" variant="light" compact>
						Reserved {counts.reserved}
					</Button>
				</Group>

				<Paper p="lg" radius="md" bg={theme.other.surfaceContainerLowest} withBorder>
					<Group spacing="xs" align="center" mb="md">
						<Text fw={700} size="sm" c="dimmed">
							Filter by section:
						</Text>
						<Tabs value={activeSection} onChange={setActiveSection} color="brand" variant="outline">
							<Tabs.List>
								<Tabs.Tab value="all">All Sections</Tabs.Tab>
								{sections.map((section) => (
									<Tabs.Tab key={section} value={section}>
										{section}
									</Tabs.Tab>
								))}
							</Tabs.List>
						</Tabs>
					</Group>

					<Table striped highlightOnHover verticalSpacing="md">
						<Table.Thead bg={theme.other.surfaceContainerLow}>
							<Table.Tr>
								<Table.Th>Table</Table.Th>
								<Table.Th>Capacity</Table.Th>
								<Table.Th>Section</Table.Th>
								<Table.Th>Status</Table.Th>
								<Table.Th>Grid</Table.Th>
								<Table.Th>Actions</Table.Th>
							</Table.Tr>
						</Table.Thead>
						<Table.Tbody>
							{paginatedTables.map((table) => (
								<Table.Tr key={table.id}>
									<Table.Td>{table.title}</Table.Td>
									<Table.Td>{table.capacity || 0}</Table.Td>
									<Table.Td>{table.section || 'Unassigned'}</Table.Td>
									<Table.Td>
										<Badge color={getStatusColor(table.status)} variant="outline" radius="xs">
											{table.status || 'Available'}
										</Badge>
									</Table.Td>
									<Table.Td>{table.grid_x ?? '-'} / {table.grid_y ?? '-'}</Table.Td>
									<Table.Td>
	<Group spacing="xs">
		<ActionIcon
			variant="light"
			color="brand"
			onClick={() => openEditForm(table)}
			aria-label="Edit table"
		>
			<Pencil size={16} />
		</ActionIcon>
		<ActionIcon
			variant="light"
			color="attention"
			onClick={() => setDeleteTarget(table)}
			aria-label="Delete table"
		>
			<Trash2 size={16} />
		</ActionIcon>
	</Group>
</Table.Td>
								</Table.Tr>
							))}
						</Table.Tbody>
					</Table>
				</Paper>

				<PaginationFooter
					page={page}
					totalPages={totalPages}
					totalItems={filteredTables.length}
					rangeStart={filteredTables.length ? (page - 1) * ITEMS_PER_PAGE + 1 : 0}
					rangeEnd={(page - 1) * ITEMS_PER_PAGE + paginatedTables.length}
					onChange={setPage}
				/>

				<TableForm
					opened={formOpen}
					mode={formMode}
					defaultValues={formData}
					onClose={closeForm}
					onSubmit={submitForm}
					loading={formLoading}
					error={formError}
				/>
			</Stack>
			<ConfirmDeleteModal
	opened={Boolean(deleteTarget)}
	title="Delete table"
	message={`Move "${deleteTarget?.title}" to trash? This cannot be undone from here.`}
	loading={deleting}
	error={deleteError}
	onCancel={() => setDeleteTarget(null)}
	onConfirm={confirmDeleteTable}
/>
		</PageWrapper>
	);
};

export default TableManagement;
