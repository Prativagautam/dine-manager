<?php // phpcs:ignore Class file names should be based on the class name with "class-" prepended.
// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers Gutenberg blocks for the plugin.
 *
 * @package    Restaurant_Management_System
 * @subpackage Restaurant_Management_System/includes
 */
class Restaurant_Management_System_Blocks {

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
	 * Register all blocks for this plugin.
	 * Hooked into 'init'.
	 *
	 * @since 1.0.0
	 */
	public function register_blocks() {
		$this->register_account_menu_block();
	}

	/**
	 * Register the Account Menu block.
	 *
	 * @since 1.0.0
	 */
	private function register_account_menu_block() {
		$block_type = register_block_type(
			RESTAURANT_MANAGEMENT_SYSTEM_PATH . 'build/blocks/account-menu',
			array(
				'render_callback' => array( $this, 'render_account_menu' ),
			)
		);

		if ( $block_type ) {
			wp_set_script_translations(
				'rms-account-menu-editor-script',
				'restaurant-management-system',
				RESTAURANT_MANAGEMENT_SYSTEM_PATH . 'languages'
			);
		}
	}

	/**
	 * Render the Account Menu block on the front end.
	 *
	 * @param array $attributes Block attributes.
	 * @return string
	 * @since 1.0.0
	 */
	public function render_account_menu( $attributes ) {
		$is_logged_in = ! empty( $attributes['isLoggedIn'] );

		if ( $is_logged_in ) {
			$links = array(
				array( 'label' => __( 'My Account', 'restaurant-management-system' ), 'href' => '#' ),
				array( 'label' => __( 'My Orders', 'restaurant-management-system' ), 'href' => '#' ),
				array( 'label' => __( 'My Reservations', 'restaurant-management-system' ), 'href' => '#' ),
				array( 'label' => __( 'Logout', 'restaurant-management-system' ), 'href' => '#' ),
			);
		} else {
			$links = array(
				array( 'label' => __( 'Sign In', 'restaurant-management-system' ), 'href' => '#' ),
				array( 'label' => __( 'Register', 'restaurant-management-system' ), 'href' => '#' ),
			);
		}

		$dropdown_links = '';
		foreach ( $links as $link ) {
			$dropdown_links .= sprintf(
				'<a class="rms-account-menu__link" href="%s" role="menuitem" tabindex="0">%s</a>',
				esc_url( $link['href'] ),
				esc_html( $link['label'] )
			);
		}

		static $menu_rendered = false;

		$html = sprintf(
			'<div class="rms-account-menu">
				<style>
					.rms-account-menu__wrapper{position:relative;display:inline-block}
					.rms-account-menu__toggle{display:flex;align-items:center;justify-content:center;width:40px;height:40px;padding:0;margin:0;border:1px solid #ccc;border-radius:4px;background:#fff;color:#333;cursor:pointer}
					.rms-account-menu__toggle:hover{background:#f0f0f0}
					.rms-account-menu__toggle:focus-visible{outline:2px solid #007cba;outline-offset:2px}
					.rms-account-menu__dropdown{position:absolute;top:100%%;right:0;z-index:100;min-width:200px;margin-top:4px;background:#fff;border:1px solid #ddd;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,.15)}
					.rms-account-menu__link{display:block;padding:10px 16px;color:#333;text-decoration:none;font-size:14px;line-height:1.4}
					.rms-account-menu__link:hover{background:#f5f5f5}
					.rms-account-menu__link:focus-visible{outline:2px solid #007cba;outline-offset:-2px}
					.rms-account-menu__link:first-child{border-radius:4px 4px 0 0}
					.rms-account-menu__link:last-child{border-radius:0 0 4px 4px}
				</style>
				<div class="rms-account-menu__wrapper">
					<button class="rms-account-menu__toggle" aria-expanded="false" aria-label="%s" type="button">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
							<circle cx="12" cy="7" r="4"></circle>
						</svg>
					</button>
					<div class="rms-account-menu__dropdown" role="menu" style="display:none;">
						%s
					</div>
				</div>
			</div>',
			esc_attr__( 'Account menu', 'restaurant-management-system' ),
			$dropdown_links
		);

		if ( ! $menu_rendered ) {
			$menu_rendered = true;
			$html         .= '<script>
				(function(){
					function rmsAccountMenuInit(){
						document.querySelectorAll(".rms-account-menu").forEach(function(b){
							var btn=b.querySelector(".rms-account-menu__toggle"),
								dd=b.querySelector(".rms-account-menu__dropdown");
							if(!btn||!dd)return;
							function open(){dd.style.display="block";btn.setAttribute("aria-expanded","true")}
							function close(){dd.style.display="none";btn.setAttribute("aria-expanded","false")}
							btn.addEventListener("click",function(){btn.getAttribute("aria-expanded")==="true"?close():open()});
							document.addEventListener("click",function(e){if(!b.contains(e.target))close()});
							document.addEventListener("keydown",function(e){if(e.key==="Escape"&&btn.getAttribute("aria-expanded")==="true"){close();btn.focus()}});
							close();
						});
					}
					if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",rmsAccountMenuInit)}
					else{rmsAccountMenuInit()}
				})();
			</script>';
		}

		return $html;
	}
}

if ( ! function_exists( 'restaurant_management_system_blocks' ) ) {
	/**
	 * Return instance of Restaurant_Management_System_Blocks class.
	 *
	 * @since 1.0.0
	 *
	 * @return Restaurant_Management_System_Blocks
	 */
	function restaurant_management_system_blocks() { // phpcs:ignore
		return Restaurant_Management_System_Blocks::get_instance();
	}
}
