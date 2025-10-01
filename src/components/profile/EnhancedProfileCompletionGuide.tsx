import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  AlertCircle, 
  User, 
  FileText, 
  Phone, 
  Camera,
  MapPin,
  Calendar,
  Shield,
  TrendingUp,
  Zap,
  Star
} from 'lucide-react';
import { ProfileData, UserDocument, ContactPerson } from '@/types/profile';

interface CompletionItem {
  id: string;
  category: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  points: number;
  action: () => void;
  tips?: string[];
}

interface EnhancedProfileCompletionGuideProps {
  profile: ProfileData;
  documents: UserDocument[];
  contacts: ContactPerson[];
  onUpdate: () => void;
}

const EnhancedProfileCompletionGuide: React.FC<EnhancedProfileCompletionGuideProps> = ({
  profile,
  documents,
  contacts,
  onUpdate
}) => {
  const [completionItems, setCompletionItems] = useState<CompletionItem[]>([]);
  const [showTips, setShowTips] = useState<string | null>(null);
  const [autoSuggestions, setAutoSuggestions] = useState<string[]>([]);

  useEffect(() => {
    generateCompletionItems();
    generateAutoSuggestions();
  }, [profile, documents, contacts]);

  const generateCompletionItems = () => {
    const items: CompletionItem[] = [
      // Basic Information Category
      {
        id: 'full_name',
        category: 'Basic Info',
        title: 'Full Name',
        description: 'Add your complete legal name',
        icon: <User className="h-4 w-4" />,
        completed: !!(profile.full_name && profile.full_name.trim().length > 2),
        points: 10,
        action: () => window.location.href = '/profile?tab=overview',
        tips: [
          'Use your full legal name as it appears on official documents',
          'Avoid nicknames or abbreviated names',
          'This helps with verification and reduces delays'
        ]
      },
      {
        id: 'email',
        category: 'Basic Info',
        title: 'Email Address',
        description: 'Verified email for communications',
        icon: <User className="h-4 w-4" />,
        completed: !!(profile.email && profile.email.includes('@')),
        points: 5,
        action: () => toast.info('Email is set during registration'),
        tips: [
          'Use an email you check regularly',
          'This will be used for important notifications'
        ]
      },
      {
        id: 'phone',
        category: 'Basic Info',
        title: 'Phone Number',
        description: 'Add a valid phone number',
        icon: <Phone className="h-4 w-4" />,
        completed: !!(profile.phone && profile.phone.length > 8),
        points: 10,
        action: () => window.location.href = '/profile?tab=personal',
        tips: [
          'Include country code (e.g., +256)',
          'Use a number you have access to',
          'May be used for SMS notifications'
        ]
      },
      {
        id: 'date_of_birth',
        category: 'Basic Info',
        title: 'Date of Birth',
        description: 'Confirm your age for compliance',
        icon: <Calendar className="h-4 w-4" />,
        completed: !!profile.date_of_birth,
        points: 8,
        action: () => window.location.href = '/profile?tab=personal',
        tips: [
          'Must be accurate for identity verification',
          'Minimum age requirements may apply',
          'Cannot be changed after verification'
        ]
      },
      {
        id: 'gender',
        category: 'Basic Info',
        title: 'Gender',
        description: 'Optional demographic information',
        icon: <User className="h-4 w-4" />,
        completed: !!profile.gender,
        points: 3,
        action: () => window.location.href = '/profile?tab=personal'
      },

      // Profile Enhancement Category
      {
        id: 'profile_picture',
        category: 'Profile Enhancement',
        title: 'Profile Picture',
        description: 'Upload a clear profile photo',
        icon: <Camera className="h-4 w-4" />,
        completed: !!profile.profile_picture_url,
        points: 10,
        action: () => window.location.href = '/profile?tab=picture',
        tips: [
          'Use a clear, recent photo of yourself',
          'Avoid group photos or images with filters',
          'Good lighting improves photo quality'
        ]
      },
      {
        id: 'nationality',
        category: 'Profile Enhancement',
        title: 'Nationality',
        description: 'Country of citizenship',
        icon: <MapPin className="h-4 w-4" />,
        completed: !!profile.nationality,
        points: 7,
        action: () => window.location.href = '/profile?tab=personal',
        tips: [
          'Select your country of citizenship',
          'This affects available services',
          'Must match your documents'
        ]
      },
      {
        id: 'country_of_residence',
        category: 'Profile Enhancement',
        title: 'Country of Residence',
        description: 'Where you currently live',
        icon: <MapPin className="h-4 w-4" />,
        completed: !!profile.country_of_residence,
        points: 5,
        action: () => window.location.href = '/profile?tab=personal'
      },
      {
        id: 'address',
        category: 'Profile Enhancement',
        title: 'Address',
        description: 'Complete residential address',
        icon: <MapPin className="h-4 w-4" />,
        completed: !!(profile.address && profile.address.length > 10),
        points: 8,
        action: () => window.location.href = '/profile?tab=personal',
        tips: [
          'Provide your complete current address',
          'Include street, city, and postal code',
          'Must be verifiable if required'
        ]
      },

      // Documents Category
      {
        id: 'identity_document',
        category: 'Documents',
        title: 'Identity Document',
        description: 'Upload ID card or passport',
        icon: <FileText className="h-4 w-4" />,
        completed: documents.some(doc => 
          ['national_id', 'passport', 'driving_license'].includes(doc.type)
        ),
        points: 20,
        action: () => window.location.href = '/profile?tab=documents',
        tips: [
          'Document must be current and not expired',
          'All corners should be visible',
          'Text should be clearly readable'
        ]
      },
      {
        id: 'proof_of_address',
        category: 'Documents',
        title: 'Proof of Address',
        description: 'Utility bill or bank statement',
        icon: <FileText className="h-4 w-4" />,
        completed: documents.some(doc => 
          doc.type === 'proof_of_address'
        ),
        points: 15,
        action: () => window.location.href = '/profile?tab=documents',
        tips: [
          'Document should be less than 3 months old',
          'Address must match your profile',
          'Utility bills or bank statements work best'
        ]
      },

      // Emergency Contacts Category
      {
        id: 'emergency_contact',
        category: 'Emergency Contacts',
        title: 'Emergency Contact',
        description: 'Add at least one trusted contact',
        icon: <Phone className="h-4 w-4" />,
        completed: contacts.length > 0,
        points: 12,
        action: () => window.location.href = '/profile?tab=contacts',
        tips: [
          'Choose someone you trust completely',
          'They should be easily reachable',
          'Will be contacted only in emergencies'
        ]
      }
    ];

    setCompletionItems(items);
  };

  const generateAutoSuggestions = () => {
    const suggestions: string[] = [];
    
    // Smart suggestions based on profile state
    if (!profile.profile_picture_url) {
      suggestions.push('📸 Add a profile picture to make your account more personal and trustworthy');
    }
    
    if (!profile.address && profile.country_of_residence) {
      suggestions.push('📍 Complete your address information for better verification');
    }
    
    if (documents.length === 0) {
      suggestions.push('📄 Upload your first document to start the verification process');
    }
    
    if (contacts.length === 0) {
      suggestions.push('📞 Add an emergency contact for account security');
    }
    
    const completionPercentage = profile.profile_completion_percentage || 0;
    if (completionPercentage > 50 && completionPercentage < 80) {
      suggestions.push('🚀 You\'re halfway there! Complete a few more fields to unlock verification');
    }
    
    setAutoSuggestions(suggestions);
  };

  const calculateCategoryProgress = (category: string) => {
    const categoryItems = completionItems.filter(item => item.category === category);
    const completedItems = categoryItems.filter(item => item.completed);
    return categoryItems.length > 0 ? (completedItems.length / categoryItems.length) * 100 : 0;
  };

  const calculateTotalPoints = () => {
    return completionItems.reduce((total, item) => total + (item.completed ? item.points : 0), 0);
  };

  const getMaxPoints = () => {
    return completionItems.reduce((total, item) => total + item.points, 0);
  };

  const categories = [...new Set(completionItems.map(item => item.category))];
  const totalPoints = calculateTotalPoints();
  const maxPoints = getMaxPoints();
  const overallProgress = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0;

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-green-600';
    if (progress >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Overall Progress Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Profile Completion Guide
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getProgressColor(overallProgress)}>
                {Math.round(overallProgress)}% Complete
              </Badge>
              <Badge variant="outline">
                <Star className="h-3 w-3 mr-1" />
                {totalPoints}/{maxPoints} points
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>

          {autoSuggestions.length > 0 && (
            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <strong>Smart Suggestions:</strong>
                  {autoSuggestions.map((suggestion, index) => (
                    <div key={index} className="text-sm">{suggestion}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      {categories.map((category) => {
        const categoryItems = completionItems.filter(item => item.category === category);
        const categoryProgress = calculateCategoryProgress(category);
        const categoryPoints = categoryItems.reduce((total, item) => 
          total + (item.completed ? item.points : 0), 0
        );
        const maxCategoryPoints = categoryItems.reduce((total, item) => total + item.points, 0);

        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{category}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getProgressColor(categoryProgress)}>
                    {Math.round(categoryProgress)}%
                  </Badge>
                  <Badge variant="outline">
                    {categoryPoints}/{maxCategoryPoints} pts
                  </Badge>
                </div>
              </CardTitle>
              <Progress value={categoryProgress} className="h-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 border rounded-lg transition-all ${
                      item.completed 
                        ? 'bg-green-50 border-green-200' 
                        : 'hover:bg-muted/50 cursor-pointer'
                    }`}
                    onClick={() => !item.completed && item.action()}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded ${
                          item.completed ? 'bg-green-100' : 'bg-muted'
                        }`}>
                          {item.completed ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            item.icon
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{item.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {item.points} pts
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {item.tips && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowTips(showTips === item.id ? null : item.id);
                            }}
                          >
                            Tips
                          </Button>
                        )}
                        
                        {!item.completed && (
                          <Button onClick={item.action} size="sm">
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Tips Section */}
                    {showTips === item.id && item.tips && (
                      <div className="mt-3 pt-3 border-t bg-blue-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-lg">
                        <h5 className="font-medium text-blue-800 mb-2">💡 Tips for {item.title}:</h5>
                        <ul className="space-y-1">
                          {item.tips.map((tip, index) => (
                            <li key={index} className="text-sm text-blue-700">
                              • {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Achievement Section */}
      {overallProgress >= 100 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-green-800 mb-2">
              🎉 Profile Complete!
            </h3>
            <p className="text-green-700 mb-4">
              Congratulations! Your profile is 100% complete and ready for verification.
            </p>
            <Button className="bg-green-600 hover:bg-green-700">
              Submit for Verification
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedProfileCompletionGuide;