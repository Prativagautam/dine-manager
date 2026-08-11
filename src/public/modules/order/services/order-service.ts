import { apiClient } from '../../../shared/api/client';
import type { CreatedOrder, MenuItem } from '../types';

export const getMenuItems = () => apiClient<MenuItem[]>('/rms/v1/menu-items?per_page=100');

export const createCustomerOrder = (items: Array<{ menu_item_id: number; quantity: number }>) =>
	apiClient<CreatedOrder>('/rms/v1/orders', {
		method: 'POST',
		body: JSON.stringify({
			order_type: 'takeout',
			order_source: 'customer_portal',
			items,
		}),
	});
