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
  Group,
  Loader,
  Paper,
  Progress,
  Stack,
  Table,
  Text,
  Title,
  UnstyledButton,
  useMantineTheme,
} from "@mantine/core";

/* Local */
import PageWrapper from "../../components/organisms/page-wrapper";

/* ============== Types ================== */

interface DashboardSummary {
  revenue_today: number;
  reservations_today: number;
  table_occupancy_pct: number;
}

type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled";

interface RecentOrder {
  id: number;
  status: OrderStatus;
  order_type: "dine_in" | "takeout";
  table_id: number;
  total_amount: number;
  created_at: string;
  items: { item_title: string; quantity: number }[];
}

type ReservationStatus = "confirmed" | "completed" | "cancelled" | "no_show";

interface UpcomingReservation {
  id: number;
  table_id: number;
  party_size: number;
  start_datetime: string;
  contact_name: string;
  status: ReservationStatus;
}

interface TableLookup {
  id: number;
  title: string;
}

/* ============== Constants ================== */

const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "reserved",
  confirmed: "occupied",
  preparing: "brand",
  ready: "available",
  delivered: "available",
  cancelled: "attention",
};

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/* ============== Helpers ================== */

const formatCurrency = (amount: number) => `$${Number(amount || 0).toFixed(2)}`;

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const todayLabel = () =>
  new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date());

const navigateTo = (path: string) => {
  window.location.hash = path;
};

/* ============== Component ================== */

const Dashboard = () => {
  const theme = useMantineTheme();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [upcomingReservations, setUpcomingReservations] = useState<
    UpcomingReservation[]
  >([]);
  const [tables, setTables] = useState<TableLookup[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const { rest_url: restUrl, nonce } = RestaurantManagementSystemLocalize;
      setIsLoading(true);
      setError(null);

      try {
        const [summaryRes, ordersRes, reservationsRes] = await Promise.all([
          fetch(`${restUrl}rms/v1/dashboard/summary`, {
            headers: { "X-WP-Nonce": nonce },
          }),
          fetch(`${restUrl}rms/v1/orders?per_page=5`, {
            headers: { "X-WP-Nonce": nonce },
          }),
          fetch(`${restUrl}rms/v1/reservations?per_page=50`, {
            headers: { "X-WP-Nonce": nonce },
          }),
        ]);

        if (!summaryRes.ok) {
          throw new Error(`Request failed: ${summaryRes.status}`);
        }
        if (!ordersRes.ok) {
          throw new Error(`Request failed: ${ordersRes.status}`);
        }
        if (!reservationsRes.ok) {
          throw new Error(`Request failed: ${reservationsRes.status}`);
        }

        setSummary((await summaryRes.json()) as DashboardSummary);
        setRecentOrders((await ordersRes.json()) as RecentOrder[]);

        const allReservations =
          (await reservationsRes.json()) as UpcomingReservation[];
        const now = new Date();
        const upcoming = allReservations
          .filter(
            (reservation) =>
              reservation.status !== "cancelled" &&
              new Date(reservation.start_datetime) >= now,
          )
          .slice(0, 5);
        setUpcomingReservations(upcoming);
      } catch (requestError) {
        setError((requestError as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  useEffect(() => {
    const fetchTables = async () => {
      const { rest_url: restUrl, nonce } = RestaurantManagementSystemLocalize;

      try {
        const response = await fetch(`${restUrl}rms/v1/tables`, {
          headers: { "X-WP-Nonce": nonce },
        });

        if (response.ok) {
          const tableResponse = (await response.json()) as {
            id: number | string;
            title: string;
          }[];
          setTables(
            tableResponse.map((table) => ({
              id: Number(table.id),
              title: table.title,
            })),
          );
        }
      } catch {
        // Table names are a display enhancement; orders/reservations remain
        // usable (falling back to "Table #N") if this request fails.
      }
    };

    fetchTables();
  }, []);

  const tableNamesById = useMemo(
    () => new Map(tables.map((table) => [table.id, table.title])),
    [tables],
  );

  const getTableName = (tableId: number) =>
    tableId ? tableNamesById.get(tableId) || `Table #${tableId}` : "Takeout";

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
        <Alert color="attention" title="Failed to load dashboard">
          {error}
        </Alert>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Stack gap="lg" maw={1440} mx="auto">
        <div>
          <Title order={1} ff="'Source Serif 4', serif">
            Today&apos;s Overview
          </Title>
          <Text c="dimmed" size="lg" mt={4}>
            {todayLabel()}
          </Text>
        </div>

        {/* Stat cards */}
        <Group grow align="stretch">
          <Paper p="xl" withBorder bg={theme.other.surfaceContainerLowest}>
            <Text
              size="xs"
              fw={700}
              c="dimmed"
              tt="uppercase"
              style={{ letterSpacing: "0.05em" }}
            >
              Today&apos;s Revenue
            </Text>
            <Text
              size="32px"
              fw={700}
              c="brand"
              ff="'Source Serif 4', serif"
              mt={4}
            >
              {formatCurrency(summary?.revenue_today ?? 0)}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Delivered orders only
            </Text>
          </Paper>

          <Paper p="xl" withBorder bg={theme.other.surfaceContainerLowest}>
            <Text
              size="xs"
              fw={700}
              c="dimmed"
              tt="uppercase"
              style={{ letterSpacing: "0.05em" }}
            >
              Reservations Today
            </Text>
            <Text size="32px" fw={700} ff="'Source Serif 4', serif" mt={4}>
              {summary?.reservations_today ?? 0}
            </Text>
          </Paper>

          <Paper p="xl" withBorder bg={theme.other.surfaceContainerLowest}>
            <Text
              size="xs"
              fw={700}
              c="dimmed"
              tt="uppercase"
              style={{ letterSpacing: "0.05em" }}
            >
              Table Occupancy
            </Text>
            <Text size="32px" fw={700} ff="'Source Serif 4', serif" mt={4}>
              {summary?.table_occupancy_pct ?? 0}%
            </Text>
            <Progress
              value={summary?.table_occupancy_pct ?? 0}
              color="brand"
              size="sm"
              mt="sm"
            />
          </Paper>
        </Group>

        {/* Main grid: recent orders + next bookings + operations */}
        <Group align="flex-start" gap="lg" wrap="nowrap">
          <Paper
            withBorder
            bg={theme.other.surfaceContainerLowest}
            style={{ flex: 2, minWidth: 0 }}
          >
            <Group justify="space-between" p="lg" pb="sm">
              <Title order={3} ff="'Source Serif 4', serif">
                Recent Orders
              </Title>
              <UnstyledButton
                c="brand"
                fw={700}
                onClick={() => navigateTo("/orders")}
              >
                View all
              </UnstyledButton>
            </Group>

            {recentOrders.length ? (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>ID</Table.Th>
                    <Table.Th>Location</Table.Th>
                    <Table.Th>Items</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th ta="right">Total</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {recentOrders.map((order) => (
                    <Table.Tr key={order.id}>
                      <Table.Td>#{order.id}</Table.Td>
                      <Table.Td>
                        {order.order_type === "dine_in"
                          ? getTableName(order.table_id)
                          : "Takeout"}
                      </Table.Td>
                      <Table.Td>
                        {order.items
                          .map((item) => `${item.quantity}x ${item.item_title}`)
                          .join(", ")}
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={ORDER_STATUS_COLORS[order.status]}
                          variant="light"
                          radius="xs"
                        >
                          {ORDER_STATUS_LABELS[order.status]}
                        </Badge>
                      </Table.Td>
                      <Table.Td ta="right" fw={700}>
                        {formatCurrency(order.total_amount)}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : (
              <Text c="dimmed" p="lg">
                No orders yet.
              </Text>
            )}
          </Paper>

          <Stack gap="lg" style={{ flex: 1, minWidth: 280 }}>
            <Paper p="lg" withBorder bg={theme.other.surfaceContainerLowest}>
              <Title order={3} ff="'Source Serif 4', serif" mb="md">
                Operations
              </Title>
              <Stack gap="xs">
                <UnstyledButton
                  p="sm"
                  bg={theme.other.surfaceContainerLow}
                  style={{ borderRadius: theme.radius.sm }}
                  onClick={() => navigateTo("/reservations")}
                >
                  <Text fw={600}>New Reservation</Text>
                </UnstyledButton>
                <UnstyledButton
                  p="sm"
                  bg={theme.other.surfaceContainerLow}
                  style={{ borderRadius: theme.radius.sm }}
                  onClick={() => navigateTo("/orders")}
                >
                  <Text fw={600}>New Order</Text>
                </UnstyledButton>
                <UnstyledButton
                  p="sm"
                  bg={theme.other.surfaceContainerLow}
                  style={{ borderRadius: theme.radius.sm }}
                  onClick={() => navigateTo("/menu")}
                >
                  <Text fw={600}>Update Menu</Text>
                </UnstyledButton>
              </Stack>
            </Paper>

            <Paper withBorder bg={theme.other.surfaceContainerLowest}>
              <Title order={3} ff="'Source Serif 4', serif" p="lg" pb="sm">
                Next Bookings
              </Title>
              {upcomingReservations.length ? (
                <Stack gap="md" p="lg" pt={0}>
                  {upcomingReservations.map((reservation) => (
                    <Group key={reservation.id} justify="space-between">
                      <div>
                        <Text fw={700}>{reservation.contact_name}</Text>
                        <Text size="xs" c="dimmed" mt={2}>
                          {formatTime(reservation.start_datetime)} ·{" "}
                          {reservation.party_size} guests ·{" "}
                          {getTableName(reservation.table_id)}
                        </Text>
                      </div>
                    </Group>
                  ))}
                </Stack>
              ) : (
                <Text c="dimmed" p="lg" pt={0}>
                  No upcoming reservations.
                </Text>
              )}
            </Paper>
          </Stack>
        </Group>
      </Stack>
    </PageWrapper>
  );
};

export default Dashboard;