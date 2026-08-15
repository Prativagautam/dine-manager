<?php // phpcs:ignore Class file names should be based on the class name with "class-" prepended.
// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Fired during plugin deactivation
 *
 * @link       https://www.acmeit.org/
 * @since      1.0.0
 *
 * @package    Restaurant_Management_System
 * @subpackage Restaurant_Management_System/includes
 */

/**
 * Fired during plugin deactivation.
 *
 * This class defines all code necessary to run during the plugin's deactivation.
 *
 * @since      1.0.0
 * @package    Restaurant_Management_System
 * @subpackage Restaurant_Management_System/includes
 * @author     codersantosh <codersantosh@gmail.com>
 */
class Restaurant_Management_System_Deactivator {

	/**
	 * Fired during plugin deactivation.
	 *
	 * Removing options and all data related to plugin if user select remove data on deactivate.
	 *
	 * @since    1.0.0
	 */
	public static function deactivate() {
			require_once RESTAURANT_MANAGEMENT_SYSTEM_PATH . 'includes/class-roles.php';

		$roles = new Restaurant_Management_System_Roles();
		$roles->remove_roles_and_capabilities();
		if ( restaurant_management_system_get_options( 'deleteAll' ) ) {
			delete_option( RESTAURANT_MANAGEMENT_SYSTEM_OPTION_NAME );
		}
		flush_rewrite_rules();
	}
}
