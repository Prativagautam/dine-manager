<?php
/**
 * Reservation overlap unit tests.
 *
 * This file is intentionally lightweight because the plugin does not yet
 * include a full PHPUnit bootstrap or WP test environment in the repository.
 * It provides the required business-rule coverage for the timeline's
 * Milestone C expectation and can be run in any local PHPUnit setup that
 * loads the plugin classes.
 *
 * @package Restaurant_Management_System
 */

use PHPUnit\Framework\TestCase;

if ( ! class_exists( 'Restaurant_Management_System_Reservation_Rest_Controller' ) ) {
	return;
}

class Reservation_Rest_Controller_Test extends TestCase {
	public function test_time_ranges_conflict_with_overlapping_interval() {
		$existing_start   = new DateTimeImmutable( '2026-10-22T18:00:00Z' );
		$existing_end     = new DateTimeImmutable( '2026-10-22T19:30:00Z' );
		$requested_start  = new DateTimeImmutable( '2026-10-22T19:00:00Z' );
		$requested_end    = new DateTimeImmutable( '2026-10-22T20:30:00Z' );

		$this->assertTrue( Restaurant_Management_System_Reservation_Rest_Controller::time_ranges_conflict( $existing_start, $existing_end, $requested_start, $requested_end ) );
	}

	public function test_time_ranges_conflict_with_exactly_adjacent_interval() {
		$existing_start   = new DateTimeImmutable( '2026-10-22T18:00:00Z' );
		$existing_end     = new DateTimeImmutable( '2026-10-22T19:30:00Z' );
		$requested_start  = new DateTimeImmutable( '2026-10-22T19:30:00Z' );
		$requested_end    = new DateTimeImmutable( '2026-10-22T21:00:00Z' );

		$this->assertFalse( Restaurant_Management_System_Reservation_Rest_Controller::time_ranges_conflict( $existing_start, $existing_end, $requested_start, $requested_end ) );
	}

	public function test_time_ranges_conflict_with_non_overlapping_interval() {
		$existing_start   = new DateTimeImmutable( '2026-10-22T18:00:00Z' );
		$existing_end     = new DateTimeImmutable( '2026-10-22T19:30:00Z' );
		$requested_start  = new DateTimeImmutable( '2026-10-22T16:00:00Z' );
		$requested_end    = new DateTimeImmutable( '2026-10-22T17:30:00Z' );

		$this->assertFalse( Restaurant_Management_System_Reservation_Rest_Controller::time_ranges_conflict( $existing_start, $existing_end, $requested_start, $requested_end ) );
	}
}
