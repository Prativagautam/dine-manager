import { useEffect, useMemo } from '@wordpress/element';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
	Alert,
	Button,
	Divider,
	Group,
	Modal,
	NumberInput,
	Paper,
	Select,
	Stack,
	Text,
} from '@mantine/core';

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
}

const OrderBaseSchema = z.object({
	table_id: z
		.number({ invalid_type_error: 'Choose a table' })
		.int('Choose a valid table')
		.positive('Choose a table'),
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
		if (!tables.some((table) => table.id === values.table_id)) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['table_id'],
				message: 'Choose a table from the available list',
			});
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
	table_id: 0,
	items: [{ menu_item_id: 0, quantity: 1 }],
};

const formatCurrency = (amount: number) => `$${Number(amount || 0).toFixed(2)}`;

const OrderForm = ({ opened, tables, menuItems, loading, error, onClose, onSubmit }: OrderFormProps) => {
	const formSchema = useMemo(() => createOrderFormSchema(tables, menuItems), [menuItems, tables]);
	const {
		control,
		handleSubmit,
		reset,
		watch,
		formState: { errors },
	} = useForm<OrderFormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: initialFormValues,
		mode: 'onSubmit',
	});
	const { fields, append, remove } = useFieldArray({ control, name: 'items' });
	const selectedItems = watch('items');

	useEffect(() => {
		if (opened) {
			reset(initialFormValues);
		}
	}, [opened, reset]);

	const estimatedTotal = useMemo(
		() =>
			selectedItems.reduce((total, item) => {
				const menuItem = menuItems.find((candidate) => candidate.id === item.menu_item_id);
				return total + (menuItem ? menuItem.price * (item.quantity || 0) : 0);
			}, 0),
		[menuItems, selectedItems]
	);

	return (
		<Modal opened={opened} onClose={onClose} title="Create dine-in order" size="xl">
			<Stack gap="md">
				{error ? <Alert color="attention">{error}</Alert> : null}

				<Text size="sm" c="dimmed">
					The total below is an estimate. The server recalculates menu prices and checks availability before creating the order.
				</Text>

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

				<Divider label="Order items" labelPosition="left" />

				{fields.map((field, index) => {
					const selectedIdsInOtherRows = selectedItems
						.filter((_, itemIndex) => itemIndex !== index)
						.map((item) => item.menu_item_id);
					const menuOptions = menuItems
						.filter((menuItem) => !selectedIdsInOtherRows.includes(menuItem.id))
						.map((menuItem) => ({
							value: String(menuItem.id),
							label: `${menuItem.title} · ${formatCurrency(menuItem.price)}`,
						}));

					return (
						<Group key={field.id} align="flex-start" gap="sm" wrap="nowrap">
							<Controller
								name={`items.${index}.menu_item_id`}
								control={control}
								render={({ field: itemField }) => (
									<Select
										label={index === 0 ? 'Menu item' : undefined}
										placeholder={menuItems.length ? 'Choose an item' : 'No menu items available'}
										data={menuOptions}
										value={itemField.value ? String(itemField.value) : null}
										onChange={(value) => itemField.onChange(value ? Number(value) : 0)}
										disabled={!menuItems.length}
										error={errors.items?.[index]?.menu_item_id?.message}
										style={{ flex: 1 }}
									/>
								)}
							/>
							<Controller
								name={`items.${index}.quantity`}
								control={control}
								render={({ field: itemField }) => (
									<NumberInput
										label={index === 0 ? 'Qty.' : undefined}
										min={1}
										value={itemField.value}
										onChange={(value) => itemField.onChange(typeof value === 'number' ? value : 0)}
										error={errors.items?.[index]?.quantity?.message}
										w={90}
									/>
								)}
							/>
							<Button
								mt={index === 0 ? 24 : 0}
								variant="subtle"
								color="attention"
								onClick={() => remove(index)}
								disabled={fields.length === 1 || loading}
							>
								Remove
							</Button>
						</Group>
					);
				})}

				{errors.items?.message ? <Text c="attention" size="sm">{errors.items.message}</Text> : null}

				<Button
					variant="light"
					color="brand"
					onClick={() => append({ menu_item_id: 0, quantity: 1 })}
					disabled={loading || menuItems.length <= fields.length}
				>
					+ Add another item
				</Button>

				<Paper p="md" bg="brand.0" radius="md">
					<Group justify="space-between">
						<Text fw={700}>Estimated total</Text>
						<Text fw={700} size="xl">{formatCurrency(estimatedTotal)}</Text>
					</Group>
				</Paper>

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
