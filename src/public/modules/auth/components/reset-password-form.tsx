import { Alert, Button, Loader, PasswordInput, Stack, Title } from '@mantine/core';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from '@wordpress/element';
import { resetPassword } from '../services/auth-service';

const schema = z.object({
	password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormValues = z.infer<typeof schema>;

const ResetPasswordForm = ({ login, resetKey }: { login: string; resetKey: string }) => {
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

	const onSubmit = async (values: FormValues) => {
		setSubmitting(true);
		setError(null);
		try {
			await resetPassword({ login, key: resetKey, password: values.password });
			window.location.reload();
		} catch (err) {
			setError((err as Error).message);
			setSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
			<Stack gap="md">
				<Title order={3}>Choose a new password</Title>
				{error ? <Alert color="red">{error}</Alert> : null}
				<PasswordInput label="New password" {...register('password')} error={errors.password?.message} autoComplete="new-password" />
				<Button type="submit" disabled={submitting}>{submitting ? <Loader size="sm" /> : 'Update password'}</Button>
			</Stack>
		</form>
	);
};

export default ResetPasswordForm;