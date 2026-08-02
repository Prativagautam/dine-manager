<?php
/**
 * The plugin bootstrap file
 *
 * This file is read by WordPress to generate the plugin information in the plugin
 * admin area. This file also includes all of the dependencies used by the plugin,
 * registers the activation and deactivation functions, and defines a function
 * that starts the plugin.
 *
 * @link              https://www.acmeit.org/
 * @since             1.0.0
 * @package           Restaurant_Management_System
 *
 * @wordpress-plugin
 * Plugin Name:       Restaurant Management System - WordPress Setting via React and Rest API
 * Plugin URI:        https://www.addonspress.com/wordpress-starter-plugins/restaurant-management-system
 * Description:       WordPress Setting via React and Rest API.
 * Version:           1.0.0
 * Author:            codersantosh
 * Author URI:        https://www.acmeit.org/
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       restaurant-management-system
 * Domain Path:       /languages
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Current plugin path.
 * Current plugin url.
 * Current plugin version.
 * Current plugin name.
 * Current plugin option name.
 */
define( 'RESTAURANT_MANAGEMENT_SYSTEM_PATH', plugin_dir_path( __FILE__ ) );
define( 'RESTAURANT_MANAGEMENT_SYSTEM_URL', plugin_dir_url( __FILE__ ) );
define( 'RESTAURANT_MANAGEMENT_SYSTEM_VERSION', '1.0.0' );
define( 'RESTAURANT_MANAGEMENT_SYSTEM_PLUGIN_NAME', 'restaurant-management-system' );
define( 'RESTAURANT_MANAGEMENT_SYSTEM_OPTION_NAME', 'restaurant-management-system' );

/**
 * The code that runs during plugin activation.
 * This action is documented in includes/class-activator.php
 */
function restaurant_management_system_activate() {
	require_once RESTAURANT_MANAGEMENT_SYSTEM_PATH . 'includes/class-activator.php';
	Restaurant_Management_System_Activator::activate();
}

/**
 * The code that runs during plugin deactivation.
 * This action is documented in includes/class-deactivator
 */
function restaurant_management_system_deactivate() {
	require_once RESTAURANT_MANAGEMENT_SYSTEM_PATH . 'includes/class-deactivator.php';
	Restaurant_Management_System_Deactivator::deactivate();
}

register_activation_hook( __FILE__, 'restaurant_management_system_activate' );
register_deactivation_hook( __FILE__, 'restaurant_management_system_deactivate' );

/**
 * The core plugin class that is used to define internationalization,
 * admin-specific hooks, and public-facing site hooks.
 */
require RESTAURANT_MANAGEMENT_SYSTEM_PATH . 'includes/main.php';

/**
 * Begins execution of the plugin.
 *
 * Since everything within the plugin is registered via hooks,
 * then kicking off the plugin from this point in the file does
 * not affect the page life cycle.
 *
 * @since    1.0.0
 */
function restaurant_management_system_run() {

	$plugin = new Restaurant_Management_System();
	$plugin->run();
}
restaurant_management_system_run();
