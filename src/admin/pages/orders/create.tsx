import { useEffect, useMemo } from '@wordpress/element';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
	ActionIcon,
	Alert,
	Button,
	Divider,
	Group,
	Modal,
	Paper,
	SegmentedControl,
	Select,
	Stack,
	Text,
} from '@mantine/core';
import MenuItemPicker from './menu-item-picker';

export interface OrderTableOption {
	id: number;
	title: string;
	capacity: number;
	section?: string;
}

export interface OrderMenuItem {
	id: number;
	title: string;
	price: number;
	menu_category: string[];
	dietary_tag: string[];
	prep_time_minutes: number;
	image_url: string | null;
	is_available: boolean;
}

const OrderBaseSchema = z.object({
	order_type: z.enum(['dine_in', 'takeout']),
	table_id: z.number().int('Choose a valid table').min(0),
	items: z
		.array(
			z.object({
				menu_item_id: z
					.number({ invalid_type_error: 'Choose a menu item' })
					.int('Choose a valid menu item')
					.positive('Choose a menu item'),
				quantity: z
					.number({ invalid_type_error: 'Quantity is required' })
					.int('Quantity must be a whole number')
					.positive('Quantity must be at least one'),
			})
		)
		.min(1, 'Add at least one menu item'),
});

export type OrderFormValues = z.infer<typeof OrderBaseSchema>;

const createOrderFormSchema = (tables: OrderTableOption[], menuItems: OrderMenuItem[]) =>
	OrderBaseSchema.superRefine((values, context) => {
		// Table is only required (and only validated against the live table
		// list) for dine-in orders. Takeaway orders carry table_id = 0 and
		// skip this entirely — that's what lets staff choose either flow.
		if ('dine_in' === values.order_type) {
			if (!values.table_id) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['table_id'],
					message: 'Choose a table',
				});
			} else if (!tables.some((table) => table.id === values.table_id)) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['table_id'],
					message: 'Choose a table from the available list',
				});
			}
		}

		const selectedMenuItemIds = new Set<number>();
		values.items.forEach((item, index) => {
			if (!menuItems.some((menuItem) => menuItem.id === item.menu_item_id)) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['items', index, 'menu_item_id'],
					message: 'Choose an available menu item',
				});
			}

			if (selectedMenuItemIds.has(item.menu_item_id)) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['items', index, 'menu_item_id'],
					message: 'Each menu item can be added once; adjust its quantity instead',
				});
			}

			selectedMenuItemIds.add(item.menu_item_id);
		});
	});

interface OrderFormProps {
	opened: boolean;
	tables: OrderTableOption[];
	menuItems: OrderMenuItem[];
	loading: boolean;
	error: string | null;
	onClose: () => void;
	onSubmit: (values: OrderFormValues) => void | Promise<void>;
}

const initialFormValues: OrderFormValues = {
	order_type: 'dine_in',
	table_id: 0,
	items: [],
};

const formatCurrency = (amount: number) => `$${Number(amount || 0).toFixed(2)}`;

const OrderForm = ({ opened, tables, menuItems, loading, error, onClose, onSubmit }: OrderFormProps) => {
	const formSchema = useMemo(() => createOrderFormSchema(tables, menuItems), [menuItems, tables]);
	const {
		control,
		handleSubmit,
		reset,
		watch,
		setValue,
		formState: { errors },
	} = useForm<OrderFormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: initialFormValues,
		mode: 'onSubmit',
	});
	const { fields, append, remove } = useFieldArray({ control, name: 'items' });
	const selectedItems = watch('items');
	const orderType = watch('order_type');

	useEffect(() => {
		if (opened) {
			reset(initialFormValues);
		}
	}, [opened, reset]);

	// Switching to takeaway clears any chosen table so a stale table_id from
	// a previous dine-in selection can never sneak into a takeaway payload.
	useEffect(() => {
		if (orderType === 'takeout') {
			setValue('table_id', 0, { shouldValidate: true });
		}
	}, [orderType, setValue]);

	const cartQuantities = useMemo(() => {
		const map: Record<number, number> = {};
		selectedItems.forEach((item) => {
			if (item.menu_item_id) {
				map[item.menu_item_id] = (map[item.menu_item_id] || 0) + item.quantity;
			}
		});
		return map;
	}, [selectedItems]);

	const estimatedTotal = useMemo(
		() =>
			selectedItems.reduce((total, item) => {
				const menuItem = menuItems.find((candidate) => candidate.id === item.menu_item_id);
				return total + (menuItem ? menuItem.price * (item.quantity || 0) : 0);
			}, 0),
		[menuItems, selectedItems]
	);

	const handleSelectMenuItem = (menuItem: OrderMenuItem) => {
		const existingIndex = fields.findIndex(
			(_, index) => selectedItems[index]?.menu_item_id === menuItem.id
		);

		if (existingIndex >= 0) {
			const currentQuantity = selectedItems[existingIndex]?.quantity || 0;
			setValue(`items.${existingIndex}.quantity`, currentQuantity + 1, { shouldValidate: true });
		} else {
			append({ menu_item_id: menuItem.id, quantity: 1 });
		}
	};

	const decrementItem = (index: number) => {
		const currentQuantity = selectedItems[index]?.quantity || 1;
		if (currentQuantity <= 1) {
			remove(index);
		} else {
			setValue(`items.${index}.quantity`, currentQuantity - 1, { shouldValidate: true });
		}
	};

	const incrementItem = (index: number) => {
		const currentQuantity = selectedItems[index]?.quantity || 0;
		setValue(`items.${index}.quantity`, currentQuantity + 1, { shouldValidate: true });
	};

	return (
		<Modal
			opened={opened}
			onClose={onClose}
			title={orderType === 'dine_in' ? 'Create dine-in order' : 'Create takeaway order'}
			size={1100}
		>
			<Stack gap="md">
				{error ? <Alert color="attention">{error}</Alert> : null}

				<Text size="sm" c="dimmed">
					The total below is an estimate. The server recalculates menu prices and checks availability before creating the order.
				</Text>

				<Controller
					name="order_type"
					control={control}
					render={({ field }) => (
						<SegmentedControl
							value={field.value}
							onChange={field.onChange}
							data={[
								{ label: 'Dine-in', value: 'dine_in' },
								{ label: 'Takeaway', value: 'takeout' },
							]}
							disabled={loading}
							fullWidth
						/>
					)}
				/>

				{orderType === 'dine_in' ? (
					<Controller
						name="table_id"
						control={control}
						render={({ field }) => (
							<Select
								label="Table"
								placeholder={tables.length ? 'Choose a table' : 'No tables available'}
								data={tables.map((table) => ({
									value: String(table.id),
									label: `${table.title} · seats ${table.capacity}${table.section ? ` · ${table.section}` : ''}`,
								}))}
								value={field.value ? String(field.value) : null}
								onChange={(value) => field.onChange(value ? Number(value) : 0)}
								disabled={!tables.length}
								error={errors.table_id?.message}
							/>
						)}
					/>
				) : null}

				<Divider label="Menu" labelPosition="left" />

				<Group align="flex-start" gap="md" wrap="nowrap">
					<div style={{ flex: 2, minWidth: 0 }}>
						<MenuItemPicker
							menuItems={menuItems}
							cartQuantities={cartQuantities}
							onSelect={handleSelectMenuItem}
							disabled={loading}
						/>
					</div>

					<Stack gap="sm" style={{ flex: 1, minWidth: 280 }}>
						<Text fw={700} size="sm">Order summary</Text>

						{fields.length ? (
							fields.map((field, index) => {
								const menuItem = menuItems.find(
									(candidate) => candidate.id === selectedItems[index]?.menu_item_id
								);
								if (!menuItem) {
									return null;
								}

								return (
									<Paper key={field.id} p="xs" withBorder radius="sm">
										<Stack gap={4}>
											<Text size="sm" fw={600} lineClamp={1}>{menuItem.title}</Text>
											<Group justify="space-between" wrap="nowrap">
												<Group gap={4} wrap="nowrap">
													<ActionIcon
														variant="light"
														size="sm"
														onClick={() => decrementItem(index)}
														disabled={loading}
													>
														−
													</ActionIcon>
													<Text size="sm" w={24} ta="center">
														{selectedItems[index]?.quantity}
													</Text>
													<ActionIcon
														variant="light"
														size="sm"
														onClick={() => incrementItem(index)}
														disabled={loading}
													>
														+
													</ActionIcon>
												</Group>
												<Text size="sm" fw={700}>
													{formatCurrency(menuItem.price * (selectedItems[index]?.quantity || 0))}
												</Text>
												<ActionIcon
													color="attention"
													variant="subtle"
													size="sm"
													onClick={() => remove(index)}
													disabled={loading}
												>
													✕
												</ActionIcon>
											</Group>
										</Stack>
									</Paper>
								);
							})
						) : (
							<Text size="sm" c="dimmed">
								Cart is empty — click a menu item to add it.
							</Text>
						)}

						{errors.items?.message ? (
							<Text c="attention" size="sm">{errors.items.message}</Text>
						) : null}

						<Paper p="md" bg="brand.0" radius="md">
							<Group justify="space-between">
								<Text fw={700}>Estimated total</Text>
								<Text fw={700} size="xl">{formatCurrency(estimatedTotal)}</Text>
							</Group>
						</Paper>
					</Stack>
				</Group>

				<Group justify="flex-end" gap="sm">
					<Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
					<Button color="brand" loading={loading} onClick={handleSubmit(onSubmit)}>
						Create order
					</Button>
				</Group>
			</Stack>
		</Modal>
	);
};

export default OrderForm;