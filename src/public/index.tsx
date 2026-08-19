import { render } from '@wordpress/element';
import CustomerPortal from './modules/portal/components/customer-portal';
import MenuDisplay from './modules/menu/components/menu-display';
import type { PortalView } from './modules/portal/components/customer-portal';
import './public.scss';

document.querySelectorAll<HTMLElement>('[data-rms-portal]').forEach((container) => {
	const view = container.dataset.rmsPortal as PortalView;
	render(<CustomerPortal view={view === 'order' || view === 'reservation' ? view : 'all'} />, container);
});

document.querySelectorAll<HTMLElement>('.rms-menu-display').forEach((container) => {
	render(<MenuDisplay />, container);
});
