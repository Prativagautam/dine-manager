import { Alert, Button, Loader, PasswordInput, Stack, TextInput, Title } from '@mantine/core';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from '@wordpress/element';
import { loginCustomer } from '../services/auth-service';

const loginSchema = z.object({
	email: z.string().min(1, 'Enter your email'),
	password: z.string().min(1, 'Enter your password'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginForm = () => {
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
		resolver: zodResolver(loginSchema),
	});

	const onSubmit = async (values: LoginFormValues) => {
		setSubmitting(true);
		setError(null);
		try {
			await loginCustomer(values);
			// Same nonce gotcha as register — reload so PHP re-renders with a fresh nonce for this session.
			window.location.reload();
		} catch (err) {
			setError((err as Error).message);
			setSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
			<Stack gap="md">
				<Title order={3}>Sign in</Title>
				{error ? <Alert color="red">{error}</Alert> : null}
				<TextInput label="Email" {...register('email')} error={errors.email?.message} autoComplete='off' />
				<PasswordInput label="Password" {...register('password')} error={errors.password?.message} autoComplete='off' />
				<Button type="submit" disabled={submitting}>{submitting ? <Loader size="sm" /> : 'Sign in'}</Button>
			</Stack>
		</form>
	);
};

export default LoginForm;