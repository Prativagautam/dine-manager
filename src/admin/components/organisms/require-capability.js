/* WordPress */
import { __ } from '@wordpress/i18n';

/* Library */
import { NavLink as RouterNavLink } from 'react-router-dom';
import { Alert, Button, Center, Stack } from '@mantine/core';

/**
 * Route-level capability guard. Wraps a page element and only renders it
 * if the current user's localized capabilities include the required one;
 * otherwise shows a friendly "restricted" message with a way back to the
 * Dashboard, instead of rendering a page full of controls that would
 * only 403 on every action.
 *
 * NOT a security boundary — the real enforcement for every one of these
 * pages is each REST controller's permission_callback. This exists
 * purely so a user who reaches a URL they don't have access to (typed
 * directly, bookmarked, browser back/forward) sees something sensible,
 * mirroring what sidebar.js already hides from navigation.
 */
const RequireCapability = ( { capability, children } ) => {
	const { capabilities = {} } = RestaurantManagementSystemLocalize;
	if ( ! capability || capabilities[ capability ] ) {
		return children;
	}
	return (
		<Center h={400}>
			<Stack align="center" gap="md" maw={420}>
				<Alert color="attention" title={__( 'Access restricted', 'restaurant-management-system' )} w="100%">
					{__( "You don't have permission to view this page.", 'restaurant-management-system' )}
				</Alert>
				<Button component={RouterNavLink} to="/" color="brand">
					{__( 'Back to Dashboard', 'restaurant-management-system' )}
				</Button>
			</Stack>
		</Center>
	);
};

export default RequireCapability;