<?php // phpcs:ignore Class file names should be based on the class name with "class-" prepended.
// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Custom REST controller for reservations.
 *
 * Implements Milestone C: reservation creation, ownership filtering,
 * capacity validation, and 90-minute strict-overlap conflict detection.
 *
 * @package    Restaurant_Management_System
 * @subpackage Restaurant_Management_System/includes
 */
class Restaurant_Management_System_Reservation_Rest_Controller {

	/**
	 * REST namespace.
	 *
	 * @var string
	 */
	private $namespace = 'rms/v1';

	/**
	 * REST base for reservations.
	 *
	 * @var string
	 */
	private $rest_base = 'reservations';

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
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_items' ),
					'permission_callback' => array( $this, 'get_items_permissions_check' ),
					'args'                => array(
						'page'     => array(
							'type'              => 'integer',
							'required'          => false,
							'default'           => 1,
							'sanitize_callback' => 'absint',
						),
						'per_page' => array(
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
					'args'                => $this->get_item_args(),
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
					'args'                => array(
						'id' => array(
							'required'          => true,
							'sanitize_callback' => 'absint',
						),
					),
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
			'args'                => array(
				'id' => array(
					'required'          => true,
					'sanitize_callback' => 'absint',
				),
			),
		),
		array(
			'methods'             => WP_REST_Server::EDITABLE,
			'callback'            => array( $this, 'update_item' ),
			'permission_callback' => array( $this, 'update_item_permissions_check' ),
			'args'                => array(
				'status' => array(
					'type'              => 'string',
					'required'          => true,
					'sanitize_callback' => 'sanitize_key',
					'validate_callback' => array( $this, 'validate_reservation_status' ),
				),
			),
		),
	)
   );
	}

	/**
	 * Permissions for listing reservations.
	 *
	 * @since 1.0.0
	 *
	 * @return bool
	 */
	public function get_items_permissions_check() {
		return is_user_logged_in();
	}

	/**
	 * Permissions for creating reservations.
	 *
	 * @since 1.0.0
	 *
	 * @return bool
	 */
	public function create_item_permissions_check() {
		return current_user_can( 'create_rms_reservations' ) || current_user_can( 'manage_rms_reservations' );
	}

	/**
	 * Permissions for fetching a single reservation.
	 *
	 * @since 1.0.0
	 *
	 * @param WP_REST_Request $request Full request.
	 * @return bool|WP_Error
	 */
	public function get_item_permissions_check( $request ) {
		$current_user_id = get_current_user_id();
		$reservation_id  = absint( $request->get_param( 'id' ) );
		$post            = get_post( $reservation_id );

		if ( ! $post || 'reservation' !== $post->post_type ) {
			return new WP_Error(
				'rest_reservation_not_found',
				__( 'Reservation not found.', 'restaurant-management-system' ),
				array( 'status' => 404 )
			);
		}

		if ( current_user_can( 'manage_rms_reservations' ) ) {
			return true;
		}

		$customer_id = absint( get_post_meta( $reservation_id, 'customer_id', true ) );
		if ( $customer_id === $current_user_id && current_user_can( 'create_rms_reservations' ) ) {
			return true;
		}

		return new WP_Error(
			'rest_forbidden',
			__( 'You cannot view this reservation.', 'restaurant-management-system' ),
			array( 'status' => 403 )
		);
	}

	/**
	 * Returns the REST item args for creating a reservation.
	 *
	 * @since 1.0.0
	 *
	 * @return array
	 */
	private function get_item_args() {
		return array(
			'table_id'       => array(
				'type'              => 'integer',
				'required'          => true,
				'sanitize_callback' => 'absint',
			),
			'start_datetime' => array(
				'type'              => 'string',
				'required'          => true,
				'sanitize_callback' => 'sanitize_text_field',
			),
			'party_size'     => array(
				'type'              => 'integer',
				'required'          => true,
				'sanitize_callback' => 'absint',
			),
			'customer_id'    => array(
				'type'              => 'integer',
				'required'          => false,
				'sanitize_callback' => 'absint',
			),
			'contact_name'   => array(
				'type'              => 'string',
				'required'          => true,
				'sanitize_callback' => 'sanitize_text_field',
			),
			'contact_phone'  => array(
				'type'              => 'string',
				'required'          => true,
				'sanitize_callback' => 'sanitize_text_field',
			),
		);
	}



	/**
	 * Handle GET /rms/v1/reservations.
	 *
	 * @since 1.0.0
	 *
	 * @param WP_REST_Request $request Full request.
	 * @return WP_REST_Response
	 */
	public function get_items( $request ) {
		$args = array(
			'post_type'      => 'reservation',
			'post_status'    => 'publish',
			'posts_per_page' => max( 1, $request->get_param( 'per_page' ) ),
			'paged'          => max( 1, $request->get_param( 'page' ) ),
			'orderby'        => 'meta_value',
			'meta_key'       => 'start_datetime',
			'order'          => 'ASC',
		);

		if ( ! current_user_can( 'manage_rms_reservations' ) ) {
			$args['meta_query'] = array(
				array(
					'key'     => 'customer_id',
					'value'   => get_current_user_id(),
					'compare' => '=',
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
	 * Handle GET /rms/v1/reservations/<id>.
	 *
	 * @since 1.0.0
	 *
	 * @param WP_REST_Request $request Full request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_item( $request ) {
		$reservation_id = absint( $request->get_param( 'id' ) );
		$post           = get_post( $reservation_id );

		if ( ! $post || 'reservation' !== $post->post_type ) {
			return new WP_Error(
				'rest_reservation_not_found',
				__( 'Reservation not found.', 'restaurant-management-system' ),
				array( 'status' => 404 )
			);
		}

		return rest_ensure_response( $this->prepare_item_for_response( $post ) );
	}
	/**
 * Only Staff and Administrators can change a reservation's status.
 *
 * @param WP_REST_Request $request Request data.
 * @return bool|WP_Error
 */
public function update_item_permissions_check( $request ) {
	if ( ! current_user_can( 'manage_rms_reservations' ) ) {
		return new WP_Error(
			'rest_forbidden',
			__( 'You cannot update this reservation.', 'restaurant-management-system' ),
			array( 'status' => 403 )
		);
	}

	$reservation_id = absint( $request->get_param( 'id' ) );
	$post            = get_post( $reservation_id );

	if ( ! $post || 'reservation' !== $post->post_type ) {
		return new WP_Error(
			'rest_reservation_not_found',
			__( 'Reservation not found.', 'restaurant-management-system' ),
			array( 'status' => 404 )
		);
	}

	return true;
}

/**
 * Validate a reservation lifecycle status slug.
 *
 * @param string $value Status slug.
 * @return bool
 */
public function validate_reservation_status( $value ) {
	return in_array( $value, array( 'confirmed', 'completed', 'cancelled', 'no_show' ), true );
}

/**
 * Advance a reservation through its permitted status transitions.
 *
 * All three terminal states (completed, cancelled, no_show) are only
 * reachable from 'confirmed' — there is no path back, matching Order's
 * one-directional lifecycle model.
 *
 * @param WP_REST_Request $request Request data.
 * @return WP_REST_Response|WP_Error
 */
public function update_item( $request ) {
	$reservation_id = absint( $request->get_param( 'id' ) );
	$current_status = $this->get_reservation_status( $reservation_id );
	$next_status    = $request->get_param( 'status' );

	$transitions = array(
		'confirmed' => array( 'completed', 'cancelled', 'no_show' ),
		'completed' => array(),
		'cancelled' => array(),
		'no_show'   => array(),
	);

	if ( $next_status !== $current_status && ! in_array( $next_status, $transitions[ $current_status ], true ) ) {
		return new WP_Error(
			'rest_reservation_invalid_transition',
			__( 'This reservation cannot move to the requested status.', 'restaurant-management-system' ),
			array( 'status' => 409 )
		);
	}

	if ( $next_status !== $current_status ) {
		wp_set_object_terms( $reservation_id, $next_status, 'reservation_status', false );
	}

	return rest_ensure_response( $this->prepare_item_for_response( get_post( $reservation_id ) ) );
}

/**
 * Return a reservation's current lifecycle slug.
 *
 * @param int $reservation_id Reservation ID.
 * @return string
 */
private function get_reservation_status( $reservation_id ) {
	$terms = wp_get_post_terms( $reservation_id, 'reservation_status', array( 'fields' => 'slugs' ) );
	return ! is_wp_error( $terms ) && ! empty( $terms ) ? $terms[0] : 'confirmed';
}

	/**
	 * Handle POST /rms/v1/reservations.
	 *
	 * @since 1.0.0
	 *
	 * @param WP_REST_Request $request Full request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function create_item( $request ) {
		$table_id      = absint( $request->get_param( 'table_id' ) );
		$party_size    = absint( $request->get_param( 'party_size' ) );
		$contact_name  = sanitize_text_field( $request->get_param( 'contact_name' ) );
		$contact_phone = sanitize_text_field( $request->get_param( 'contact_phone' ) );
		$start         = $this->normalize_datetime_to_utc( $request->get_param( 'start_datetime' ) );

		if ( ! $start ) {
			return new WP_Error(
				'rest_invalid_start_datetime',
				__( 'Invalid start datetime. Provide a valid ISO 8601 timestamp.', 'restaurant-management-system' ),
				array( 'status' => 400 )
			);
		}

		$table = get_post( $table_id );
		if ( ! $table || 'table' !== $table->post_type ) {
			return new WP_Error(
				'rest_table_not_found',
				__( 'Table not found.', 'restaurant-management-system' ),
				array( 'status' => 404 )
			);
		}

		$capacity = absint( get_post_meta( $table_id, 'capacity', true ) );
		if ( $capacity <= 0 ) {
			return new WP_Error(
				'rest_table_capacity_invalid',
				__( 'Table capacity is invalid.', 'restaurant-management-system' ),
				array( 'status' => 500 )
			);
		}

		if ( $party_size > $capacity ) {
			return new WP_Error(
				'rest_party_too_large',
				__( 'Party size exceeds table capacity.', 'restaurant-management-system' ),
				array( 'status' => 422 )
			);
		}

		$table_status = get_post_meta( $table_id, 'status', true );
		if ( 'Out of Service' === $table_status ) {
			return new WP_Error(
				'rest_table_unavailable',
				__( 'This table is not currently available for booking.', 'restaurant-management-system' ),
				array( 'status' => 409 )
			);
		}

		$end = $start->modify( '+90 minutes' );

		if ( $this->has_conflicting_reservation( $table_id, $start, $end ) ) {
			return new WP_Error(
				'rest_reservation_conflict',
				__( 'The requested reservation conflicts with an existing booking.', 'restaurant-management-system' ),
				array( 'status' => 409 )
			);
		}

		$current_user_id = get_current_user_id();
		$customer_id     = $current_user_id;
		if ( current_user_can( 'manage_rms_reservations' ) && $request->has_param( 'customer_id' ) ) {
			$customer_id = absint( $request->get_param( 'customer_id' ) );
		}

		$reservation_id = wp_insert_post(
			array(
				'post_type'   => 'reservation',
				'post_title'  => sprintf( 'Reservation for %s', $contact_name ),
				'post_status' => 'publish',
			)
		);

		if ( is_wp_error( $reservation_id ) || ! $reservation_id ) {
			return new WP_Error(
				'rest_reservation_create_failed',
				__( 'Failed to create reservation.', 'restaurant-management-system' ),
				array( 'status' => 500 )
			);
		}

		update_post_meta( $reservation_id, 'table_id', $table_id );
		update_post_meta( $reservation_id, 'customer_id', $customer_id );
		update_post_meta( $reservation_id, 'party_size', $party_size );
		update_post_meta( $reservation_id, 'start_datetime', $start->format( DATE_W3C ) );
		update_post_meta( $reservation_id, 'end_datetime', $end->format( DATE_W3C ) );
		update_post_meta( $reservation_id, 'contact_name', $contact_name );
		update_post_meta( $reservation_id, 'contact_phone', $contact_phone );
		wp_set_object_terms( $reservation_id, 'confirmed', 'reservation_status', false );

		return rest_ensure_response( $this->prepare_item_for_response( get_post( $reservation_id ) ) );
	}

	/**
	 * Normalize and convert an arbitrary ISO 8601 datetime string to UTC.
	 *
	 * @since 1.0.0
	 *
	 * @param string $value Raw datetime input.
	 * @return DateTimeImmutable|false
	 */
	private function normalize_datetime_to_utc( $value ) {
		try {
			$datetime = new DateTimeImmutable( sanitize_text_field( $value ) );
			return $datetime->setTimezone( new DateTimeZone( 'UTC' ) );
		} catch ( Exception $exception ) {
			return false;
		}
	}

	/**
	 * Determine whether two reservation time ranges conflict.
	 *
	 * This is intentionally a strict inequality: a reservation ending exactly
	 * when another begins is allowed.
	 *
	 * @since 1.0.0
	 *
	 * @param DateTimeInterface $existing_start Existing reservation UTC start.
	 * @param DateTimeInterface $existing_end Existing reservation UTC end.
	 * @param DateTimeInterface $requested_start Requested reservation UTC start.
	 * @param DateTimeInterface $requested_end Requested reservation UTC end.
	 * @return bool
	 */
	public static function time_ranges_conflict( DateTimeInterface $existing_start, DateTimeInterface $existing_end, DateTimeInterface $requested_start, DateTimeInterface $requested_end ) {
		return $existing_start < $requested_end && $existing_end > $requested_start;
	}

	/**
	 * Check for an overlapping reservation on the same table.
	 *
	 * Strict inequality is intentional: a reservation ending exactly at the
	 * requested start time does not conflict, and one starting exactly at the
	 * requested end time does not conflict.
	 *
	 * @since 1.0.0
	 *
	 * @param int               $table_id Table ID.
	 * @param DateTimeImmutable $start    Requested UTC start.
	 * @param DateTimeImmutable $end      Requested UTC end.
	 * @return bool
	 */
	private function has_conflicting_reservation( $table_id, $start, $end ) {
		$query = new WP_Query(
			array(
				'post_type'      => 'reservation',
				'post_status'    => 'publish',
				'posts_per_page' => -1,
				'meta_query'     => array(
					array(
						'key'     => 'table_id',
						'value'   => $table_id,
						'compare' => '=',
					),
				),
			)
		);

		foreach ( $query->posts as $post ) {
			$existing_start = $this->normalize_datetime_to_utc( get_post_meta( $post->ID, 'start_datetime', true ) );
			$existing_end   = $this->normalize_datetime_to_utc( get_post_meta( $post->ID, 'end_datetime', true ) );

			if ( ! $existing_start || ! $existing_end ) {
				continue;
			}

			if ( self::time_ranges_conflict( $existing_start, $existing_end, $start, $end ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Format a single reservation for REST response.
	 *
	 * @since 1.0.0
	 *
	 * @param WP_Post $post Reservation post.
	 * @return array
	 */
	private function prepare_item_for_response( $post ) {
		return array(
			'id'             => $post->ID,
			'title'          => get_the_title( $post ),
			'table_id'       => absint( get_post_meta( $post->ID, 'table_id', true ) ),
			'status'         => $this->get_reservation_status( $post->ID ),
			'customer_id'    => absint( get_post_meta( $post->ID, 'customer_id', true ) ),
			'party_size'     => absint( get_post_meta( $post->ID, 'party_size', true ) ),
			'start_datetime' => get_post_meta( $post->ID, 'start_datetime', true ),
			'end_datetime'   => get_post_meta( $post->ID, 'end_datetime', true ),
			'contact_name'   => get_post_meta( $post->ID, 'contact_name', true ),
			'contact_phone'  => get_post_meta( $post->ID, 'contact_phone', true ),
		);
	}
}

if ( ! function_exists( 'restaurant_management_system_reservation_rest_controller' ) ) {
	/**
	 * Return instance of Restaurant_Management_System_Reservation_Rest_Controller class.
	 *
	 * @since 1.0.0
	 *
	 * @return Restaurant_Management_System_Reservation_Rest_Controller
	 */
	function restaurant_management_system_reservation_rest_controller() { // phpcs:ignore
		return Restaurant_Management_System_Reservation_Rest_Controller::get_instance();
	}
}
