declare const RestaurantManagementSystemLocalize: {
	rest_url: string;
	nonce: string;
};

/* WordPress */
import { useEffect, useMemo, useState } from '@wordpress/element';

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
	ScrollArea,
	Stack,
	Table,
	Text,
	Title,
	useMantineTheme,
} from '@mantine/core';

/* Local */
import PageWrapper from '../../components/organisms/page-wrapper';
import PaginationFooter from '../../components/organisms/pagination-footer';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

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
	order_type: 'dine_in' | 'takeout';
	order_source: 'staff_pos' | 'customer_portal';
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
	pending: 'Pending',
	confirmed: 'Confirmed',
	preparing: 'Preparing',
	ready: 'Ready',
	delivered: 'Delivered',
	cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
	pending: 'reserved',
	confirmed: 'occupied',
	preparing: 'brand',
	ready: 'available',
	delivered: 'available',
	cancelled: 'attention',
};

const PAGE_SIZE = 20;

const formatCurrency = (amount: number) => `$${Number(amount || 0).toFixed(2)}`;

const formatDateTime = (value: string) => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return 'Unavailable';
	}

	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	}).format(date);
};

const AllOrders = () => {
	const theme = useMantineTheme();
	const [orders, setOrders] = useState<Order[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalItems, setTotalItems] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [tables, setTables] = useState<OrderLookupResponse[]>([]);
	const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

	useEffect(() => {
		const fetchTables = async () => {
			const { rest_url: restUrl, nonce } = RestaurantManagementSystemLocalize;

			try {
				const response = await fetch(`${restUrl}rms/v1/tables`, {
					headers: { 'X-WP-Nonce': nonce },
				});
				if (response.ok) {
					setTables((await response.json()) as OrderLookupResponse[]);
				}
			} catch {
				// Table names are a display enhancement only.
			}
		};

		fetchTables();
	}, []);

	// Server already returns date-descending by default (get_items()'s
	// orderby/order args), so we render pages exactly as received —
	// sorting client-side here would only reorder within a single page,
	// not across the full dataset, which would be wrong.
	useEffect(() => {
		const fetchOrders = async () => {
			const { rest_url: restUrl, nonce } = RestaurantManagementSystemLocalize;
			setIsLoading(true);
			setError(null);

			try {
				const response = await fetch(
					`${restUrl}rms/v1/orders?per_page=${PAGE_SIZE}&page=${page}`,
					{ headers: { 'X-WP-Nonce': nonce } }
				);

				if (!response.ok) {
					throw new Error(`Request failed: ${response.status}`);
				}

				setTotalPages(Math.max(1, Number(response.headers.get('X-WP-TotalPages')) || 1));
				setTotalItems(Number(response.headers.get('X-WP-Total')) || 0);
				setOrders((await response.json()) as Order[]);
			} catch (requestError) {
				setError((requestError as Error).message);
			} finally {
				setIsLoading(false);
			}
		};

		fetchOrders();
	}, [page]);

	const tableNamesById = useMemo(
		() => new Map(tables.map((table) => [Number(table.id), table.title])),
		[tables]
	);

	const getLocationLabel = (order: Order) =>
		order.table_id ? tableNamesById.get(order.table_id) || `Table #${order.table_id}` : 'Takeout';

	const rangeStart = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
	const rangeEnd = Math.min(page * PAGE_SIZE, totalItems);

	if (isLoading && !orders.length) {
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

				<Paper p="lg" radius="md" bg={theme.other.surfaceContainerLowest} withBorder>
                 <ScrollArea>
                  <Table
                   striped
                   highlightOnHover
                   verticalSpacing="md"
                    miw={800}
                    >
						<Table.Thead bg={theme.other.surfaceContainerLow}>
							<Table.Tr>
								<Table.Th>Order</Table.Th>
								<Table.Th>Type</Table.Th>
								<Table.Th>Location</Table.Th>
								<Table.Th>Items</Table.Th>
								<Table.Th>Total</Table.Th>
								<Table.Th>Status</Table.Th>
								<Table.Th>Created</Table.Th>
							</Table.Tr>
						</Table.Thead>
						<Table.Tbody>
							{orders.map((order) => (
								<Table.Tr
									key={order.id}
									style={{ cursor: 'pointer' }}
									onClick={() => setSelectedOrder(order)}
								>
									<Table.Td>
										<Group gap={6} wrap="nowrap">
											<Text fw={600}>#{order.id}</Text>
											{order.status === 'cancelled' ? (
												<Badge color="attention" variant="filled" size="xs">
													Cancelled
												</Badge>
											) : null}
										</Group>
									</Table.Td>
									<Table.Td>{order.order_type === 'dine_in' ? 'Dine in' : 'Takeout'}</Table.Td>
									<Table.Td>{getLocationLabel(order)}</Table.Td>
									<Table.Td>{order.items.length}</Table.Td>
									<Table.Td>{formatCurrency(order.total_amount)}</Table.Td>
									<Table.Td>
										<Badge color={STATUS_COLORS[order.status]} variant="light" radius="xs">
											{STATUS_LABELS[order.status]}
										</Badge>
									</Table.Td>
									<Table.Td>{formatDateTime(order.created_at)}</Table.Td>
								</Table.Tr>
							))}
						</Table.Tbody>
					</Table>

					{!orders.length ? (
						<Text c="dimmed" size="sm" ta="center" py="xl">
							No orders found.
						</Text>
					) : null}
				 
				  </ScrollArea>
				</Paper>
				

				<PaginationFooter
					page={page}
					totalPages={totalPages}
					totalItems={totalItems}
					rangeStart={rangeStart}
					rangeEnd={rangeEnd}
					onChange={setPage}
				/>
			</Stack>

			<Drawer
				opened={Boolean(selectedOrder)}
				onClose={() => setSelectedOrder(null)}
				position="right"
				size={420}
				padding="lg"
				title="Order details"
				styles={{ content: { backgroundColor: theme.other.surface } }}
			>
				{selectedOrder ? (
					<Stack gap="lg">
						<Group justify="space-between" align="flex-start">
							<div>
								<Title order={2}>Order #{selectedOrder.id}</Title>
								<Text size="sm" c="dimmed" mt={4}>{formatDateTime(selectedOrder.created_at)}</Text>
							</div>
							<Badge color={STATUS_COLORS[selectedOrder.status]} variant="light" radius="xs">
								{STATUS_LABELS[selectedOrder.status]}
							</Badge>
						</Group>

						<Divider />

						<Group grow>
							<Text size="xs" fw={700} c="dimmed" tt="uppercase">
								Type: <Text component="span" fw={600} c="inherit">{selectedOrder.order_type === 'dine_in' ? 'Dine in' : 'Takeout'}</Text>
							</Text>
							<Text size="xs" fw={700} c="dimmed" tt="uppercase">
								Location: <Text component="span" fw={600} c="inherit">{getLocationLabel(selectedOrder)}</Text>
							</Text>
						</Group>

						<Stack gap="sm">
							<Text size="xs" fw={700} c="dimmed" tt="uppercase">Items</Text>
							{selectedOrder.items.map((item) => (
								<Group key={`${item.menu_item_id}-${item.item_title}`} justify="space-between" align="flex-start" gap="sm">
									<div>
										<Text fw={600}>{item.item_title}</Text>
										<Text size="xs" c="dimmed">{item.quantity} × {formatCurrency(item.unit_price)}</Text>
									</div>
									<Text fw={600}>{formatCurrency(item.line_total)}</Text>
								</Group>
							))}
						</Stack>

						<Divider />
						<Group justify="space-between">
							<Text fw={700}>Total</Text>
							<Text size="xl" fw={700} ff="'Source Serif 4', serif">{formatCurrency(selectedOrder.total_amount)}</Text>
						</Group>
					</Stack>
				) : null}
			</Drawer>
		</>
	);
};

export default AllOrders;


