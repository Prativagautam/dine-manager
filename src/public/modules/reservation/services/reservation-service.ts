import { apiClient } from '../../../shared/api/client';
import type { CreatedReservation, CustomerTable, ReservationValues } from '../types';

export const getCustomerTables = () => apiClient<CustomerTable[]>('/rms/v1/customer-tables');

export const createReservation = (values: ReservationValues) => apiClient<CreatedReservation>('/rms/v1/reservations', {
	method: 'POST',
	body: JSON.stringify(values),
});
