export interface MenuDisplayItem {
	id: number;
	title: string;
	description: string;
	price: number;
	prep_time_minutes: number;
	menu_category: string[];
	dietary_tag: string[];
	featured_image_url: string | null;
	is_available: boolean;
}
