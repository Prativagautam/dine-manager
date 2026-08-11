import { useMemo, useState } from '@wordpress/element';
import {
	Badge,
	Card,
	Chip,
	Group,
	Image,
	ScrollArea,
	SimpleGrid,
	Stack,
	Text,
	TextInput,
} from '@mantine/core';
import { OrderMenuItem } from './create';

interface MenuItemPickerProps {
	menuItems: OrderMenuItem[];
	cartQuantities: Record<number, number>;
	onSelect: (menuItem: OrderMenuItem) => void;
	disabled?: boolean;
}

const formatCurrency = (amount: number) => `$${Number(amount || 0).toFixed(2)}`;

const MenuItemPicker = ({ menuItems, cartQuantities, onSelect, disabled }: MenuItemPickerProps) => {
	const [search, setSearch] = useState('');
	const [activeCategory, setActiveCategory] = useState<string | null>(null);

	const categories = useMemo(() => {
		const unique = new Set<string>();
		menuItems.forEach((item) => item.menu_category.forEach((category) => unique.add(category)));
		return Array.from(unique).sort();
	}, [menuItems]);

	const filteredItems = useMemo(() => {
		const query = search.trim().toLowerCase();
		return menuItems.filter((item) => {
			const matchesCategory = !activeCategory || item.menu_category.includes(activeCategory);
			const matchesSearch = !query || item.title.toLowerCase().includes(query);
			return matchesCategory && matchesSearch;
		});
	}, [menuItems, search, activeCategory]);

	return (
		<Stack gap="sm">
			<TextInput
				placeholder="Search menu items"
				value={search}
				onChange={(event) => setSearch(event.currentTarget.value)}
				disabled={disabled}
			/>

			{categories.length ? (
				<Chip.Group
					value={activeCategory ?? ''}
					onChange={(value) => setActiveCategory(value === '' ? null : (value as string))}
				>
					<Group gap="xs">
						<Chip value="" variant="light">All</Chip>
						{categories.map((category) => (
							<Chip key={category} value={category} variant="light">
								{category}
							</Chip>
						))}
					</Group>
				</Chip.Group>
			) : null}

			<ScrollArea h={380} type="auto">
				<SimpleGrid cols={3} spacing="sm">
					{filteredItems.map((item) => {
						const quantityInCart = cartQuantities[item.id] || 0;
						const isUnavailable = item.is_available === false;
						const isDisabled = disabled || isUnavailable;

						return (
							<Card
								key={item.id}
								padding="sm"
								radius="md"
								withBorder
								style={{
									cursor: isDisabled ? 'not-allowed' : 'pointer',
									opacity: isDisabled ? 0.6 : 1,
									position: 'relative',
								}}
								onClick={() => !isDisabled && onSelect(item)}
							>
								{isUnavailable ? (
									<Badge
										color="gray"
										variant="filled"
										size="sm"
										style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
									>
										Unavailable
									</Badge>
								) : quantityInCart ? (
									<Badge
										color="brand"
										variant="filled"
										circle
										style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
									>
										{quantityInCart}
									</Badge>
								) : null}

								<Card.Section>
									<Image
										src={item.image_url || undefined}
										height={90}
										fallbackSrc="https://placehold.co/300x200?text=No+image"
										alt={item.title}
									/>
								</Card.Section>

								<Stack gap={4} mt="xs">
									<Text fw={600} size="sm" lineClamp={1}>{item.title}</Text>

									{item.dietary_tag.length ? (
										<Group gap={4}>
											{item.dietary_tag.slice(0, 2).map((tag) => (
												<Badge key={tag} size="xs" variant="light" color="available">
													{tag}
												</Badge>
											))}
										</Group>
									) : null}

									<Group justify="space-between">
										<Text size="xs" c="dimmed">{item.prep_time_minutes} min</Text>
										<Text fw={700} size="sm">{formatCurrency(item.price)}</Text>
									</Group>
								</Stack>
							</Card>
						);
					})}
				</SimpleGrid>

				{!filteredItems.length ? (
					<Text c="dimmed" size="sm" ta="center" py="xl">
						No menu items match your search.
					</Text>
				) : null}
			</ScrollArea>
		</Stack>
	);
};

export default MenuItemPicker;