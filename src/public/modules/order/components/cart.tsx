import { ActionIcon, Button, Divider, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { formatCurrency } from '../../../shared/utils/format';
import type { CartItem } from '../types';

interface CartProps {
	items: CartItem[];
	isSubmitting: boolean;
	onChangeQuantity: (id: number, change: number) => void;
	onSubmit: () => void;
}

const Cart = ({ items, isSubmitting, onChangeQuantity, onSubmit }: CartProps) => {
	const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

	return (
		<Paper withBorder radius="md" p="md" mt="md">
			<Stack gap="sm">
				<Title order={3} size="h4">Your order</Title>
				{items.length ? items.map((item) => (
					<Group key={item.id} justify="space-between" align="center" wrap="nowrap">
						<Text size="sm">{item.title}</Text>
						<Group gap={4} wrap="nowrap">
							<ActionIcon variant="light" size="sm" onClick={() => onChangeQuantity(item.id, -1)} aria-label={`Remove one ${item.title}`}>−</ActionIcon>
							<Text size="sm" w={18} ta="center">{item.quantity}</Text>
							<ActionIcon variant="light" size="sm" onClick={() => onChangeQuantity(item.id, 1)} aria-label={`Add one ${item.title}`}>+</ActionIcon>
							<Text size="sm" w={65} ta="right">{formatCurrency(item.price * item.quantity)}</Text>
						</Group>
					</Group>
				)) : <Text c="dimmed">Your cart is empty.</Text>}
				<Divider />
				<Group justify="space-between"><Text fw={700}>Total</Text><Text fw={700}>{formatCurrency(total)}</Text></Group>
				<Button loading={isSubmitting} disabled={!items.length} onClick={onSubmit}>Place order</Button>
			</Stack>
		</Paper>
	);
};

export default Cart;
