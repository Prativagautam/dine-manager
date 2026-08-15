declare const RestaurantManagementSystemLocalize: {
  rest_url: string;
  nonce: string;
};

/* WordPress */
import { useEffect, useState } from "@wordpress/element";

/* Library */
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Alert,
  Box,
  Center,
  Group,
  Loader,
  Stack,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";

/* Local */
import PageWrapper from "../../components/organisms/page-wrapper";

/* ============== Types ================== */

type TableStatus = "Available" | "Occupied" | "Out of Service";

interface FloorTable {
  id: number;
  title: string;
  status: TableStatus;
  capacity: number;
  section: string;
  grid_x: number;
  grid_y: number;
}

/* ============== Constants ================== */

// Must match the server-side 0-11 grid_x/grid_y validation range in
// class-post-types.php and the table REST controller — a 12x12 grid.
const GRID_SIZE = 12;
const CELL_SIZE = 64;

const STATUS_COLORS: Record<TableStatus, string> = {
  Available: "available",
  Occupied: "occupied",
  "Out of Service": "attention",
};

/* ============== Helpers ================== */

const clampToGrid = (value: number) =>
  Math.min(GRID_SIZE - 1, Math.max(0, value));

/* ============== Draggable table card ================== */

interface DraggableTableProps {
  table: FloorTable;
  theme: ReturnType<typeof useMantineTheme>;
}

const DraggableTable = ({ table, theme }: DraggableTableProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: String(table.id),
    });

  const color =
    theme.colors[STATUS_COLORS[table.status]]?.[6] || theme.colors.brand[6];

  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        position: "absolute",
        left: table.grid_x * CELL_SIZE,
        top: table.grid_y * CELL_SIZE,
        width: CELL_SIZE - 8,
        height: CELL_SIZE - 8,
        margin: 4,
        borderRadius: theme.radius.sm,
        border: `2px solid ${color}`,
        backgroundColor: theme.other.surfaceContainerLowest,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: isDragging ? "grabbing" : "grab",
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        zIndex: isDragging ? 10 : 1,
        boxShadow: isDragging ? theme.shadows.md : undefined,
        touchAction: "none",
        userSelect: "none",
      }}
    >
      <Text size="xs" fw={700} ta="center" px={4} lineClamp={1}>
        {table.title}
      </Text>
      <Text size="xs" c="dimmed">
        {table.capacity} seats
      </Text>
    </Box>
  );
};

/* ============== Page ================== */

const FloorPlan = () => {
  const theme = useMantineTheme();

  const [tables, setTables] = useState<FloorTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // A small activation distance stops an ordinary click/tap from being
  // misread as a drag — without this, useDraggable treats even a
  // zero-movement pointerdown/up as a completed drag.
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
  );

  useEffect(() => {
    const fetchTables = async () => {
      const { rest_url: restUrl, nonce } = RestaurantManagementSystemLocalize;
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${restUrl}rms/v1/tables`, {
          headers: { "X-WP-Nonce": nonce },
        });

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        setTables((await response.json()) as FloorTable[]);
      } catch (requestError) {
        setError((requestError as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTables();
  }, []);

  const persistPosition = async (
    tableId: number,
    gridX: number,
    gridY: number,
    previousTables: FloorTable[],
  ) => {
    const { rest_url: restUrl, nonce } = RestaurantManagementSystemLocalize;
    setSaveError(null);

    try {
      const response = await fetch(`${restUrl}rms/v1/tables/${tableId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": nonce,
        },
        body: JSON.stringify({ grid_x: gridX, grid_y: gridY }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message || `Request failed: ${response.status}`);
      }
    } catch (requestError) {
      // Roll back to the pre-drag positions — the optimistic move gets
      // undone visually since the server never actually saved it.
      setTables(previousTables);
      setSaveError((requestError as Error).message);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const tableId = Number(active.id);
    const table = tables.find((item) => item.id === tableId);

    if (!table) {
      return;
    }

    const gridDeltaX = Math.round(delta.x / CELL_SIZE);
    const gridDeltaY = Math.round(delta.y / CELL_SIZE);
    const nextGridX = clampToGrid(table.grid_x + gridDeltaX);
    const nextGridY = clampToGrid(table.grid_y + gridDeltaY);

    if (nextGridX === table.grid_x && nextGridY === table.grid_y) {
      return;
    }

    const previousTables = tables;

    // Optimistic update — the table jumps to its new cell immediately;
    // persistPosition rolls this back if the PATCH fails.
    setTables((currentTables) =>
      currentTables.map((item) =>
        item.id === tableId
          ? { ...item, grid_x: nextGridX, grid_y: nextGridY }
          : item,
      ),
    );

    persistPosition(tableId, nextGridX, nextGridY, previousTables);
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
        <div>
          <Title order={1} ff="'Source Serif 4', serif">
            Floor Plan
          </Title>
          <Text c="dimmed" size="lg" mt={4}>
            Drag tables to arrange your floor layout.
          </Text>
        </div>

        {saveError ? (
          <Alert color="attention" title="Couldn't save position">
            {saveError}
          </Alert>
        ) : null}

        <Group gap="lg">
          {(["Available", "Occupied", "Out of Service"] as TableStatus[]).map(
            (status) => (
              <Group key={status} gap={6}>
                <Box
                  w={12}
                  h={12}
                  style={{
                    borderRadius: 3,
                    backgroundColor:
                      theme.colors[STATUS_COLORS[status]]?.[6] ||
                      theme.colors.brand[6],
                  }}
                />
                <Text size="sm" c="dimmed">
                  {status}
                </Text>
              </Group>
            ),
          )}
        </Group>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <Box
            style={{
              position: "relative",
              width: GRID_SIZE * CELL_SIZE,
              height: GRID_SIZE * CELL_SIZE,
              backgroundColor: theme.other.surfaceContainerLow,
              backgroundImage: `linear-gradient(${theme.other.outlineVariant} 1px, transparent 1px), linear-gradient(90deg, ${theme.other.outlineVariant} 1px, transparent 1px)`,
              backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
              border: `1px solid ${theme.other.outlineVariant}`,
              borderRadius: theme.radius.sm,
            }}
          >
            {tables.map((table) => (
              <DraggableTable key={table.id} table={table} theme={theme} />
            ))}
          </Box>
        </DndContext>
      </Stack>
    </PageWrapper>
  );
};

export default FloorPlan;
