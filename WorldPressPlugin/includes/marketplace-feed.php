<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Placeholder function to simulate fetching items from NexRealm Marketplace
 */
function storycore_get_marketplace_items()
{
    return array(
        array(
            'title' => 'Cinematic Sci-Fi Pack',
            'price' => 'Free',
            'image' => 'https://nexrealm.shop/assets/packs/scifi-thumb.jpg',
            'url' => 'https://nexrealm.shop/item/scifi-pack'
        ),
        array(
            'title' => 'Cyberpunk Character Creator',
            'price' => '$19.99',
            'image' => 'https://nexrealm.shop/assets/packs/cyberpunk-thumb.jpg',
            'url' => 'https://nexrealm.shop/item/cyberpunk'
        ),
        array(
            'title' => 'Medieval Forest Environment',
            'price' => '$24.99',
            'image' => 'https://nexrealm.shop/assets/packs/forest-thumb.jpg',
            'url' => 'https://nexrealm.shop/item/medieval-forest'
        )
    );
}

/**
 * Render the marketplace dashboard widget or page section
 */
function storycore_render_marketplace_feed()
{
    $items = storycore_get_marketplace_items();
    ?>
    <div class="storycore-marketplace-feed">
        <h3>Trending on NexRealm Marketplace</h3>
        <div class="storycore-grid">
            <?php foreach ($items as $item): ?>
                <div class="storycore-item">
                    <div class="storycore-item-thumb"></div>
                    <div class="storycore-item-info">
                        <h4>
                            <?php echo esc_html($item['title']); ?>
                        </h4>
                        <span class="price">
                            <?php echo esc_html($item['price']); ?>
                        </span>
                        <a href="<?php echo esc_url($item['url']); ?>" target="_blank" class="button button-secondary">View on
                            Shop</a>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>

    <style>
        .storycore-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }

        .storycore-item {
            background: #f1f5f9;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            transition: transform 0.2s;
        }

        .storycore-item:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        .storycore-item-thumb {
            height: 120px;
            background: linear-gradient(45deg, #1e293b, #334155);
        }

        .storycore-item-info {
            padding: 15px;
        }

        .storycore-item-info h4 {
            margin: 0 0 5px 0;
            font-size: 14px;
        }

        .storycore-item-info .price {
            display: block;
            margin-bottom: 10px;
            font-weight: 700;
            color: #4f46e5;
        }
    </style>
    <?php
}
