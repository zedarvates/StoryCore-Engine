<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * StoryCore Shop Frontend Template
 */
function storycore_render_public_shop($atts) {
    include_once(STORYCORE_PLUGIN_PATH . 'includes/gemmes/gemmes-transactions.php');
    include_once(STORYCORE_PLUGIN_PATH . 'includes/shop/prompt-library.php');
    include_once(STORYCORE_PLUGIN_PATH . 'includes/gemmes/gemmes-community.php');
    
    $balance = GEMmes_Transactions::get_balance();
    $prompts = StoryCore_Prompt_Library::get_prompts();
    
    ob_start();
    ?>
    <div class="storycore-public-shop">
        <div class="shop-header">
            <div class="shop-branding">
                <span class="shop-tag">OFFICIAL STORE</span>
                <h2>StoryCore Marketplace</h2>
            </div>
            <div class="user-wallet-pill">
                <span class="pill-icon">💎</span>
                <span class="pill-balance" id="public_balance"><?php echo number_format($balance); ?> GEMmes</span>
            </div>
        </div>

        <div class="shop-filter-bar">
            <button class="filter-btn active">All Assets</button>
            <button class="filter-btn">Prompts</button>
            <button class="filter-btn">3D Models</button>
            <button class="filter-btn">Environments</button>
        </div>

        <div class="shop-grid">
            <?php foreach ($prompts as $p) : 
                $price = 250; 
                $votes = GEMmes_Community::get_votes($p['id']);
                $avg_rating = GEMmes_Community::get_average_rating($p['id']);
                $comments = get_option('storycore_asset_comments_' . $p['id'], array());
                ?>
                <div class="shop-item-card" data-id="<?php echo $p['id']; ?>">
                    <div class="item-preview">
                        <div class="gemmes-badge-overlay">GRADE <?php echo esc_html(substr($p['gemmes_score'] >= 90 ? 'S' : 'A', 0, 1)); ?></div>
                        <div class="item-type-tag"><?php echo esc_html($p['category']); ?></div>
                    </div>
                    <div class="item-details">
                        <h4><?php echo esc_html($p['title']); ?></h4>
                        
                        <!-- Community Section -->
                        <div class="community-row">
                            <div class="community-score">
                                <span class="score-val"><?php echo $avg_rating ?: '--'; ?></span><span class="score-max">/100</span>
                                <div class="score-bar"><div class="score-fill" style="width:<?php echo $avg_rating; ?>%"></div></div>
                            </div>
                            <div class="community-votes">
                                <button class="vote-btn like-btn" data-type="like">👍 <span><?php echo $votes['likes']; ?></span></button>
                                <button class="vote-btn dislike-btn" data-type="dislike">👎 <span><?php echo $votes['dislikes']; ?></span></button>
                            </div>
                        </div>

                        <!-- Justification for Dislike -->
                        <div class="justification-box" style="display:none;">
                            <p>Explanation required for downvote:</p>
                            <textarea class="justification-text" placeholder="Explain why..."></textarea>
                            <button class="submit-dislike">Post & Confirm</button>
                        </div>

                        <!-- User Rating Slider -->
                        <div class="user-rate-box">
                            <label>Rate (0-100):</label>
                            <input type="range" class="rate-range" min="0" max="100" value="<?php echo $avg_rating ?: 50; ?>">
                            <span class="range-indicator">50</span>
                        </div>

                        <!-- Comments Section -->
                        <div class="comments-section">
                            <button class="toggle-comments">Community Feedback (<?php echo count($comments); ?>)</button>
                            <div class="comments-dropdown" style="display:none;">
                                <?php if (!empty($comments)) : ?>
                                    <?php foreach (array_slice($comments, 0, 3) as $c) : ?>
                                        <div class="comment-line">
                                            <strong><?php echo esc_html($c['user_name']); ?>:</strong> 
                                            <span><?php echo esc_html($c['text']); ?></span>
                                        </div>
                                    <?php endforeach; ?>
                                <?php else : ?>
                                    <p class="no-c">No comments yet.</p>
                                <?php endif; ?>
                            </div>
                        </div>
                        
                        <div class="item-footer">
                            <div class="item-price">
                                <span class="price-val"><?php echo $price; ?></span>
                                <span class="price-unit">💎</span>
                            </div>
                            <button class="purchase-btn" data-id="<?php echo $p['id']; ?>" data-price="<?php echo $price; ?>">Unlock</button>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>

    <style>
    .storycore-public-shop { max-width: 1200px; margin: 40px auto; font-family: 'Outfit', sans-serif; }
    .shop-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .user-wallet-pill { background: #0f172a; color: #fff; padding: 10px 20px; border-radius: 100px; font-weight: 800; display: flex; align-items: center; gap: 8px; }
    .shop-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
    .shop-item-card { background: #fff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; transition: all 0.3s; }
    .shop-item-card:hover { transform: translateY(-5px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
    .item-preview { height: 160px; background: #1e293b; position: relative; }
    .gemmes-badge-overlay { position: absolute; top: 10px; left: 10px; background: #22c55e; color: #fff; padding: 3px 8px; border-radius: 5px; font-size: 10px; font-weight: 900; }
    .item-details { padding: 20px; }
    .community-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .score-val { font-size: 20px; font-weight: 900; color: #6366f1; }
    .score-max { font-size: 12px; color: #94a3b8; }
    .vote-btn { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 5px 10px; cursor: pointer; transition: 0.2s; }
    .vote-btn:hover { background: #e2e8f0; }
    .user-rate-box { background: #f8fafc; padding: 10px; border-radius: 10px; margin-bottom: 15px; }
    .user-rate-box label { font-size: 10px; font-weight: 800; color: #94a3b8; display: block; margin-bottom: 5px; }
    .rate-range { width: 100%; cursor: pointer; }
    .justification-box { background: #fff1f2; padding: 12px; border-radius: 10px; border: 1px solid #fecdd3; margin-bottom: 15px; }
    .justification-text { width: 100%; border: 1px solid #fecdd3; border-radius: 5px; margin: 8px 0; font-size: 11px; padding: 6px; }
    .submit-dislike { background: #e11d48; color: #fff; border: none; width: 100%; border-radius: 5px; padding: 6px; font-size: 11px; font-weight: 800; cursor: pointer; }
    .comments-section { border-top: 1px solid #f1f5f9; padding-top: 10px; margin-bottom: 15px; }
    .toggle-comments { background: none; border: none; color: #6366f1; font-size: 11px; font-weight: 700; cursor: pointer; padding: 0; }
    .comments-dropdown { font-size: 11px; color: #64748b; margin-top: 10px; }
    .comment-line { margin-bottom: 5px; border-bottom: 1px solid #f8fafc; padding-bottom: 3px; }
    .item-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 15px; }
    .purchase-btn { background: #6366f1; color: #fff; border: none; border-radius: 8px; padding: 8px 15px; font-weight: 800; cursor: pointer; }
    </style>
    <?php
    return ob_get_clean();
}
