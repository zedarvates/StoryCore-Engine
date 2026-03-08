<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * StoryCore Prompt Library
 * Manage and display Prompt Assets
 */
class StoryCore_Prompt_Library
{

    public static function get_prompts()
    {
        // This would eventually come from the database
        return array(
            array(
                'id' => 1,
                'title' => 'Cinematic Cyberpunk Street',
                'category' => 'Environment',
                'prompt' => 'Gritty cyberpunk street, neon lights, rain on pavement, volumetric fog, hyper-realistic, 8k, unreal engine 5 style',
                'neg_prompt' => 'blur, low quality, distorted, cartoon',
                'gemmes_score' => 95
            ),
            array(
                'id' => 2,
                'title' => 'Medieval Character Portrait',
                'category' => 'Character',
                'prompt' => 'Knight in ornate silver armor, dramatic lighting, stone background, intense gaze, highly detailed chainmail',
                'neg_prompt' => 'modern, digital artifacts, low res',
                'gemmes_score' => 88
            )
        );
    }

    public static function render_prompt_bank()
    {
        $prompts = self::get_prompts();
        ?>
        <div class="storycore-prompt-bank">
            <h3>Prompt Asset Bank</h3>
            <div class="prompt-grid">
                <?php foreach ($prompts as $p): ?>
                    <div class="prompt-card">
                        <div class="prompt-header">
                            <span class="category">
                                <?php echo esc_html($p['category']); ?>
                            </span>
                            <span class="gemmes-badge">GEMmes:
                                <?php echo esc_html($p['gemmes_score']); ?>
                            </span>
                        </div>
                        <h4>
                            <?php echo esc_html($p['title']); ?>
                        </h4>
                        <div class="prompt-fields">
                            <div class="field">
                                <label>Target Prompt:</label>
                                <code><?php echo esc_html($p['prompt']); ?></code>
                            </div>
                        </div>
                        <button class="button button-small copy-prompt" data-content="<?php echo esc_attr($p['prompt']); ?>">Copy
                            Prompt</button>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>

        <style>
            .prompt-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 20px;
            }

            .prompt-card {
                background: #fff;
                padding: 20px;
                border-radius: 12px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);
            }

            .prompt-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 15px;
            }

            .category {
                background: #f1f5f9;
                padding: 2px 10px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 700;
                color: #64748b;
            }

            .gemmes-badge {
                color: #22c55e;
                font-weight: 800;
                font-size: 11px;
            }

            .prompt-fields .field {
                margin-bottom: 10px;
            }

            .prompt-fields label {
                display: block;
                font-size: 12px;
                color: #94a3b8;
                margin-bottom: 5px;
            }

            .prompt-fields code {
                display: block;
                background: #f8fafc;
                padding: 10px;
                font-size: 12px;
                color: #1e293b;
                border-radius: 6px;
                max-height: 80px;
                overflow-y: auto;
            }
        </style>
        <?php
    }
}
