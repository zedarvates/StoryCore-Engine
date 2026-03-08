<?php
/**
 * Plugin Name: StoryCore Engine - Official Linker
 * Plugin URI: https://github.com/zedarvates/StoryCore-Engine
 * Description: Official WordPress plugin to link your site with StoryCore Engine and the NexRealm Marketplace.
 * Version: 1.0.0
 * Author: StoryCore Team
 * Author URI: https://github.com/zedarvates/StoryCore-Engine
 * License: GPL2
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Define Constants
define('STORYCORE_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('STORYCORE_PLUGIN_URL', plugin_dir_url(__FILE__));
define('STORYCORE_VERSION', '1.0.0');

// Main Plugin Class
class StoryCore_Engine_Linker
{

    public function __construct()
    {
        // Initialization
        add_action('admin_init', array($this, 'register_settings'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_public_assets'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));

        // Shortcodes
        add_shortcode('storycore_links', array($this, 'render_links_shortcode'));
        add_shortcode('storycore_showcase', array($this, 'render_showcase_shortcode'));
        add_shortcode('storycore_shop', array($this, 'render_shop_shortcode'));

        // AJAX handlers
        add_action('wp_ajax_storycore_buy_asset', array($this, 'ajax_buy_asset'));
        add_action('wp_ajax_storycore_vote_asset', array($this, 'ajax_vote_asset'));
        add_action('wp_ajax_storycore_rate_asset', array($this, 'ajax_rate_asset'));
    }

    /**
     * Register plugin settings
     */
    public function register_settings()
    {
        register_setting('storycore_settings_group', 'storycore_website_url');
        register_setting('storycore_settings_group', 'storycore_marketplace_url');
        register_setting('storycore_settings_group', 'storycore_local_engine_url');

        // Set default values if not exists
        if (!get_option('storycore_website_url')) {
            update_option('storycore_website_url', 'https://github.com/zedarvates/StoryCore-Engine');
        }
        if (!get_option('storycore_marketplace_url')) {
            update_option('storycore_marketplace_url', 'https://nexrealm.shop');
        }
        if (!get_option('storycore_local_engine_url')) {
            update_option('storycore_local_engine_url', 'http://localhost:8000');
        }
    }

    /**
     * Add admin menu
     */
    public function add_admin_menu()
    {
        add_menu_page(
            'StoryCore Engine',
            'StoryCore',
            'manage_options',
            'storycore-engine',
            array($this, 'render_settings_page'),
            'dashicons-video-alt3',
            100
        );
    }

    public function enqueue_public_assets()
    {
        wp_enqueue_style('storycore-public-styles', STORYCORE_PLUGIN_URL . 'assets/css/public.css', array(), STORYCORE_VERSION);
        wp_enqueue_script('storycore-public-js', STORYCORE_PLUGIN_URL . 'assets/js/public.js', array('jquery'), STORYCORE_VERSION, true);

        wp_localize_script('storycore-public-js', 'storycore_data', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('storycore_public_nonce')
        ));
    }

    /**
     * Enqueue admin styles and scripts
     */
    public function enqueue_admin_scripts()
    {
        wp_enqueue_style('storycore-admin-styles', STORYCORE_PLUGIN_URL . 'assets/css/admin.css', array(), STORYCORE_VERSION);
        wp_enqueue_script('storycore-admin-js', STORYCORE_PLUGIN_URL . 'assets/js/admin.js', array('jquery'), STORYCORE_VERSION, true);

        wp_localize_script('storycore-admin-js', 'storycore_admin', array(
            'local_engine_url' => get_option('storycore_local_engine_url', 'http://localhost:8000')
        ));
    }

    /**
     * Render Settings Page
     */
    public function render_settings_page()
    {
        include_once(STORYCORE_PLUGIN_PATH . 'admin/settings-page.php');
    }

    /**
     * Shortcode to display links
     */
    public function render_links_shortcode($atts)
    {
        $atts = shortcode_atts(array(
            'show_website' => 'yes',
            'show_marketplace' => 'yes',
            'style' => 'button'
        ), $atts);

        ob_start();
        include(STORYCORE_PLUGIN_PATH . 'includes/links-template.php');
        return ob_get_clean();
    }

    /**
     * Shortcode to display a cinematic showcase
     */
    public function render_showcase_shortcode($atts)
    {
        $atts = shortcode_atts(array(
            'url' => '',
            'title' => 'StoryCore Production',
            'description' => '',
            'tech_specs' => '', // Lens, Sensor, Emotion, etc.
            'style' => 'premium'
        ), $atts);

        ob_start();
        include(STORYCORE_PLUGIN_PATH . 'includes/showcase-template.php');
        return ob_get_clean();
    }

    /**
     * AJAX handler for simulating buying an asset
     */
    public function ajax_simulate_purchase()
    {
        check_ajax_referer('storycore_admin_nonce');

        include_once(STORYCORE_PLUGIN_PATH . 'includes/gemmes/gemmes-transactions.php');

        $price = 250;
        $result = GEMmes_Transactions::spend_funds($price, 'Purchase of Cinematic Asset');

        if (is_wp_error($result)) {
            wp_send_json_error($result->get_error_message());
        } else {
            wp_send_json_success(array(
                'new_balance' => GEMmes_Transactions::get_balance(),
                'message' => 'Asset purchased successfully!'
            ));
        }
    }

    /**
     * AJAX handler for buying an asset
     */
    public function ajax_buy_asset()
    {
        check_ajax_referer('storycore_public_nonce', 'nonce');

        $asset_id = isset($_POST['asset_id']) ? (int) $_POST['asset_id'] : 0;
        $price = isset($_POST['price']) ? (int) $_POST['price'] : 0;

        include_once(STORYCORE_PLUGIN_PATH . 'includes/gemmes/gemmes-transactions.php');

        $result = GEMmes_Transactions::spend_funds($price, "Purchase of Asset #$asset_id");

        if (is_wp_error($result)) {
            wp_send_json_error($result->get_error_message());
        } else {
            wp_send_json_success(array(
                'new_balance' => GEMmes_Transactions::get_balance(),
                'message' => 'Asset unlocked!'
            ));
        }
    }

    /**
     * AJAX handler for voting
     */
    public function ajax_vote_asset()
    {
        check_ajax_referer('storycore_public_nonce', 'nonce');
        $asset_id = (int) $_POST['asset_id'];
        $type = sanitize_text_field($_POST['type']);
        $reason = isset($_POST['reason']) ? sanitize_textarea_field($_POST['reason']) : '';

        include_once(STORYCORE_PLUGIN_PATH . 'includes/gemmes/gemmes-community.php');
        $result = GEMmes_Community::vote($asset_id, get_current_user_id(), $type, $reason);

        if ($result) {
            wp_send_json_success($result);
        } else {
            wp_send_json_error('Already voted.');
        }
    }

    /**
     * AJAX handler for rating
     */
    public function ajax_rate_asset()
    {
        check_ajax_referer('storycore_public_nonce', 'nonce');
        $asset_id = (int) $_POST['asset_id'];
        $score = (int) $_POST['score'];

        include_once(STORYCORE_PLUGIN_PATH . 'includes/gemmes/gemmes-community.php');
        GEMmes_Community::rate_asset($asset_id, get_current_user_id(), $score);

        wp_send_json_success(array('average' => GEMmes_Community::get_average_rating($asset_id)));
    }

    /**
     * Shortcode to display the public shop/marketplace
     */
    public function render_shop_shortcode($atts)
    {
        $atts = shortcode_atts(array(
            'category' => 'all',
            'limit' => 20
        ), $atts);

        include_once(STORYCORE_PLUGIN_PATH . 'includes/shop/shop-template.php');
        return storycore_render_public_shop($atts);
    }
}

// Instantiate the class
new StoryCore_Engine_Linker();
