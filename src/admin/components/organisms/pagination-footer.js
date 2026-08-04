/* WordPress */
import { useMantineTheme } from '@mantine/core';

/* Library */
import { Group, Pagination, Text } from '@mantine/core';

const PaginationFooter = ({
	page,
	totalPages,
	totalItems,
	rangeStart,
	rangeEnd,
	onChange,
	color = 'brand',
	size = 'sm',
}) => {
	const theme = useMantineTheme();

	return (
		<Group justify="space-between" p="md" bg={theme.other.surfaceContainerLow}>
			<Text size="sm" c="dimmed">
				Showing {rangeStart}–{rangeEnd} of {totalItems} {totalItems === 1 ? 'item' : 'items'}
			</Text>
			<Pagination
				value={page}
				onChange={onChange}
				total={totalPages}
				color={color}
				size={size}
			/>
		</Group>
	);
};

export default PaginationFooter;
