export interface CustomerTable {
	id: number;
	title: string;
	capacity: number;
	section: string;
}

export interface ReservationValues {
	table_id: number;
	party_size: number;
	start_datetime: string;
	contact_name: string;
	contact_phone: string;
}

export interface CreatedReservation { id: number; }
