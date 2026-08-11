import { MantineProvider, Paper, Stack, Text } from '@mantine/core';
import '@mantine/core/styles.css';
import { theme } from '../shared/theme';
import { render, useState } from '@wordpress/element';
import './public.scss';
import OrderPortal from './modules/order/components/order-portal';
import ReservationPortal from './modules/reservation/components/reservation-portal';
import { portalConfig } from './shared/api/client';
import RegisterForm from './modules/auth/components/register-form';
import LoginForm from './modules/auth/components/login-form';
import ForgotPasswordForm from './modules/auth/components/forgot-password-form';
import ResetPasswordForm from './modules/auth/components/reset-password-form';

type PortalView = 'all' | 'order' | 'reservation';

const urlParams = new URLSearchParams(window.location.search);
const isResetFlow = urlParams.get('rms_action') === 'reset-password';
const resetLogin = urlParams.get('login') ?? '';
const resetKey = urlParams.get('key') ?? '';

const CustomerPortal = ({ view }: { view: PortalView }) => {
	const [authView, setAuthView] = useState<'register' | 'login' | 'forgot'>('register');

	return (
		<MantineProvider theme={theme}>
			<Paper className="rms-customer-portal" p="xl" radius="md" withBorder>
				{isResetFlow ? (
					<ResetPasswordForm login={resetLogin} resetKey={resetKey} />
				) : portalConfig.is_logged_in ? (
					<Stack gap="xl">
						{(view === 'all' || view === 'order') ? <OrderPortal /> : null}
						{(view === 'all' || view === 'reservation') ? <ReservationPortal /> : null}
					</Stack>
				) : (
					<Stack gap="md">
						{authView === 'register' && <RegisterForm />}
						{authView === 'login' && <LoginForm />}
						{authView === 'forgot' && <ForgotPasswordForm onBack={() => setAuthView('login')} />}

						{authView !== 'forgot' && (
							<Text size="sm">
								{authView === 'register'
									? <>Already have an account? <a onClick={() => setAuthView('login')} style={{ cursor: 'pointer' }}>Sign in</a></>
									: <>Need an account? <a onClick={() => setAuthView('register')} style={{ cursor: 'pointer' }}>Create one</a></>}
							</Text>
						)}
						{authView === 'login' && (
							<Text size="sm"><a onClick={() => setAuthView('forgot')} style={{ cursor: 'pointer' }}>Forgot password?</a></Text>
						)}
					</Stack>
				)}
			</Paper>
		</MantineProvider>
	);
};

document.querySelectorAll<HTMLElement>('[data-rms-portal]').forEach((container) => {
	const view = container.dataset.rmsPortal as PortalView;
	render(<CustomerPortal view={view === 'order' || view === 'reservation' ? view : 'all'} />, container);
});