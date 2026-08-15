/* WordPress */
import { useMantineTheme } from '@mantine/core';

/* Library */
import { Group, Pagination, Select, Text } from '@mantine/core';

interface PaginationFooterProps {
	page: number;
	totalPages: number;
	totalItems: number;
	rangeStart: number;
	rangeEnd: number;
	onChange: ( page: number ) => void;
	color?: string;
	size?: string;
	/**
	 * Optional page-size control. Omit all three pageSize* props to keep
	 * PaginationFooter exactly as it behaved before — existing callers
	 * that don't pass them are unaffected.
	 */
	pageSize?: number;
	pageSizeOptions?: number[];
	onPageSizeChange?: ( pageSize: number ) => void;
}

const PaginationFooter = ( {
	page,
	totalPages,
	totalItems,
	rangeStart,
	rangeEnd,
	onChange,
	color = 'brand',
	size = 'sm',
	pageSize,
	pageSizeOptions,
	onPageSizeChange,
}: PaginationFooterProps ) => {
	const theme = useMantineTheme();
	const showPageSizeControl = Boolean( pageSize && pageSizeOptions && onPageSizeChange );

	return (
		<Group justify="space-between" p="md" bg={theme.other.surfaceContainerLow} wrap="wrap" gap="md">
			<Group gap="md" wrap="wrap">
				<Text size="sm" c="dimmed">
					Showing {rangeStart}–{rangeEnd} of {totalItems} {totalItems === 1 ? 'item' : 'items'}
				</Text>

				{showPageSizeControl ? (
					<Select
						size="xs"
						w={110}
						value={String( pageSize )}
						data={( pageSizeOptions as number[] ).map( ( option ) => ( {
							value: String( option ),
							label: `${ option } / page`,
						} ) )}
						onChange={( value ) => {
							if ( value ) {
								( onPageSizeChange as ( pageSize: number ) => void )( Number( value ) );
							}
						}}
						allowDeselect={false}
					/>
				) : null}
			</Group>

			<Pagination value={page} onChange={onChange} total={totalPages} color={color} size={size} />
		</Group>
	);
};

export default PaginationFooter;