<?php // phpcs:ignore Class file names should be based on the class name with "class-" prepended.
// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers RMS custom roles and capabilities.
 *
 * Per PLAN.md §6 (flat create_/manage_ scheme, not edit_/edit_others_ —
 * see PLAN.md §6 for why). Run on plugin activation via add_role()/add_cap(),
 * and removed on deactivation — see PLAN.md §4.5 (Plugin Lifecycle).
 *
 * @package    Restaurant_Management_System
 * @subpackage Restaurant_Management_System/includes
 */
class Restaurant_Management_System_Roles {

	/**
	 * Gets an instance of this object.
	 *
	 * @static
	 * @access public
	 * @return object
	 * @since 1.0.0
	 */
	public static function get_instance() {
		static $instance = null;

		if ( null === $instance ) {
			$instance = new self();
		}

		return $instance;
	}

	/**
	 * Add the RMS custom roles (Customer, Staff) and grant capabilities
	 * to them plus the existing Administrator role.
	 *
	 * Call this on plugin activation (class-activator.php), NOT on
	 * every page load — add_role()/add_cap() write to the database.
	 *
	 * @since 1.0.0
	 */
	public function add_roles_and_capabilities() {

		/*
		 * Customer role.
		 * Base capability 'read' only — a real WP user account (per
		 * PLAN.md §4.4: authenticated WP users only, no anonymous
		 * booking), plus the two RMS-specific creation capabilities.
		 */
		add_role(
			'rms_customer',
			__( 'Customer', 'restaurant-management-system' ),
			array(
				'read'                    => true,
				'create_rms_orders'       => true,
				'create_rms_reservations' => true,
			)
		);

		/*
		 * Staff role.
		 * Base capability 'read' only — Staff don't need general
		 * wp-admin access, just the RMS operational capabilities.
		 */
		add_role(
			'rms_staff',
			__( 'Staff', 'restaurant-management-system' ),
			array(
				'read'                    => true,
				'access_rms_admin'        => true,
				'view_rms_menu_items'     => true, 
				'manage_rms_orders'       => true,
				'manage_rms_reservations' => true,
				'manage_rms_tables'       => true,

			)
		);

		/*
		 * Administrator gets every RMS capability on top of what it
		 * already has (manage_options is already native to this role).
		 * Admin is a superset of Staff's operational capabilities, plus
		 * menu control — per PLAN.md §6.
		 */
		$admin = get_role( 'administrator' );
		if ( $admin ) {
			$admin->add_cap( 'access_rms_admin' );
			$admin->add_cap( 'view_rms_menu_items' ); 
			$admin->add_cap( 'manage_rms_menu_items' );
			$admin->add_cap( 'manage_rms_orders' );
			$admin->add_cap( 'manage_rms_reservations' );
			$admin->add_cap( 'manage_rms_tables' );
		}
	}

	/**
	 * Remove RMS roles and capabilities.
	 *
	 * Call this on plugin deactivation (class-deactivator.php).
	 * Per PLAN.md §4.5, this is reversible cleanup — it does NOT delete
	 * any CPT content, only the role/capability grants.
	 *
	 * @since 1.0.0
	 */
	public function remove_roles_and_capabilities() {
		remove_role( 'rms_customer' );
		remove_role( 'rms_staff' );

		$admin = get_role( 'administrator' );
		if ( $admin ) {
			$admin->remove_cap( 'access_rms_admin' );
			$admin->add_cap( 'view_rms_menu_items' ); 
			$admin->remove_cap( 'manage_rms_menu_items' );
			$admin->remove_cap( 'manage_rms_orders' );
			$admin->remove_cap( 'manage_rms_reservations' );
			$admin->remove_cap( 'manage_rms_tables' );
		}
	}
}

if ( ! function_exists( 'restaurant_management_system_roles' ) ) {
	/**
	 * Return instance of Restaurant_Management_System_Roles class.
	 *
	 * @since 1.0.0
	 *
	 * @return Restaurant_Management_System_Roles
	 */
	function restaurant_management_system_roles() { // phpcs:ignore
		return Restaurant_Management_System_Roles::get_instance();
	}
}
