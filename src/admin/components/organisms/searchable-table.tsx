/* WordPress */
import { useEffect, useMemo, useState } from "@wordpress/element";

/* Library */
import {
  ActionIcon,
  Center,
  Group,
  ScrollArea,
  Stack,
  Table,
  Text,
  TextInput,
  useMantineTheme,
} from "@mantine/core";

/* Local */
import PaginationFooter from "./pagination-footer";
import { Search, X } from "lucide-react";

/**
 * Shared searchable, paginated table shell used across list-style admin
 * pages (Reservations, Orders "All" tab, Tables, Menu). Owns search
 * filtering AND pagination together — pagination has to operate on
 * whatever search left behind, not the original unfiltered dataset. Any
 * other filtering (date-range tabs, category dropdowns, etc.) is
 * domain-specific and stays in the page, applied to `data` before it
 * reaches this component.
 *
 * Column *shape* (labels, cell rendering — badges, multi-line cells,
 * currency formatting) is entirely page-defined via `columns`.
 */

export interface SearchableTableColumn<T> {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
}

interface SearchableTableProps<T> {
  data: T[];
  columns: SearchableTableColumn<T>[];
  rowKey: (row: T) => string | number;
  getSearchableText: (row: T) => string;
  searchLabel?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  minWidth?: number;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  /**
   * Optional — when provided, the whole row becomes clickable (cursor
   * changes to pointer) and calls this with the row's data. Individual
   * columns (e.g. a status Badge, an action button) still render and
   * work normally; this is purely an additional row-level handler, not
   * a replacement for column-level interactivity.
   */
  onRowClick?: (row: T) => void;
}

function SearchableTable<T>({
  data,
  columns,
  rowKey,
  getSearchableText,
  searchLabel = "Search",
  searchPlaceholder = "Search...",
  emptyMessage = "No records found.",
  minWidth = 760,
  pageSizeOptions = [10, 25, 50],
  defaultPageSize = 10,
  onRowClick,
}: SearchableTableProps<T>) {
  const theme = useMantineTheme();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const filteredData = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return data;
    }

    return data.filter((row) =>
      getSearchableText(row).toLowerCase().includes(normalizedSearch),
    );
  }, [data, search, getSearchableText]);

  // Reset to page 1 whenever the search text (or the underlying data)
  // changes — otherwise someone sitting on page 5 who searches down to
  // 2 results lands on a blank page with no visible rows and no
  // indication why. Also protects against a page-size change or an
  // external data refresh leaving `page` pointing past the new end.
  useEffect(() => {
    setPage(1);
  }, [search, data]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const rangeStart =
    filteredData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredData.length);

  return (
    <Stack gap="xs">
      <Group justify="flex-end">
        {isSearchOpen ? (
          <TextInput
            autoFocus
            aria-label={searchLabel}
            placeholder={searchPlaceholder}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            leftSection={<Search size={16} strokeWidth={1.8} />}
            rightSection={
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => {
                  setSearch("");
                  setIsSearchOpen(false);
                }}
              >
                <X size={16} strokeWidth={1.8} />
              </ActionIcon>
            }
            w={{ base: "100%", sm: 260 }}
            style={{ transition: "width 150ms ease" }}
          />
        ) : (
          <ActionIcon
            variant="light"
            color="brand"
            size="lg"
            aria-label={searchLabel}
            onClick={() => setIsSearchOpen(true)}
          >
            <Search size={18} strokeWidth={1.8} />
          </ActionIcon>
        )}
      </Group>

      <ScrollArea>
        <Table striped highlightOnHover verticalSpacing="md" miw={minWidth}>
          <Table.Thead bg={theme.other.surfaceContainerLow}>
            <Table.Tr>
              {columns.map((column) => (
                <Table.Th key={column.key} ta={column.align}>
                  {column.label}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginatedData.length ? (
              paginatedData.map((row) => (
                <Table.Tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={onRowClick ? { cursor: "pointer" } : undefined}
                >
                  {columns.map((column) => (
                    <Table.Td key={column.key} ta={column.align}>
                      {column.render(row)}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))
            ) : (
              <Table.Tr>
                <Table.Td colSpan={columns.length}>
                  <Center py="xl">
                    <Text c="dimmed">{emptyMessage}</Text>
                  </Center>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      <PaginationFooter
        page={currentPage}
        totalPages={totalPages}
        totalItems={filteredData.length}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onChange={setPage}
        pageSize={pageSize}
        pageSizeOptions={pageSizeOptions}
        onPageSizeChange={(newPageSize) => {
          setPageSize(newPageSize);
          setPage(1);
        }}
      />
    </Stack>
  );
}
export default SearchableTable;
