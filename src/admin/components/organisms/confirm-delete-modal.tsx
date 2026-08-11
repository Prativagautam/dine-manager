/* Library */
import { Alert, Button, Group, Modal, Stack, Text } from '@mantine/core';

interface ConfirmDeleteModalProps {
	opened: boolean;
	title: string;
	message: string;
	loading: boolean;
	error?: string | null;
	confirmLabel?: string;
	cancelLabel?: string;
	onCancel: () => void;
	onConfirm: () => void;
}

/**
 * Shared delete-confirmation dialog — replaces per-page ad-hoc patterns
 * (Menu had its own inline <Modal>, Tables used the native
 * window.confirm()). Both should use this instead, so every destructive
 * action in the app looks and behaves the same way.
 */
const ConfirmDeleteModal = ({
	opened,
	title,
	message,
	loading,
	error,
	confirmLabel = 'Delete',
	cancelLabel = 'Cancel',
	onCancel,
	onConfirm,
}: ConfirmDeleteModalProps) => {
	return (
		<Modal opened={opened} onClose={() => !loading && onCancel()} title={title}>
			<Stack gap="md">
				{error ? <Alert color="attention">{error}</Alert> : null}
				<Text>{message}</Text>
				<Group justify="flex-end" gap="sm">
					<Button variant="outline" onClick={onCancel} disabled={loading}>
						{cancelLabel}
					</Button>
					<Button color="attention" loading={loading} onClick={onConfirm}>
						{confirmLabel}
					</Button>
				</Group>
			</Stack>
		</Modal>
	);
};

export default ConfirmDeleteModal;