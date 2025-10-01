import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileCompletionCheckProps {
  onProfileComplete?: () => void;
  children?: React.ReactNode;
}

const ProfileCompletionCheck: React.FC<ProfileCompletionCheckProps> = ({ 
  onProfileComplete, 
  children 
}) => {
  const { user } = useAuth();
  const [profileCompletion, setProfileCompletion] = useState<number>(0);
  const [isClubMember, setIsClubMember] = useState(false);
  const [hasCheckFired, setHasCheckFired] = useState(false);

  useEffect(() => {
    if (!user || hasCheckFired) return;

    const checkProfileAndSendConsent = async () => {
      try {
        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('profile_completion_percentage, account_type')
          .eq('id', user.id)
          .single();

        if (!profile) return;

        const completion = profile.profile_completion_percentage || 0;
        setProfileCompletion(completion);

        // Check if user is a club member with pending allocations
        const { data: allocations } = await supabase
          .from('club_share_allocations')
          .select(`
            id,
            allocation_status,
            investment_club_members!inner(
              user_id,
              member_name,
              email
            )
          `)
          .eq('investment_club_members.user_id', user.id)
          .eq('allocation_status', 'pending_invitation');

        const hasClubAllocations = allocations && allocations.length > 0;
        setIsClubMember(hasClubAllocations);

        // If profile is 80%+ complete and user has club allocations, send consent invitation
        if (completion >= 80 && hasClubAllocations && !hasCheckFired) {
          setHasCheckFired(true);
          
          for (const allocation of allocations) {
            const clubMember = allocation.investment_club_members;
            
            try {
              // Send consent invitation email
              await supabase.functions.invoke('unified-communication-sender', {
                body: {
                  recipient: clubMember.email,
                  subject: 'YAWATU Club Share Consent Required',
                  message: `Dear ${clubMember.member_name}, your profile is now complete. Please review and consent to your share allocation.`,
                  channel: 'email',
                  templateType: 'consent_invitation',
                  templateData: {
                    club_allocation_id: allocation.id,
                    member_name: clubMember.member_name,
                    allocated_shares: 0 // Will be filled from allocation data
                  }
                }
              });

              // Update allocation status to pending_consent
              await supabase
                .from('club_share_allocations')
                .update({
                  allocation_status: 'pending_consent',
                  updated_at: new Date().toISOString()
                })
                .eq('id', allocation.id);

            } catch (emailError) {
              console.error('Error sending consent invitation:', emailError);
            }
          }

          // Notify user
          toast({
            title: "Consent Invitation Sent",
            description: "Your profile is complete! We've sent you a consent invitation email for your share allocation. Please check your email."
          });

          onProfileComplete?.();
        }

      } catch (error) {
        console.error('Error checking profile completion:', error);
      }
    };

    checkProfileAndSendConsent();
  }, [user, hasCheckFired, onProfileComplete]);

  return <>{children}</>;
};

export default ProfileCompletionCheck;