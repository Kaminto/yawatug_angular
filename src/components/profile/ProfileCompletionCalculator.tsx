
import { ProfileData, ContactPerson, UserDocument } from '@/types/profile';

export interface CompletionBreakdown {
  basicInfo: {
    total: number;
    score: number;
    items: Array<{
      field: string;
      label: string;
      points: number;
      completed: boolean;
    }>;
  };
  accountInfo: {
    total: number;
    score: number;
    items: Array<{
      field: string;
      label: string;
      points: number;
      completed: boolean;
    }>;
  };
  profilePicture: {
    total: number;
    score: number;
    items: Array<{
      field: string;
      label: string;
      points: number;
      completed: boolean;
    }>;
  };
  documents: {
    total: number;
    score: number;
    items: Array<{
      field: string;
      label: string;
      points: number;
      completed: boolean;
    }>;
  };
  contacts: {
    total: number;
    score: number;
    items: Array<{
      field: string;
      label: string;
      points: number;
      completed: boolean;
    }>;
  };
}

export const calculateProfileCompletion = (
  profile: ProfileData | null,
  documents: UserDocument[],
  contactPersons: ContactPerson[]
): { breakdown: CompletionBreakdown; totalScore: number; percentage: number; isAutoVerificationEligible: boolean } => {
  if (!profile) {
    return {
      breakdown: {} as CompletionBreakdown,
      totalScore: 0,
      percentage: 0,
      isAutoVerificationEligible: false
    };
  }

  const breakdown: CompletionBreakdown = {
    basicInfo: {
      total: 65,
      score: 0,
      items: [
        { field: 'full_name', label: 'Full Name', points: 15, completed: !!profile.full_name },
        { field: 'email', label: 'Email', points: 5, completed: !!profile.email },
        { field: 'phone', label: 'Phone', points: 15, completed: !!profile.phone },
        { field: 'date_of_birth', label: 'Date of Birth', points: 10, completed: !!profile.date_of_birth },
        { field: 'gender', label: 'Gender', points: 5, completed: !!profile.gender },
        { field: 'nationality', label: 'Nationality', points: 5, completed: !!profile.nationality },
        { field: 'country_of_residence', label: 'Country of Residence', points: 5, completed: !!profile.country_of_residence },
        { field: 'address', label: 'Address', points: 5, completed: !!profile.address }
      ]
    },
    accountInfo: {
      total: 10,
      score: 0,
      items: [
        { field: 'account_type', label: 'Account Type', points: 10, completed: !!profile.account_type }
      ]
    },
    profilePicture: {
      total: 10,
      score: 0,
      items: [
        { field: 'profile_picture_url', label: 'Profile Picture', points: 10, completed: !!profile.profile_picture_url }
      ]
    },
    documents: {
      total: 10,
      score: 0,
      items: [
        { field: 'documents_1', label: 'First Document', points: 5, completed: documents.length >= 1 },
        { field: 'documents_2', label: 'Second Document', points: 5, completed: documents.length >= 2 }
      ]
    },
    contacts: {
      total: 5,
      score: 0,
      items: [
        { field: 'emergency_contact', label: 'Emergency Contact', points: 5, completed: contactPersons.length > 0 }
      ]
    }
  };

  // Calculate scores
  Object.keys(breakdown).forEach(category => {
    breakdown[category as keyof CompletionBreakdown].score = breakdown[category as keyof CompletionBreakdown].items.reduce((sum, item) => {
      return sum + (item.completed ? item.points : 0);
    }, 0);
  });

  const totalScore = Object.values(breakdown).reduce((sum, category) => sum + category.score, 0);
  const totalPossible = Object.values(breakdown).reduce((sum, category) => sum + category.total, 0);
  const percentage = Math.round((totalScore / totalPossible) * 100);
  
  // Auto verification eligibility: all basic info + account type + profile picture + 2 documents + 1 contact
  const isAutoVerificationEligible = 
    breakdown.basicInfo.score === breakdown.basicInfo.total &&
    breakdown.accountInfo.score === breakdown.accountInfo.total &&
    breakdown.profilePicture.score === breakdown.profilePicture.total &&
    breakdown.documents.score === breakdown.documents.total &&
    breakdown.contacts.score === breakdown.contacts.total;
  
  return { breakdown, totalScore, percentage, isAutoVerificationEligible };
};

export const getCompletionColor = (percentage: number): string => {
  if (percentage >= 80) return 'text-green-600';
  if (percentage >= 50) return 'text-yellow-600';
  return 'text-red-600';
};

export const getNextSteps = (breakdown: CompletionBreakdown): Array<{ field: string; label: string; points: number }> => {
  const allItems = Object.values(breakdown).flatMap(category => 
    category.items.filter(item => !item.completed)
  );
  return allItems.slice(0, 3).map(({ field, label, points }) => ({ field, label, points }));
};
