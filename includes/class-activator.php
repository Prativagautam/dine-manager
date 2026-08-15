<?php // phpcs:ignore Class file names should be based on the class name with "class-" prepended.
// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Fired during plugin activation
 *
 * @link       https://www.acmeit.org/
 * @since      1.0.0
 *
 * @package    Restaurant_Management_System
 * @subpackage Restaurant_Management_System/includes
 */

/**
 * Fired during plugin activation.
 *
 * This class defines all code necessary to run during the plugin's activation.
 *
 * @since      1.0.0
 * @package    Restaurant_Management_System
 * @subpackage Restaurant_Management_System/includes
 * @author     codersantosh <codersantosh@gmail.com>
 */
class Restaurant_Management_System_Activator {

	/**
	 * Short Description. (use period)
	 *
	 * Long Description.
	 *
	 * @since    1.0.0
	 */
	public static function activate() {
		require_once RESTAURANT_MANAGEMENT_SYSTEM_PATH . 'includes/class-roles.php';

		$roles = new Restaurant_Management_System_Roles();
		$roles->add_roles_and_capabilities();

		flush_rewrite_rules();
	}
}
