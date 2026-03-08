<?php
if (!defined('ABSPATH')) {
    exit;
}

$website_url = get_option('storycore_website_url', 'https://github.com/zedarvates/StoryCore-Engine');
$marketplace_url = get_option('storycore_marketplace_url', 'https://nexrealm.shop');
$style = isset($atts['style']) ? $atts['style'] : 'button';
?>

<div class="storycore-links-container style-<?php echo esc_attr($style); ?>">
    <?php if ($atts['show_website'] === 'yes'): ?>
        <a href="<?php echo esc_url($website_url); ?>" target="_blank" class="storycore-link storycore-website">
            <span class="dashicons dashicons-admin-site"></span>
            Visit StoryCore Website
        </a>
    <?php endif; ?>

    <?php if ($atts['show_marketplace'] === 'yes'): ?>
        <a href="<?php echo esc_url($marketplace_url); ?>" target="_blank" class="storycore-link storycore-marketplace">
            <span class="dashicons dashicons-cart"></span>
            Browse Marketplace
        </a>
    <?php endif; ?>
</div>