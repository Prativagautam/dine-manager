import { apiClient } from '../../../shared/api/client';

export interface RegisteredCustomer {
	id: number;
	name: string;
	email: string;
}

export const registerCustomer = (data: { name: string; email: string; phone: string; password: string }) =>
	apiClient<RegisteredCustomer>('/rms/v1/customers/register', {
		method: 'POST',
		body: JSON.stringify(data),
	});

export const loginCustomer = (data: { email: string; password: string }) =>
	apiClient<RegisteredCustomer>('/rms/v1/customers/login', {
		method: 'POST',
		body: JSON.stringify(data),
	});

export const requestPasswordReset = (email: string) =>
	apiClient<{ message: string }>('/rms/v1/customers/forgot-password', {
		method: 'POST',
		body: JSON.stringify({ email }),
	});

export const resetPassword = (data: { login: string; key: string; password: string }) =>
	apiClient<{ message: string }>('/rms/v1/customers/reset-password', {
		method: 'POST',
		body: JSON.stringify(data),
	});