/* WordPress */
import { useState, useEffect, useMemo } from '@wordpress/element';

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
	useMantineTheme,
} from '@mantine/core';

/* Local */
import PageWrapper from '../../components/organisms/page-wrapper';
import PaginationFooter from '../../components/organisms/pagination-footer';

const ITEMS_PER_PAGE = 10;

/**
 * Menu Management page.
 *
 * Fetches from the custom /rms/v1/menu-items REST controller (Milestone A
 * backend). Matches DESIGN.md's token set and the Stitch "Menu Management"
 * screen's layout: filter tabs, image thumbnails, availability toggle,
 * page header with an Add button (non-functional placeholder — create/edit
 * isn't built yet), and pagination (real, wired to the REST controller's
 * existing page/per_page params — this was already supported server-side,
 * just never used from the frontend until now).
 *
 * Background/text color come from <PageWrapper> (shared, DESIGN.md
 * defaults) — this file only sets colors where it genuinely differs from
 * that default, always via theme.other, never a hardcoded hex.
 *
 * Note on filtering + pagination together: switching category tabs
 * currently filters client-side against only the CURRENT page's fetched
 * items, not the full dataset — fine at small scale (a few dozen items),
 * but once real usage grows, category filtering should move server-side
 * too (pass menu_category to the fetch, reset to page 1) rather than
 * filtering only what happens to be on the page already loaded.
 */
const MenuManagement = () => {
	const theme = useMantineTheme();
	const [items, setItems] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [activeCategory, setActiveCategory] = useState('all');
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalItems, setTotalItems] = useState(0);

	useEffect(() => {
		const { rest_url: restUrl, nonce } = RestaurantManagementSystemLocalize;

		setIsLoading(true);

		fetch(
			`${restUrl}rms/v1/menu-items?page=${page}&per_page=${ITEMS_PER_PAGE}`,
			{
				headers: {
					'X-WP-Nonce': nonce,
				},
			}
		)
			.then((response) => {
				if (!response.ok) {
					throw new Error(`Request failed: ${response.status}`);
				}
				setTotalPages(
					parseInt(response.headers.get('X-WP-TotalPages') || '1', 10)
				);
				setTotalItems(
					parseInt(response.headers.get('X-WP-Total') || '0', 10)
				);
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

	/* Derive the set of categories actually present, for the filter tabs */
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
				<Alert color="attention" title="Failed to load menu items">
					{error}
				</Alert>
			</PageWrapper>
		);
	}

	return (
		<PageWrapper>
			<Stack gap="lg" maw={1440} mx="auto">
				{/* Page header */}
				<Group justify="space-between" align="flex-end">
					<div>
						<Title order={1} ff="'Source Serif 4', serif">
							Menu Management
						</Title>
						<Text c="dimmed" size="lg" mt={4}>
							Configure and monitor your restaurant's digital menu items.
						</Text>
					</div>
					<Button color="brand" radius="lg">
						+ Add Menu Item
					</Button>
				</Group>

				{/* Filter tabs */}
				<Tabs
					value={activeCategory}
					onChange={setActiveCategory}
					color="brand"
					variant="outline"
				>
					<Tabs.List>
						<Tabs.Tab value="all">All Items</Tabs.Tab>
						{categories.map((cat) => (
							<Tabs.Tab key={cat} value={cat} tt="capitalize">
								{cat}
							</Tabs.Tab>
						))}
					</Tabs.List>
				</Tabs>

				{/* Menu items table */}
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
							</Table.Tr>
						</Table.Thead>
						<Table.Tbody>
							{filteredItems.map((item) => (
								<Table.Tr key={item.id}>
									<Table.Td>
										<Avatar
											src={item.featured_image_url}
											radius="md"
											size={56}
										>
											{item.title.charAt(0)}
										</Avatar>
									</Table.Td>
									<Table.Td>
										<Text fw={700}>{item.title}</Text>
									</Table.Td>
									<Table.Td>
										<Group gap="xs">
											{item.menu_category.map((cat) => (
												<Badge
													key={cat}
													color="brand"
													variant="light"
													tt="capitalize"
												>
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
												<Badge
													key={tag}
													color="available"
													variant="outline"
													size="sm"
													tt="capitalize"
												>
													{tag}
												</Badge>
											))}
										</Group>
									</Table.Td>
									<Table.Td>
										<Switch
											checked={true /* meta write-back not built yet */}
											readOnly
											color="brand"
											label="Available"
										/>
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
		</PageWrapper>
	);
};

export default MenuManagement;