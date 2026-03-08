<?php
if (!defined('ABSPATH')) {
    exit;
}

// Get current options
$website_url = get_option('storycore_website_url', 'https://github.com/zedarvates/StoryCore-Engine');
$marketplace_url = get_option('storycore_marketplace_url', 'https://nexrealm.shop');
$local_engine_url = get_option('storycore_local_engine_url', 'http://localhost:8000');
?>

<div class="wrap storycore-admin">
    <h1>StoryCore Engine - Plugin Settings</h1>

    <?php if (isset($_GET['settings-updated'])): ?>
        <div id="setting-error-settings_updated" class="updated settings-error notice is-dismissible">
            <p><strong>Settings saved.</strong></p>
        </div>
    <?php endif; ?>

    <div class="storycore-status-card">
        <div class="status-header">
            <h3>Local Engine Status</h3>
            <div class="status-indicator">
                <span class="storycore-status-dot"></span>
                <span class="storycore-status-text">Checking...</span>
            </div>
        </div>
    </div>

    <form method="post" action="options.php">
        <?php settings_fields('storycore_settings_group'); ?>
        <?php do_settings_sections('storycore_settings_group'); ?>

        <div class="storycore-card">
            <h2>Connection Settings</h2>
            <p>Configure the URLs for the StoryCore ecosystem components.</p>

            <table class="form-table">
                <tr>
                    <th scope="row"><label for="storycore_website_url">Official Website / Repo</label></th>
                    <td>
                        <input type="url" name="storycore_website_url" id="storycore_website_url"
                            value="<?php echo esc_url($website_url); ?>" class="regular-text" />
                        <p class="description">Link used for the documentation button.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="storycore_marketplace_url">Marketplace (NexRealm)</label></th>
                    <td>
                        <input type="url" name="storycore_marketplace_url" id="storycore_marketplace_url"
                            value="<?php echo esc_url($marketplace_url); ?>" class="regular-text" />
                        <p class="description">Link to the official asset store.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="storycore_local_engine_url">Local Engine API</label></th>
                    <td>
                        <input type="url" name="storycore_local_engine_url" id="storycore_local_engine_url"
                            value="<?php echo esc_url($local_engine_url); ?>" class="regular-text" />
                        <p class="description">The base URL of your local StoryCore Engine (usually
                            http://localhost:8000).</p>
                    </td>
                </tr>
            </table>

            <?php submit_button('Save Connection Settings'); ?>
        </div>
    </form>

    <div class="storycore-card" style="margin-top: 20px;">
        <h2>Showcase Shortcode Generator</h2>
        <p>Fill in the details below to generate a cinematic showcase shortcode.</p>

        <div class="generator-form">
            <div class="gen-row">
                <label>Video URL (YouTube/Vimeo)</label>
                <input type="text" id="gen_url" placeholder="https://www.youtube.com/watch?v=..."
                    class="regular-text" />
            </div>
            <div class="gen-row">
                <label>Title</label>
                <input type="text" id="gen_title" placeholder="My StoryCore Production" class="regular-text" />
            </div>
            <div class="gen-row">
                <label>Tech Specs</label>
                <input type="text" id="gen_specs" placeholder="Lens: 35mm | Emotion: Dramatic" class="regular-text" />
            </div>
            <div class="gen-row result-row">
                <code id="generated_shortcode">[storycore_showcase url="" title="" tech_specs=""]</code>
                <button type="button" class="button button-primary" id="copy_generated_btn">Copy Shortcode</button>
            </div>
        </div>
    </div>

    <div class="storycore-card" style="margin-top: 20px;">
        <h2>GEMmes Asset Evaluator</h2>
        <p>This system automatically evaluates your assets based on quality, resolution, and consistency.</p>

        <div class="gemmes-simulator">
            <div id="gemmes_result" class="gemmes-result-box">
                <div class="score-circle">--</div>
                <div class="score-info">
                    <h4 class="grade-label">Grade: ?</h4>
                    <p class="status-msg">Upload or select an asset to evaluate.</p>
                </div>
            </div>
            <button type="button" class="button button-secondary" id="simulate_eval_btn">Simulate Random
                Evaluation</button>
        </div>
    </div>

    <div class="storycore-card" style="margin-top: 20px;">
        <?php
        include_once(STORYCORE_PLUGIN_PATH . 'includes/shop/prompt-library.php');
        StoryCore_Prompt_Library::render_prompt_bank();
        ?>
    </div>

    <div class="storycore-card" style="margin-top: 20px;">
        <?php
        include_once(STORYCORE_PLUGIN_PATH . 'includes/gemmes/gemmes-transactions.php');
        GEMmes_Transactions::render_wallet();
        ?>
    </div>

    <div class="storycore-card" style="margin-top: 20px;">
        <h2>Usage</h2>
        <p>Use the following shortcode to display the links on your pages or posts:</p>
        <div class="shortcode-copy">
            <code>[storycore_links]</code>
            <button class="button button-small copy-btn"
                onclick="navigator.clipboard.writeText('[storycore_links]')">Copy</button>
        </div>

        <p style="margin-top: 15px;">Available attributes:</p>
        <ul class="attr-list">
            <li><code>style="button"</code> or <code>style="list"</code></li>
            <li><code>show_website="yes/no"</code></li>
            <li><code>show_marketplace="yes/no"</code></li>
        </ul>
    </div>

    <div class="storycore-card" style="margin-top: 20px;">
        <?php
        include_once(STORYCORE_PLUGIN_PATH . 'includes/marketplace-feed.php');
        storycore_render_marketplace_feed();
        ?>
    </div>
</div>