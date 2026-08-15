<?php // phpcs:ignore Class file names should be based on the class name with "class-" prepended.
// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Custom REST controller for tables.
 *
 * Registers the initial table-focused endpoints for Milestone B:
 * GET /rms/v1/tables to list table state, and PATCH /rms/v1/tables/<id>
 * to update table metadata such as status and floor-plan coordinates.
 *
 * @package    Restaurant_Management_System
 * @subpackage Restaurant_Management_System/includes
 */
class Restaurant_Management_System_Table_Rest_Controller {

	/**
	 * REST namespace.
	 *
	 * @var string
	 */
	private $namespace = 'rms/v1';

	/**
	 * REST base for tables.
	 *
	 * @var string
	 */
	private $rest_base = 'tables';

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
	 * Register the REST routes.
	 *
	 * @since 1.0.0
	 */
	public function register_routes() {
		// Customers need table IDs and capacities to make a reservation, but
		// should not receive the operational table-management endpoint.
		register_rest_route(
			$this->namespace,
			'/customer-tables',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_customer_tables' ),
				'permission_callback' => function () {
					return current_user_can( 'create_rms_reservations' ) || current_user_can( 'manage_rms_reservations' );
				},
			)
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_items' ),
					'permission_callback' => function () {
						return current_user_can( 'manage_rms_tables' );
					},
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'create_item' ),
					'permission_callback' => function () {
						return current_user_can( 'manage_rms_tables' );
					},
					'args'                => $this->get_create_item_args(),
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
					'permission_callback' => function () {
						return current_user_can( 'manage_rms_tables' );
					},
					'args'                => $this->get_update_item_args(),
				),
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'delete_item' ),
					'permission_callback' => function () {
						return current_user_can( 'manage_rms_tables' );
					},
				),
			)
		);
	}

	/**
	 * Table args for creation — title is required, everything else optional.
	 *
	 * @return array
	 */
	private function get_create_item_args() {
		return array(
			'title'    => array(
				'type'              => 'string',
				'required'          => true,
				'sanitize_callback' => 'sanitize_text_field',
			),
			'status'   => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'validate_callback' => function ( $value, $request, $key ) {
					return in_array( $value, array( 'Available', 'Occupied', 'Out of Service' ), true );
				},
			),
			'capacity' => array(
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
			),
			'section'  => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
			),
			'grid_x'   => array(
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
				'validate_callback' => function ( $value, $request, $key ) {
					if ( ! is_numeric( $value ) ) {
						return false;
					}

					$int_value = (int) $value;
					return $int_value >= 0 && $int_value <= 11;
				},
			),
			'grid_y'   => array(
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
				'validate_callback' => function ( $value, $request, $key ) {
					if ( ! is_numeric( $value ) ) {
						return false;
					}

					$int_value = (int) $value;
					return $int_value >= 0 && $int_value <= 11;
				},
			),
		);
	}

	/**
	 * Table args for updates — every field optional, since update_item()
	 * already supports partial updates (only the fields present are
	 * written). title must NOT be required here, or a drag-only PATCH
	 * sending just grid_x/grid_y is rejected before update_item() runs.
	 *
	 * @return array
	 */
	private function get_update_item_args() {
		return array(
			'title'    => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
			),
			'status'   => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'validate_callback' => function ( $value, $request, $key ) {
					return in_array( $value, array( 'Available', 'Occupied', 'Out of Service' ), true );
				},
			),
			'capacity' => array(
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
			),
			'section'  => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
			),
			'grid_x'   => array(
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
				'validate_callback' => function ( $value, $request, $key ) {
					if ( ! is_numeric( $value ) ) {
						return false;
					}

					$int_value = (int) $value;
					return $int_value >= 0 && $int_value <= 11;
				},
			),
			'grid_y'   => array(
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
				'validate_callback' => function ( $value, $request, $key ) {
					if ( ! is_numeric( $value ) ) {
						return false;
					}

					$int_value = (int) $value;
					return $int_value >= 0 && $int_value <= 11;
				},
			),
		);
	}

	/**
	 * Handle GET /rms/v1/tables.
	 *
	 * @since 1.0.0
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 * @return WP_REST_Response
	 */
	public function get_items( $request ) {
		$query = new WP_Query(
			array(
				'post_type'      => 'table',
				'post_status'    => 'publish',
				'posts_per_page' => -1,
				'orderby'        => 'menu_order',
				'order'          => 'ASC',
			)
		);

		$items = array();
		foreach ( $query->posts as $post ) {
			$items[] = $this->prepare_item_for_response( $post );
		}

		return rest_ensure_response( $items );
	}

	/**
	 * Return the small, customer-safe table shape needed by booking forms.
	 *
	 * @return WP_REST_Response
	 */
	public function get_customer_tables() {
		$query = new WP_Query(
			array(
				'post_type'      => 'table',
				'post_status'    => 'publish',
				'posts_per_page' => -1,
				'orderby'        => 'menu_order',
				'order'          => 'ASC',
			)
		);

		$items = array();
		foreach ( $query->posts as $post ) {
			$items[] = array(
				'id'       => $post->ID,
				'title'    => get_the_title( $post ),
				'capacity' => absint( get_post_meta( $post->ID, 'capacity', true ) ),
				'section'  => get_post_meta( $post->ID, 'section', true ),
			);
		}

		return rest_ensure_response( $items );
	}

	/**
	 * Handle PATCH /rms/v1/tables/<id>.
	 *
	 * @since 1.0.0
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function update_item( $request ) {
		$table_id = absint( $request->get_param( 'id' ) );
		$post     = get_post( $table_id );

		if ( ! $post || 'table' !== $post->post_type ) {
			return new WP_Error(
				'rest_table_not_found',
				__( 'Table not found.', 'restaurant-management-system' ),
				array( 'status' => 404 )
			);
		}

		$updated = false;

		if ( $request->has_param( 'title' ) ) {
			wp_update_post(
				array(
					'ID'         => $table_id,
					'post_title' => sanitize_text_field( $request->get_param( 'title' ) ),
				)
			);
			$updated = true;
		}

		if ( $request->has_param( 'status' ) ) {
			update_post_meta( $table_id, 'status', sanitize_text_field( $request->get_param( 'status' ) ) );
			$updated = true;
		}

		if ( $request->has_param( 'capacity' ) ) {
			update_post_meta( $table_id, 'capacity', absint( $request->get_param( 'capacity' ) ) );
			$updated = true;
		}

		if ( $request->has_param( 'section' ) ) {
			update_post_meta( $table_id, 'section', sanitize_text_field( $request->get_param( 'section' ) ) );
			$updated = true;
		}

		if ( $request->has_param( 'grid_x' ) ) {
			update_post_meta( $table_id, 'grid_x', absint( $request->get_param( 'grid_x' ) ) );
			$updated = true;
		}

		if ( $request->has_param( 'grid_y' ) ) {
			update_post_meta( $table_id, 'grid_y', absint( $request->get_param( 'grid_y' ) ) );
			$updated = true;
		}

		if ( ! $updated ) {
			return new WP_Error(
				'rest_table_empty_update',
				__( 'No table fields were provided for update.', 'restaurant-management-system' ),
				array( 'status' => 400 )
			);
		}

		return rest_ensure_response( $this->prepare_item_for_response( get_post( $table_id ) ) );
	}

	/**
	 * Handle POST /rms/v1/tables.
	 *
	 * @since 1.0.0
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function create_item( $request ) {
		$title = sanitize_text_field( $request->get_param( 'title' ) );
		if ( empty( $title ) ) {
			return new WP_Error(
				'rest_table_title_required',
				__( 'Table name is required.', 'restaurant-management-system' ),
				array( 'status' => 400 )
			);
		}

		$table_id = wp_insert_post(
			array(
				'post_type'   => 'table',
				'post_title'  => $title,
				'post_status' => 'publish',
			)
		);

		if ( is_wp_error( $table_id ) || ! $table_id ) {
			return new WP_Error(
				'rest_table_create_failed',
				__( 'Failed to create table.', 'restaurant-management-system' ),
				array( 'status' => 500 )
			);
		}

		if ( $request->has_param( 'status' ) ) {
			update_post_meta( $table_id, 'status', sanitize_text_field( $request->get_param( 'status' ) ) );
		}

		if ( $request->has_param( 'capacity' ) ) {
			update_post_meta( $table_id, 'capacity', absint( $request->get_param( 'capacity' ) ) );
		}

		if ( $request->has_param( 'section' ) ) {
			update_post_meta( $table_id, 'section', sanitize_text_field( $request->get_param( 'section' ) ) );
		}

		if ( $request->has_param( 'grid_x' ) ) {
			update_post_meta( $table_id, 'grid_x', absint( $request->get_param( 'grid_x' ) ) );
		}

		if ( $request->has_param( 'grid_y' ) ) {
			update_post_meta( $table_id, 'grid_y', absint( $request->get_param( 'grid_y' ) ) );
		}

		return rest_ensure_response( $this->prepare_item_for_response( get_post( $table_id ) ) );
	}

	/**
	 * Handle DELETE /rms/v1/tables/<id>.
	 *
	 * @since 1.0.0
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function delete_item( $request ) {
		$table_id = absint( $request->get_param( 'id' ) );
		$post     = get_post( $table_id );

		if ( ! $post || 'table' !== $post->post_type ) {
			return new WP_Error(
				'rest_table_not_found',
				__( 'Table not found.', 'restaurant-management-system' ),
				array( 'status' => 404 )
			);
		}

		$trashed = wp_trash_post( $table_id );
		if ( ! $trashed ) {
			return new WP_Error(
				'rest_table_delete_failed',
				__( 'Unable to delete table.', 'restaurant-management-system' ),
				array( 'status' => 500 )
			);
		}

		return rest_ensure_response(
			array(
				'deleted' => true,
				'id'      => $table_id,
			)
		);
	}

	/**
	 * Format a single table post for the REST response.
	 *
	 * @access private
	 * @since 1.0.0
	 *
	 * @param WP_Post $post The table post.
	 * @return array
	 */
	private function prepare_item_for_response( $post ) {
		return array(
			'id'       => $post->ID,
			'title'    => get_the_title( $post ),
			'status'   => get_post_meta( $post->ID, 'status', true ),
			'capacity' => (int) get_post_meta( $post->ID, 'capacity', true ),
			'section'  => get_post_meta( $post->ID, 'section', true ),
			'grid_x'   => (int) get_post_meta( $post->ID, 'grid_x', true ),
			'grid_y'   => (int) get_post_meta( $post->ID, 'grid_y', true ),
		);
	}
}

if ( ! function_exists( 'restaurant_management_system_table_rest_controller' ) ) {
	/**
	 * Return instance of Restaurant_Management_System_Table_Rest_Controller class.
	 *
	 * @since 1.0.0
	 *
	 * @return Restaurant_Management_System_Table_Rest_Controller
	 */
	function restaurant_management_system_table_rest_controller() { // phpcs:ignore
		return Restaurant_Management_System_Table_Rest_Controller::get_instance();
	}
}