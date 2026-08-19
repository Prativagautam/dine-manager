import { useEffect, useMemo, useState } from '@wordpress/element';
import { Alert, Badge, Center, Group, Image, Loader, Paper, Stack, Tabs, Text, Title } from '@mantine/core';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { theme } from '../../../../shared/theme';
import { formatCurrency } from '../../../shared/utils/format';
import { getMenuItems } from '../services/menu-service';
import type { MenuDisplayItem } from '../types';

const UNCATEGORIZED = 'uncategorized';

const MenuItemCard = ({ item }: { item: MenuDisplayItem }) => (
	<Paper withBorder radius="md" p="lg">
		<Group align="flex-start" gap="lg">
			{item.featured_image_url ? (
				<Image
					src={item.featured_image_url}
					alt={item.title}
					radius="md"
					style={{ width: 180, height: 120, objectFit: 'cover', flexShrink: 0 }}
				/>
			) : null}
			<Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
				<Group justify="space-between" align="baseline" wrap="nowrap" gap="md">
					<Text fw={700} size="lg">{item.title}</Text>
					<Text fw={700} size="lg" c="brand">{formatCurrency(item.price)}</Text>
				</Group>
				{item.description ? (
					<div
						className="rms-menu-item-description"
						dangerouslySetInnerHTML={{ __html: item.description }}
					/>
				) : null}
				{item.dietary_tag.length ? (
					<Group gap="xs">
						{item.dietary_tag.map((tag) => (
							<Badge key={tag} color="available" variant="light" size="sm" tt="capitalize">
								{tag}
							</Badge>
						))}
					</Group>
				) : null}
			</Stack>
		</Group>
	</Paper>
);

const MenuDisplay = () => {
	const [items, setItems] = useState<MenuDisplayItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState('all');

	useEffect(() => {
		let isMounted = true;

		getMenuItems()
			.then((data) => {
				if (!isMounted) return;
				setItems(data);
				setIsLoading(false);
			})
			.catch((requestError) => {
				if (!isMounted) return;
				setError(requestError instanceof Error ? requestError.message : 'Failed to load the menu.');
				setIsLoading(false);
			});

		return () => {
			isMounted = false;
		};
	}, []);

	const categories = useMemo(() => {
		const unique = new Set<string>();
		items.forEach((item) => item.menu_category.forEach((category) => unique.add(category)));
		return Array.from(unique).sort();
	}, [items]);

	const hasUncategorized = useMemo(
		() => items.some((item) => item.menu_category.length === 0),
		[items]
	);

	const groups = useMemo(() => {
		const visibleItems =
			activeTab === 'all'
				? items
				: activeTab === UNCATEGORIZED
					? items.filter((item) => item.menu_category.length === 0)
					: items.filter((item) => item.menu_category.includes(activeTab));

		const groupOrder =
			activeTab === 'all'
				? [...categories, ...(hasUncategorized ? [UNCATEGORIZED] : [])]
				: [activeTab];

		return groupOrder
			.map((category) => ({
				category,
				items:
					category === UNCATEGORIZED
						? visibleItems.filter((item) => item.menu_category.length === 0)
						: visibleItems.filter((item) => item.menu_category.includes(category)),
			}))
			.filter((group) => group.items.length > 0);
	}, [items, categories, hasUncategorized, activeTab]);

	return (
		<MantineProvider theme={theme}>
			<Paper className="rms-menu-display" p="xl" radius="md" withBorder>
				{isLoading ? (
					<Center h={200}>
						<Loader color="brand" />
					</Center>
				) : error ? (
					<Alert color="attention" title="Failed to load the menu">
						{error}
					</Alert>
				) : items.length === 0 ? (
					<Text c="dimmed" ta="center" py="xl">
						No menu items to display yet.
					</Text>
				) : (
					<Stack gap="lg">
						<Tabs
							value={activeTab}
							onChange={(value) => setActiveTab(value || 'all')}
							color="brand"
							variant="outline"
						>
							<Tabs.List>
								<Tabs.Tab value="all">All</Tabs.Tab>
								{categories.map((category) => (
									<Tabs.Tab key={category} value={category} tt="capitalize">
										{category}
									</Tabs.Tab>
								))}
								{hasUncategorized ? (
									<Tabs.Tab value={UNCATEGORIZED}>Uncategorized</Tabs.Tab>
								) : null}
							</Tabs.List>
						</Tabs>

						{groups.map((group) => (
							<Stack key={group.category} gap="md">
								<Title
									order={2}
									size="h3"
									fw={700}
									tt={group.category === UNCATEGORIZED ? undefined : 'capitalize'}
								>
									{group.category === UNCATEGORIZED ? 'Uncategorized' : group.category}
								</Title>
								<Stack gap="sm">
									{group.items.map((item) => (
										<MenuItemCard key={item.id} item={item} />
									))}
								</Stack>
							</Stack>
						))}
					</Stack>
				)}
			</Paper>
		</MantineProvider>
	);
};

export default MenuDisplay;
