<?php
/**
 * PHPUnit bootstrap file for lightweight reservation overlap unit tests.
 */

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__ ) . DIRECTORY_SEPARATOR );
}

require_once ABSPATH . 'includes/class-reservation-rest-controller.php';
