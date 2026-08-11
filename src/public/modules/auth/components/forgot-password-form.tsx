import { Alert, Button, Loader, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from '@wordpress/element';
import { requestPasswordReset } from '../services/auth-service';

const schema = z.object({
	email: z.string().email('Enter a valid email'),
});

type FormValues = z.infer<typeof schema>;

const ForgotPasswordForm = ({ onBack }: { onBack: () => void }) => {
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

	const onSubmit = async (values: FormValues) => {
		setSubmitting(true);
		setError(null);
		try {
			const result = await requestPasswordReset(values.email);
			setMessage(result.message);
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
			<Stack gap="md">
				<Title order={3}>Reset your password</Title>
				{message ? <Alert color="blue">{message}</Alert> : null}
				{error ? <Alert color="red">{error}</Alert> : null}
				{!message && (
					<>
						<TextInput label="Email" {...register('email')} error={errors.email?.message} autoComplete="off" />
						<Button type="submit" disabled={submitting}>{submitting ? <Loader size="sm" /> : 'Send reset link'}</Button>
					</>
				)}
				<Text size="sm"><a onClick={onBack} style={{ cursor: 'pointer' }}>Back to sign in</a></Text>
			</Stack>
		</form>
	);
};

export default ForgotPasswordForm;