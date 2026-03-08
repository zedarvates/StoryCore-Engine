<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Helper to convert YouTube/Vimeo URLs to embed URLs
 */
function storycore_get_embed_url($url)
{
    // YouTube
    if (preg_match('%(?:youtube(?:-nocookie)?\.com/(?:[^/]+/.+/|(?:v|e(?:mbed)?)/|.*[?&]v=)|youtu\.be/)([^"&?/ ]{11})%i', $url, $match)) {
        return 'https://www.youtube.com/embed/' . $match[1];
    }
    // Vimeo
    if (preg_match('%vimeo\.com/(?:channels/(?:\w+/)?|groups/([^/]*)/videos/|album/(\d+)/video/|video/|)(\d+)(?:$|/|\?)%i', $url, $match)) {
        return 'https://player.vimeo.com/video/' . $match[3];
    }
    return $url;
}

$embed_url = storycore_get_embed_url($atts['url']);
$title = $atts['title'];
$description = $atts['description'];
$tech_specs = $atts['tech_specs'];
?>

<div class="storycore-showcase-container style-premium">
    <div class="storycore-video-wrapper">
        <?php if (!empty($embed_url)): ?>
            <iframe src="<?php echo esc_url($embed_url); ?>" frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen></iframe>
        <?php else: ?>
            <div class="storycore-placeholder">
                <span class="dashicons dashicons-video-alt3"></span>
                <p>No video URL provided.</p>
            </div>
        <?php endif; ?>

        <div class="storycore-overlay">
            <div class="storycore-badge">PRODUCED BY STORYCORE</div>
        </div>
    </div>

    <div class="storycore-info-panel">
        <h2 class="storycore-title">
            <?php echo esc_html($title); ?>
        </h2>
        <?php if (!empty($description)): ?>
            <p class="storycore-description">
                <?php echo esc_html($description); ?>
            </p>
        <?php endif; ?>

        <?php if (!empty($tech_specs)): ?>
            <div class="storycore-tech-specs">
                <span class="spec-label">TECH SPECS:</span>
                <span class="spec-value">
                    <?php echo esc_html($tech_specs); ?>
                </span>
            </div>
        <?php endif; ?>

        <div class="storycore-showcase-actions">
            <a href="https://nexrealm.shop" target="_blank" class="button storycore-btn">Get Assets for this World</a>
        </div>
    </div>
</div>