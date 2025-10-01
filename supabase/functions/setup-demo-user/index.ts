import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    console.log('🚀 Starting demo user setup process...');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Add timeout to prevent hanging operations
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout - exceeded 30 seconds')), 30000);
    });

    console.log('✅ Supabase admin client initialized');

    const demoEmail = 'demo@yawatug.com';
    const demoPassword = 'DemoPassword123!';

    // First, check if the user exists in auth.users
    const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (getUserError) {
      console.error('Error listing users:', getUserError);
      throw getUserError;
    }

    let demoUser = existingUser.users.find(user => user.email === demoEmail);

    if (!demoUser) {
      console.log('Creating new demo user...');
      // Create the auth user
      const { data: createUserData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: demoEmail,
        password: demoPassword,
        email_confirm: true,
        user_metadata: {
          full_name: 'Demo User'
        }
      });

      if (createUserError) {
        console.error('Error creating user:', createUserError);
        throw createUserError;
      }

      demoUser = createUserData.user;
      console.log('Demo user created successfully:', demoUser.id);
    } else {
      console.log('Demo user already exists:', demoUser.id);
      
      // Update password to ensure it's correct
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(demoUser.id, {
        password: demoPassword
      });

      if (updateError) {
        console.error('Error updating user password:', updateError);
        throw updateError;
      }
      
      console.log('Demo user password updated');
    }

    if (!demoUser) {
      throw new Error('Failed to create or find demo user');
    }

    // Validate user ID format before proceeding
    if (!demoUser.id || typeof demoUser.id !== 'string' || demoUser.id.length < 10) {
      throw new Error('Invalid user ID format received from auth system');
    }

    console.log('🔧 Setting up demo user profile and data...');
    
    // Wrap the setup in a race with timeout
    const setupOperation = supabaseAdmin.rpc('setup_demo_user_data', { p_user_id: demoUser.id });
    const setupResult = await Promise.race([setupOperation, timeoutPromise]) as any;
    const { data: setupData, error: setupError } = setupResult;

    if (setupError) {
      console.error('❌ Error setting up demo user data:', {
        error: setupError,
        code: setupError.code,
        details: setupError.details,
        hint: setupError.hint,
        message: setupError.message
      });
      
      // Check for specific constraint violations and provide better error messages
      if (setupError.code === '23505') {
        if (setupError.details?.includes('referral_code')) {
          console.log('🔄 Referral code conflict detected, attempting cleanup...');
          
          // Attempt to clean up existing referral code
          const { error: cleanupError } = await supabaseAdmin
            .rpc('cleanup_demo_user_data', { p_user_id: demoUser.id });
          
          if (cleanupError) {
            console.error('❌ Cleanup failed:', cleanupError);
          } else {
            console.log('✅ Cleanup successful, retrying setup...');
            // Retry setup after cleanup
            const { data: retryData, error: retryError } = await supabaseAdmin
              .rpc('setup_demo_user_data', { p_user_id: demoUser.id });
            
            if (retryError) {
              throw retryError;
            } else {
              console.log('✅ Retry setup successful:', retryData);
            }
          }
        } else {
          throw setupError;
        }
      } else {
        throw setupError;
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Demo user setup completed successfully in ${processingTime}ms:`, setupData);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo user setup completed successfully',
        user_id: demoUser.id,
        email: demoEmail,
        credentials: {
          email: demoEmail,
          password: demoPassword
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Setup demo user error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})