<?php // phpcs:ignore Class file names should be based on the class name with "class-" prepended.
// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Custom REST controller for private order records and their lifecycle.
 *
 * @package Restaurant_Management_System
 */
class Restaurant_Management_System_Order_Rest_Controller {

	/** @var string */
	private $namespace = 'rms/v1';

	/** @var string */
	private $rest_base = 'orders';

	/**
	 * Return the shared controller instance.
	 *
	 * @return Restaurant_Management_System_Order_Rest_Controller
	 */
	public static function get_instance() {
		static $instance = null;

		if ( null === $instance ) {
			$instance = new self();
		}

		return $instance;
	}

	/**
	 * Register the order collection and item routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_items' ),
					'permission_callback' => array( $this, 'get_items_permissions_check' ),
					'args'                => $this->get_collection_args(),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'create_item' ),
					'permission_callback' => array( $this, 'create_item_permissions_check' ),
					'args'                => $this->get_create_item_args(),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/(?P<id>[\d]+)',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_item' ),
					'permission_callback' => array( $this, 'get_item_permissions_check' ),
				),
				array(
					'methods'             => WP_REST_Server::EDITABLE,
					'callback'            => array( $this, 'update_item' ),
					'permission_callback' => array( $this, 'update_item_permissions_check' ),
					'args'                => $this->get_update_item_args(),
				),
			)
		);
	}

	/**
	 * Require a role that can create or manage orders for a collection read.
	 *
	 * @return bool
	 */
	public function get_items_permissions_check() {
		return current_user_can( 'manage_rms_orders' ) || current_user_can( 'create_rms_orders' );
	}

	/**
	 * Require a role that can create orders.
	 *
	 * @return bool
	 */
	public function create_item_permissions_check() {
		return current_user_can( 'manage_rms_orders' ) || current_user_can( 'create_rms_orders' );
	}

	/**
	 * Allow managers to view all orders and customers to view their own.
	 *
	 * @param WP_REST_Request $request Request data.
	 * @return bool|WP_Error
	 */
	public function get_item_permissions_check( $request ) {
		$order = $this->get_order( $request->get_param( 'id' ) );
		if ( is_wp_error( $order ) ) {
			return $order;
		}

		if ( current_user_can( 'manage_rms_orders' ) ) {
			return true;
		}

		if ( current_user_can( 'create_rms_orders' ) && absint( get_post_meta( $order->ID, 'customer_id', true ) ) === get_current_user_id() ) {
			return true;
		}

		return new WP_Error(
			'rest_forbidden',
			__( 'You cannot view this order.', 'restaurant-management-system' ),
			array( 'status' => 403 )
		);
	}

	/**
	 * Only Staff and Administrators can progress an order lifecycle.
	 *
	 * @param WP_REST_Request $request Request data.
	 * @return bool|WP_Error
	 */
	public function update_item_permissions_check( $request ) {
		if ( ! current_user_can( 'manage_rms_orders' ) ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'You cannot update this order.', 'restaurant-management-system' ),
				array( 'status' => 403 )
			);
		}

		$order = $this->get_order( $request->get_param( 'id' ) );
		return is_wp_error( $order ) ? $order : true;
	}

	/**
	 * Shared collection query arguments.
	 *
	 * @return array
	 */
	private function get_collection_args() {
		return array(
			'page'         => array(
				'type'              => 'integer',
				'default'           => 1,
				'sanitize_callback' => 'absint',
			),
			'per_page'     => array(
				'type'              => 'integer',
				'default'           => 20,
				'sanitize_callback' => 'absint',
			),
			'order_status' => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_key',
				'validate_callback' => array( $this, 'validate_order_status' ),
			),
		);
	}

	/**
	 * Creation arguments. Prices and totals are intentionally not accepted.
	 *
	 * @return array
	 */
	private function get_create_item_args() {
		return array(
			'order_type'   => array(
				'type'              => 'string',
				'required'          => true,
				'sanitize_callback' => 'sanitize_key',
				'validate_callback' => function( $value ) {
					return in_array( $value, array( 'dine_in', 'takeout' ), true );
				},
			),
			'order_source' => array(
				'type'              => 'string',
				'required'          => true,
				'sanitize_callback' => 'sanitize_key',
				'validate_callback' => function( $value ) {
					return in_array( $value, array( 'staff_pos', 'customer_portal' ), true );
				},
			),
			'items'        => array(
				'type'              => 'array',
				'required'          => true,
				'sanitize_callback' => function( $value ) {
					return is_array( $value ) ? $value : array();
				},
				'validate_callback' => array( $this, 'validate_order_items' ),
			),
			'table_id'     => array(
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
			),
			'customer_id'  => array(
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
			),
		);
	}

	/**
	 * Lifecycle update arguments.
	 *
	 * @return array
	 */
	private function get_update_item_args() {
		return array(
			'status' => array(
				'type'              => 'string',
				'required'          => true,
				'sanitize_callback' => 'sanitize_key',
				'validate_callback' => array( $this, 'validate_order_status' ),
			),
		);
	}

	/**
	 * Validate a lifecycle status slug.
	 *
	 * @param string $value Status slug.
	 * @return bool
	 */
	public function validate_order_status( $value ) {
		return in_array( $value, $this->get_statuses(), true );
	}

	/**
	 * Validate the shape of requested items before resolving them.
	 *
	 * @param array $items Submitted items.
	 * @return bool
	 */
	public function validate_order_items( $items ) {
		if ( ! is_array( $items ) || empty( $items ) ) {
			return false;
		}

		foreach ( $items as $item ) {
			if ( ! is_array( $item ) || empty( $item['menu_item_id'] ) || empty( $item['quantity'] ) || absint( $item['menu_item_id'] ) < 1 || absint( $item['quantity'] ) < 1 ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * List orders, restricting customers to their own records.
	 *
	 * @param WP_REST_Request $request Request data.
	 * @return WP_REST_Response
	 */
	public function get_items( $request ) {
		$args = array(
			'post_type'      => 'order',
			'post_status'    => 'publish',
			'posts_per_page' => max( 1, min( 100, absint( $request->get_param( 'per_page' ) ) ) ),
			'paged'          => max( 1, absint( $request->get_param( 'page' ) ) ),
			'orderby'        => 'date',
			'order'          => 'DESC',
		);

		if ( ! current_user_can( 'manage_rms_orders' ) ) {
			$args['meta_query'] = array(
				array(
					'key'     => 'customer_id',
					'value'   => get_current_user_id(),
					'compare' => '=',
				),
			);
		}

		$status = $request->get_param( 'order_status' );
		if ( $status ) {
			$args['tax_query'] = array(
				array(
					'taxonomy' => 'order_status',
					'field'    => 'slug',
					'terms'    => $status,
				),
			);
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
	 * Return one order after its permission callback has checked ownership.
	 *
	 * @param WP_REST_Request $request Request data.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_item( $request ) {
		$order = $this->get_order( $request->get_param( 'id' ) );
		if ( is_wp_error( $order ) ) {
			return $order;
		}

		return rest_ensure_response( $this->prepare_item_for_response( $order ) );
	}

	/**
	 * Create an order with server-resolved item prices and total.
	 *
	 * @param WP_REST_Request $request Request data.
	 * @return WP_REST_Response|WP_Error
	 */
	public function create_item( $request ) {
		$order_type   = $request->get_param( 'order_type' );
		$order_source = $request->get_param( 'order_source' );
		$is_manager   = current_user_can( 'manage_rms_orders' );

		if ( ! $this->is_allowed_order_flow( $order_type, $order_source, $is_manager ) ) {
			return new WP_Error(
				'rest_order_flow_not_allowed',
				__( 'Customers can create takeout portal orders only; staff POS orders must be dine-in.', 'restaurant-management-system' ),
				array( 'status' => 403 )
			);
		}

		$table_id = absint( $request->get_param( 'table_id' ) );
		if ( 'dine_in' === $order_type ) {
			$table = get_post( $table_id );
			if ( ! $table || 'table' !== $table->post_type ) {
				return new WP_Error(
					'rest_table_not_found',
					__( 'A valid table is required for a dine-in order.', 'restaurant-management-system' ),
					array( 'status' => 422 )
				);
			}
		} else {
			$table_id = 0;
		}

		$resolved_items = $this->resolve_order_items( $request->get_param( 'items' ) );
		if ( is_wp_error( $resolved_items ) ) {
			return $resolved_items;
		}

		$current_user_id = get_current_user_id();
		$customer_id     = $is_manager && $request->has_param( 'customer_id' ) ? absint( $request->get_param( 'customer_id' ) ) : ( $is_manager ? 0 : $current_user_id );

		$order_id = wp_insert_post(
			array(
				'post_type'   => 'order',
				'post_title'  => __( 'New order', 'restaurant-management-system' ),
				'post_status' => 'publish',
				'post_author' => $current_user_id,
			)
		);

		if ( is_wp_error( $order_id ) || ! $order_id ) {
			return new WP_Error(
				'rest_order_create_failed',
				__( 'Failed to create order.', 'restaurant-management-system' ),
				array( 'status' => 500 )
			);
		}

		wp_set_object_terms( $order_id, 'pending', 'order_status', false );
		wp_update_post(
			array(
				'ID'         => $order_id,
				'post_title' => sprintf( __( 'Order #%d', 'restaurant-management-system' ), $order_id ),
			)
		);

		update_post_meta( $order_id, 'order_type', $order_type );
		update_post_meta( $order_id, 'order_source', $order_source );
		update_post_meta( $order_id, 'items', wp_json_encode( $resolved_items['items'] ) );
		update_post_meta( $order_id, 'total_amount', $resolved_items['total_amount'] );
		update_post_meta( $order_id, 'table_id', $table_id );
		update_post_meta( $order_id, 'customer_id', $customer_id );
		update_post_meta( $order_id, 'created_by', $current_user_id );

		$response = rest_ensure_response( $this->prepare_item_for_response( get_post( $order_id ) ) );
		$response->set_status( 201 );

		return $response;
	}

	/**
	 * Advance an order through its permitted status transitions.
	 *
	 * @param WP_REST_Request $request Request data.
	 * @return WP_REST_Response|WP_Error
	 */
	public function update_item( $request ) {
		$order = $this->get_order( $request->get_param( 'id' ) );
		if ( is_wp_error( $order ) ) {
			return $order;
		}

		$current_status = $this->get_order_status( $order->ID );
		$next_status    = $request->get_param( 'status' );

		if ( $next_status !== $current_status && ! $this->is_valid_transition( $current_status, $next_status ) ) {
			return new WP_Error(
				'rest_order_invalid_transition',
				__( 'This order cannot move to the requested status.', 'restaurant-management-system' ),
				array( 'status' => 409 )
			);
		}

		if ( $next_status !== $current_status ) {
			wp_set_object_terms( $order->ID, $next_status, 'order_status', false );
		}

		return rest_ensure_response( $this->prepare_item_for_response( get_post( $order->ID ) ) );
	}

	/**
	 * Fetch a valid order post or return a REST 404 error.
	 *
	 * @param int $order_id Order ID.
	 * @return WP_Post|WP_Error
	 */
	private function get_order( $order_id ) {
		$order = get_post( absint( $order_id ) );
		if ( ! $order || 'order' !== $order->post_type ) {
			return new WP_Error(
				'rest_order_not_found',
				__( 'Order not found.', 'restaurant-management-system' ),
				array( 'status' => 404 )
			);
		}

		return $order;
	}

	/**
	 * Resolve menu records into immutable price snapshots.
	 *
	 * @param array $requested_items Client-submitted menu IDs and quantities.
	 * @return array|WP_Error
	 */
	private function resolve_order_items( $requested_items ) {
		$quantities = array();
		foreach ( $requested_items as $requested_item ) {
			$menu_item_id = absint( $requested_item['menu_item_id'] );
			$quantity     = absint( $requested_item['quantity'] );
			$quantities[ $menu_item_id ] = isset( $quantities[ $menu_item_id ] ) ? $quantities[ $menu_item_id ] + $quantity : $quantity;
		}

		$snapshots = array();
		$total     = 0.0;
		foreach ( $quantities as $menu_item_id => $quantity ) {
			$menu_item = get_post( $menu_item_id );
			if ( ! $menu_item || 'menu_item' !== $menu_item->post_type || 'publish' !== $menu_item->post_status ) {
				return new WP_Error(
					'rest_menu_item_not_found',
					__( 'One or more menu items could not be found.', 'restaurant-management-system' ),
					array( 'status' => 422 )
				);
			}

			$availability = get_post_meta( $menu_item_id, 'is_available', true );
			if ( '' !== $availability && ! rest_sanitize_boolean( $availability ) ) {
				return new WP_Error(
					'rest_menu_item_unavailable',
					__( 'One or more menu items are unavailable.', 'restaurant-management-system' ),
					array( 'status' => 409 )
				);
			}

			$unit_price = (float) get_post_meta( $menu_item_id, 'price', true );
			$line_total = round( $unit_price * $quantity, 2 );
			$snapshots[] = array(
				'menu_item_id' => (int) $menu_item_id,
				'item_title'   => get_the_title( $menu_item ),
				'unit_price'   => $unit_price,
				'quantity'     => (int) $quantity,
				'line_total'   => $line_total,
			);
			$total += $line_total;
		}

		return array(
			'items'        => $snapshots,
			'total_amount' => round( $total, 2 ),
		);
	}

	/**
	 * Check whether the requesting role may use the requested order path.
	 *
	 * @param string $order_type Requested fulfilment type.
	 * @param string $order_source Requested origin.
	 * @param bool   $is_manager Whether the user can manage all orders.
	 * @return bool
	 */
	private function is_allowed_order_flow( $order_type, $order_source, $is_manager ) {
		if ( 'customer_portal' === $order_source && 'takeout' === $order_type ) {
			return true;
		}

		return $is_manager && 'staff_pos' === $order_source && 'dine_in' === $order_type;
	}

	/**
	 * Return fixed lifecycle statuses.
	 *
	 * @return array
	 */
	private function get_statuses() {
		return array( 'pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled' );
	}

	/**
	 * Return an order's current lifecycle slug.
	 *
	 * @param int $order_id Order ID.
	 * @return string
	 */
	private function get_order_status( $order_id ) {
		$terms = wp_get_post_terms( $order_id, 'order_status', array( 'fields' => 'slugs' ) );
		return ! is_wp_error( $terms ) && ! empty( $terms ) ? $terms[0] : 'pending';
	}

	/**
	 * Restrict status updates to the defined lifecycle.
	 *
	 * @param string $current_status Current lifecycle status.
	 * @param string $next_status Requested lifecycle status.
	 * @return bool
	 */
	private function is_valid_transition( $current_status, $next_status ) {
		$transitions = array(
			'pending'   => array( 'confirmed', 'cancelled' ),
			'confirmed' => array( 'preparing', 'cancelled' ),
			'preparing' => array( 'ready', 'cancelled' ),
			'ready'     => array( 'delivered', 'cancelled' ),
			'delivered' => array(),
			'cancelled' => array(),
		);

		return isset( $transitions[ $current_status ] ) && in_array( $next_status, $transitions[ $current_status ], true );
	}

	/**
	 * Format an order as the React client contract.
	 *
	 * @param WP_Post $order Order post.
	 * @return array
	 */
	private function prepare_item_for_response( $order ) {
		$items = json_decode( get_post_meta( $order->ID, 'items', true ), true );

		return array(
			'id'           => $order->ID,
			'title'        => get_the_title( $order ),
			'status'       => $this->get_order_status( $order->ID ),
			'order_type'   => get_post_meta( $order->ID, 'order_type', true ),
			'order_source' => get_post_meta( $order->ID, 'order_source', true ),
			'items'        => is_array( $items ) ? $items : array(),
			'total_amount' => (float) get_post_meta( $order->ID, 'total_amount', true ),
			'table_id'     => absint( get_post_meta( $order->ID, 'table_id', true ) ),
			'customer_id'  => absint( get_post_meta( $order->ID, 'customer_id', true ) ),
			'created_by'   => absint( get_post_meta( $order->ID, 'created_by', true ) ),
			'created_at'   => get_post_time( DATE_W3C, true, $order ),
		);
	}
}

if ( ! function_exists( 'restaurant_management_system_order_rest_controller' ) ) {
	/**
	 * Return the order REST controller instance.
	 *
	 * @return Restaurant_Management_System_Order_Rest_Controller
	 */
	function restaurant_management_system_order_rest_controller() { // phpcs:ignore
		return Restaurant_Management_System_Order_Rest_Controller::get_instance();
	}
}
