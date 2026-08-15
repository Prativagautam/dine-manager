<?php // phpcs:ignore Class file names should be based on the class name with "class-" prepended.
// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Custom REST controller for menu items.
 *
 * Registers GET /rms/v1/menu-items — the actual documented endpoint from
 * PLAN.md §7 (public, filterable by menu_category and dietary_tag) — plus
 * the protected create/update/delete routes for Menu CRUD.
 *
 * @package    Restaurant_Management_System
 * @subpackage Restaurant_Management_System/includes
 */
class Restaurant_Management_System_Menu_Rest_Controller {

	/**
	 * REST namespace, per PLAN.md §4.1.
	 *
	 * @var string
	 */
	private $namespace = 'rms/v1';

	/**
	 * REST base for this controller.
	 *
	 * @var string
	 */
	private $rest_base = 'menu-items';

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
	 * Register the menu-items collection and item routes.
	 * Hooked into 'rest_api_init'.
	 *
	 * @since 1.0.0
	 */
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_items' ),
					'permission_callback' => '__return_true', // Public endpoint, per PLAN.md §7.
					'args'                => array(
						'menu_category' => array(
							'description'       => __( 'Filter by menu_category taxonomy term slug.', 'restaurant-management-system' ),
							'type'              => 'string',
							'required'          => false,
							'sanitize_callback' => 'sanitize_title',
						),
						'dietary_tag'   => array(
							'description'       => __( 'Filter by dietary_tag taxonomy term slug.', 'restaurant-management-system' ),
							'type'              => 'string',
							'required'          => false,
							'sanitize_callback' => 'sanitize_title',
						),
						'page'          => array(
							'description'       => __( 'Page number for pagination.', 'restaurant-management-system' ),
							'type'              => 'integer',
							'required'          => false,
							'default'           => 1,
							'sanitize_callback' => 'absint',
						),
						'per_page'      => array(
							'description'       => __( 'Number of items per page.', 'restaurant-management-system' ),
							'type'              => 'integer',
							'required'          => false,
							'default'           => 20,
							'sanitize_callback' => 'absint',
						),
					),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'create_item' ),
					'permission_callback' => array( $this, 'create_item_permissions_check' ),
					'args'                => $this->get_write_item_args( true ),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/(?P<id>[\d]+)',
			array(
				array(
					'methods'             => WP_REST_Server::EDITABLE,
					'callback'            => array( $this, 'update_item' ),
					'permission_callback' => array( $this, 'update_item_permissions_check' ),
					'args'                => $this->get_write_item_args( false ),
				),
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'delete_item' ),
					'permission_callback' => array( $this, 'delete_item_permissions_check' ),
				),
			)
		);
	}

	/**
	 * Shared create/update arguments. Required on create, optional on
	 * update so PATCH can send only the fields that changed (used both
	 * for full edits and the Menu Management table's single-field
	 * availability toggle).
	 *
	 * @param bool $required Whether core fields are required (true for create).
	 * @return array
	 */
	private function get_write_item_args( $required ) {
		return array(
			'title'             => array(
				'type'              => 'string',
				'required'          => $required,
				'sanitize_callback' => 'sanitize_text_field',
			),
			'description'       => array(
				'type'              => 'string',
				'required'          => false,
				'sanitize_callback' => 'wp_kses_post',
			),
			'price'             => array(
				'type'              => 'number',
				'required'          => $required,
				'sanitize_callback' => function ( $value ) {
					return floatval( $value );
				},
			),
			'prep_time_minutes' => array(
				'type'              => 'integer',
				'required'          => $required,
				'sanitize_callback' => 'absint',
			),
			'is_available'      => array(
				'type'              => 'boolean',
				'required'          => false,
				'sanitize_callback' => 'rest_sanitize_boolean',
			),
			'menu_category'     => array(
				'type'              => 'array',
				'required'          => false,
				'items'             => array( 'type' => 'string' ),
				'sanitize_callback' => function ( $value ) {
					return is_array( $value ) ? array_map( 'sanitize_text_field', $value ) : array();
				},
			),
			'dietary_tag'       => array(
				'type'              => 'array',
				'required'          => false,
				'items'             => array( 'type' => 'string' ),
				'sanitize_callback' => function ( $value ) {
					return is_array( $value ) ? array_map( 'sanitize_text_field', $value ) : array();
				},
			),
		);
	}

	/**
	 * Only staff/admins with manage_rms_menu_items can create menu items.
	 *
	 * @return bool
	 */
	public function create_item_permissions_check() {
		return current_user_can( 'manage_rms_menu_items' );
	}

	/**
	 * Only staff/admins with manage_rms_menu_items can edit menu items.
	 *
	 * @param WP_REST_Request $request Request data.
	 * @return bool|WP_Error
	 */
	public function update_item_permissions_check( $request ) {
		if ( ! current_user_can( 'manage_rms_menu_items' ) ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'You cannot edit menu items.', 'restaurant-management-system' ),
				array( 'status' => 403 )
			);
		}

		$item = $this->get_menu_item( $request->get_param( 'id' ) );
		return is_wp_error( $item ) ? $item : true;
	}

	/**
	 * Only staff/admins with manage_rms_menu_items can delete menu items.
	 *
	 * @param WP_REST_Request $request Request data.
	 * @return bool|WP_Error
	 */
	public function delete_item_permissions_check( $request ) {
		if ( ! current_user_can( 'manage_rms_menu_items' ) ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'You cannot delete menu items.', 'restaurant-management-system' ),
				array( 'status' => 403 )
			);
		}

		$item = $this->get_menu_item( $request->get_param( 'id' ) );
		return is_wp_error( $item ) ? $item : true;
	}

	/**
	 * Fetch a valid menu_item post or a REST 404 error.
	 *
	 * @param int $id Menu item ID.
	 * @return WP_Post|WP_Error
	 */
	private function get_menu_item( $id ) {
		$post = get_post( absint( $id ) );
		if ( ! $post || 'menu_item' !== $post->post_type ) {
			return new WP_Error(
				'rest_menu_item_not_found',
				__( 'Menu item not found.', 'restaurant-management-system' ),
				array( 'status' => 404 )
			);
		}

		return $post;
	}

	/**
	 * Create a menu item. menu_category/dietary_tag terms that don't
	 * already exist are created automatically — wp_set_object_terms()
	 * inserts any term passed by name that isn't found, for both
	 * hierarchical and flat taxonomies, which is what gives us "type a
	 * new tag inline" for free.
	 *
	 * @param WP_REST_Request $request Request data.
	 * @return WP_REST_Response|WP_Error
	 */
	public function create_item( $request ) {
		$post_id = wp_insert_post(
			array(
				'post_type'    => 'menu_item',
				'post_title'   => $request->get_param( 'title' ),
				'post_content' => (string) $request->get_param( 'description' ),
				'post_status'  => 'publish',
			),
			true
		);

		if ( is_wp_error( $post_id ) || ! $post_id ) {
			return new WP_Error(
				'rest_menu_item_create_failed',
				__( 'Failed to create menu item.', 'restaurant-management-system' ),
				array( 'status' => 500 )
			);
		}

		$this->apply_write_fields( $post_id, $request, true );

		$response = rest_ensure_response( $this->prepare_item_for_response( get_post( $post_id ) ) );
		$response->set_status( 201 );

		return $response;
	}

	/**
	 * Update a menu item. Only fields present on the request are
	 * touched, since this endpoint is also used for the availability
	 * toggle's single-field PATCH from the Menu Management table.
	 *
	 * @param WP_REST_Request $request Request data.
	 * @return WP_REST_Response|WP_Error
	 */
	public function update_item( $request ) {
		$post = $this->get_menu_item( $request->get_param( 'id' ) );
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		$post_update = array( 'ID' => $post->ID );
		if ( $request->has_param( 'title' ) ) {
			$post_update['post_title'] = $request->get_param( 'title' );
		}
		if ( $request->has_param( 'description' ) ) {
			$post_update['post_content'] = $request->get_param( 'description' );
		}
		if ( count( $post_update ) > 1 ) {
			wp_update_post( $post_update );
		}

		$this->apply_write_fields( $post->ID, $request, false );

		return rest_ensure_response( $this->prepare_item_for_response( get_post( $post->ID ) ) );
	}

	/**
	 * Apply meta/taxonomy fields shared by create and update.
	 *
	 * @param int             $post_id Menu item ID.
	 * @param WP_REST_Request $request Request data.
	 * @param bool            $is_create Whether this is a create (writes defaults) or a partial update.
	 * @return void
	 */
	private function apply_write_fields( $post_id, $request, $is_create ) {
		if ( $is_create || $request->has_param( 'price' ) ) {
			update_post_meta( $post_id, 'price', $request->get_param( 'price' ) );
		}
		if ( $is_create || $request->has_param( 'prep_time_minutes' ) ) {
			update_post_meta( $post_id, 'prep_time_minutes', $request->get_param( 'prep_time_minutes' ) );
		}
		if ( $is_create || $request->has_param( 'is_available' ) ) {
			update_post_meta( $post_id, 'is_available', $request->has_param( 'is_available' ) ? $request->get_param( 'is_available' ) : true );
		}
		if ( $is_create || $request->has_param( 'menu_category' ) ) {
			wp_set_object_terms( $post_id, (array) $request->get_param( 'menu_category' ), 'menu_category', false );
		}
		if ( $is_create || $request->has_param( 'dietary_tag' ) ) {
			wp_set_object_terms( $post_id, (array) $request->get_param( 'dietary_tag' ), 'dietary_tag', false );
		}
	}

	/**
	 * Trash (not permanently delete) a menu item — matches the Tables
	 * controller's delete behavior.
	 *
	 * @param WP_REST_Request $request Request data.
	 * @return WP_REST_Response|WP_Error
	 */
	public function delete_item( $request ) {
		$post = $this->get_menu_item( $request->get_param( 'id' ) );
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		$trashed = wp_trash_post( $post->ID );
		if ( ! $trashed ) {
			return new WP_Error(
				'rest_menu_item_delete_failed',
				__( 'Failed to delete menu item.', 'restaurant-management-system' ),
				array( 'status' => 500 )
			);
		}

		return rest_ensure_response(
			array(
				'deleted' => true,
				'id'      => $post->ID,
			)
		);
	}

	/**
	 * Handle GET /rms/v1/menu-items.
	 *
	 * Only returns published, is_available=true menu items — a public
	 * customer-facing menu listing has no business surfacing draft or
	 * sold-out items to anonymous visitors.
	 *
	 * @since 1.0.0
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 * @return WP_REST_Response
	 */
	public function get_items( $request ) {

		$args = array(
			'post_type'      => 'menu_item',
			'post_status'    => 'publish',
			'posts_per_page' => $request->get_param( 'per_page' ),
			'paged'          => $request->get_param( 'page' ),

		);
		if ( ! current_user_can( 'manage_rms_menu_items' ) ) {
	// phpcs:ignore WordPress.DB.SlowDBQuery -- small dataset, acceptable for Phase 1 scope per PLAN.md §1.
			$args['meta_query'] = array(
				array(
					'key'     => 'is_available',
					'value'   => '1',
					'compare' => '=',
				),
			); }

		$tax_query = array();

		$menu_category = $request->get_param( 'menu_category' );
		if ( ! empty( $menu_category ) ) {
			$tax_query[] = array(
				'taxonomy' => 'menu_category',
				'field'    => 'slug',
				'terms'    => $menu_category,
			);
		}

		$dietary_tag = $request->get_param( 'dietary_tag' );
		if ( ! empty( $dietary_tag ) ) {
			$tax_query[] = array(
				'taxonomy' => 'dietary_tag',
				'field'    => 'slug',
				'terms'    => $dietary_tag,
			);
		}

		if ( ! empty( $tax_query ) ) {
			$args['tax_query'] = $tax_query; // phpcs:ignore WordPress.DB.SlowDBQuery -- see meta_query note above.
		}

		$query = new WP_Query( $args );

		$items = array();
		foreach ( $query->posts as $post ) {
			$items[] = $this->prepare_item_for_response( $post );
		}

		$response = rest_ensure_response( $items );
		$response->header( 'X-WP-Total', $query->found_posts );
		$response->header( 'X-WP-TotalPages', $query->max_num_pages );

		return $response;
	}

	/**
	 * Format a single menu_item post for the REST response.
	 *
	 * Deliberately returns a flat, purpose-built shape (not the full
	 * WP_REST_Posts_Controller schema) — the React Menu Management
	 * screen doesn't need guid/link/template/etc., just what it will
	 * actually render.
	 *
	 * @access private
	 * @since 1.0.0
	 *
	 * @param WP_Post $post The menu_item post.
	 * @return array
	 */
	private function prepare_item_for_response( $post ) {
		$categories = wp_get_post_terms( $post->ID, 'menu_category', array( 'fields' => 'slugs' ) );
		$tags       = wp_get_post_terms( $post->ID, 'dietary_tag', array( 'fields' => 'slugs' ) );

		return array(
			'id'                 => $post->ID,
			'title'              => get_the_title( $post ),
			'description'        => apply_filters( 'the_content', $post->post_content ), // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals -- core filter, not custom.
			'price'              => (float) get_post_meta( $post->ID, 'price', true ),
			'prep_time_minutes'  => (int) get_post_meta( $post->ID, 'prep_time_minutes', true ),
			'menu_category'      => is_wp_error( $categories ) ? array() : $categories,
			'dietary_tag'        => is_wp_error( $tags ) ? array() : $tags,
			'featured_image_url' => get_the_post_thumbnail_url( $post->ID, 'medium' ) ?: null,
			'is_available'       => '1' === (string) get_post_meta(
				$post->ID,
				'is_available',
				true
			),
		);
	}
}

if ( ! function_exists( 'restaurant_management_system_menu_rest_controller' ) ) {
	/**
	 * Return instance of Restaurant_Management_System_Menu_Rest_Controller class.
	 *
	 * @since 1.0.0
	 *
	 * @return Restaurant_Management_System_Menu_Rest_Controller
	 */
	function restaurant_management_system_menu_rest_controller() { // phpcs:ignore
		return Restaurant_Management_System_Menu_Rest_Controller::get_instance();
	}
}
