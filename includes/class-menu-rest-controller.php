<?php // phpcs:ignore Class file names should be based on the class name with "class-" prepended.
// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Custom REST controller for menu items.
 *
 * Registers GET /rms/v1/menu-items — the actual documented endpoint from
 * PLAN.md §7 (public, filterable by menu_category and dietary_tag).
 *
 * This is deliberately separate from WordPress's generic auto-CRUD route
 * (/wp/v2/rms-menu-items, from register_post_type()'s show_in_rest) — that
 * route exists automatically and is useful for quick verification, but it
 * doesn't have the category/dietary-tag filtering behavior PLAN.md
 * actually specifies. This file is the real endpoint the React frontend
 * will call.
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
	 * Register the GET /rms/v1/menu-items route.
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
			'meta_query'     => array( // phpcs:ignore WordPress.DB.SlowDBQuery -- small dataset, acceptable for Phase 1 scope per PLAN.md §1.
				array(
					'key'     => 'is_available',
					'value'   => '1',
					'compare' => '=',
				),
			),
		);

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