
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';

interface ProfileStatusAlertProps {
  profile: any;
}

const ProfileStatusAlert: React.FC<ProfileStatusAlertProps> = ({ profile }) => {
  if (!profile) return null;

  const getStatusAlert = () => {
    switch (profile.status) {
      case 'pending_verification':
        return {
          icon: <Clock className="h-4 w-4" />,
          title: 'Profile Under Review',
          description: 'Your profile is currently being reviewed by our team. This usually takes 1-3 business days.',
          variant: 'default' as const,
          badge: 'Under Review'
        };
      
      case 'active':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          title: 'Profile Verified',
          description: 'Your profile has been successfully verified. You can now access all platform features.',
          variant: 'default' as const,
          badge: 'Verified'
        };
      
      case 'blocked':
        return {
          icon: <XCircle className="h-4 w-4" />,
          title: 'Profile Blocked',
          description: 'Your profile has been blocked. Please contact support for assistance.',
          variant: 'destructive' as const,
          badge: 'Blocked'
        };
      
      case 'unverified':
        if (profile.verification_notes) {
          return {
            icon: <AlertCircle className="h-4 w-4" />,
            title: 'Profile Requires Updates',
            description: `Admin feedback: ${profile.verification_notes}`,
            variant: 'destructive' as const,
            badge: 'Needs Updates'
          };
        }
        return null;
      
      default:
        return null;
    }
  };

  const statusAlert = getStatusAlert();
  if (!statusAlert) return null;

  return (
    <Alert variant={statusAlert.variant} className="mb-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          {statusAlert.icon}
          <div>
            <h4 className="font-medium">{statusAlert.title}</h4>
            <AlertDescription className="mt-1">
              {statusAlert.description}
            </AlertDescription>
          </div>
        </div>
        <Badge variant={statusAlert.variant === 'destructive' ? 'destructive' : 'secondary'}>
          {statusAlert.badge}
        </Badge>
      </div>
    </Alert>
  );
};

export default ProfileStatusAlert;
