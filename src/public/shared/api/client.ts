declare const RestaurantManagementSystemLocalize: {
	rest_url: string;
	nonce: string;
	is_logged_in: boolean;
	login_url: string;
};

export const portalConfig = RestaurantManagementSystemLocalize;

export async function apiClient<T>(path: string, options: RequestInit = {}): Promise<T> {
	const response = await fetch(`${portalConfig.rest_url.replace(/\/$/, '')}${path}`, {
		credentials: 'same-origin',
		headers: {
			'Content-Type': 'application/json',
			'X-WP-Nonce': portalConfig.nonce,
			...options.headers,
		},
		...options,
	});
	const data = await response.json().catch(() => ({}));

	if (!response.ok) {
		throw new Error(data.message || 'Something went wrong. Please try again.');
	}

	return data as T;
}
