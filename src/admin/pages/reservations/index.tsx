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
  Button,
  Center,
  Divider,
  Drawer,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";

/* Local */
import PageWrapper from "../../components/organisms/page-wrapper";
import SearchableTable, {
  SearchableTableColumn,
} from "../../components/organisms/searchable-table";
import ReservationForm, {
  ReservationFormValues,
  ReservationTableOption,
} from "./create";

type ReservationStatus = "confirmed" | "completed" | "cancelled" | "no_show";

interface ReservationItem {
  id: number;
  title: string;
  status: ReservationStatus;
  table_id: number;
  customer_id: number;
  party_size: number;
  start_datetime: string;
  end_datetime: string;
  contact_name: string;
  contact_phone: string;
}

type DateFilter = "all" | "today" | "upcoming" | "past";

const DATE_FILTERS: { value: DateFilter; label: string }[] = [
  { value: "all", label: "All reservations" },
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

// Matches the backend's one-directional lifecycle exactly (see
// class-reservation-rest-controller.php's $transitions array): every
// reservation starts — and stays — 'confirmed' until a human staff
// action moves it to one of three terminal states. None of the
// terminal states have further transitions, so only 'confirmed'
// reservations ever show status-change actions in the drawer.
const STATUS_LABELS: Record<ReservationStatus, string> = {
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

const STATUS_COLORS: Record<ReservationStatus, string> = {
  confirmed: "occupied",
  completed: "available",
  cancelled: "attention",
  no_show: "reserved",
};

const initialFormState: ReservationFormValues = {
  table_id: 0,
  party_size: 1,
  start_datetime: "",
  contact_name: "",
  contact_phone: "",
  customer_id: undefined,
};

const isValidDate = (value: string) => !Number.isNaN(new Date(value).getTime());

const isToday = (value: string) => {
  if (!isValidDate(value)) {
    return false;
  }

  const date = new Date(value);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const formatDateTime = (value: string) => {
  if (!isValidDate(value)) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
};

const formatTime = (value: string) => {
  if (!isValidDate(value)) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
};

const Reservations = () => {
  const theme = useMantineTheme();
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [selectedReservation, setSelectedReservation] =
    useState<ReservationItem | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [tables, setTables] = useState<ReservationTableOption[]>([]);
  const [tableError, setTableError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReservations = async () => {
      const { rest_url: restUrl, nonce } = RestaurantManagementSystemLocalize;

      setIsLoading(true);
      setError(null);

      try {
        // The endpoint supports pagination. A 100-record page keeps this staff
        // view simple while the reservation volume is small; server-side filters
        // can be added alongside the endpoint if the data set grows.
        const response = await fetch(
          `${restUrl}rms/v1/reservations?per_page=100`,
          {
            headers: {
              "X-WP-Nonce": nonce,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const data = (await response.json()) as ReservationItem[];
        setReservations(data);
      } catch (requestError) {
        setError((requestError as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReservations();
  }, []);

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
          throw new Error(`Request failed: ${response.status}`);
        }

        const data = (await response.json()) as ReservationTableOption[];
        setTables(data);
      } catch (requestError) {
        setTableError((requestError as Error).message);
      }
    };

    fetchTables();
  }, []);

  const counts = useMemo(() => {
    const now = new Date();

    return reservations.reduce(
      (accumulator, reservation) => {
        if (isToday(reservation.start_datetime)) {
          accumulator.today += 1;
        }

        if (isValidDate(reservation.start_datetime)) {
          if (new Date(reservation.start_datetime) >= now) {
            accumulator.upcoming += 1;
          } else {
            accumulator.past += 1;
          }
        }

        return accumulator;
      },
      { today: 0, upcoming: 0, past: 0 },
    );
  }, [reservations]);

  // Date filter stays page-specific — narrows the dataset BEFORE it
  // reaches SearchableTable, which owns search + pagination on top of
  // whatever this filter leaves behind. Search itself moved into
  // SearchableTable, so this no longer does text matching at all.
  const dateFilteredReservations = useMemo(() => {
    const now = new Date();

    return reservations.filter((reservation) => {
      const startsAt = new Date(reservation.start_datetime);
      return (
        dateFilter === "all" ||
        (dateFilter === "today" && isToday(reservation.start_datetime)) ||
        (dateFilter === "upcoming" &&
          isValidDate(reservation.start_datetime) &&
          startsAt >= now) ||
        (dateFilter === "past" &&
          isValidDate(reservation.start_datetime) &&
          startsAt < now)
      );
    });
  }, [dateFilter, reservations]);

  const tableNamesById = useMemo(
    () => new Map(tables.map((table) => [table.id, table.title])),
    [tables],
  );

  const getTableName = (tableId: number) =>
    tableNamesById.get(tableId) || `Table #${tableId}`;

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

  const submitForm = async (values: ReservationFormValues) => {
    const { rest_url: restUrl, nonce } = RestaurantManagementSystemLocalize;
    const payload = {
      table_id: Number(values.table_id),
      party_size: Number(values.party_size),
      start_datetime: new Date(values.start_datetime).toISOString(),
      contact_name: values.contact_name.trim(),
      contact_phone: values.contact_phone.trim(),
      ...(values.customer_id
        ? { customer_id: Number(values.customer_id) }
        : {}),
    };

    setFormLoading(true);
    setFormError(null);

    try {
      const response = await fetch(`${restUrl}rms/v1/reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": nonce,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message || `Request failed: ${response.status}`);
      }

      const createdReservation = (await response.json()) as ReservationItem;
      setReservations((currentReservations) =>
        [...currentReservations, createdReservation].sort(
          (first, second) =>
            new Date(first.start_datetime).getTime() -
            new Date(second.start_datetime).getTime(),
        ),
      );
      setFormOpen(false);
    } catch (requestError) {
      setFormError((requestError as Error).message);
    } finally {
      setFormLoading(false);
    }
  };

  const updateReservationStatus = async (status: ReservationStatus) => {
    if (!selectedReservation) {
      return;
    }

    const { rest_url: restUrl, nonce } = RestaurantManagementSystemLocalize;
    setUpdatingStatus(true);
    setActionError(null);

    try {
      const response = await fetch(
        `${restUrl}rms/v1/reservations/${selectedReservation.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-WP-Nonce": nonce,
          },
          body: JSON.stringify({ status }),
        },
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message || `Request failed: ${response.status}`);
      }

      const updatedReservation = (await response.json()) as ReservationItem;
      setReservations((currentReservations) =>
        currentReservations.map((reservation) =>
          reservation.id === updatedReservation.id
            ? updatedReservation
            : reservation,
        ),
      );
      setSelectedReservation(updatedReservation);
    } catch (requestError) {
      setActionError((requestError as Error).message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const columns: SearchableTableColumn<ReservationItem>[] = [
    {
      key: "guest",
      label: "Guest",
      render: (reservation) => (
        <>
          <Text fw={600}>{reservation.contact_name}</Text>
          <Text size="xs" c="dimmed">
            Reservation #{reservation.id}
          </Text>
        </>
      ),
    },
    {
      key: "table",
      label: "Table",
      render: (reservation) => (
        <Badge color="reserved" variant="light" radius="xs">
          {getTableName(reservation.table_id)}
        </Badge>
      ),
    },
    {
      key: "party",
      label: "Party",
      render: (reservation) => `${reservation.party_size} guests`,
    },
    {
      key: "arrival",
      label: "Arrival",
      render: (reservation) => (
        <>
          <Text size="sm">{formatDateTime(reservation.start_datetime)}</Text>
          <Text size="xs" c="dimmed">
            Until {formatTime(reservation.end_datetime)}
          </Text>
        </>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (reservation) => (
        <Badge
          color={STATUS_COLORS[reservation.status]}
          variant="light"
          radius="xs"
        >
          {STATUS_LABELS[reservation.status]}
        </Badge>
      ),
    },
    {
      key: "contact",
      label: "Contact",
      render: (reservation) => reservation.contact_phone,
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

  if (error) {
    return (
      <PageWrapper>
        <Alert color="attention" title="Failed to load reservations">
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
              Reservations
            </Title>
            <Text c="dimmed" size="lg" mt={4}>
              Manage upcoming guests and review booking details.
            </Text>
          </div>
          <Button color="brand" radius="lg" onClick={openCreateForm}>
            + Add reservation
          </Button>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <Paper
            p="lg"
            radius="md"
            bg={theme.other.surfaceContainerLowest}
            withBorder
          >
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Today
            </Text>
            <Text
              size="42px"
              lh={1.1}
              fw={700}
              ff="'Source Serif 4', serif"
              mt="xs"
            >
              {counts.today}
            </Text>
            <Text size="sm" c="dimmed" mt="xs">
              Reservations scheduled today
            </Text>
          </Paper>
          <Paper
            p="lg"
            radius="md"
            bg={theme.other.surfaceContainerLowest}
            withBorder
          >
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Upcoming
            </Text>
            <Text
              size="42px"
              lh={1.1}
              fw={700}
              ff="'Source Serif 4', serif"
              mt="xs"
            >
              {counts.upcoming}
            </Text>
            <Text size="sm" c="dimmed" mt="xs">
              Reservations yet to start
            </Text>
          </Paper>
          <Paper
            p="lg"
            radius="md"
            bg={theme.other.surfaceContainerLowest}
            withBorder
          >
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Past
            </Text>
            <Text
              size="42px"
              lh={1.1}
              fw={700}
              ff="'Source Serif 4', serif"
              mt="xs"
            >
              {counts.past}
            </Text>
            <Text size="sm" c="dimmed" mt="xs">
              Completed booking times
            </Text>
          </Paper>
        </SimpleGrid>

        {/* Tabs + table grouped under a tighter gap, matching Menu's
				    layout — reads as one connected block rather than two
				    separate stacked sections. */}
        <Stack gap="xs">
          <Tabs
            value={dateFilter}
            onChange={(value) => setDateFilter((value || "all") as DateFilter)}
            color="brand"
            variant="outline"
          >
            <Tabs.List>
              {DATE_FILTERS.map((filter) => (
                <Tabs.Tab key={filter.value} value={filter.value}>
                  {filter.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>

          <Paper
            p="lg"
            radius="md"
            bg={theme.other.surfaceContainerLowest}
            withBorder
          >
            <SearchableTable
              data={dateFilteredReservations}
              columns={columns}
              rowKey={(reservation: ReservationItem) => reservation.id}
              getSearchableText={(reservation: ReservationItem) =>
                `${reservation.contact_name} ${
                  reservation.contact_phone
                } ${getTableName(reservation.table_id)} ${
                  STATUS_LABELS[reservation.status]
                }`
              }
              onRowClick={(reservation: ReservationItem) =>
                setSelectedReservation(reservation)
              }
              searchLabel="Search reservations"
              searchPlaceholder="Guest, phone, table, or status"
              emptyMessage="No reservations match the selected filters."
              minWidth={760}
            />
          </Paper>
        </Stack>
      </Stack>

      <Drawer
        opened={Boolean(selectedReservation)}
        onClose={() => setSelectedReservation(null)}
        position="right"
        size={420}
        padding="lg"
        title="Reservation details"
        styles={{ content: { backgroundColor: theme.other.surface } }}
      >
        {selectedReservation ? (
          <Stack gap="lg">
            <Group justify="space-between" align="flex-start">
              <div>
                <Title order={2}>{selectedReservation.contact_name}</Title>
                <Text c="dimmed" size="sm" mt={4}>
                  Reservation #{selectedReservation.id}
                </Text>
              </div>
              <Badge
                color={STATUS_COLORS[selectedReservation.status]}
                variant="light"
                radius="xs"
              >
                {STATUS_LABELS[selectedReservation.status]}
              </Badge>
            </Group>

            <Divider />

            {actionError ? (
              <Alert color="attention" title="Couldn't update status">
                {actionError}
              </Alert>
            ) : null}

            <Stack gap="xs">
              <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                Booking
              </Text>
              <Text fw={600}>
                {formatDateTime(selectedReservation.start_datetime)}
              </Text>
              <Text size="sm" c="dimmed">
                90-minute seating · ends{" "}
                {formatTime(selectedReservation.end_datetime)}
              </Text>
            </Stack>

            <SimpleGrid cols={2} spacing="md">
              <Paper p="md" bg={theme.other.surfaceContainerLow} radius="md">
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Table
                </Text>
                <Text fw={700} mt={4}>
                  {getTableName(selectedReservation.table_id)}
                </Text>
              </Paper>
              <Paper p="md" bg={theme.other.surfaceContainerLow} radius="md">
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Party size
                </Text>
                <Text fw={700} mt={4}>
                  {selectedReservation.party_size} guests
                </Text>
              </Paper>
            </SimpleGrid>

            <Stack gap="xs">
              <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                Contact
              </Text>
              <Text>{selectedReservation.contact_name}</Text>
              <Text>{selectedReservation.contact_phone}</Text>
            </Stack>

            {/* Only 'confirmed' reservations have any valid transition —
						    completed/cancelled/no_show are all terminal states on the
						    backend, so no actions render once one of those is reached. */}
            {selectedReservation.status === "confirmed" ? (
              <>
                <Divider />
                <Stack gap="xs">
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                    Update status
                  </Text>
                  <Group gap="xs">
                    <Button
                      size="xs"
                      color="available"
                      loading={updatingStatus}
                      onClick={() => updateReservationStatus("completed")}
                    >
                      Mark Completed
                    </Button>
                    <Button
                      size="xs"
                      color="reserved"
                      variant="outline"
                      loading={updatingStatus}
                      onClick={() => updateReservationStatus("no_show")}
                    >
                      Mark No Show
                    </Button>
                    <Button
                      size="xs"
                      color="attention"
                      variant="outline"
                      loading={updatingStatus}
                      onClick={() => updateReservationStatus("cancelled")}
                    >
                      Cancel
                    </Button>
                  </Group>
                </Stack>
              </>
            ) : null}
          </Stack>
        ) : null}
      </Drawer>

      <ReservationForm
        opened={formOpen}
        defaultValues={initialFormState}
        tables={tables}
        tableError={tableError}
        loading={formLoading}
        error={formError}
        onClose={closeCreateForm}
        onSubmit={submitForm}
      />
    </PageWrapper>
  );
};

export default Reservations;
