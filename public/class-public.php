<?php // phpcs:ignore Class file names should be based on the class name with "class-" prepended.
// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
/**
 * The public-facing functionality of the plugin.
 *
 * @link       https://www.acmeit.org/
 * @since      1.0.0
 *
 * @package    Restaurant_Management_System
 * @subpackage Restaurant_Management_System/public
 */

/**
 * The public-facing functionality of the plugin.
 *
 * Defines the plugin name, version, and two examples hooks for how to
 * enqueue the public-facing stylesheet and JavaScript.
 *
 * @package    Restaurant_Management_System
 * @subpackage Restaurant_Management_System/public
 * @author     codersantosh <codersantosh@gmail.com>
 */
class Restaurant_Management_System_Public {

	/**
	 * Register the customer portal shortcodes.
	 *
	 * [restaurant_customer_portal] renders both actions. Sites that place the
	 * actions on separate pages can use [restaurant_order_form] and
	 * [restaurant_reservation_form].
	 *
	 * @return void
	 */
	public function register_shortcodes() {
		add_shortcode( 'restaurant_customer_portal', array( $this, 'render_customer_portal' ) );
		add_shortcode( 'restaurant_order_form', array( $this, 'render_order_portal' ) );
		add_shortcode( 'restaurant_reservation_form', array( $this, 'render_reservation_portal' ) );
		add_shortcode( 'restaurant_menu', array( $this, 'render_menu_display' ) );
	}

	/**
	 * Render the public menu display.
	 *
	 * @return string
	 */
	public function render_menu_display() {
		return '<div class="rms-menu-display"></div>';
	}

	/**
	 * Render the combined customer portal.
	 *
	 * @param array $attributes Shortcode attributes.
	 * @return string
	 */
	public function render_customer_portal( $attributes = array() ) {
		$attributes = shortcode_atts( array( 'view' => 'all' ), $attributes, 'restaurant_customer_portal' );
		$view       = in_array( $attributes['view'], array( 'all', 'order', 'reservation' ), true ) ? $attributes['view'] : 'all';

		return sprintf( '<div class="rms-customer-portal" data-rms-portal="%s"></div>', esc_attr( $view ) );
	}

	/**
	 * Render the order-only customer portal.
	 *
	 * @return string
	 */
	public function render_order_portal() {
		return $this->render_customer_portal( array( 'view' => 'order' ) );
	}

	/**
	 * Render the reservation-only customer portal.
	 *
	 * @return string
	 */
	public function render_reservation_portal() {
		return $this->render_customer_portal( array( 'view' => 'reservation' ) );
	}

	/**
	 * Gets an instance of this object.
	 * Prevents duplicate instances which avoid artefacts and improves performance.
	 *
	 * @static
	 * @access public
	 * @return object
	 * @since 1.0.0
	 */
	public static function get_instance() {
		// Store the instance locally to avoid private static replication.
		static $instance = null;

		// Only run these methods if they haven't been ran previously.
		if ( null === $instance ) {
			$instance = new self();
		}

		// Always return the instance.
		return $instance;
	}

	/**
	 * Register the JavaScript and stylesheets for the public-facing side of the site.
	 *
	 * @since    1.0.0
	 */
	public function enqueue_public_resources() {
		/**
		 * This function is provided for demonstration purposes only.
		 *
		 * An instance of this class should be passed to the run() function
		 * defined in Restaurant_Management_System_Loader as all of the hooks are defined
		 * in that particular class.
		 *
		 * The Restaurant_Management_System_Loader will then create the relationship
		 * between the defined hooks and the functions defined in this
		 * class.
		 */
		/* Atomic CSS */
		wp_enqueue_style( 'atomic' );
		wp_style_add_data( 'atomic', 'rtl', 'replace' );

		$version = RESTAURANT_MANAGEMENT_SYSTEM_VERSION;
		wp_enqueue_style(
    'rms-google-fonts',
    'https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&family=Source+Sans+3:wght@400;500;600&display=swap',
    array(),
    null
);

		wp_enqueue_style( RESTAURANT_MANAGEMENT_SYSTEM_PLUGIN_NAME, RESTAURANT_MANAGEMENT_SYSTEM_URL . 'build/public/index.css', array(), $version );
		wp_style_add_data( RESTAURANT_MANAGEMENT_SYSTEM_PLUGIN_NAME, 'rtl', 'replace' );

		/*Scripts dependency files*/
		$deps_file = RESTAURANT_MANAGEMENT_SYSTEM_PATH . 'build/public/index.asset.php';

		/*Fallback dependency array*/
		$dependency = array();

		/*Set dependency and version*/
		if ( file_exists( $deps_file ) ) {
			$deps_file  = require $deps_file;
			$dependency = $deps_file['dependencies'];
			$version    = $deps_file['version'];
		}

		wp_enqueue_script( RESTAURANT_MANAGEMENT_SYSTEM_PLUGIN_NAME, RESTAURANT_MANAGEMENT_SYSTEM_URL . 'build/public/index.js', $dependency, $version, true );
		wp_set_script_translations( RESTAURANT_MANAGEMENT_SYSTEM_PLUGIN_NAME, RESTAURANT_MANAGEMENT_SYSTEM_PLUGIN_NAME );

		$localize = apply_filters(
			'restaurant_management_system_public_localize',
			array(
				'RESTAURANT_MANAGEMENT_SYSTEM_URL' => RESTAURANT_MANAGEMENT_SYSTEM_URL,
				'site_url'                         => esc_url( home_url() ),
				'rest_url'                         => get_rest_url(),
				'nonce'                            => wp_create_nonce( 'wp_rest' ),
				'is_logged_in'                     => is_user_logged_in(),
				'login_url'                        => wp_login_url( esc_url_raw( add_query_arg( array(), get_permalink() ) ) ),
			)
		);

		wp_add_inline_script(
			RESTAURANT_MANAGEMENT_SYSTEM_PLUGIN_NAME,
			sprintf(
				"var RestaurantManagementSystemLocalize = JSON.parse( decodeURIComponent( '%s' ) );",
				rawurlencode(
					wp_json_encode(
						$localize
					)
				),
			),
			'before'
		);
	}
}

if ( ! function_exists( 'restaurant_management_system_public' ) ) {
	/**
	 * Return instance of  Restaurant_Management_System_Public class
	 *
	 * @since 1.0.0
	 *
	 * @return Restaurant_Management_System_Public
	 */
	function restaurant_management_system_public() {//phpcs:ignore
		return Restaurant_Management_System_Public::get_instance();
	}
}
