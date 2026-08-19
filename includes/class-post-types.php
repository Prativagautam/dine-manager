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
 * is_available meta fields. Milestone B adds the table CPT and its
 * metadata. See PLAN.md §5.1 for the full data model — this file keeps
 * each domain's registration grouped in its own method so later
 * milestones can extend it in the same pattern.
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
		$this->register_table_post_type();
		$this->register_reservation_post_type();
		$this->register_order_post_type();
	}

	/**
	 * Register all taxonomies for this plugin.
	 * Hooked into 'init'.
	 *
	 * @since 1.0.0
	 */
	public function register_taxonomies() {
		$this->register_menu_taxonomies();
		$this->register_order_taxonomy();
		$this->register_order_status_terms();
		$this->register_reservation_taxonomy();
	$this->register_reservation_status_terms();
	}

	/**
	 * Register post meta fields for this plugin.
	 * Hooked into 'init'.
	 *
	 * @since 1.0.0
	 */
	public function register_meta_fields() {
		$this->register_menu_meta();
		$this->register_table_meta();
		$this->register_reservation_meta();
		$this->register_order_meta();
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
			'labels'                => $labels,
			'public'                => true,
			'show_ui'               => true,
			'show_in_menu'          => false, // Managed via the plugin's own React admin screen, not a separate wp-admin CPT list.
			'show_in_rest'          => true,
			'rest_base'             => 'rms-menu-items',
			'rest_controller_class' => 'WP_REST_Posts_Controller', // Overridden by our custom controller (Part 2) for the public GET endpoint; this keeps core CRUD available too.
			'supports'              => array( 'title', 'editor', 'thumbnail', 'custom-fields' ), // title = item name, editor = description, thumbnail = image.
			'has_archive'           => false,
			'capability_type'       => 'post', // Deliberately plain 'post' capabilities here, NOT the custom RMS capabilities — menu CRUD is gated by 'manage_rms_menu_items' at the REST layer (Part 2), not by CPT-level capabilities. See PLAN.md §6.
			'map_meta_cap'          => true,
		);

		register_post_type( 'menu_item', $args );
	}

	/**
	 * Register the table CPT.
	 *
	 * Tables are a transactional data model for the floor-plan and seating
	 * workflows, so they get their own CPT with explicit meta fields rather
	 * than being modeled as a taxonomy or a menu-like content type.
	 *
	 * @access private
	 * @since 1.0.0
	 */
	private function register_table_post_type() {
		$labels = array(
			'name'               => __( 'Tables', 'restaurant-management-system' ),
			'singular_name'      => __( 'Table', 'restaurant-management-system' ),
			'add_new'            => __( 'Add New', 'restaurant-management-system' ),
			'add_new_item'       => __( 'Add New Table', 'restaurant-management-system' ),
			'edit_item'          => __( 'Edit Table', 'restaurant-management-system' ),
			'new_item'           => __( 'New Table', 'restaurant-management-system' ),
			'view_item'          => __( 'View Table', 'restaurant-management-system' ),
			'search_items'       => __( 'Search Tables', 'restaurant-management-system' ),
			'not_found'          => __( 'No tables found', 'restaurant-management-system' ),
			'not_found_in_trash' => __( 'No tables found in Trash', 'restaurant-management-system' ),
			'menu_name'          => __( 'Tables', 'restaurant-management-system' ),
		);

		$args = array(
			'labels'          => $labels,
			'public'          => true,
			'show_ui'         => true,
			'show_in_menu'    => false,
			'show_in_rest'    => true,
			'rest_base'       => 'rms-tables',
			'supports'        => array( 'title', 'custom-fields' ),
			'has_archive'     => false,
			'capability_type' => 'post',
			'map_meta_cap'    => true,
		);

		register_post_type( 'table', $args );
	}

	/**
	 * Register the reservation CPT.
	 *
	 * Reservations are transactional data, not public content. They are
	 * stored as a CPT so they can use WordPress metadata and REST-friendly
	 * persistence, while the business rules are enforced in a custom REST
	 * controller.
	 *
	 * @access private
	 * @since 1.0.0
	 */
	private function register_reservation_post_type() {
		$labels = array(
			'name'               => __( 'Reservations', 'restaurant-management-system' ),
			'singular_name'      => __( 'Reservation', 'restaurant-management-system' ),
			'add_new'            => __( 'Add New', 'restaurant-management-system' ),
			'add_new_item'       => __( 'Add New Reservation', 'restaurant-management-system' ),
			'edit_item'          => __( 'Edit Reservation', 'restaurant-management-system' ),
			'new_item'           => __( 'New Reservation', 'restaurant-management-system' ),
			'view_item'          => __( 'View Reservation', 'restaurant-management-system' ),
			'search_items'       => __( 'Search Reservations', 'restaurant-management-system' ),
			'not_found'          => __( 'No reservations found', 'restaurant-management-system' ),
			'not_found_in_trash' => __( 'No reservations found in Trash', 'restaurant-management-system' ),
			'menu_name'          => __( 'Reservations', 'restaurant-management-system' ),
		);

		$args = array(
			'labels'          => $labels,
			'public'          => false,
			'show_ui'         => false,
			'show_in_menu'    => false,
			'show_in_rest'    => false,
			'supports'        => array( 'title', 'custom-fields' ),
			'has_archive'     => false,
			'capability_type' => 'post',
			'map_meta_cap'    => true,
		);

		register_post_type( 'reservation', $args );
	}

	/**
	 * Register the order CPT.
	 *
	 * Orders are private transactional records. Their lifecycle, price
	 * snapshots, and ownership rules are enforced by the custom REST
	 * controller rather than WordPress's generic post endpoints.
	 *
	 * @access private
	 * @since 1.0.0
	 */
	private function register_order_post_type() {
		$labels = array(
			'name'               => __( 'Orders', 'restaurant-management-system' ),
			'singular_name'      => __( 'Order', 'restaurant-management-system' ),
			'add_new'            => __( 'Add New', 'restaurant-management-system' ),
			'add_new_item'       => __( 'Add New Order', 'restaurant-management-system' ),
			'edit_item'          => __( 'Edit Order', 'restaurant-management-system' ),
			'new_item'           => __( 'New Order', 'restaurant-management-system' ),
			'view_item'          => __( 'View Order', 'restaurant-management-system' ),
			'search_items'       => __( 'Search Orders', 'restaurant-management-system' ),
			'not_found'          => __( 'No orders found', 'restaurant-management-system' ),
			'not_found_in_trash' => __( 'No orders found in Trash', 'restaurant-management-system' ),
			'menu_name'          => __( 'Orders', 'restaurant-management-system' ),
		);

		$args = array(
			'labels'          => $labels,
			'public'          => false,
			'show_ui'         => false,
			'show_in_menu'    => false,
			'show_in_rest'    => false,
			'supports'        => array( 'title', 'custom-fields' ),
			'has_archive'     => false,
			'capability_type' => 'post',
			'map_meta_cap'    => true,
			'query_var'       => false,
		);

		register_post_type( 'order', $args );
	}

	/**
	 * Register reservation meta fields: table_id, customer_id, party_size,
	 * start_datetime, end_datetime, contact_name, contact_phone.
	 *
	 * @access private
	 * @since 1.0.0
	 */
	private function register_reservation_meta() {
		register_post_meta(
			'reservation',
			'table_id',
			array(
				'type'              => 'integer',
				'description'       => __( 'Associated table ID for this reservation.', 'restaurant-management-system' ),
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => 'absint',
				'auth_callback'     => function () {
					return current_user_can( 'manage_rms_reservations' );
				},
			)
		);

		register_post_meta(
			'reservation',
			'customer_id',
			array(
				'type'              => 'integer',
				'description'       => __( 'Customer user ID who created the reservation.', 'restaurant-management-system' ),
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => 'absint',
				'auth_callback'     => function () {
					return current_user_can( 'manage_rms_reservations' );
				},
			)
		);

		register_post_meta(
			'reservation',
			'party_size',
			array(
				'type'              => 'integer',
				'description'       => __( 'Number of guests in the reservation.', 'restaurant-management-system' ),
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => 'absint',
				'auth_callback'     => function () {
					return current_user_can( 'manage_rms_reservations' );
				},
			)
		);

		register_post_meta(
			'reservation',
			'start_datetime',
			array(
				'type'              => 'string',
				'description'       => __( 'UTC ISO 8601 start datetime for the reservation.', 'restaurant-management-system' ),
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => 'sanitize_text_field',
				'auth_callback'     => function () {
					return current_user_can( 'manage_rms_reservations' );
				},
			)
		);

		register_post_meta(
			'reservation',
			'end_datetime',
			array(
				'type'              => 'string',
				'description'       => __( 'UTC ISO 8601 end datetime for the reservation.', 'restaurant-management-system' ),
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => 'sanitize_text_field',
				'auth_callback'     => function () {
					return current_user_can( 'manage_rms_reservations' );
				},
			)
		);

		register_post_meta(
			'reservation',
			'contact_name',
			array(
				'type'              => 'string',
				'description'       => __( 'Contact name for the reservation.', 'restaurant-management-system' ),
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => 'sanitize_text_field',
				'auth_callback'     => function () {
					return current_user_can( 'manage_rms_reservations' );
				},
			)
		);

		register_post_meta(
			'reservation',
			'contact_phone',
			array(
				'type'              => 'string',
				'description'       => __( 'Contact phone number for the reservation.', 'restaurant-management-system' ),
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => 'sanitize_text_field',
				'auth_callback'     => function () {
					return current_user_can( 'manage_rms_reservations' );
				},
			)
		);
	}
	/**
 * Register the reservation lifecycle taxonomy.
 *
 * Same reasoning as order_status: a taxonomy so reservation lists can be
 * queried/filtered by status. Reservations are auto-confirmed at creation
 * (validation already happens server-side), so 'confirmed' is the default
 * term rather than 'pending' — there is no unconfirmed state.
 *
 * @access private
 * @since 1.0.0
 */
private function register_reservation_taxonomy() {
	register_taxonomy(
		'reservation_status',
		'reservation',
		array(
			'labels'       => array(
				'name'          => __( 'Reservation Statuses', 'restaurant-management-system' ),
				'singular_name' => __( 'Reservation Status', 'restaurant-management-system' ),
			),
			'hierarchical' => false,
			'public'       => false,
			'show_ui'      => false,
			'show_in_rest' => false,
		),
	);
}

/**
 * Ensure the fixed reservation lifecycle terms exist.
 *
 * @access private
 * @since 1.0.0
 */
private function register_reservation_status_terms() {
	$statuses = array(
		'confirmed' => __( 'Confirmed', 'restaurant-management-system' ),
		'completed' => __( 'Completed', 'restaurant-management-system' ),
		'cancelled' => __( 'Cancelled', 'restaurant-management-system' ),
		'no_show'   => __( 'No Show', 'restaurant-management-system' ),
	);

	foreach ( $statuses as $slug => $name ) {
		if ( ! term_exists( $slug, 'reservation_status' ) ) {
			wp_insert_term( $name, 'reservation_status', array( 'slug' => $slug ) );
		}
	}
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
	 * Register the order lifecycle taxonomy.
	 *
	 * A taxonomy is used because order lists and the kitchen board need to
	 * query by status. The valid state changes themselves are still enforced
	 * in the custom order REST controller.
	 *
	 * @access private
	 * @since 1.0.0
	 */
	private function register_order_taxonomy() {
		register_taxonomy(
			'order_status',
			'order',
			array(
				'labels'       => array(
					'name'          => __( 'Order Statuses', 'restaurant-management-system' ),
					'singular_name' => __( 'Order Status', 'restaurant-management-system' ),
				),
				'hierarchical' => false,
				'public'       => false,
				'show_ui'      => false,
				'show_in_rest' => false,
			),
		);
	}

	/**
	 * Ensure the fixed order lifecycle terms exist.
	 *
	 * @access private
	 * @since 1.0.0
	 */
	private function register_order_status_terms() {
		$statuses = array(
			'pending'   => __( 'Pending', 'restaurant-management-system' ),
			'confirmed' => __( 'Confirmed', 'restaurant-management-system' ),
			'preparing' => __( 'Preparing', 'restaurant-management-system' ),
			'ready'     => __( 'Ready', 'restaurant-management-system' ),
			'delivered' => __( 'Delivered', 'restaurant-management-system' ),
			'cancelled' => __( 'Cancelled', 'restaurant-management-system' ),
		);

		foreach ( $statuses as $slug => $name ) {
			if ( ! term_exists( $slug, 'order_status' ) ) {
				wp_insert_term( $name, 'order_status', array( 'slug' => $slug ) );
			}
		}
	}

	/**
	 * Register menu_item meta fields: price, prep_time_minutes, is_available, is_featured .
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
				'sanitize_callback' => function ( $meta_value ) {
					return floatval( $meta_value );
				},
				'auth_callback'     => function () {
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
				'auth_callback'     => function () {
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
				'auth_callback'     => function () {
					return current_user_can( 'manage_rms_menu_items' );
				},
			)
		);
		register_post_meta(
	'menu_item',
	'is_featured',
	array(
		'type'              => 'boolean',
		'description'       => __( 'Whether this item is highlighted as a best-selling/featured dish.', 'restaurant-management-system' ),
		'single'            => true,
		'default'           => false,
		'show_in_rest'      => true,
		'sanitize_callback' => 'rest_sanitize_boolean',
		'auth_callback'     => function () {
			return current_user_can( 'manage_rms_menu_items' );
		},
	)
);
	}
	



	/**
	 * Register table meta fields: capacity, section, status, grid_x, grid_y.
	 *
	 * @access private
	 * @since 1.0.0
	 */
	private function register_table_meta() {
		register_post_meta(
			'table',
			'capacity',
			array(
				'type'              => 'integer',
				'description'       => __( 'Seating capacity for the table.', 'restaurant-management-system' ),
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => 'absint',
				'auth_callback'     => function () {
					return current_user_can( 'manage_rms_tables' );
				},
			)
		);

		register_post_meta(
			'table',
			'section',
			array(
				'type'              => 'string',
				'description'       => __( 'Section or zone name for the table.', 'restaurant-management-system' ),
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => 'sanitize_text_field',
				'auth_callback'     => function () {
					return current_user_can( 'manage_rms_tables' );
				},
			)
		);

		register_post_meta(
			'table',
			'status',
			array(
				'type'              => 'string',
				'description'       => __( 'Table availability status.', 'restaurant-management-system' ),
				'single'            => true,
				'default'           => 'Available',
				'show_in_rest'      => true,
				'sanitize_callback' => 'sanitize_text_field',
				'validate_callback' => function ( $value ) {
					return in_array( $value, array( 'Available', 'Occupied', 'Reserved' ), true );
				},
				'auth_callback'     => function () {
					return current_user_can( 'manage_rms_tables' );
				},
			)
		);

		register_post_meta(
			'table',
			'grid_x',
			array(
				'type'              => 'integer',
				'description'       => __( 'Floor-plan X position.', 'restaurant-management-system' ),
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => 'absint',
				'validate_callback' => function ( $value ) {
					if ( ! is_numeric( $value ) ) {
						return false;
					}

					$int_value = (int) $value;
					return $int_value >= 0 && $int_value <= 11;
				},
				'auth_callback'     => function () {
					return current_user_can( 'manage_rms_tables' );
				},
			)
		);

		register_post_meta(
			'table',
			'grid_y',
			array(
				'type'              => 'integer',
				'description'       => __( 'Floor-plan Y position.', 'restaurant-management-system' ),
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => 'absint',
				'validate_callback' => function ( $value ) {
					if ( ! is_numeric( $value ) ) {
						return false;
					}

					$int_value = (int) $value;
					return $int_value >= 0 && $int_value <= 11;
				},
				'auth_callback'     => function () {
					return current_user_can( 'manage_rms_tables' );
				},
			)
		);
	}

	/**
	 * Register order metadata.
	 *
	 * `items` holds a JSON price snapshot created by the server. It is never
	 * written directly from a client request; see the order REST controller.
	 *
	 * @access private
	 * @since 1.0.0
	 */
	private function register_order_meta() {
		$meta_fields = array(
			'order_type'   => array(
				'type'        => 'string',
				'description' => __( 'Order fulfilment type: dine_in or takeout.', 'restaurant-management-system' ),
			),
			'order_source' => array(
				'type'        => 'string',
				'description' => __( 'Order origin: staff_pos or customer_portal.', 'restaurant-management-system' ),
			),
			'items'        => array(
				'type'        => 'string',
				'description' => __( 'Server-generated JSON snapshot of ordered menu items.', 'restaurant-management-system' ),
			),
			'total_amount' => array(
				'type'        => 'number',
				'description' => __( 'Server-calculated total for the order.', 'restaurant-management-system' ),
			),
			'table_id'     => array(
				'type'        => 'integer',
				'description' => __( 'Associated table ID for dine-in orders.', 'restaurant-management-system' ),
			),
			'customer_id'  => array(
				'type'        => 'integer',
				'description' => __( 'Customer who owns the order, if one is associated.', 'restaurant-management-system' ),
			),
			'created_by'   => array(
				'type'        => 'integer',
				'description' => __( 'WordPress user who created the order.', 'restaurant-management-system' ),
			),
			'delivered_at' => array(
		'type'        => 'string',
		'description' => __( 'UTC ISO 8601 timestamp when the order was marked delivered.', 'restaurant-management-system' ),
	),  
		);

		foreach ( $meta_fields as $meta_key => $meta ) {
			// Meta sanitizers are invoked by WordPress with the value, key, and
			// object type. Do not register floatval() directly: as an internal PHP
			// function it rejects those additional arguments, which turns saving an
			// order total into a fatal error on PHP 8+.
			$sanitize_callback = 'total_amount' === $meta_key
				? function ( $value ) {
					return (float) $value;
				}
				: ( in_array( $meta_key, array( 'table_id', 'customer_id', 'created_by' ), true ) ? 'absint' : 'sanitize_text_field' );

			register_post_meta(
				'order',
				$meta_key,
				array(
					'type'              => $meta['type'],
					'description'       => $meta['description'],
					'single'            => true,
					'show_in_rest'      => true,
					'sanitize_callback' => $sanitize_callback,
					'auth_callback'     => function () {
						return current_user_can( 'manage_rms_orders' );
					},
				)
			);
		}
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
