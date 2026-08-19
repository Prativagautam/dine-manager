<?php // phpcs:ignore Class file names should be based on the class name with "class-" prepended.
// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The file that defines the core plugin class
 *
 * A class definition that includes attributes and functions used across both the
 * public-facing side of the site and the admin area.
 *
 * @link       https://www.acmeit.org/
 * @since      1.0.0
 *
 * @package    Restaurant_Management_System
 * @subpackage Restaurant_Management_System/includes
 */

/**
 * The core plugin class.
 *
 * This is used to define internationalization, admin-specific hooks, and
 * public-facing site hooks.
 *
 * Also maintains the unique identifier of this plugin as well as the current
 * version of the plugin.
 *
 * @since      1.0.0
 * @package    Restaurant_Management_System
 * @subpackage Restaurant_Management_System/includes
 * @author     codersantosh <codersantosh@gmail.com>
 */
class Restaurant_Management_System {

	/**
	 * The loader that's responsible for maintaining and registering all hooks that power
	 * the plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      Restaurant_Management_System_Loader    $loader    Maintains and registers all hooks for the plugin.
	 */
	protected $loader;

	/**
	 * Define the core functionality of the plugin.
	 *
	 * Set the plugin name and the plugin version that can be used throughout the plugin.
	 * Load the dependencies, define the locale, and set the hooks for the admin area and
	 * the public-facing side of the site.
	 *
	 * @since    1.0.0
	 */
	public function __construct() {

		$this->load_dependencies();
		$this->set_locale();
		$this->define_include_hooks();
		$this->define_admin_hooks();
		$this->define_public_hooks();
		$this->define_rest_hooks();
	}

	/**
	 * Load the required dependencies for this plugin.
	 *
	 * Include the following files that make up the plugin:
	 *
	 * - Restaurant_Management_System_Loader. Orchestrates the hooks of the plugin.
	 * - Restaurant_Management_System_i18n. Defines internationalization functionality.
	 * - Restaurant_Management_System_Admin. Defines all hooks for the admin area.
	 * - Restaurant_Management_System_Public. Defines all hooks for the public side of the site.
	 *
	 * Create an instance of the loader which will be used to register the hooks
	 * with WordPress.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function load_dependencies() {

		/* API */
		require_once RESTAURANT_MANAGEMENT_SYSTEM_PATH . 'includes/api/index.php';

		/**Plugin Core Functions*/
		require_once RESTAURANT_MANAGEMENT_SYSTEM_PATH . 'includes/functions.php';

		/**
		 * The class responsible for orchestrating the actions and filters of the
		 * core plugin.
		 */
		require_once RESTAURANT_MANAGEMENT_SYSTEM_PATH . 'includes/class-loader.php';

		/**
		 * The class responsible for defining internationalization functionality
		 * of the plugin.
		 */
		require_once RESTAURANT_MANAGEMENT_SYSTEM_PATH . 'includes/class-i18n.php';

		/**
		 * The class responsible for defining all actions that occur in both admin and public area.
		 */
		require_once RESTAURANT_MANAGEMENT_SYSTEM_PATH . 'includes/class-include.php';
			/**
		 * The class responsible for registering CPTs, taxonomies, and meta fields.
		 */
		require_once RESTAURANT_MANAGEMENT_SYSTEM_PATH . 'includes/class-post-types.php';

		/**
		 * The class responsible for registering RMS custom roles and capabilities.
		 */
		require_once RESTAURANT_MANAGEMENT_SYSTEM_PATH . 'includes/class-roles.php';

		/**
		 * The class responsible for defining all actions that occur in the admin area.
		 */
		require_once RESTAURANT_MANAGEMENT_SYSTEM_PATH . 'admin/class-admin.php';

		/**
		 * The class responsible for defining all actions that occur in the public-facing
		 * side of the site.
		 */
		require_once RESTAURANT_MANAGEMENT_SYSTEM_PATH . 'public/class-public.php';
		require_once RESTAURANT_MANAGEMENT_SYSTEM_PATH . 'includes/class-menu-rest-controller.php';
		require_once RESTAURANT_MANAGEMENT_SYSTEM_PATH . 'includes/class-table-rest-controller.php';
		require_once RESTAURANT_MANAGEMENT_SYSTEM_PATH . 'includes/class-reservation-rest-controller.php';
		require_once RESTAURANT_MANAGEMENT_SYSTEM_PATH . 'includes/class-order-rest-controller.php';
		require_once RESTAURANT_MANAGEMENT_SYSTEM_PATH . 'includes/class-customer-rest-controller.php';
        require_once RESTAURANT_MANAGEMENT_SYSTEM_PATH . 'includes/class-dashboard-rest-controller.php';

		/**
		 * The class responsible for registering Gutenberg blocks.
		 */
		require_once RESTAURANT_MANAGEMENT_SYSTEM_PATH . 'includes/class-blocks.php';
		$this->loader = new Restaurant_Management_System_Loader();
	}

	/**
	 * Define the locale for this plugin for internationalization.
	 *
	 * Uses the Restaurant_Management_System_i18n class in order to set the domain and to register the hook
	 * with WordPress.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function set_locale() {

		$plugin_i18n = new Restaurant_Management_System_i18n();

		$this->loader->add_action( 'plugins_loaded', $plugin_i18n, 'load_plugin_textdomain' );
	}

	/**
	 * Register all of the hooks related to both admin and public-facing areas functionality
	 * of the plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function define_include_hooks() {

		$plugin_include = restaurant_management_system_include();

		/* Register scripts and styles */
		$this->loader->add_action( 'init', $plugin_include, 'register_scripts_and_styles' );
		$plugin_post_types = restaurant_management_system_post_types();
		$this->loader->add_action( 'init', $plugin_post_types, 'register_post_types' );
		$this->loader->add_action( 'init', $plugin_post_types, 'register_taxonomies' );
		$this->loader->add_action( 'init', $plugin_post_types, 'register_meta_fields' );

		$plugin_blocks = restaurant_management_system_blocks();
		$this->loader->add_action( 'init', $plugin_blocks, 'register_blocks' );
	}


	/**
	 * Register all of the hooks related to the admin area functionality
	 * of the plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function define_admin_hooks() {

		$plugin_admin = restaurant_management_system_admin();

		$this->loader->add_action( 'admin_menu', $plugin_admin, 'add_admin_menu' );
		$this->loader->add_filter( 'admin_body_class', $plugin_admin, 'add_has_sticky_header' );
		$this->loader->add_action( 'admin_enqueue_scripts', $plugin_admin, 'enqueue_resources' );

		/*Register Settings*/
		$this->loader->add_action( 'rest_api_init', $plugin_admin, 'register_settings' );
		$this->loader->add_action( 'admin_init', $plugin_admin, 'register_settings' );

		$this->loader->add_filter( 'plugin_action_links_restaurant-management-system/restaurant-management-system.php', $plugin_admin, 'add_plugin_links', 10, 4 );
	}

	/**
	 * Register all of the hooks related to the public-facing functionality
	 * of the plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function define_public_hooks() {

		$plugin_public = restaurant_management_system_public();

		$this->loader->add_action( 'wp_enqueue_scripts', $plugin_public, 'enqueue_public_resources' );
		$this->loader->add_action( 'init', $plugin_public, 'register_shortcodes' );
	}

	private function define_rest_hooks() {
		$plugin_menu_rest = restaurant_management_system_menu_rest_controller();
		$this->loader->add_action( 'rest_api_init', $plugin_menu_rest, 'register_routes' );

		$plugin_table_rest = restaurant_management_system_table_rest_controller();
		$this->loader->add_action( 'rest_api_init', $plugin_table_rest, 'register_routes' );

		$plugin_reservation_rest = restaurant_management_system_reservation_rest_controller();
		$this->loader->add_action( 'rest_api_init', $plugin_reservation_rest, 'register_routes' );

		$plugin_order_rest = restaurant_management_system_order_rest_controller();
		$this->loader->add_action( 'rest_api_init', $plugin_order_rest, 'register_routes' );
        $plugin_dashboard_rest = restaurant_management_system_dashboard_rest_controller();
        $this->loader->add_action( 'rest_api_init', $plugin_dashboard_rest, 'register_routes' );
		$plugin_customer_rest = restaurant_management_system_customer_rest_controller();
		$this->loader->add_action( 'rest_api_init', $plugin_customer_rest, 'register_routes' );
		$this->loader->add_filter( 'retrieve_password_message', $plugin_customer_rest, 'customize_reset_password_email', 10, 4 );
	}

	/**
	 * Run the loader to execute all of the hooks with WordPress.
	 *
	 * @since    1.0.0
	 */
	public function run() {
		$this->loader->run();
	}

	/**
	 * The reference to the class that orchestrates the hooks with the plugin.
	 *
	 * @since     1.0.0
	 * @return    Restaurant_Management_System_Loader    Orchestrates the hooks of the plugin.
	 */
	public function get_loader() {
		return $this->loader;
	}
}
