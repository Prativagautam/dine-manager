import { Alert, Button, Loader, PasswordInput, Stack, TextInput, Title } from '@mantine/core';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from '@wordpress/element';
import { registerCustomer } from '../services/auth-service';

const registerSchema = z.object({
	name: z.string().min(2, 'Enter your full name'),
	email: z.string().email('Enter a valid email'),
	phone: z.string().min(10, 'Enter a valid phone number'),
	password: z.string().min(8, 'Password must be at least 8 characters'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const RegisterForm = () => {
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
		resolver: zodResolver(registerSchema),
	});

	const onSubmit = async (values: RegisterFormValues) => {
		setSubmitting(true);
		setError(null);
		try {
			await registerCustomer(values);
			// Nonce was generated for the logged-out state — reload so PHP re-renders
			// with a fresh nonce for the now-logged-in user.
			window.location.reload();
		} catch (err) {
			setError((err as Error).message);
			setSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} autoComplete='off'>
			<Stack gap="md">
				<Title order={3}>Create an account</Title>
				{error ? <Alert color="red">{error}</Alert> : null}
				<TextInput label="Full name" {...register('name')} error={errors.name?.message} />
				<TextInput label="Email" {...register('email')} error={errors.email?.message} />
				<TextInput label="Phone" {...register('phone')} error={errors.phone?.message} />
				<PasswordInput label="Password" {...register('password')} error={errors.password?.message} autoComplete="new-password"  />
				<Button type="submit" disabled={submitting}>{submitting ? <Loader size="sm" /> : 'Create account'}</Button>
			</Stack>
		</form>
	);
};

export default RegisterForm;