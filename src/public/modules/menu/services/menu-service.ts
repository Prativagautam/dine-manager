import { apiClient } from '../../../shared/api/client';
import type { MenuDisplayItem } from '../types';

export const getMenuItems = () => apiClient<MenuDisplayItem[]>('/rms/v1/menu-items?per_page=100');
