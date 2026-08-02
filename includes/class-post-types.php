<?php // phpcs:ignore Class file names should be based on the class name with "class-" prepended.
// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers Custom Post Types, Taxonomies, and Meta Fields for the plugin.
 *
 * Milestone A (Menu Core): menu_item CPT, menu_category (hierarchical)
 * and dietary_tag (flat) taxonomies, and the price/prep_time_minutes/
 * is_available meta fields. See PLAN.md §5.1 for the full data model —
 * this file only covers Milestone A; Tables/Reservations/Orders get
 * their own register_*_post_type() methods added here in later
 * milestones, same pattern.
 *
 * @package    Restaurant_Management_System
 * @subpackage Restaurant_Management_System/includes
 */
class Restaurant_Management_System_Post_Types {

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
		static $instance = null;

		if ( null === $instance ) {
			$instance = new self();
		}

		return $instance;
	}

	/**
	 * Register all custom post types for this plugin.
	 * Hooked into 'init'.
	 *
	 * @since 1.0.0
	 */
	public function register_post_types() {
		$this->register_menu_item_post_type();
	}

	/**
	 * Register all taxonomies for this plugin.
	 * Hooked into 'init'.
	 *
	 * @since 1.0.0
	 */
	public function register_taxonomies() {
		$this->register_menu_taxonomies();
	}

	/**
	 * Register post meta fields for this plugin.
	 * Hooked into 'init'.
	 *
	 * @since 1.0.0
	 */
	public function register_meta_fields() {
		$this->register_menu_meta();
	}

	/**
	 * Register the menu_item CPT.
	 *
	 * PLAN.md §4.2: menu_item is content-like (name, description, image),
	 * unlike order/reservation which are transactional — a plain CPT is
	 * the uncontroversial choice here, no tradeoff discussion needed.
	 *
	 * @access private
	 * @since 1.0.0
	 */
	private function register_menu_item_post_type() {
		$labels = array(
			'name'               => __( 'Menu Items', 'restaurant-management-system' ),
			'singular_name'      => __( 'Menu Item', 'restaurant-management-system' ),
			'add_new'            => __( 'Add New', 'restaurant-management-system' ),
			'add_new_item'       => __( 'Add New Menu Item', 'restaurant-management-system' ),
			'edit_item'          => __( 'Edit Menu Item', 'restaurant-management-system' ),
			'new_item'           => __( 'New Menu Item', 'restaurant-management-system' ),
			'view_item'          => __( 'View Menu Item', 'restaurant-management-system' ),
			'search_items'       => __( 'Search Menu Items', 'restaurant-management-system' ),
			'not_found'          => __( 'No menu items found', 'restaurant-management-system' ),
			'not_found_in_trash' => __( 'No menu items found in Trash', 'restaurant-management-system' ),
			'menu_name'          => __( 'Menu Items', 'restaurant-management-system' ),
		);

		$args = array(
			'labels'             => $labels,
			'public'             => true,
			'show_ui'            => true,
			'show_in_menu'       => false, // Managed via the plugin's own React admin screen, not a separate wp-admin CPT list.
			'show_in_rest'       => true,
			'rest_base'          => 'rms-menu-items',
			'rest_controller_class' => 'WP_REST_Posts_Controller', // Overridden by our custom controller (Part 2) for the public GET endpoint; this keeps core CRUD available too.
			'supports'           => array( 'title', 'editor', 'thumbnail', 'custom-fields' ), // title = item name, editor = description, thumbnail = image.
			'has_archive'        => false,
			'capability_type'    => 'post', // Deliberately plain 'post' capabilities here, NOT the custom RMS capabilities — menu CRUD is gated by 'manage_rms_menu_items' at the REST layer (Part 2), not by CPT-level capabilities. See PLAN.md §6.
			'map_meta_cap'       => true,
		);

		register_post_type( 'menu_item', $args );
	}

	/**
	 * Register menu_category (hierarchical) and dietary_tag (flat) taxonomies.
	 *
	 * @access private
	 * @since 1.0.0
	 */
	private function register_menu_taxonomies() {
		register_taxonomy(
			'menu_category',
			'menu_item',
			array(
				'labels'            => array(
					'name'          => __( 'Menu Categories', 'restaurant-management-system' ),
					'singular_name' => __( 'Menu Category', 'restaurant-management-system' ),
				),
				'hierarchical'      => true, // e.g. Mains > Steaks, per PLAN.md §5.1.
				'show_in_rest'      => true,
				'rest_base'         => 'menu-categories',
				'public'            => true,
				'show_admin_column' => true,
			)
		);

		register_taxonomy(
			'dietary_tag',
			'menu_item',
			array(
				'labels'            => array(
					'name'          => __( 'Dietary Tags', 'restaurant-management-system' ),
					'singular_name' => __( 'Dietary Tag', 'restaurant-management-system' ),
				),
				'hierarchical'      => false, // Flat — GF, Vegan, etc. don't nest.
				'show_in_rest'      => true,
				'rest_base'         => 'dietary-tags',
				'public'            => true,
				'show_admin_column' => true,
			)
		);
	}

	/**
	 * Register menu_item meta fields: price, prep_time_minutes, is_available.
	 *
	 * All three registered with show_in_rest so they're readable/writable
	 * via the standard REST meta mechanism as well as our custom
	 * controller. sanitize_callback matches PLAN.md §4.4's sanitization
	 * requirements (absint for integers/bool-as-int, floatval for price).
	 *
	 * @access private
	 * @since 1.0.0
	 */
	private function register_menu_meta() {
		register_post_meta(
			'menu_item',
			'price',
			array(
				'type'              => 'number',
				'description'       => __( 'Price in the site currency.', 'restaurant-management-system' ),
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => function( $meta_value ) {
			return floatval( $meta_value );
		},
				'auth_callback'     => function() {
					return current_user_can( 'manage_rms_menu_items' );
				},
			)
		);

		register_post_meta(
			'menu_item',
			'prep_time_minutes',
			array(
				'type'              => 'integer',
				'description'       => __( 'Preparation time in minutes.', 'restaurant-management-system' ),
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => 'absint',
				'auth_callback'     => function() {
					return current_user_can( 'manage_rms_menu_items' );
				},
			)
		);

		register_post_meta(
			'menu_item',
			'is_available',
			array(
				'type'              => 'boolean',
				'description'       => __( 'Whether this item is currently orderable.', 'restaurant-management-system' ),
				'single'            => true,
				'default'           => true,
				'show_in_rest'      => true,
				'sanitize_callback' => 'rest_sanitize_boolean',
				'auth_callback'     => function() {
					return current_user_can( 'manage_rms_menu_items' );
				},
			)
		);
	}
}

if ( ! function_exists( 'restaurant_management_system_post_types' ) ) {
	/**
	 * Return instance of Restaurant_Management_System_Post_Types class.
	 *
	 * @since 1.0.0
	 *
	 * @return Restaurant_Management_System_Post_Types
	 */
	function restaurant_management_system_post_types() { // phpcs:ignore
		return Restaurant_Management_System_Post_Types::get_instance();
	}
}