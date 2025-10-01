import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProfileData {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  nationality: string | null;
  country_of_residence: string | null;
  address: string | null;
  account_type: string | null;
  profile_picture_url: string | null;
  status: string | null;
  profile_completion_percentage: number | null;
}

interface UserDocument {
  id: string;
  user_id: string;
  status: string;
}

interface ContactPerson {
  id: string;
  user_id: string;
}

function calculateProfileCompletion(
  profile: ProfileData,
  documents: UserDocument[],
  contactPersons: ContactPerson[]
): { percentage: number; isAutoVerificationEligible: boolean } {
  let totalScore = 0;

  // Basic Info (65 points)
  if (profile.full_name) totalScore += 15;
  if (profile.email) totalScore += 5;
  if (profile.phone) totalScore += 15;
  if (profile.date_of_birth) totalScore += 10;
  if (profile.gender) totalScore += 5;
  if (profile.nationality) totalScore += 5;
  if (profile.country_of_residence) totalScore += 5;
  if (profile.address) totalScore += 5;

  // Account Info (10 points)
  if (profile.account_type) totalScore += 10;

  // Profile Picture (10 points)
  if (profile.profile_picture_url) totalScore += 10;

  // Documents (10 points)
  if (documents.length >= 1) totalScore += 5;
  if (documents.length >= 2) totalScore += 5;

  // Emergency Contacts (5 points)
  if (contactPersons.length > 0) totalScore += 5;

  const percentage = Math.min(totalScore, 100);
  const isAutoVerificationEligible = percentage >= 80;

  return { percentage, isAutoVerificationEligible };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Processing auto-approval for user: ${userId}`);

    // Get profile data
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get user documents
    const { data: documents, error: documentsError } = await supabaseClient
      .from('user_documents')
      .select('*')
      .eq('user_id', userId);

    if (documentsError) {
      console.error('Documents fetch error:', documentsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch documents' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get contact persons
    const { data: contactPersons, error: contactsError } = await supabaseClient
      .from('contact_persons')
      .select('*')
      .eq('user_id', userId);

    if (contactsError) {
      console.error('Contacts fetch error:', contactsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch contacts' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Calculate completion
    const { percentage, isAutoVerificationEligible } = calculateProfileCompletion(
      profile,
      documents || [],
      contactPersons || []
    );

    console.log(`Profile completion: ${percentage}%, Auto-eligible: ${isAutoVerificationEligible}`);

    // Update profile completion percentage
    const { error: updateCompletionError } = await supabaseClient
      .from('profiles')
      .update({ 
        profile_completion_percentage: percentage,
        last_profile_update: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateCompletionError) {
      console.error('Failed to update completion percentage:', updateCompletionError);
    }

    let statusUpdated = false;
    let newStatus = profile.status;

    // Auto-approve if eligible and not already active/approved
    if (isAutoVerificationEligible && profile.status !== 'active' && profile.status !== 'pending_verification') {
      const { error: statusError } = await supabaseClient
        .from('profiles')
        .update({ 
          status: 'active',
          verification_reviewed_at: new Date().toISOString(),
          verification_notes: 'Auto-approved: Profile completion meets requirements (80%+)'
        })
        .eq('id', userId);

      if (statusError) {
        console.error('Failed to update status:', statusError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to update profile status',
            details: statusError.message 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      statusUpdated = true;
      newStatus = 'active';
      console.log(`Auto-approved user ${userId} - status updated to active`);

      // Log the auto-approval action
      const { error: logError } = await supabaseClient
        .from('admin_actions')
        .insert({
          admin_id: null, // System action
          user_id: userId,
          action_type: 'auto_approve',
          reason: `Auto-approved: Profile completion ${percentage}% meets requirements`
        });

      if (logError) {
        console.error('Failed to log admin action:', logError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        percentage,
        isAutoVerificationEligible,
        statusUpdated,
        currentStatus: newStatus,
        message: statusUpdated 
          ? `Profile auto-approved! Completion: ${percentage}%`
          : `Profile updated. Completion: ${percentage}%`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Auto-approval function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});