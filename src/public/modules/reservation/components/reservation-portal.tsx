import { Alert, Button, Loader, NumberInput, Select, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core';
import { useEffect, useState } from '@wordpress/element';
import { createReservation, getCustomerTables } from '../services/reservation-service';
import type { CustomerTable } from '../types';

const ReservationPortal = () => {
	const [tables, setTables] = useState<CustomerTable[]>([]);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [tableId, setTableId] = useState<string | null>(null);
	const [partySize, setPartySize] = useState<number | string>(1);

	useEffect(() => { getCustomerTables().then(setTables).catch((error: Error) => setMessage(error.message)).finally(() => setLoading(false)); }, []);
	const submit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const selectedTable = tables.find((table) => table.id === Number(tableId));
		if (!selectedTable || Number(partySize) > selectedTable.capacity) { setMessage('Choose a table with enough seats for your party.'); return; }
		setSubmitting(true); setMessage(null);
		try {
			const reservation = await createReservation({ table_id: selectedTable.id, party_size: Number(partySize), start_datetime: new Date(String(form.get('start_datetime'))).toISOString(), contact_name: String(form.get('contact_name')), contact_phone: String(form.get('contact_phone')) });
			event.currentTarget.reset(); setTableId(null); setPartySize(1); setMessage(`Your reservation #${reservation.id} is confirmed.`);
		} catch (error) { setMessage((error as Error).message); } finally { setSubmitting(false); }
	};

	return <Stack gap="md"><div><Title order={2}>Make a reservation</Title><Text c="dimmed">Reserve a table for 90 minutes.</Text></div>{message ? <Alert color="blue">{message}</Alert> : null}{loading ? <Loader /> : <form onSubmit={submit}><Stack><SimpleGrid cols={{ base: 1, sm: 2 }}><Select label="Table" placeholder="Choose a table" required value={tableId} onChange={setTableId} data={tables.filter((table) => table.capacity > 0).map((table) => ({ value: String(table.id), label: `${table.title} — seats ${table.capacity}${table.section ? ` (${table.section})` : ''}` }))} /><NumberInput label="Party size" min={1} required value={partySize} onChange={setPartySize} /></SimpleGrid><TextInput label="Arrival date and time" name="start_datetime" type="datetime-local" required /><TextInput label="Your name" name="contact_name" autoComplete="name" required /><TextInput label="Phone number" name="contact_phone" type="tel" autoComplete="tel" required /><Button type="submit" loading={submitting}>Reserve table</Button></Stack></form>}</Stack>;
};

export default ReservationPortal;
