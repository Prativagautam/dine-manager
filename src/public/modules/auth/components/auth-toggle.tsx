import { Stack, Text } from '@mantine/core';
import { useEffect, useState } from '@wordpress/element';
import RegisterForm from './register-form';
import LoginForm from './login-form';
import ForgotPasswordForm from './forgot-password-form';

interface AuthToggleProps {
	onAuthPromptShown?: () => void;
}

const AuthToggle = ({ onAuthPromptShown }: AuthToggleProps) => {
	const [authView, setAuthView] = useState<'register' | 'login' | 'forgot'>('register');

	// Fire once when the auth forms are about to be shown, so callers can record
	// what the visitor was trying to do before they had to log in.
	useEffect(() => {
		onAuthPromptShown?.();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
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
	);
};

export default AuthToggle;
