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
  action: 'sync' | 'cleanup_orphans' | 'create_wallets' | 'get_status' | 'create_auth_for_orphans' | 'create_profiles_for_orphans' | 'full_consistency_check' | 'check_sync_status' | 'match_by_email_phone';
  target_profile_ids?: string[];
  email?: string;
  phone?: string;
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
        console.log('🔄 Starting create_auth_for_orphans action');
        
        // Get profiles without auth accounts
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, full_name, phone')
          .is('auth_created_at', null);
        
        if (profilesError) {
          console.error('❌ Error fetching orphaned profiles:', profilesError);
          throw profilesError;
        }

        console.log(`📊 Found ${profiles.length} orphaned profiles`);

        let profilesToProcess = profiles;
        
        // Filter by target IDs if provided
        if (target_profile_ids && target_profile_ids.length > 0) {
          profilesToProcess = profiles.filter((profile: any) => 
            target_profile_ids.includes(profile.id)
          );
          console.log(`🎯 Filtered to ${profilesToProcess.length} target profiles`);
        }

        const results = {
          success: 0,
          failed: 0,
          errors: [] as any[],
          created: [] as any[]
        };

        // Create auth accounts for each orphaned profile
        for (const profile of profilesToProcess) {
          try {
            console.log(`🔄 Processing profile ${profile.id} (${profile.email || profile.phone})`);
            
            // Check if profile has email or phone
            if (!profile.email && !profile.phone) {
              const error = 'No email or phone found - cannot create auth or send invitation';
              console.error(`❌ Profile ${profile.id}: ${error}`);
              results.errors.push({
                profile_id: profile.id,
                full_name: profile.full_name,
                error
              });
              results.failed++;
              continue;
            }

            // Generate a secure temporary password
            const tempPassword = `Temp${Math.random().toString(36).slice(2)}${Date.now()}!`;

            // Prepare auth user creation payload based on available contact info
            let createUserPayload: any = {
              password: tempPassword,
              user_metadata: {
                full_name: profile.full_name,
                imported_profile: true
              }
            };

            // Create auth user with email or phone
            if (profile.email) {
              console.log(`📧 Creating auth user for ${profile.email}`);
              createUserPayload.email = profile.email;
              createUserPayload.email_confirm = true;
              if (profile.phone) {
                createUserPayload.user_metadata.phone = profile.phone;
              }
            } else if (profile.phone) {
              console.log(`📱 Creating auth user for phone ${profile.phone}`);
              createUserPayload.phone = profile.phone;
              createUserPayload.phone_confirm = true;
              createUserPayload.user_metadata.email = null;
            } else {
              console.error(`❌ Profile ${profile.id} (${profile.full_name}) has no email or phone`);
              results.errors.push({
                profile_id: profile.id,
                full_name: profile.full_name,
                error: 'Profile has no email or phone - cannot create auth user',
                details: 'User needs to update profile with contact information'
              });
              results.failed++;
              continue;
            }

            const { data: authUser, error: authError } = await supabase.auth.admin.createUser(createUserPayload);

            if (authError) {
              const contactInfo = profile.email || profile.phone;
              console.error(`❌ Auth creation failed for ${contactInfo}:`, authError);
              results.errors.push({
                profile_id: profile.id,
                email: profile.email,
                phone: profile.phone,
                full_name: profile.full_name,
                error: authError.message,
                error_code: authError.code,
                details: authError.details
              });
              results.failed++;
              continue;
            }

            const contactInfo = profile.email || profile.phone;
            console.log(`✅ Auth user created for ${contactInfo}`);

            // Update profile to mark auth as created
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                auth_created_at: new Date().toISOString(),
                account_activation_status: 'activated'
              })
              .eq('id', profile.id);

            if (updateError) {
              console.error(`Failed to update profile ${profile.id}:`, updateError);
            }

            // Ensure wallets exist
            const { data: existingWallet } = await supabase
              .from('wallets')
              .select('id')
              .eq('user_id', profile.id)
              .eq('currency', 'UGX')
              .single();

            if (!existingWallet) {
              await supabase
                .from('wallets')
                .insert([
                  { user_id: profile.id, currency: 'UGX', balance: 0, status: 'active' },
                  { user_id: profile.id, currency: 'USD', balance: 0, status: 'active' }
                ]);
            }

            results.success++;
            results.created.push({
              profile_id: profile.id,
              email: profile.email,
              phone: profile.phone,
              temp_password: tempPassword, // Return this securely
              note: profile.phone && !profile.email ? 'Phone-only account - user can login with phone and password' : undefined
            });

          } catch (error: any) {
            console.error(`❌ Unexpected error creating auth for profile ${profile.id}:`, error);
            results.errors.push({
              profile_id: profile.id,
              email: profile.email || 'N/A',
              full_name: profile.full_name,
              error: error.message,
              stack: error.stack
            });
            results.failed++;
          }
        }

        console.log(`✅ Auth creation complete: ${results.success} success, ${results.failed} failed`);

        return new Response(
          JSON.stringify({
            success: true,
            message: `Created ${results.success} auth accounts (${results.failed} failed)`,
            results,
            note: 'Temporary passwords generated - users should reset via email'
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case 'create_profiles_for_orphans': {
        console.log('🔄 Starting create_profiles_for_orphans action');
        
        // Get auth users and profiles
        const { data: authUsersData, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) {
          console.error('❌ Error fetching auth users:', authError);
          throw authError;
        }

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id');
        
        if (profilesError) {
          console.error('❌ Error fetching profiles:', profilesError);
          throw profilesError;
        }

        const profileIds = new Set(profiles.map(p => p.id));
        const orphanedAuthUsers = authUsersData.users.filter(u => !profileIds.has(u.id));
        
        console.log(`📊 Found ${orphanedAuthUsers.length} orphaned auth users`);

        let usersToProcess = orphanedAuthUsers;
        if (target_profile_ids && target_profile_ids.length > 0) {
          usersToProcess = orphanedAuthUsers.filter(u => target_profile_ids.includes(u.id));
          console.log(`🎯 Filtered to ${usersToProcess.length} target users`);
        }

        const results = {
          success: 0,
          failed: 0,
          errors: [] as any[],
          created: [] as any[]
        };

        for (const authUser of usersToProcess) {
          try {
            console.log(`🔄 Processing auth user ${authUser.id} (${authUser.email || authUser.phone})`);
            
            // Validate that auth user has at least email or phone
            if (!authUser.email && !authUser.phone) {
              console.error(`❌ Auth user ${authUser.id} has neither email nor phone`);
              results.errors.push({
                user_id: authUser.id,
                error: 'Auth user has neither email nor phone - cannot create profile'
              });
              results.failed++;
              continue;
            }
            
            // Create profile (works with phone-only users too)
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: authUser.id,
                email: authUser.email || null,
                full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || authUser.phone || 'User',
                phone: authUser.user_metadata?.phone || authUser.phone || null,
                auth_created_at: authUser.created_at,
                account_activation_status: 'activated',
                status: 'active'
              });

            if (profileError) {
              console.error(`❌ Profile creation failed for ${authUser.email}:`, profileError);
              results.errors.push({
                user_id: authUser.id,
                email: authUser.email,
                error: profileError.message,
                error_code: profileError.code,
                details: profileError.details
              });
              results.failed++;
              continue;
            }

            console.log(`✅ Profile created for ${authUser.email || authUser.phone}`);

            // Create wallets
            await supabase
              .from('wallets')
              .insert([
                { user_id: authUser.id, currency: 'UGX', balance: 0, status: 'active' },
                { user_id: authUser.id, currency: 'USD', balance: 0, status: 'active' }
              ]);

            results.success++;
            results.created.push({
              user_id: authUser.id,
              email: authUser.email,
              phone: authUser.phone,
              note: authUser.email ? 'Profile created with email' : 'Profile created with phone only - user can login via phone'
            });
          } catch (error: any) {
            console.error(`❌ Unexpected error creating profile for auth user ${authUser.id}:`, error);
            results.errors.push({
              user_id: authUser.id,
              email: authUser.email,
              error: error.message,
              stack: error.stack
            });
            results.failed++;
          }
        }

        console.log(`✅ Profile creation complete: ${results.success} success, ${results.failed} failed`);

        return new Response(
          JSON.stringify({
            success: true,
            message: `Created ${results.success} profiles (${results.failed} failed)`,
            results
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case 'check_sync_status': {
        // Get comprehensive sync status with orphaned auth users
        const { data: authUsersData, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) throw authError;

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, phone, full_name');
        if (profilesError) throw profilesError;

        const profileIds = new Set(profiles.map(p => p.id));
        const profileEmails = new Map(profiles.map(p => [p.email?.toLowerCase(), p]));
        const profilePhones = new Map(profiles.map(p => [p.phone, p]));

        const orphanedAuthUsers = authUsersData.users
          .filter(u => !profileIds.has(u.id))
          .map(u => ({
            id: u.id,
            email: u.email,
            phone: u.phone,
            user_metadata: u.user_metadata,
            created_at: u.created_at,
            // Check if email/phone exists in profiles
            matchingProfile: profileEmails.get(u.email?.toLowerCase()) || profilePhones.get(u.phone)
          }));

        return new Response(
          JSON.stringify({
            success: true,
            orphanedAuthUsers,
            totalAuthUsers: authUsersData.users.length,
            totalProfiles: profiles.length
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case 'match_by_email_phone': {
        // Match auth users with profiles by email/phone and sync
        const { email, phone } = await req.json();
        
        const results = {
          matched: false,
          authUser: null as any,
          profile: null as any,
          action: null as string | null
        };

        // Find auth user by email or phone
        const { data: authUsersData, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) throw authError;

        const authUser = authUsersData.users.find(u => 
          (email && u.email?.toLowerCase() === email.toLowerCase()) ||
          (phone && u.phone === phone)
        );

        // Find profile by email or phone
        let query = supabase.from('profiles').select('*');
        if (email) query = query.or(`email.eq.${email}`);
        if (phone) query = query.or(`phone.eq.${phone}`);
        
        const { data: matchingProfiles } = await query.limit(1).single();

        if (authUser && !matchingProfiles) {
          // Auth exists but no profile - create profile
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authUser.id,
              email: authUser.email,
              full_name: authUser.user_metadata?.full_name,
              phone: authUser.phone || authUser.user_metadata?.phone,
              auth_created_at: authUser.created_at,
              account_activation_status: 'activated',
              status: 'active'
            });

          if (!profileError) {
            await supabase.from('wallets').insert([
              { user_id: authUser.id, currency: 'UGX', balance: 0, status: 'active' },
              { user_id: authUser.id, currency: 'USD', balance: 0, status: 'active' }
            ]);
            results.action = 'profile_created';
            results.matched = true;
          }
        } else if (!authUser && matchingProfiles) {
          // Profile exists but no auth - create auth
          const tempPassword = `Temp${Math.random().toString(36).slice(2)}${Date.now()}!`;
          
          const { data: newAuthUser, error: authError } = await supabase.auth.admin.createUser({
            email: matchingProfiles.email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              full_name: matchingProfiles.full_name,
              phone: matchingProfiles.phone
            }
          });

          if (!authError) {
            await supabase
              .from('profiles')
              .update({
                auth_created_at: new Date().toISOString(),
                account_activation_status: 'activated'
              })
              .eq('id', matchingProfiles.id);
            
            results.action = 'auth_created';
            results.matched = true;
          }
        }

        results.authUser = authUser;
        results.profile = matchingProfiles;

        return new Response(
          JSON.stringify({
            success: true,
            results
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case 'full_consistency_check': {
        // Run comprehensive consistency check
        const results = {
          orphanedAuthCount: 0,
          orphanedProfiles: [] as any[],
          profilesWithoutWallets: [] as any[],
          walletsCreated: 0,
          recommendations: [] as string[]
        };

        // Check orphaned auth users
        const { data: authUsersData } = await supabase.auth.admin.listUsers();
        const { data: profiles } = await supabase.from('profiles').select('id, email, auth_created_at');
        
        const profileIds = new Set(profiles?.map(p => p.id) || []);
        results.orphanedAuthCount = authUsersData?.users.filter(u => !profileIds.has(u.id)).length || 0;

        // Check orphaned profiles (no auth)
        results.orphanedProfiles = profiles?.filter(p => !p.auth_created_at) || [];

        // Check profiles without wallets and create them
        for (const profile of profiles || []) {
          const { data: wallet } = await supabase
            .from('wallets')
            .select('id')
            .eq('user_id', profile.id)
            .eq('currency', 'UGX')
            .single();

          if (!wallet) {
            results.profilesWithoutWallets.push(profile);
            await supabase.from('wallets').insert([
              { user_id: profile.id, currency: 'UGX', balance: 0, status: 'active' },
              { user_id: profile.id, currency: 'USD', balance: 0, status: 'active' }
            ]);
            results.walletsCreated++;
          }
        }

        // Generate recommendations
        if (results.orphanedAuthCount > 0) {
          results.recommendations.push(`Found ${results.orphanedAuthCount} auth users without profiles`);
        }
        if (results.orphanedProfiles.length > 0) {
          results.recommendations.push(`Found ${results.orphanedProfiles.length} profiles without auth accounts`);
        }
        if (results.walletsCreated > 0) {
          results.recommendations.push(`Created ${results.walletsCreated} missing wallets`);
        }

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