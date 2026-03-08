<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * GEMmes Transaction System
 * Manages virtual currency for the StoryCore Shop
 */
class GEMmes_Transactions
{

    /**
     * Get user balance
     */
    public static function get_balance($user_id = null)
    {
        if (!$user_id)
            $user_id = get_current_user_id();
        if (!$user_id)
            return 0;

        $balance = get_user_meta($user_id, 'storycore_gemmes_balance', true);
        return $balance !== '' ? (int) $balance : 1000; // Default 1000 for new users
    }

    /**
     * Add GEMmes to balance
     */
    public static function add_funds($amount, $user_id = null)
    {
        if (!$user_id)
            $user_id = get_current_user_id();
        $current = self::get_balance($user_id);
        update_user_meta($user_id, 'storycore_gemmes_balance', $current + $amount);
        self::log_transaction($user_id, 'credit', $amount, 'System Credit / Refund');
    }

    /**
     * Spend GEMmes
     */
    public static function spend_funds($amount, $description, $user_id = null)
    {
        if (!$user_id)
            $user_id = get_current_user_id();
        $current = self::get_balance($user_id);

        if ($current < $amount) {
            return new WP_Error('insufficient_funds', 'Not enough GEMmes to complete transaction.');
        }

        update_user_meta($user_id, 'storycore_gemmes_balance', $current - $amount);
        self::log_transaction($user_id, 'debit', $amount, $description);
        return true;
    }

    /**
     * Log transaction history
     */
    private static function log_transaction($user_id, $type, $amount, $description)
    {
        $history = get_user_meta($user_id, 'storycore_gemmes_history', true);
        if (!$history)
            $history = array();

        array_unshift($history, array(
            'date' => current_time('mysql'),
            'type' => $type,
            'amount' => $amount,
            'description' => $description
        ));

        // Keep last 50 transactions
        $history = array_slice($history, 0, 50);
        update_user_meta($user_id, 'storycore_gemmes_history', $history);
    }

    /**
     * Render the wallet UI
     */
    public static function render_wallet()
    {
        $balance = self::get_balance();
        $history = get_user_meta(get_current_user_id(), 'storycore_gemmes_history', true);
        ?>
        <div class="storycore-wallet">
            <div class="wallet-header">
                <h3>Your GEMmes Wallet</h3>
                <div class="balance-display">
                    <span class="gem-icon">💎</span>
                    <span class="balance-amount">
                        <?php echo number_format($balance); ?>
                    </span>
                    <span class="balance-label">GEMmes Available</span>
                </div>
            </div>

            <div class="transaction-history">
                <h4>Recent Activity</h4>
                <?php if (!empty($history)): ?>
                    <table class="wp-list-table widefat fixed striped">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($history as $t): ?>
                                <tr>
                                    <td>
                                        <?php echo esc_html($t['date']); ?>
                                    </td>
                                    <td>
                                        <?php echo esc_html($t['description']); ?>
                                    </td>
                                    <td class="<?php echo $t['type'] === 'credit' ? 'text-success' : 'text-danger'; ?>">
                                        <?php echo $t['type'] === 'credit' ? '+' : '-'; ?>
                                        <?php echo number_format($t['amount']); ?> 💎
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php else: ?>
                    <p>No recent transactions.</p>
                <?php endif; ?>
            </div>
        </div>

        <style>
            .storycore-wallet {
                background: #fff;
                border-radius: 12px;
                overflow: hidden;
            }

            .wallet-header {
                background: linear-gradient(135deg, #4f46e5 0%, #ec4899 100%);
                padding: 30px;
                color: #fff;
                text-align: center;
            }

            .balance-display {
                margin-top: 15px;
            }

            .gem-icon {
                font-size: 32px;
                display: block;
            }

            .balance-amount {
                font-size: 48px;
                font-weight: 900;
                display: block;
                line-height: 1;
            }

            .balance-label {
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 2px;
                opacity: 0.8;
            }

            .transaction-history {
                padding: 20px;
            }

            .text-success {
                color: #22c55e;
                font-weight: 700;
            }

            .text-danger {
                color: #ef4444;
                font-weight: 700;
            }
        </style>
        <?php
    }
}
