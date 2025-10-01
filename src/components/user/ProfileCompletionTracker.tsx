
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertCircle, User, FileText, Phone } from "lucide-react";
import EnhancedProfileCompletionTracker from '../profile/EnhancedProfileCompletionTracker';
import { ProfileData, ContactPerson, UserDocument } from '@/types/profile';

interface ProfileCompletionTrackerProps {
  profile: ProfileData;
  documents: UserDocument[];
  contactPersons: ContactPerson[];
}

const ProfileCompletionTracker: React.FC<ProfileCompletionTrackerProps> = ({
  profile,
  documents,
  contactPersons
}) => {
  return (
    <EnhancedProfileCompletionTracker 
      profile={profile}
      documents={documents}
      contactPersons={contactPersons}
    />
  );
};

export default ProfileCompletionTracker;
