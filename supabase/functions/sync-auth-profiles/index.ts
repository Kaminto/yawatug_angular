import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface RequestBody {
  action: 'sync' | 'cleanup_orphans' | 'create_wallets' | 'get_status' | 'create_auth_for_orphans' | 'full_consistency_check';
  target_profile_ids?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin permissions
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.user_role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin privileges required' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { action, target_profile_ids }: RequestBody = await req.json();

    switch (action) {
      case 'sync': {
        const syncResults = {
          profilesUpdated: 0,
          walletsCreated: 0,
          orphanedAuth: 0,
          orphanedProfiles: 0,
          errors: [] as string[]
        };

        // Get all profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, auth_created_at, account_activation_status');

        if (profilesError) {
          throw profilesError;
        }

        // Check each profile for auth user existence
        for (const profile of profiles) {
          try {
            const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(profile.id);
            
            if (!authError && authUser?.user) {
              // Auth user exists, update profile if needed
              if (!profile.auth_created_at) {
                const { error: updateError } = await supabase
                  .from('profiles')
                  .update({ 
                    auth_created_at: new Date().toISOString(),
                    account_activation_status: 'activated'
                  })
                  .eq('id', profile.id);

                if (updateError) {
                  syncResults.errors.push(`Failed to update profile ${profile.email}: ${updateError.message}`);
                } else {
                  syncResults.profilesUpdated++;
                }
              }

              // Ensure wallet exists
              const { data: wallet } = await supabase
                .from('wallets')
                .select('id')
                .eq('user_id', profile.id)
                .eq('currency', 'UGX')
                .single();

              if (!wallet) {
                const { error: walletError } = await supabase
                  .from('wallets')
                  .insert({
                    user_id: profile.id,
                    currency: 'UGX',
                    balance: 0,
                    status: 'active'
                  });

                if (walletError) {
                  syncResults.errors.push(`Failed to create wallet for ${profile.email}: ${walletError.message}`);
                } else {
                  syncResults.walletsCreated++;
                }
              }
            } else {
              // No auth user for this profile
              if (profile.auth_created_at) {
                syncResults.orphanedProfiles++;
              }
            }
          } catch (error: any) {
            syncResults.errors.push(`Error processing profile ${profile.email}: ${error.message}`);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Sync completed',
            results: syncResults
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case 'cleanup_orphans': {
        // Get all auth users
        const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers();
        
        if (authUsersError) {
          throw authUsersError;
        }

        const orphanedAuthUsers = [];

        // Check each auth user for profile existence
        for (const authUser of authUsers.users) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', authUser.id)
            .single();

          if (!profile) {
            orphanedAuthUsers.push({
              id: authUser.id,
              email: authUser.email,
              created_at: authUser.created_at
            });
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: `Found ${orphanedAuthUsers.length} orphaned auth users`,
            orphanedAuthUsers
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case 'create_wallets': {
        let walletsCreated = 0;
        const errors = [];

        // Get all profiles
        const { data: allProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email');

        if (profilesError) {
          throw profilesError;
        }

        // Check each profile for existing wallet and create if needed
        for (const profile of allProfiles) {
          try {
            // Check if wallet already exists
            const { data: existingWallet } = await supabase
              .from('wallets')
              .select('id')
              .eq('user_id', profile.id)
              .eq('currency', 'UGX')
              .single();

            if (!existingWallet) {
              const { error: walletError } = await supabase
                .from('wallets')
                .insert({
                  user_id: profile.id,
                  currency: 'UGX',
                  balance: 0,
                  status: 'active'
                });

              if (walletError) {
                errors.push(`Failed to create wallet for ${profile.email}: ${walletError.message}`);
              } else {
                walletsCreated++;
              }
            }
          } catch (error: any) {
            errors.push(`Error processing wallet for ${profile.email}: ${error.message}`);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: `Created ${walletsCreated} wallets`,
            walletsCreated,
            errors
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case 'get_status': {
        // Get comprehensive sync status using new database function
        const { data, error } = await supabase.rpc('get_sync_status');
        
        if (error) {
          throw error;
        }

        return new Response(
          JSON.stringify({
            success: true,
            ...data
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case 'create_auth_for_orphans': {
        // Find and process orphaned profiles
        const { data: orphanedProfiles, error: queryError } = await supabase.rpc('find_orphaned_profiles');
        
        if (queryError) {
          throw queryError;
        }

        let profilesToProcess = orphanedProfiles;
        
        // Filter by target IDs if provided
        if (target_profile_ids && target_profile_ids.length > 0) {
          profilesToProcess = orphanedProfiles.filter((profile: any) => 
            target_profile_ids.includes(profile.profile_id)
          );
        }

        const profilesNeedingAuth = profilesToProcess.map((profile: any) => ({
          profile_id: profile.profile_id,
          email: profile.email,
          full_name: profile.full_name,
          created_at: profile.created_at
        }));

        return new Response(
          JSON.stringify({
            success: true,
            message: `Found ${profilesNeedingAuth.length} profiles that need auth accounts`,
            authAccountsNeeded: profilesNeedingAuth.length,
            profilesNeedingAuth,
            note: 'Auth account creation requires invitation flow or manual admin setup'
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case 'full_consistency_check': {
        // Run comprehensive consistency check
        const results = {
          syncStatus: null as any,
          orphanedProfiles: [] as any[],
          profilesWithoutWallets: [] as any[],
          walletCreationResult: null as any,
          recommendations: [] as string[]
        };

        // Get sync status
        const { data: statusData, error: statusError } = await supabase.rpc('get_sync_status');
        if (statusError) {
          throw statusError;
        }
        results.syncStatus = statusData;

        // Get orphaned profiles
        const { data: orphanedData, error: orphanError } = await supabase.rpc('find_orphaned_profiles');
        if (orphanError) {
          throw orphanError;
        }
        results.orphanedProfiles = orphanedData || [];

        // Get profiles without wallets
        const { data: walletData, error: walletError } = await supabase.rpc('find_profiles_without_wallets');
        if (walletError) {
          throw walletError;
        }
        results.profilesWithoutWallets = walletData || [];

        // Create missing wallets
        const { data: walletResult, error: createError } = await supabase.rpc('create_missing_wallets');
        if (createError) {
          throw createError;
        }
        results.walletCreationResult = walletResult;

        // Generate recommendations
        if (results.orphanedProfiles.length > 0) {
          results.recommendations.push('Create auth accounts for orphaned profiles');
        }
        if (results.profilesWithoutWallets.length > 0) {
          results.recommendations.push('Missing wallets have been created automatically');
        }
        results.recommendations.push('Consider setting up automated daily sync checks');

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Full consistency check completed',
            ...results
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }
  } catch (error: any) {
    console.error('Error in sync-auth-profiles:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);