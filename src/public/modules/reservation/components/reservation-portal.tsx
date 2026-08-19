import { Alert, Button, Loader, NumberInput, Select, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from '@wordpress/element';
import { createReservation, getCustomerTables } from '../services/reservation-service';
import type { CustomerTable } from '../types';

const reservationSchema = z.object({
	table_id: z.string().min(1, 'Choose a table'),
	party_size: z.number().min(1, 'Party size must be at least 1'),
	start_datetime: z.string().min(1, 'Choose an arrival date and time'),
	contact_name: z.string().min(2, 'Enter your name'),
	contact_phone: z.string().min(7, 'Enter a valid phone number'),
});

type ReservationFormValues = z.infer<typeof reservationSchema>;

const ReservationPortal = () => {
	const [tables, setTables] = useState<CustomerTable[]>([]);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const { register, control, handleSubmit, reset, formState: { errors } } = useForm<ReservationFormValues>({
		resolver: zodResolver(reservationSchema),
		defaultValues: { table_id: '', party_size: 1, start_datetime: '', contact_name: '', contact_phone: '' },
	});

	useEffect(() => { getCustomerTables().then(setTables).catch((error: Error) => setMessage(error.message)).finally(() => setLoading(false)); }, []);

	const onSubmit = async (values: ReservationFormValues) => {
		const selectedTable = tables.find((table) => table.id === Number(values.table_id));
		if (!selectedTable || values.party_size > selectedTable.capacity) { setMessage('Choose a table with enough seats for your party.'); return; }
		setSubmitting(true); setMessage(null);
		try {
			const reservation = await createReservation({ table_id: selectedTable.id, party_size: values.party_size, start_datetime: new Date(values.start_datetime).toISOString(), contact_name: values.contact_name, contact_phone: values.contact_phone });
			reset(); setMessage(`Your reservation #${reservation.id} is confirmed.`);
		} catch (error) { setMessage((error as Error).message); } finally { setSubmitting(false); }
	};

	return <Stack gap="md"><div><Title order={2}>Make a reservation</Title><Text c="dimmed">Reserve a table for 90 minutes.</Text></div>{message ? <Alert color="blue">{message}</Alert> : null}{loading ? <Loader /> : <form onSubmit={handleSubmit(onSubmit)}><Stack><SimpleGrid cols={{ base: 1, sm: 2 }}><Controller name="table_id" control={control} render={({ field }) => (<Select label="Table" placeholder="Choose a table" required value={field.value} onChange={field.onChange} error={errors.table_id?.message} data={tables.filter((table) => table.capacity > 0).map((table) => ({ value: String(table.id), label: `${table.title} — seats ${table.capacity}${table.section ? ` (${table.section})` : ''}` }))} />)} /><Controller name="party_size" control={control} render={({ field }) => (<NumberInput label="Party size" min={1} required value={field.value} onChange={(value) => field.onChange(value ?? 1)} error={errors.party_size?.message} />)} /></SimpleGrid><TextInput label="Arrival date and time" type="datetime-local" required {...register('start_datetime')} error={errors.start_datetime?.message} /><TextInput label="Your name" autoComplete="name" required {...register('contact_name')} error={errors.contact_name?.message} /><TextInput label="Phone number" type="tel" autoComplete="tel" required {...register('contact_phone')} error={errors.contact_phone?.message} /><Button type="submit" loading={submitting}>Reserve table</Button></Stack></form>}</Stack>;
};

export default ReservationPortal;
