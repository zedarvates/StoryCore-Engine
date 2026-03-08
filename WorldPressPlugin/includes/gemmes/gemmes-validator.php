<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * GEMmes (Graphic & Entity Multimodal Evaluation System)
 * Automatic Asset Quality Assessment for StoryCore
 */
class GEMmes_Validator
{

    /**
     * Evaluate an asset based on various metrics
     */
    public static function evaluate_asset($asset_data)
    {
        $score = 0;
        $max_score = 100;
        $details = array();

        $type = isset($asset_data['type']) ? $asset_data['type'] : 'image';

        // 1. Resolution Check
        if (isset($asset_data['resolution'])) {
            $res_score = self::check_resolution($asset_data['resolution']);
            $score += $res_score;
            $details['resolution'] = array(
                'label' => 'Resolution Quality',
                'points' => $res_score,
                'status' => $res_score >= 20 ? 'Premium' : 'Standard'
            );
        }

        // 2. 3D Specific Metrics
        if ($type === '3d_object') {
            $poly_score = self::check_polygons($asset_data['poly_count']);
            $tex_score = self::check_texture_res($asset_data['texture_res']);

            $score += ($poly_score + $tex_score) / 2;
            $details['3d_metrics'] = array(
                'label' => '3D Optimization',
                'poly_status' => $poly_score > 15 ? 'Highly Detailed' : 'Mobile Optimized',
                'tex_status' => $tex_score > 15 ? 'High Fidelity' : 'Optimized'
            );
        }

        // 3. Prompt/Content Consistency
        if (isset($asset_data['prompt_match'])) {
            $match_score = $asset_data['prompt_match'] * 40; // 0.0 to 1.0 scale
            $score += $match_score;
            $details['consistency'] = array(
                'label' => 'Prompt Fidelity',
                'score' => $match_score
            );
        }

        $grade = self::calculate_grade($score);
        return array(
            'total_score' => min(100, round($score)),
            'grade' => $grade,
            'details' => $details,
            'certified' => $score >= 80,
            'reward' => self::calculate_reward($grade)
        );
    }

    /**
     * Calculate virtual currency reward based on quality grade
     */
    public static function calculate_reward($grade)
    {
        $rewards = array(
            'S' => 500,
            'A' => 200,
            'B' => 100,
            'C' => 50,
            'D' => 0
        );
        return isset($rewards[$grade]) ? $rewards[$grade] : 0;
    }

    private static function check_resolution($res)
    {
        if ($res >= 3840)
            return 30; // 4K
        if ($res >= 1920)
            return 20; // 1080p
        if ($res >= 1024)
            return 10;
        return 5;
    }

    private static function check_polygons($count)
    {
        if ($count > 100000)
            return 10; // Very heavy
        if ($count > 20000)
            return 30;  // High quality
        return 20; // Low Poly / Optimized
    }

    private static function check_texture_res($res)
    {
        if ($res >= 4096)
            return 30;
        if ($res >= 2048)
            return 20;
        return 10;
    }

    private static function calculate_grade($score)
    {
        if ($score >= 90)
            return 'S';
        if ($score >= 80)
            return 'A';
        if ($score >= 70)
            return 'B';
        if ($score >= 60)
            return 'C';
        return 'D';
    }
}
