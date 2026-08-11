export interface MenuItem {
	id: number;
	title: string;
	description: string;
	price: number;
	featured_image_url: string | null;
}

export interface CartItem extends MenuItem {
	quantity: number;
}

export interface CreatedOrder {
	id: number;
}
