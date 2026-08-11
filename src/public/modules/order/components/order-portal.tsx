import { Alert, Loader, Stack, Text, Title } from '@mantine/core';
import { useEffect, useMemo, useState } from '@wordpress/element';
import MenuList from './menu-list';
import Cart from './cart';
import { createCustomerOrder, getMenuItems } from '../services/order-service';
import type { CartItem, MenuItem } from '../types';

const OrderPortal = () => {
	const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
	const [cart, setCart] = useState<CartItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		getMenuItems().then(setMenuItems).catch((error: Error) => setMessage(error.message)).finally(() => setLoading(false));
	}, []);

	const cartItems = useMemo(() => cart, [cart]);
	const addToCart = (item: MenuItem) => setCart((current) => {
		const existing = current.find((cartItem) => cartItem.id === item.id);
		return existing ? current.map((cartItem) => cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem) : [...current, { ...item, quantity: 1 }];
	});
	const changeQuantity = (id: number, change: number) => setCart((current) => current.flatMap((item) => {
		if (item.id !== id) return [item];
		return item.quantity + change > 0 ? [{ ...item, quantity: item.quantity + change }] : [];
	}));
	const submitOrder = async () => {
		setSubmitting(true);
		setMessage(null);
		try {
			const order = await createCustomerOrder(cart.map(({ id, quantity }) => ({ menu_item_id: id, quantity })));
			setCart([]);
			setMessage(`Thanks! Your order #${order.id} has been placed.`);
		} catch (error) {
			setMessage((error as Error).message);
		} finally {
			setSubmitting(false);
		}
	};

	return <Stack gap="md"><div><Title order={2}>Place an order</Title><Text c="dimmed">Choose from our available menu and we’ll prepare your takeout order.</Text></div>{message ? <Alert color="blue">{message}</Alert> : null}{loading ? <Loader /> : <MenuList items={menuItems} onAdd={addToCart} />}<Cart items={cartItems} isSubmitting={submitting} onChangeQuantity={changeQuantity} onSubmit={submitOrder} /></Stack>;
};

export default OrderPortal;
