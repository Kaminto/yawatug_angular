-- Just insert data using existing allowed promotion types
INSERT INTO public.promotions (
    name, title, description, offer_details, target_audience, promotion_type, 
    value_percentage, priority, expires_at, terms_and_conditions
) VALUES 
(
    'first-time-bonus',
    'First-Time Investor Bonus',
    '🎉 Welcome Package: Get 15% bonus on your first investment plus exclusive benefits worth over UGX 100,000!',
    '{
        "bonus_percentage": 15,
        "free_consultation": true,
        "fast_track_verification": true,
        "early_bird_pricing": true,
        "priority_app_access": true,
        "consultation_value": 50000,
        "total_package_value": 100000
    }',
    'first_time',
    'bonus_shares',
    15,
    10,
    now() + INTERVAL '30 days',
    '• Valid for new investors only • Minimum investment UGX 100,000 • Bonus applied to first investment only • Cannot be combined with other offers • Consultation must be scheduled within 7 days'
),
(
    'premium-exclusive',
    'Premium Investor Exclusive',
    '💎 VIP Treatment: Premium investors get discount and dedicated account manager',
    '{
        "discount_percentage": 8,
        "dedicated_manager": true,
        "quarterly_reports": true,
        "priority_support": true,
        "exclusive_opportunities": true
    }',
    'premium',
    'discount',
    8,
    8,
    now() + INTERVAL '90 days',
    '• For investments above UGX 5,000,000 • Dedicated account manager assigned within 24 hours • Quarterly detailed profit analysis • Priority access to new mining opportunities'
),
(
    'returning-loyalty',
    'Returning Investor Loyalty Bonus',
    '🏆 Welcome Back: Get cashback for returning investors who have not invested in the last 6 months',
    '{
        "cashback_percentage": 5,
        "loyalty_tier_upgrade": true,
        "fee_reduction": 50
    }',
    'returning',
    'cashback',
    5,
    6,
    now() + INTERVAL '60 days',
    '• Valid for investors inactive for 6+ months • Applies to investments above UGX 500,000 • 50% reduction in transaction fees • Automatic loyalty tier upgrade'
),
(
    'mobile-referral-special',
    'Mobile App Referral Special',
    '📱 Referral Bonus: Get 3% bonus for every successful referral through our mobile app',
    '{
        "referral_bonus_percentage": 3,
        "app_exclusive": true,
        "mobile_only": true,
        "push_notifications": true
    }',
    'all',
    'referral_bonus',
    3,
    7,
    now() + INTERVAL '45 days',
    '• Available only through mobile app • Valid for all app users • Bonus applies to all referrals made via app • Includes real-time push notifications'
);