import { Button, Card, Group, Image, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { formatCurrency, toPlainText } from '../../../shared/utils/format';
import type { MenuItem } from '../types';

interface MenuListProps {
	items: MenuItem[];
	onAdd: (item: MenuItem) => void;
}

const MenuList = ({ items, onAdd }: MenuListProps) => (
	<SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
		{items.map((item) => (
			<Card key={item.id} withBorder radius="md" padding="md">
				<Stack justify="space-between" h="100%">
					<div>
						{item.featured_image_url ? <Image src={item.featured_image_url} alt="" h={140} fit="cover" radius="sm" mb="sm" /> : null}
						<Title order={3} size="h4">{item.title}</Title>
						{item.description ? <Text size="sm" c="dimmed" mt={4}>{toPlainText(item.description)}</Text> : null}
					</div>
					<Group justify="space-between">
						<Text fw={700}>{formatCurrency(item.price)}</Text>
						<Button size="xs" onClick={() => onAdd(item)}>Add</Button>
					</Group>
				</Stack>
			</Card>
		))}
	</SimpleGrid>
);

export default MenuList;
