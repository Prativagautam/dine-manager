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
	Button,
	Center,
	Divider,
	Drawer,
	Group,
	Loader,
	Paper,
	ScrollArea,
	Stack,
	Text,
	Title,
	useMantineTheme,
} from '@mantine/core';

/* Local */
import PageWrapper from '../../components/organisms/page-wrapper';
import OrderForm, { OrderFormValues, OrderMenuItem, OrderTableOption } from './create';

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

type OrderMenuItemResponse = {
	id: number | string;
	title: string;
	price: number | string;
};

const STATUS_COLUMNS: { status: Exclude<OrderStatus, 'cancelled'>; label: string; color: string }[] = [
	{ status: 'pending', label: 'Pending', color: 'reserved' },
	{ status: 'confirmed', label: 'Confirmed', color: 'occupied' },
	{ status: 'preparing', label: 'Preparing', color: 'brand' },
	{ status: 'ready', label: 'Ready', color: 'available' },
	{ status: 'delivered', label: 'Delivered', color: 'available' },
];

const STATUS_LABELS: Record<OrderStatus, string> = {
	pending: 'Pending',
	confirmed: 'Confirmed',
	preparing: 'Preparing',
	ready: 'Ready',
	delivered: 'Delivered',
	cancelled: 'Cancelled',
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
	pending: 'confirmed',
	confirmed: 'preparing',
	preparing: 'ready',
	ready: 'delivered',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
	pending: 'reserved',
	confirmed: 'occupied',
	preparing: 'brand',
	ready: 'available',
	delivered: 'available',
	cancelled: 'attention',
};

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

const Orders = () => {
	const theme = useMantineTheme();
	const [orders, setOrders] = useState<Order[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
	const [updatingStatus, setUpdatingStatus] = useState(false);
	const [tables, setTables] = useState<OrderTableOption[]>([]);
	const [menuItems, setMenuItems] = useState<OrderMenuItem[]>([]);
	const [formOpen, setFormOpen] = useState(false);
	const [formLoading, setFormLoading] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	useEffect(() => {
		const fetchOrders = async () => {
			const { rest_url: restUrl, nonce } = RestaurantManagementSystemLocalize;
			setIsLoading(true);
			setError(null);

			try {
				const response = await fetch(`${restUrl}rms/v1/orders?per_page=100`, {
					headers: { 'X-WP-Nonce': nonce },
				});

				if (!response.ok) {
					throw new Error(`Request failed: ${response.status}`);
				}

				setOrders((await response.json()) as Order[]);
			} catch (requestError) {
				setError((requestError as Error).message);
			} finally {
				setIsLoading(false);
			}
		};

		fetchOrders();
	}, []);

	useEffect(() => {
		const fetchTables = async () => {
			const { rest_url: restUrl, nonce } = RestaurantManagementSystemLocalize;

			try {
				const response = await fetch(`${restUrl}rms/v1/tables`, {
					headers: { 'X-WP-Nonce': nonce },
				});

				if (response.ok) {
					const tableResponse = (await response.json()) as OrderLookupResponse[];
					setTables(tableResponse.map((table) => ({
						id: Number(table.id),
						title: table.title,
						capacity: Number(table.capacity),
						section: table.section,
					})));
				}
			} catch {
				// Table names are a display enhancement; orders remain usable if
				// this secondary request is unavailable.
			}
		};

		fetchTables();
	}, []);

	useEffect(() => {
		const fetchMenuItems = async () => {
			const { rest_url: restUrl, nonce } = RestaurantManagementSystemLocalize;

			try {
				const response = await fetch(`${restUrl}rms/v1/menu-items?per_page=100`, {
					headers: { 'X-WP-Nonce': nonce },
				});

				if (response.ok) {
					const menuItemResponse = (await response.json()) as OrderMenuItemResponse[];
					setMenuItems(menuItemResponse.map((menuItem) => ({
						id: Number(menuItem.id),
						title: menuItem.title,
						price: Number(menuItem.price),
					})));
				}
			} catch {
				// The modal keeps its unavailable-item validation if this request
				// fails; the server remains the source of truth at submission time.
			}
		};

		fetchMenuItems();
	}, []);

	const ordersByStatus = useMemo(() => {
		return orders.reduce<Record<OrderStatus, Order[]>>(
			(accumulator, order) => {
				(accumulator[order.status] || accumulator.pending).push(order);
				return accumulator;
			},
			{ pending: [], confirmed: [], preparing: [], ready: [], delivered: [], cancelled: [] }
		);
	}, [orders]);

	const tableNamesById = useMemo(
		() => new Map(tables.map((table) => [table.id, table.title])),
		[tables]
	);

	const getTableName = (tableId: number) => tableNamesById.get(tableId) || `Table #${tableId}`;

	const openCreateForm = () => {
		setFormError(null);
		setFormOpen(true);
	};

	const closeCreateForm = () => {
		if (!formLoading) {
			setFormOpen(false);
			setFormError(null);
		}
	};

	const submitOrder = async (values: OrderFormValues) => {
		const { rest_url: restUrl, nonce } = RestaurantManagementSystemLocalize;
		setFormLoading(true);
		setFormError(null);

		try {
			const response = await fetch(`${restUrl}rms/v1/orders`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-WP-Nonce': nonce,
				},
				body: JSON.stringify({
					order_type: 'dine_in',
					order_source: 'staff_pos',
					table_id: values.table_id,
					items: values.items.map((item) => ({
						menu_item_id: item.menu_item_id,
						quantity: item.quantity,
					})),
				}),
			});

			if (!response.ok) {
				const body = (await response.json().catch(() => null)) as { message?: string } | null;
				throw new Error(body?.message || `Request failed: ${response.status}`);
			}

			const createdOrder = (await response.json()) as Order;
			setOrders((currentOrders) => [createdOrder, ...currentOrders]);
			setSelectedOrder(createdOrder);
			setFormOpen(false);
		} catch (requestError) {
			setFormError((requestError as Error).message);
		} finally {
			setFormLoading(false);
		}
	};

	const updateOrderStatus = async (status: OrderStatus) => {
		if (!selectedOrder) {
			return;
		}

		const { rest_url: restUrl, nonce } = RestaurantManagementSystemLocalize;
		setUpdatingStatus(true);
		setError(null);

		try {
			const response = await fetch(`${restUrl}rms/v1/orders/${selectedOrder.id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					'X-WP-Nonce': nonce,
				},
				body: JSON.stringify({ status }),
			});

			if (!response.ok) {
				const body = (await response.json().catch(() => null)) as { message?: string } | null;
				throw new Error(body?.message || `Request failed: ${response.status}`);
			}

			const updatedOrder = (await response.json()) as Order;
			setOrders((currentOrders) =>
				currentOrders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
			);
			setSelectedOrder(updatedOrder);
		} catch (requestError) {
			setError((requestError as Error).message);
		} finally {
			setUpdatingStatus(false);
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

	if (error && !selectedOrder) {
		return (
			<PageWrapper>
				<Alert color="attention" title="Failed to load orders">
					{error}
				</Alert>
			</PageWrapper>
		);
	}

	return (
		<PageWrapper>
			<Stack gap="lg" maw={1440} mx="auto">
				<Group justify="space-between" align="flex-end" gap="md">
					<div>
						<Title order={1} ff="'Source Serif 4', serif">
							Order Management
						</Title>
						<Text c="dimmed" size="lg" mt={4}>
							Track each order from arrival through delivery.
						</Text>
					</div>
					<Button color="brand" radius="lg" onClick={openCreateForm}>
						+ Add order
					</Button>
				</Group>

				{error ? <Alert color="attention" title="Order update failed">{error}</Alert> : null}

				<ScrollArea type="auto" offsetScrollbars>
					<Group align="flex-start" gap="md" wrap="nowrap" pb="sm">
						{STATUS_COLUMNS.map((column) => {
							const columnOrders = ordersByStatus[column.status];

							return (
								<Stack key={column.status} gap="sm" w={320} style={{ flexShrink: 0 }}>
									<Group justify="space-between" px="xs">
										<Group gap="xs">
											<Badge color={column.color} variant="filled" circle>
												{columnOrders.length}
											</Badge>
											<Text fw={700}>{column.label}</Text>
										</Group>
									</Group>

									{columnOrders.length ? (
										columnOrders.map((order) => (
											<Paper
												key={order.id}
												p="md"
												withBorder
												bg={theme.other.surfaceContainerLowest}
												style={{ borderTop: `4px solid ${theme.colors[column.color]?.[6] || theme.colors.brand[6]}`, cursor: 'pointer' }}
												onClick={() => setSelectedOrder(order)}
											>
												<Stack gap="xs">
													<Group justify="space-between" align="flex-start" gap="xs">
														<Text fw={700}>Order #{order.id}</Text>
														<Badge color={STATUS_COLORS[order.status]} variant="light" radius="xs">
															{order.order_type === 'dine_in' ? 'Dine in' : 'Takeout'}
														</Badge>
													</Group>
													<Text size="sm" c="dimmed">
														{order.table_id ? getTableName(order.table_id) : 'Customer takeout'} · {order.items.length} item{order.items.length === 1 ? '' : 's'}
													</Text>
													<Group justify="space-between">
														<Text size="xs" c="dimmed">{formatDateTime(order.created_at)}</Text>
														<Text fw={700}>{formatCurrency(order.total_amount)}</Text>
													</Group>
												</Stack>
											</Paper>
										))
									) : (
										<Paper p="lg" withBorder bg={theme.other.surfaceContainerLow}>
											<Text size="sm" c="dimmed" ta="center">No orders</Text>
										</Paper>
									)}
								</Stack>
							);
						})}
					</Group>
				</ScrollArea>

				{ordersByStatus.cancelled.length ? (
					<Paper p="md" withBorder bg={theme.other.surfaceContainerLow}>
						<Group justify="space-between">
							<Text fw={700}>Cancelled orders</Text>
							<Badge color="attention" variant="light">{ordersByStatus.cancelled.length}</Badge>
						</Group>
					</Paper>
				) : null}
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
							<Paper p="sm" bg={theme.other.surfaceContainerLow}>
								<Text size="xs" fw={700} c="dimmed" tt="uppercase">Type</Text>
								<Text fw={600} mt={4}>{selectedOrder.order_type === 'dine_in' ? 'Dine in' : 'Takeout'}</Text>
							</Paper>
							<Paper p="sm" bg={theme.other.surfaceContainerLow}>
								<Text size="xs" fw={700} c="dimmed" tt="uppercase">Location</Text>
								<Text fw={600} mt={4}>{selectedOrder.table_id ? getTableName(selectedOrder.table_id) : 'Takeout'}</Text>
							</Paper>
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

						{NEXT_STATUS[selectedOrder.status] ? (
							<Button color="brand" loading={updatingStatus} onClick={() => updateOrderStatus(NEXT_STATUS[selectedOrder.status] as OrderStatus)}>
								Move to {STATUS_LABELS[NEXT_STATUS[selectedOrder.status] as OrderStatus]}
							</Button>
						) : null}
						{selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' ? (
							<Button color="attention" variant="outline" loading={updatingStatus} onClick={() => updateOrderStatus('cancelled')}>
								Cancel order
							</Button>
						) : null}
					</Stack>
				) : null}
			</Drawer>

			<OrderForm
				opened={formOpen}
				tables={tables}
				menuItems={menuItems}
				loading={formLoading}
				error={formError}
				onClose={closeCreateForm}
				onSubmit={submitOrder}
			/>
		</PageWrapper>
	);
};

export default Orders;
