<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Restaurant_Management_System_Customer_Rest_Controller {

	public function register_routes() {
		register_rest_route(
			'rms/v1',
			'/customers/register',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'register_customer' ),
				'permission_callback' => '__return_true', // Public route — anyone can hit this, logged in or not.
				'args'                => array(
					'name'     => array( 'required' => true, 'type' => 'string' ),
					'email'    => array( 'required' => true, 'type' => 'string' ),
					'phone'    => array( 'required' => true, 'type' => 'string' ),
					'password' => array( 'required' => true, 'type' => 'string' ),
				),
			)
		);

		register_rest_route(
			'rms/v1',
			'/customers/login',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'login_customer' ),
				'permission_callback' => '__return_true', // Public — the whole point is the user isn't authenticated yet.
				'args'                => array(
					'email'    => array( 'required' => true, 'type' => 'string' ),
					'password' => array( 'required' => true, 'type' => 'string' ),
				),

			)
		);
        register_rest_route(
	'rms/v1',
	'/customers/forgot-password',
	array(
		'methods'             => 'POST',
		'callback'            => array( $this, 'request_password_reset' ),
		'permission_callback' => '__return_true',
		'args'                => array(
			'email' => array( 'required' => true, 'type' => 'string' ),
		),
	)
);

register_rest_route(
	'rms/v1',
	'/customers/reset-password',
	array(
		'methods'             => 'POST',
		'callback'            => array( $this, 'reset_password' ),
		'permission_callback' => '__return_true',
		'args'                => array(
			'login'    => array( 'required' => true, 'type' => 'string' ),
			'key'      => array( 'required' => true, 'type' => 'string' ),
			'password' => array( 'required' => true, 'type' => 'string' ),
		),
	)
   );
        



	}

	public function register_customer( $request ) {
		$name     = sanitize_text_field( $request->get_param( 'name' ) );
		$email    = sanitize_email( $request->get_param( 'email' ) );
		$phone    = sanitize_text_field( $request->get_param( 'phone' ) );
		$password = (string) $request->get_param( 'password' );

		if ( ! is_email( $email ) ) {
			return new WP_Error( 'rms_invalid_email', 'Please provide a valid email address.', array( 'status' => 422 ) );
		}
		if ( email_exists( $email ) ) {
			return new WP_Error( 'rms_email_exists', 'An account with this email already exists.', array( 'status' => 409 ) );
		}
		if ( strlen( $password ) < 8 ) {
			return new WP_Error( 'rms_weak_password', 'Password must be at least 8 characters.', array( 'status' => 422 ) );
		}

		// WordPress requires a unique username even though our form doesn't collect one —
		// derive it from the email and de-dupe if needed.
		$username = sanitize_user( current( explode( '@', $email ) ), true );
		$base     = $username;
		$suffix   = 1;
		while ( username_exists( $username ) ) {
			$username = $base . $suffix++;
		}

		$user_id = wp_insert_user(
			array(
				'user_login'   => $username,
				'user_email'   => $email,
				'user_pass'    => $password,
				'display_name' => $name,
				'first_name'   => $name,
				'role'         => 'rms_customer',
			)
		);

		if ( is_wp_error( $user_id ) ) {
			return new WP_Error( 'rms_registration_failed', $user_id->get_error_message(), array( 'status' => 500 ) );
		}

		update_user_meta( $user_id, 'rms_phone', $phone );

		// Auto-login: sets the auth cookie on the response, same as a normal WP login.
		wp_set_current_user( $user_id );
		wp_set_auth_cookie( $user_id, true );

		return new WP_REST_Response(
			array(
				'id'    => $user_id,
				'name'  => $name,
				'email' => $email,
			),
			201
		);
	}

	public function login_customer( $request ) {
		$email    = sanitize_text_field( $request->get_param( 'email' ) );
		$password = (string) $request->get_param( 'password' );

		$user = wp_signon(
			array(
				'user_login'    => $email, // WP accepts username OR email here natively.
				'user_password' => $password,
				'remember'      => true,
			),
			is_ssl()
		);

		if ( is_wp_error( $user ) ) {
			// wp_signon's own error messages reveal whether it was the email or password that was wrong —
			// deliberately flattened here to one generic message so a login form can't be used to enumerate
			// which emails have accounts.
			return new WP_Error( 'rms_login_failed', 'Incorrect email or password.', array( 'status' => 401 ) );
		}

		return new WP_REST_Response(
			array(
				'id'    => $user->ID,
				'name'  => $user->display_name,
				'email' => $user->user_email,
			),
			200
		);
	}
public function request_password_reset( $request ) {
	$email = sanitize_email( $request->get_param( 'email' ) );

	// retrieve_password() is WP core's own "forgot password" function — same one
	// wp-login.php uses. It looks up the user by email or username, generates a
	// reset key, and emails the reset link itself. We don't build any of that.
	$result = retrieve_password( $email );

	// Deliberately return success even if the email doesn't exist — returning an
	// error here would let someone probe which emails have accounts (the same
	// enumeration concern as the login error message).
	if ( is_wp_error( $result ) && 'invalid_email' !== $result->get_error_code() ) {
		return new WP_Error( 'rms_reset_failed', 'Something went wrong. Please try again.', array( 'status' => 500 ) );
	}

	return new WP_REST_Response(
		array( 'message' => 'If an account exists for that email, a reset link has been sent.' ),
		200
	);
}

public function reset_password( $request ) {
	$login    = sanitize_text_field( $request->get_param( 'login' ) );
	$key      = sanitize_text_field( $request->get_param( 'key' ) );
	$password = (string) $request->get_param( 'password' );

	if ( strlen( $password ) < 8 ) {
		return new WP_Error( 'rms_weak_password', 'Password must be at least 8 characters.', array( 'status' => 422 ) );
	}

	// check_password_reset_key() validates the key/login pair and returns the
	// WP_User on success, or a WP_Error (expired_key / invalid_key) on failure.
	$user = check_password_reset_key( $key, $login );

	if ( is_wp_error( $user ) ) {
		return new WP_Error( 'rms_invalid_reset_link', 'This reset link is invalid or has expired.', array( 'status' => 400 ) );
	}

	reset_password( $user, $password );

	// Log them in immediately after a successful reset, same as register/login.
	wp_set_current_user( $user->ID );
	wp_set_auth_cookie( $user->ID, true );

	return new WP_REST_Response(
		array( 'message' => 'Password updated.' ),
		200
	);
}
public function customize_reset_password_email( $message, $key, $user_login, $user_data ) {
	$reset_url = add_query_arg(
		array(
			'rms_action' => 'reset-password',
			'key'        => rawurlencode( $key ),
			'login'      => rawurlencode( $user_login ),
		),
		home_url( '/customer-portal/' )
	);

	return sprintf(
		"Someone has requested a password reset for the following account:\n\nSite Name: %s\nUsername: %s\n\nIf this was a mistake, ignore this email and nothing will happen.\n\nTo reset your password, visit the following address:\n\n%s\n\nThis password reset request originated from the IP address %s.",
		get_bloginfo( 'name' ),
		$user_login,
		esc_url_raw( $reset_url ),
		$_SERVER['REMOTE_ADDR']
	);
}




}

if ( ! function_exists( 'restaurant_management_system_customer_rest_controller' ) ) {
	function restaurant_management_system_customer_rest_controller() { //phpcs:ignore
		static $instance = null;
		if ( null === $instance ) {
			$instance = new Restaurant_Management_System_Customer_Rest_Controller();
		}
		return $instance;
	}
}