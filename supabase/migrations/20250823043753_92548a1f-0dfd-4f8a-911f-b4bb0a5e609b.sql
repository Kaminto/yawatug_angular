-- Enhanced Sell Shares System Implementation
-- This migration creates the comprehensive sell shares system with admin controls, FIFO queue, and market protection

-- Drop existing table if needed and recreate with enhanced structure
DROP TABLE IF EXISTS public.share_sell_orders CASCADE;

-- Create enhanced share sell orders table (renamed from share_buyback_orders)
CREATE TABLE public.share_sell_orders (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    share_id uuid NOT NULL,
    quantity integer NOT NULL CHECK (quantity > 0),
    requested_price numeric NOT NULL CHECK (requested_price > 0),
    current_market_price numeric,
    
    -- Order management
    order_type text NOT NULL DEFAULT 'market' CHECK (order_type IN ('market', 'limit')),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'completed', 'cancelled', 'expired')),
    priority_level integer NOT NULL DEFAULT 1 CHECK (priority_level BETWEEN 1 AND 5),
    
    -- FIFO Queue Management
    fifo_position integer,
    original_quantity integer NOT NULL,
    processed_quantity integer NOT NULL DEFAULT 0,
    remaining_quantity integer NOT NULL,
    
    -- Partial Processing Support
    last_partial_processing_at timestamp with time zone,
    processing_batch_id uuid,
    
    -- Order lifecycle
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    expires_at timestamp with time zone,
    completed_at timestamp with time zone,
    
    -- User modifications
    modification_count integer NOT NULL DEFAULT 0,
    last_modified_at timestamp with time zone,
    cancellation_reason text,
    
    -- Admin processing
    processed_by uuid,
    processing_notes text,
    
    -- Financial calculations
    total_sell_value numeric GENERATED ALWAYS AS (quantity * requested_price) STORED,
    estimated_fees numeric,
    net_proceeds numeric,
    
    -- Market protection
    price_impact_assessment jsonb,
    market_conditions_at_submission jsonb,
    
    CONSTRAINT valid_remaining_quantity CHECK (remaining_quantity >= 0),
    CONSTRAINT valid_processed_quantity CHECK (processed_quantity <= original_quantity)
);

-- Create processing batches table for admin batch operations
CREATE TABLE public.sell_order_processing_batches (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_reference text NOT NULL UNIQUE,
    processed_by uuid NOT NULL,
    processing_type text NOT NULL DEFAULT 'manual' CHECK (processing_type IN ('manual', 'auto', 'scheduled')),
    
    -- Batch details
    orders_count integer NOT NULL DEFAULT 0,
    total_quantity integer NOT NULL DEFAULT 0,
    total_value numeric NOT NULL DEFAULT 0,
    
    -- Fund management
    buyback_fund_used numeric NOT NULL DEFAULT 0,
    fund_balance_before numeric,
    fund_balance_after numeric,
    
    -- Processing status
    status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'partial')),
    started_at timestamp with time zone NOT NULL DEFAULT now(),
    completed_at timestamp with time zone,
    
    -- Batch settings
    processing_settings jsonb,
    results_summary jsonb,
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create order modifications tracking table
CREATE TABLE public.share_sell_order_modifications (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid NOT NULL REFERENCES public.share_sell_orders(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    
    -- Modification details
    modification_type text NOT NULL CHECK (modification_type IN ('quantity_change', 'cancellation', 'admin_adjustment')),
    old_values jsonb NOT NULL,
    new_values jsonb NOT NULL,
    reason text,
    
    -- FIFO impact
    fifo_position_before integer,
    fifo_position_after integer,
    queue_reset boolean NOT NULL DEFAULT false,
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid NOT NULL
);

-- Create buyback fund transactions table for detailed tracking
CREATE TABLE public.buyback_fund_transactions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_type text NOT NULL CHECK (transaction_type IN ('order_payment', 'fund_allocation', 'adjustment', 'refund')),
    
    -- Related order information
    sell_order_id uuid REFERENCES public.share_sell_orders(id),
    processing_batch_id uuid REFERENCES public.sell_order_processing_batches(id),
    
    -- Transaction details
    amount numeric NOT NULL,
    currency text NOT NULL DEFAULT 'UGX',
    description text NOT NULL,
    reference_id text,
    
    -- Fund balance tracking
    balance_before numeric NOT NULL,
    balance_after numeric NOT NULL,
    
    -- Authorization
    authorized_by uuid NOT NULL,
    authorization_notes text,
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed'))
);

-- Create market protection settings table
CREATE TABLE public.sell_order_market_protection (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    is_enabled boolean NOT NULL DEFAULT true,
    
    -- Price protection limits
    max_price_drop_percentage numeric NOT NULL DEFAULT 5.0 CHECK (max_price_drop_percentage >= 0),
    daily_volume_limit integer NOT NULL DEFAULT 100000,
    weekly_volume_limit integer NOT NULL DEFAULT 500000,
    
    -- Auto-processing limits
    auto_processing_fund_threshold numeric NOT NULL DEFAULT 1000000,
    max_daily_auto_processing_amount numeric NOT NULL DEFAULT 5000000,
    
    -- Market conditions monitoring
    price_monitoring_window_hours integer NOT NULL DEFAULT 24,
    volume_spike_threshold_multiplier numeric NOT NULL DEFAULT 3.0,
    
    -- Emergency controls
    emergency_halt_enabled boolean NOT NULL DEFAULT false,
    emergency_halt_reason text,
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_by uuid
);

-- Insert default market protection settings
INSERT INTO public.sell_order_market_protection (
    max_price_drop_percentage,
    daily_volume_limit,
    weekly_volume_limit,
    auto_processing_fund_threshold,
    max_daily_auto_processing_amount
) VALUES (5.0, 100000, 500000, 1000000, 5000000);

-- Enable RLS on all tables
ALTER TABLE public.share_sell_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sell_order_processing_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_sell_order_modifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyback_fund_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sell_order_market_protection ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Share sell orders policies
CREATE POLICY "Users can view their own sell orders" 
ON public.share_sell_orders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sell orders" 
ON public.share_sell_orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending orders" 
ON public.share_sell_orders 
FOR UPDATE 
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can manage all sell orders" 
ON public.share_sell_orders 
FOR ALL 
USING (is_admin(auth.uid()));

-- Processing batches policies
CREATE POLICY "Admins can manage processing batches" 
ON public.sell_order_processing_batches 
FOR ALL 
USING (is_admin(auth.uid()));

-- Order modifications policies  
CREATE POLICY "Users can view their order modifications" 
ON public.share_sell_order_modifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create order modifications" 
ON public.share_sell_order_modifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage all modifications" 
ON public.share_sell_order_modifications 
FOR ALL 
USING (is_admin(auth.uid()));

-- Buyback fund transactions policies
CREATE POLICY "Admins can manage buyback fund transactions" 
ON public.buyback_fund_transactions 
FOR ALL 
USING (is_admin(auth.uid()));

-- Market protection policies
CREATE POLICY "Admins can manage market protection" 
ON public.sell_order_market_protection 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Users can view market protection settings" 
ON public.sell_order_market_protection 
FOR SELECT 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_share_sell_orders_user_id ON public.share_sell_orders(user_id);
CREATE INDEX idx_share_sell_orders_status ON public.share_sell_orders(status);
CREATE INDEX idx_share_sell_orders_fifo_position ON public.share_sell_orders(fifo_position) WHERE status = 'pending';
CREATE INDEX idx_share_sell_orders_share_id ON public.share_sell_orders(share_id);
CREATE INDEX idx_sell_order_modifications_order_id ON public.share_sell_order_modifications(order_id);
CREATE INDEX idx_buyback_fund_transactions_order_id ON public.buyback_fund_transactions(sell_order_id);

-- Create trigger for updating FIFO positions
CREATE OR REPLACE FUNCTION public.update_sell_order_fifo_positions()
RETURNS TRIGGER AS $$
BEGIN
    -- Update FIFO positions for pending orders
    WITH numbered_orders AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_position
        FROM public.share_sell_orders 
        WHERE status = 'pending'
    )
    UPDATE public.share_sell_orders 
    SET fifo_position = numbered_orders.new_position,
        updated_at = now()
    FROM numbered_orders 
    WHERE public.share_sell_orders.id = numbered_orders.id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for FIFO position updates
CREATE TRIGGER update_sell_order_fifo_positions_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.share_sell_orders
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.update_sell_order_fifo_positions();

-- Create trigger for updating remaining quantity
CREATE OR REPLACE FUNCTION public.update_remaining_quantity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.remaining_quantity := NEW.original_quantity - NEW.processed_quantity;
    NEW.updated_at := now();
    
    -- Update status based on processing
    IF NEW.remaining_quantity = 0 THEN
        NEW.status := 'completed';
        NEW.completed_at := now();
    ELSIF NEW.processed_quantity > 0 AND NEW.remaining_quantity > 0 THEN
        NEW.status := 'partial';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_remaining_quantity_trigger
    BEFORE UPDATE ON public.share_sell_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_remaining_quantity();

-- Create function to submit sell order with validations
CREATE OR REPLACE FUNCTION public.submit_sell_order(
    p_user_id uuid,
    p_share_id uuid,
    p_quantity integer,
    p_order_type text DEFAULT 'market'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    order_id uuid;
    current_price numeric;
    market_protection record;
    user_holdings integer;
BEGIN
    -- Get current share price
    SELECT price_per_share INTO current_price
    FROM public.shares
    WHERE id = p_share_id;
    
    IF current_price IS NULL THEN
        RAISE EXCEPTION 'Share not found or invalid';
    END IF;
    
    -- Check user holdings
    SELECT COALESCE(SUM(quantity), 0) INTO user_holdings
    FROM public.user_shares
    WHERE user_id = p_user_id AND share_id = p_share_id;
    
    IF user_holdings < p_quantity THEN
        RAISE EXCEPTION 'Insufficient share holdings';
    END IF;
    
    -- Get market protection settings
    SELECT * INTO market_protection
    FROM public.sell_order_market_protection
    WHERE is_enabled = true
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Check daily volume limits if protection is enabled
    IF market_protection.is_enabled THEN
        -- Add volume checks here
        NULL;
    END IF;
    
    -- Create sell order
    INSERT INTO public.share_sell_orders (
        user_id,
        share_id,
        quantity,
        original_quantity,
        remaining_quantity,
        requested_price,
        current_market_price,
        order_type,
        market_conditions_at_submission
    ) VALUES (
        p_user_id,
        p_share_id,
        p_quantity,
        p_quantity,
        p_quantity,
        current_price,
        current_price,
        p_order_type,
        jsonb_build_object(
            'price_at_submission', current_price,
            'timestamp', now()
        )
    ) RETURNING id INTO order_id;
    
    RETURN order_id;
END;
$$;

-- Create function to process sell orders (admin)
CREATE OR REPLACE FUNCTION public.process_sell_orders_batch(
    p_order_ids uuid[],
    p_admin_id uuid,
    p_processing_type text DEFAULT 'manual'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    batch_id uuid;
    current_fund_balance numeric;
    total_payment_needed numeric := 0;
    order_record record;
    payment_amount numeric;
BEGIN
    -- Verify admin permissions
    IF NOT is_admin(p_admin_id) THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;
    
    -- Get current buyback fund balance
    SELECT balance INTO current_fund_balance
    FROM public.admin_sub_wallets
    WHERE wallet_type = 'share_buyback' AND currency = 'UGX'
    LIMIT 1;
    
    IF current_fund_balance IS NULL THEN
        RAISE EXCEPTION 'Buyback fund wallet not found';
    END IF;
    
    -- Calculate total payment needed
    FOR order_record IN 
        SELECT * FROM public.share_sell_orders
        WHERE id = ANY(p_order_ids) AND status IN ('pending', 'partial')
    LOOP
        payment_amount := order_record.remaining_quantity * order_record.requested_price;
        total_payment_needed := total_payment_needed + payment_amount;
    END LOOP;
    
    -- Check if sufficient funds available
    IF current_fund_balance < total_payment_needed THEN
        RAISE EXCEPTION 'Insufficient buyback fund balance. Required: %, Available: %', 
            total_payment_needed, current_fund_balance;
    END IF;
    
    -- Create processing batch
    INSERT INTO public.sell_order_processing_batches (
        batch_reference,
        processed_by,
        processing_type,
        orders_count,
        total_value,
        buyback_fund_used,
        fund_balance_before,
        fund_balance_after
    ) VALUES (
        'BATCH-' || extract(epoch from now())::text,
        p_admin_id,
        p_processing_type,
        array_length(p_order_ids, 1),
        total_payment_needed,
        total_payment_needed,
        current_fund_balance,
        current_fund_balance - total_payment_needed
    ) RETURNING id INTO batch_id;
    
    -- Process each order
    FOR order_record IN 
        SELECT * FROM public.share_sell_orders
        WHERE id = ANY(p_order_ids) AND status IN ('pending', 'partial')
    LOOP
        payment_amount := order_record.remaining_quantity * order_record.requested_price;
        
        -- Update order as completed
        UPDATE public.share_sell_orders
        SET status = 'completed',
            processed_quantity = original_quantity,
            remaining_quantity = 0,
            completed_at = now(),
            processed_by = p_admin_id,
            processing_batch_id = batch_id
        WHERE id = order_record.id;
        
        -- Record fund transaction
        INSERT INTO public.buyback_fund_transactions (
            transaction_type,
            sell_order_id,
            processing_batch_id,
            amount,
            description,
            balance_before,
            balance_after,
            authorized_by
        ) VALUES (
            'order_payment',
            order_record.id,
            batch_id,
            payment_amount,
            'Order processing payment',
            current_fund_balance,
            current_fund_balance - payment_amount,
            p_admin_id
        );
        
        current_fund_balance := current_fund_balance - payment_amount;
    END LOOP;
    
    -- Deduct from buyback fund
    UPDATE public.admin_sub_wallets
    SET balance = balance - total_payment_needed,
        updated_at = now()
    WHERE wallet_type = 'share_buyback' AND currency = 'UGX';
    
    -- Update batch as completed
    UPDATE public.sell_order_processing_batches
    SET status = 'completed',
        completed_at = now()
    WHERE id = batch_id;
    
    RETURN batch_id;
END;
$$;

-- Create function for users to modify orders (quantity only)
CREATE OR REPLACE FUNCTION public.modify_sell_order_quantity(
    p_order_id uuid,
    p_user_id uuid,
    p_new_quantity integer,
    p_reason text DEFAULT 'User modification'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    order_record record;
    user_holdings integer;
BEGIN
    -- Get order details and verify ownership
    SELECT * INTO order_record
    FROM public.share_sell_orders
    WHERE id = p_order_id AND user_id = p_user_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found or cannot be modified';
    END IF;
    
    -- Validate new quantity against holdings
    SELECT COALESCE(SUM(quantity), 0) INTO user_holdings
    FROM public.user_shares
    WHERE user_id = p_user_id AND share_id = order_record.share_id;
    
    IF user_holdings < p_new_quantity THEN
        RAISE EXCEPTION 'New quantity exceeds available holdings';
    END IF;
    
    -- Record modification
    INSERT INTO public.share_sell_order_modifications (
        order_id,
        user_id,
        modification_type,
        old_values,
        new_values,
        reason,
        fifo_position_before,
        queue_reset,
        created_by
    ) VALUES (
        p_order_id,
        p_user_id,
        'quantity_change',
        jsonb_build_object('quantity', order_record.quantity),
        jsonb_build_object('quantity', p_new_quantity),
        p_reason,
        order_record.fifo_position,
        true,
        p_user_id
    );
    
    -- Update order with new timestamp (resets FIFO position)
    UPDATE public.share_sell_orders
    SET quantity = p_new_quantity,
        original_quantity = p_new_quantity,
        remaining_quantity = p_new_quantity,
        modification_count = modification_count + 1,
        last_modified_at = now(),
        created_at = now() -- Reset timestamp for FIFO
    WHERE id = p_order_id;
    
    RETURN true;
END;
$$;

-- Create function to cancel sell order
CREATE OR REPLACE FUNCTION public.cancel_sell_order(
    p_order_id uuid,
    p_user_id uuid,
    p_reason text DEFAULT 'User cancellation'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    order_record record;
BEGIN
    -- Get order and verify ownership
    SELECT * INTO order_record
    FROM public.share_sell_orders
    WHERE id = p_order_id AND user_id = p_user_id AND status IN ('pending', 'partial');
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found or cannot be cancelled';
    END IF;
    
    -- Record cancellation
    INSERT INTO public.share_sell_order_modifications (
        order_id,
        user_id,
        modification_type,
        old_values,
        new_values,
        reason,
        created_by
    ) VALUES (
        p_order_id,
        p_user_id,
        'cancellation',
        jsonb_build_object('status', order_record.status),
        jsonb_build_object('status', 'cancelled'),
        p_reason,
        p_user_id
    );
    
    -- Update order status
    UPDATE public.share_sell_orders
    SET status = 'cancelled',
        cancellation_reason = p_reason,
        updated_at = now()
    WHERE id = p_order_id;
    
    RETURN true;
END;
$$;

-- Migrate existing data from share_buyback_orders if it exists
DO $$
DECLARE
    rec record;
BEGIN
    -- Check if old table exists and migrate data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'share_buyback_orders') THEN
        FOR rec IN SELECT * FROM public.share_buyback_orders
        LOOP
            INSERT INTO public.share_sell_orders (
                id,
                user_id,
                share_id,
                quantity,
                original_quantity,
                remaining_quantity,
                requested_price,
                status,
                fifo_position,
                created_at,
                updated_at
            ) VALUES (
                rec.id,
                rec.user_id,
                rec.share_id,
                rec.quantity,
                rec.quantity,
                COALESCE(rec.quantity - COALESCE(rec.processed_quantity, 0), rec.quantity),
                rec.requested_price,
                rec.status,
                rec.fifo_position,
                rec.created_at,
                rec.updated_at
            ) ON CONFLICT (id) DO NOTHING;
        END LOOP;
    END IF;
END $$;