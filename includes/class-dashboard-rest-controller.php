<?php // phpcs:ignore Class file names should be based on the class name with "class-" prepended.
// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Custom REST controller for admin dashboard summary statistics.
 *
 * Computes server-side aggregates (today's revenue, reservation count,
 * table occupancy) for the admin Dashboard's stat cards. The two list
 * widgets (Today's Orders, Next Bookings) are NOT served here — they
 * reuse the existing /orders and /reservations endpoints directly.
 *
 * @package    Restaurant_Management_System
 * @subpackage Restaurant_Management_System/includes
 */
class Restaurant_Management_System_Dashboard_Rest_Controller {

	/**
	 * REST namespace.
	 *
	 * @var string
	 */
	private $namespace = 'rms/v1';

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
	 * Register the REST route.
	 *
	 * @since 1.0.0
	 */
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/dashboard/summary',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_summary' ),
					'permission_callback' => array( $this, 'get_summary_permissions_check' ),
				),
			)
		);
	}

	/**
	 * Gate the whole dashboard behind the same "front door" capability
	 * used to guard the rest of the admin console, not a per-resource
	 * manage_rms_* capability — this endpoint aggregates across orders,
	 * reservations, and tables at once, so no single resource capability
	 * is the right fit.
	 *
	 * @since 1.0.0
	 *
	 * @return bool
	 */
	public function get_summary_permissions_check() {
		return current_user_can( 'access_rms_admin' );
	}

	/**
	 * Handle GET /rms/v1/dashboard/summary.
	 *
	 * @since 1.0.0
	 *
	 * @return WP_REST_Response
	 */
	public function get_summary() {
		list( $today_start_utc, $today_end_utc ) = $this->get_today_utc_bounds();

		return rest_ensure_response(
			array(
				'revenue_today'          => $this->get_revenue_today( $today_start_utc, $today_end_utc ),
				'reservations_today'     => $this->get_reservations_today_count( $today_start_utc, $today_end_utc ),
				'table_occupancy_pct'    => $this->get_table_occupancy_percentage(),
			)
		);
	}

	/**
	 * Compute today's local calendar day as a UTC [start, end) boundary pair.
	 *
	 * "Today" means the WordPress site's configured timezone (Settings >
	 * General), not the server's raw system timezone and not UTC. This is
	 * the same site-timezone concept `wp_timezone()` already exposes; we
	 * use it to build local midnight boundaries, then convert those to UTC
	 * so they're comparable against the UTC-stored delivered_at/
	 * start_datetime values.
	 *
	 * @since 1.0.0
	 *
	 * @return DateTimeImmutable[] Two-element array: [start, end), both UTC.
	 */
	private function get_today_utc_bounds() {
		$site_timezone = wp_timezone();
		$now_local     = new DateTimeImmutable( 'now', $site_timezone );

		$start_local = $now_local->setTime( 0, 0, 0 );
		$end_local   = $start_local->modify( '+1 day' );

		$utc = new DateTimeZone( 'UTC' );

		return array(
			$start_local->setTimezone( $utc ),
			$end_local->setTimezone( $utc ),
		);
	}

	/**
	 * Sum total_amount for orders delivered within today's local day.
	 *
	 * Filtered by order_status=delivered at the query level (cheap, uses
	 * the taxonomy index), then delivered_at is compared in PHP rather
	 * than in meta_query — DATE_W3C strings (with 'T' separator and
	 * timezone offset) don't compare correctly as MySQL DATETIME meta
	 * values, the same issue reservation overlap-checking already solved
	 * by comparing DateTimeImmutable objects after fetching candidates.
	 *
	 * @since 1.0.0
	 *
	 * @param DateTimeImmutable $today_start_utc Inclusive local-day start, in UTC.
	 * @param DateTimeImmutable $today_end_utc   Exclusive local-day end, in UTC.
	 * @return float
	 */
	private function get_revenue_today( $today_start_utc, $today_end_utc ) {
		$query = new WP_Query(
			array(
				'post_type'      => 'order',
				'post_status'    => 'publish',
				'posts_per_page' => -1,
				'fields'         => 'ids',
				'tax_query'      => array(
					array(
						'taxonomy' => 'order_status',
						'field'    => 'slug',
						'terms'    => 'delivered',
					),
				),
				'meta_query'     => array(
					array(
						'key'     => 'delivered_at',
						'compare' => 'EXISTS',
					),
				),
			)
		);

		$revenue = 0.0;
		foreach ( $query->posts as $order_id ) {
			$delivered_at = $this->parse_utc_datetime( get_post_meta( $order_id, 'delivered_at', true ) );

			if ( ! $delivered_at || $delivered_at < $today_start_utc || $delivered_at >= $today_end_utc ) {
				continue;
			}

			$revenue += (float) get_post_meta( $order_id, 'total_amount', true );
		}

		return round( $revenue, 2 );
	}

	/**
	 * Count reservations whose start_datetime falls within today's local day.
	 *
	 * Deliberately counts every non-cancelled status (confirmed, completed,
	 * no_show) — the dashboard number represents "how many bookings does
	 * today involve", not just upcoming ones. Cancelled reservations are
	 * excluded since they no longer represent real floor commitments.
	 *
	 * @since 1.0.0
	 *
	 * @param DateTimeImmutable $today_start_utc Inclusive local-day start, in UTC.
	 * @param DateTimeImmutable $today_end_utc   Exclusive local-day end, in UTC.
	 * @return int
	 */
	private function get_reservations_today_count( $today_start_utc, $today_end_utc ) {
		$query = new WP_Query(
			array(
				'post_type'      => 'reservation',
				'post_status'    => 'publish',
				'posts_per_page' => -1,
				'fields'         => 'ids',
				'tax_query'      => array(
					array(
						'taxonomy' => 'reservation_status',
						'field'    => 'slug',
						'terms'    => 'cancelled',
						'operator' => 'NOT IN',
					),
				),
			)
		);

		$count = 0;
		foreach ( $query->posts as $reservation_id ) {
			$start = $this->parse_utc_datetime( get_post_meta( $reservation_id, 'start_datetime', true ) );

			if ( $start && $start >= $today_start_utc && $start < $today_end_utc ) {
				++$count;
			}
		}

		return $count;
	}

	/**
	 * Percentage of tables currently Occupied.
	 *
	 * Unlike revenue/reservations this is not a "today" figure at all — it
	 * is a live snapshot, since table.status is already kept current in
	 * real time by sync_table_status(). Tables manually set to
	 * "Out of Service" are excluded from the denominator entirely: they
	 * are not part of usable seating capacity, so counting them would
	 * understate occupancy of the tables actually in service.
	 *
	 * @since 1.0.0
	 *
	 * @return int Whole-number percentage, 0 when there are no in-service tables.
	 */
	private function get_table_occupancy_percentage() {
		$query = new WP_Query(
			array(
				'post_type'      => 'table',
				'post_status'    => 'publish',
				'posts_per_page' => -1,
				'fields'         => 'ids',
				'meta_query'     => array(
					array(
						'key'     => 'status',
						'value'   => 'Out of Service',
						'compare' => '!=',
					),
				),
			)
		);

		$in_service_ids = $query->posts;
		if ( empty( $in_service_ids ) ) {
			return 0;
		}

		$occupied_count = 0;
		foreach ( $in_service_ids as $table_id ) {
			if ( 'Occupied' === get_post_meta( $table_id, 'status', true ) ) {
				++$occupied_count;
			}
		}

		return (int) round( ( $occupied_count / count( $in_service_ids ) ) * 100 );
	}

	/**
	 * Parse a stored ISO 8601 datetime string as UTC.
	 *
	 * @since 1.0.0
	 *
	 * @param string $value Raw stored datetime string.
	 * @return DateTimeImmutable|false
	 */
	private function parse_utc_datetime( $value ) {
		if ( empty( $value ) ) {
			return false;
		}

		try {
			return ( new DateTimeImmutable( $value ) )->setTimezone( new DateTimeZone( 'UTC' ) );
		} catch ( Exception $exception ) {
			return false;
		}
	}
}

if ( ! function_exists( 'restaurant_management_system_dashboard_rest_controller' ) ) {
	/**
	 * Return instance of Restaurant_Management_System_Dashboard_Rest_Controller class.
	 *
	 * @since 1.0.0
	 *
	 * @return Restaurant_Management_System_Dashboard_Rest_Controller
	 */
	function restaurant_management_system_dashboard_rest_controller() { // phpcs:ignore
		return Restaurant_Management_System_Dashboard_Rest_Controller::get_instance();
	}
}