export const formatCurrency = (value: number) => `$${Number(value || 0).toFixed(2)}`;

export const toPlainText = (html: string) => {
	const documentFragment = new DOMParser().parseFromString(html || '', 'text/html');
	return documentFragment.body.textContent || '';
};
