<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * GEMmes Community System
 * Handles Likes, Dislikes, Ratings (0-100), and Comments
 */
class GEMmes_Community
{

    /**
     * Rate an asset
     */
    public static function rate_asset($asset_id, $user_id, $score, $feedback = '')
    {
        $ratings = get_option('storycore_asset_ratings_' . $asset_id, array());

        $ratings[$user_id] = array(
            'score' => (int) $score, // 0-100
            'feedback' => sanitize_textarea_field($feedback),
            'timestamp' => current_time('mysql')
        );

        update_option('storycore_asset_ratings_' . $asset_id, $ratings);
        return true;
    }

    /**
     * Get average rating for an asset
     */
    public static function get_average_rating($asset_id)
    {
        $ratings = get_option('storycore_asset_ratings_' . $asset_id, array());
        if (empty($ratings))
            return 0;

        $total = 0;
        foreach ($ratings as $r) {
            $total += $r['score'];
        }
        return round($total / count($ratings));
    }

    /**
     * Add a comment
     */
    public static function add_comment($asset_id, $user_id, $comment_text)
    {
        $comments = get_option('storycore_asset_comments_' . $asset_id, array());

        $comments[] = array(
            'user_id' => $user_id,
            'user_name' => get_userdata($user_id)->display_name,
            'text' => sanitize_textarea_field($comment_text),
            'date' => current_time('mysql')
        );

        update_option('storycore_asset_comments_' . $asset_id, $comments);
    }

    /**
     * Get total likes/dislikes
     */
    public static function get_votes($asset_id)
    {
        $votes = get_option('storycore_asset_votes_' . $asset_id, array('likes' => 0, 'dislikes' => 0, 'users' => array()));
        return $votes;
    }

    /**
     * Vote on an asset
     */
    public static function vote($asset_id, $user_id, $type, $reason = '')
    {
        $votes = self::get_votes($asset_id);

        // Prevent double voting or handle changes
        $existing_vote = isset($votes['users'][$user_id]) ? $votes['users'][$user_id] : null;

        if ($existing_vote === $type)
            return false;

        if ($existing_vote) {
            $votes[$existing_vote . 's']--;
        }

        $votes['users'][$user_id] = $type;
        $votes[$type . 's']++;

        if ($type === 'dislike' && !empty($reason)) {
            self::add_comment($asset_id, $user_id, "DISLIKE REASON: " . $reason);
        }

        update_option('storycore_asset_votes_' . $asset_id, $votes);
        return $votes;
    }
}
