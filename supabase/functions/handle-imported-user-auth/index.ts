import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: 'check' | 'activate';
  email?: string;
  phone?: string;
  token?: string;
  password?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const reqBody: any = await req.json();

    const action: 'check' | 'activate' = reqBody.action;
    const email: string | undefined = reqBody.email?.toLowerCase();
    const phone: string | undefined = reqBody.phone;
    const token: string | undefined = reqBody.token || reqBody.activation_token; // accept legacy key
    const password: string | undefined = reqBody.password;

    if (action === 'check') {
      // Use the database function to check user status
      const { data: userStatus, error } = await supabase.rpc('check_user_status_public', {
        p_email: email?.toLowerCase(),
        p_phone: phone
      });

      if (error) {
        throw error;
      }

      return new Response(JSON.stringify(userStatus), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });

    } else if (action === 'activate') {
      if (!token || !password) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Token and password are required for activation'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Validate the invitation token using the database function
      const { data: validation, error: validationError } = await supabase.rpc(
        'validate_invitation_token_enhanced', 
        { p_token: token }
      );

      if (validationError || !validation?.success) {
        return new Response(JSON.stringify({
          success: false,
          error: validation?.error || 'Invalid or expired activation token'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const userId = validation.user_id;
      let userEmail: string | null = (validation as any)?.email || (validation as any)?.profile?.email || email || null;

      // Fallback: fetch from profiles if still missing
      if (!userEmail) {
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', userId)
          .maybeSingle();
        userEmail = profileRow?.email ?? null;
      }

      if (!userEmail) {
        return new Response(JSON.stringify({
          success: false,
          error: 'User email not found for activation'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Create auth account using admin client
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: userEmail,
        password,
        email_confirm: true, // Auto-confirm email for imported users
        user_metadata: {
          imported_user: true,
          activation_token: token
        }
      });

      if (authError) {
        console.error('Auth creation error:', authError);
        return new Response(JSON.stringify({
          success: false,
          error: authError.message || 'Failed to create auth account'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Update the profile without changing the primary key to avoid FK issues
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          account_activation_status: 'activated',
          auth_created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (profileError) {
        console.error('Profile update error:', profileError);
        // Clean up auth user if profile update fails
        await supabase.auth.admin.deleteUser(authUser.user.id);
        
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to update profile after auth creation'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Create default wallets for the user (UGX and USD)
      const { error: walletError } = await supabase
        .from('wallets')
        .insert([
          {
            user_id: userId,
            currency: 'UGX',
            balance: 0,
            status: 'active'
          },
          {
            user_id: userId,
            currency: 'USD',
            balance: 0,
            status: 'active'
          }
        ]);

      if (walletError) {
        console.error('Wallet creation error:', walletError);
        // Don't fail the activation if wallet creation fails
        // Wallets can be created manually later if needed
      }

      // Mark invitation as used
      await supabase
        .from('imported_user_invitations')
        .update({
          status: 'used',
          used_at: new Date().toISOString()
        })
        .eq('invitation_token', token);

      return new Response(JSON.stringify({
        success: true,
        message: 'Account activated successfully',
        user_id: authUser.user.id
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid action specified'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Handler error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);