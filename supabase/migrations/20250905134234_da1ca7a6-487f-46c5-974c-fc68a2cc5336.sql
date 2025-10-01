-- Ensure all users have both UGX and USD wallets for standardized wallet functionality
-- This will create missing wallets for existing users

DO $$
DECLARE
    user_record RECORD;
    ugx_wallet_exists BOOLEAN;
    usd_wallet_exists BOOLEAN;
    wallets_created INTEGER := 0;
BEGIN
    -- Loop through all profiles to ensure they have standard wallets
    FOR user_record IN 
        SELECT id, email 
        FROM public.profiles 
        WHERE id IS NOT NULL
    LOOP
        -- Check if UGX wallet exists
        SELECT EXISTS(
            SELECT 1 FROM public.wallets 
            WHERE user_id = user_record.id AND currency = 'UGX'
        ) INTO ugx_wallet_exists;
        
        -- Check if USD wallet exists
        SELECT EXISTS(
            SELECT 1 FROM public.wallets 
            WHERE user_id = user_record.id AND currency = 'USD'
        ) INTO usd_wallet_exists;
        
        -- Create UGX wallet if it doesn't exist
        IF NOT ugx_wallet_exists THEN
            INSERT INTO public.wallets (user_id, currency, balance, status)
            VALUES (user_record.id, 'UGX', 0, 'active');
            wallets_created := wallets_created + 1;
            RAISE NOTICE 'Created UGX wallet for user: %', user_record.email;
        END IF;
        
        -- Create USD wallet if it doesn't exist
        IF NOT usd_wallet_exists THEN
            INSERT INTO public.wallets (user_id, currency, balance, status)
            VALUES (user_record.id, 'USD', 0, 'active');
            wallets_created := wallets_created + 1;
            RAISE NOTICE 'Created USD wallet for user: %', user_record.email;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Wallet standardization complete. Created % wallets total.', wallets_created;
END $$;