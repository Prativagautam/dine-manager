import { useEffect, useMemo } from '@wordpress/element';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
	Alert,
	Button,
	Group,
	Modal,
	NumberInput,
	Select,
	Stack,
	Text,
	TextInput,
} from '@mantine/core';

const PHONE_NUMBER_PATTERN = /^\+?[0-9][0-9\s().-]*$/;
const GUEST_NAME_PATTERN = /^[\p{L}\p{M}]+(?:[\s.'’-][\p{L}\p{M}]+)*$/u;

const ReservationBaseSchema = z.object({
	table_id: z
		.number({ invalid_type_error: 'Choose a table' })
		.int('Choose a valid table')
		.positive('Choose a table'),
	party_size: z
		.number({ invalid_type_error: 'Party size is required' })
		.int('Party size must be a whole number')
		.positive('Party size must be at least one'),
	start_datetime: z
		.string()
		.min(1, 'Arrival date and time is required')
		.refine((value) => !Number.isNaN(new Date(value).getTime()), 'Enter a valid arrival date and time'),
	contact_name: z
		.string()
		.trim()
		.min(1, 'Guest name is required')
		.max(100, 'Guest name must be 100 characters or fewer')
		.regex(GUEST_NAME_PATTERN, 'Guest name may contain letters, spaces, apostrophes, periods, and hyphens only'),
	contact_phone: z
		.string()
		.trim()
		.min(7, 'Contact phone must contain at least 7 characters')
		.max(25, 'Contact phone must contain 25 characters or fewer')
		.regex(PHONE_NUMBER_PATTERN, 'Enter a valid phone number')
		.refine(
			(value) => {
				const digitCount = value.replace(/\D/g, '').length;
				return digitCount >= 7 && digitCount <= 15;
			},
			'Contact phone must contain between 7 and 15 digits'
		),
	customer_id: z
		.number()
		.int('Customer ID must be a whole number')
		.positive('Customer ID must be greater than zero')
		.optional(),
});

export type ReservationFormValues = z.infer<typeof ReservationBaseSchema>;

export interface ReservationTableOption {
	id: number;
	title: string;
	capacity: number;
	section?: string;
}

const createReservationFormSchema = (tables: ReservationTableOption[]) =>
	ReservationBaseSchema.superRefine((values, context) => {
		const selectedTable = tables.find((table) => table.id === values.table_id);

		if (!selectedTable) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['table_id'],
				message: 'Choose a table from the available list',
			});
			return;
		}

		if (values.party_size > selectedTable.capacity) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['party_size'],
				message: `Party size exceeds ${selectedTable.title}'s capacity of ${selectedTable.capacity}`,
			});
		}
	});

interface ReservationFormProps {
	opened: boolean;
	defaultValues: ReservationFormValues;
	tables: ReservationTableOption[];
	tableError: string | null;
	loading: boolean;
	error: string | null;
	onClose: () => void;
	onSubmit: (values: ReservationFormValues) => void | Promise<void>;
}

const ReservationForm = ({
	opened,
	defaultValues,
	tables,
	tableError,
	loading,
	error,
	onClose,
	onSubmit,
}: ReservationFormProps) => {
	const formSchema = useMemo(() => createReservationFormSchema(tables), [tables]);
	const {
		control,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<ReservationFormValues>({
		resolver: zodResolver(formSchema),
		defaultValues,
		mode: 'onSubmit',
	});

	useEffect(() => {
		if (opened) {
			reset(defaultValues);
		}
	}, [defaultValues, opened, reset]);

	return (
		<Modal opened={opened} onClose={onClose} title="Add reservation" size="lg">
			<Stack gap="md">
				{error ? <Alert color="attention">{error}</Alert> : null}
				{tableError ? <Alert color="attention" title="Unable to load tables">{tableError}</Alert> : null}

				<Text size="sm" c="dimmed">
					Reservations reserve a table for 90 minutes. Arrival time is converted from this browser’s local time to UTC before it is sent to the API.
				</Text>

				<Group grow align="flex-start">
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
					<Controller
						name="party_size"
						control={control}
						render={({ field }) => (
							<NumberInput
								label="Party size"
								min={1}
								value={field.value}
								onChange={(value) => field.onChange(typeof value === 'number' ? value : 0)}
								error={errors.party_size?.message}
							/>
						)}
					/>
				</Group>

				<Controller
					name="start_datetime"
					control={control}
					render={({ field }) => (
						<TextInput
							label="Arrival date and time"
							type="datetime-local"
							{...field}
							error={errors.start_datetime?.message}
						/>
					)}
				/>

				<Controller
					name="contact_name"
					control={control}
					render={({ field }) => (
						<TextInput
							label="Guest name"
							placeholder="Enter the guest's name"
							{...field}
							error={errors.contact_name?.message}
						/>
					)}
				/>

				<Controller
					name="contact_phone"
					control={control}
					render={({ field }) => (
						<TextInput
							label="Contact phone"
							placeholder="Enter a contact number"
							type="tel"
							{...field}
							error={errors.contact_phone?.message}
						/>
					)}
				/>

				<Controller
					name="customer_id"
					control={control}
					render={({ field }) => (
						<NumberInput
							label="Customer user ID (optional)"
							description="For staff-created bookings. Leave blank to use the current user."
							min={1}
							value={field.value}
							onChange={(value) => field.onChange(typeof value === 'number' ? value : undefined)}
							error={errors.customer_id?.message}
						/>
					)}
				/>

				<Group justify="flex-end" gap="sm" mt="xs">
					<Button variant="outline" onClick={onClose} disabled={loading}>
						Cancel
					</Button>
					<Button color="brand" loading={loading} onClick={handleSubmit(onSubmit)}>
						Create reservation
					</Button>
				</Group>
			</Stack>
		</Modal>
	);
};

export default ReservationForm;
