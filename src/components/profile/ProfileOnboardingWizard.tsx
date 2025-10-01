import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowRight, ArrowLeft, User, FileText, Phone, Shield, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { allCountries } from '@/data/countries';
import ImprovedDocumentUploadSection from '@/components/user/ImprovedDocumentUploadSection';
import EmergencyContactsSection from '@/components/user/EmergencyContactsSection';
import ProfilePictureUpload from '@/components/profile/ProfilePictureUpload';
import { EnhancedLoading } from '@/components/ui/enhanced-loading';
import { ValidationErrors } from '@/components/ui/validation-errors';
import { validateBasicInfo, validateForVerification, ValidationError } from '@/utils/profileValidation';
import { calculateProfileCompletion } from '@/components/profile/ProfileCompletionCalculator';
import { validateAgeForAccountType, getMinimumAgeDate } from '@/utils/ageValidation';
import ProfilePreviewReport from './ProfilePreviewReport';
import { UnifiedDateInput } from '@/components/ui/unified-date-input';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  required: boolean;
}

interface ProfileOnboardingWizardProps {
  onComplete: () => void;
  currentProfile: any;
}

const ProfileOnboardingWizard: React.FC<ProfileOnboardingWizardProps> = ({
  onComplete,
  currentProfile
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  const [profile, setProfile] = useState(currentProfile);
  const [documents, setDocuments] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const isWelcomeFlow = searchParams.get('welcome') === 'true';

  // Load current data on mount
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load documents
      const { data: documentsData } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', user.id);

      // Load contacts
      const { data: contactsData } = await supabase
        .from('contact_persons')
        .select('*')
        .eq('user_id', user.id);

      setDocuments(documentsData || []);
      setContacts(contactsData || []);
    } catch (error) {
      console.error('Error loading profile data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const getSteps = (): OnboardingStep[] => {
    return [
      {
        id: 'basic-info',
        title: 'Basic Information',
        description: 'Add your personal details and contact information',
        icon: <User className="h-5 w-5" />,
        completed: !!(profile?.full_name && profile?.phone && profile?.date_of_birth && profile?.account_type),
        required: true
      },
      {
        id: 'profile-picture',
        title: 'Profile Picture',
        description: 'Upload your profile picture',
        icon: <User className="h-5 w-5" />,
        completed: !!profile?.profile_picture_url,
        required: true
      },
      {
        id: 'documents',
        title: 'Identity Documents',
        description: 'Upload at least 2 required identification documents',
        icon: <FileText className="h-5 w-5" />,
        completed: documents.length >= 2,
        required: true
      },
      {
        id: 'emergency-contact',
        title: 'Emergency Contact',
        description: 'Add someone we can contact in case of emergency',
        icon: <Phone className="h-5 w-5" />,
        completed: contacts.length >= 1,
        required: true
      },
      {
        id: 'verification',
        title: 'Submit for Verification',
        description: 'Review and submit your profile for admin approval',
        icon: <Shield className="h-5 w-5" />,
        completed: profile?.status === 'pending_verification' || profile?.status === 'active',
        required: true
      }
    ];
  };

  // Calculate step-based completion percentage (20% per step)
  const getStepCompletionPercentage = () => {
    const steps = getSteps();
    const completedSteps = steps.filter(step => step.completed).length;
    return Math.round((completedSteps / steps.length) * 100);
  };

  const [steps, setSteps] = useState<OnboardingStep[]>(getSteps());

  useEffect(() => {
    // Update steps based on current profile data
    setSteps(getSteps());
  }, [profile, documents, contacts]);

  const handleStepComplete = () => {
    // Reload data after step completion
    loadProfileData();
    // Auto-advance to next step if not on last step
    if (currentStep < steps.length - 1) {
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
      }, 1000);
    }
  };

  // Move useState outside of render function to fix hook order
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    date_of_birth: profile?.date_of_birth || '',
    nationality: profile?.nationality || '',
    country_of_residence: profile?.country_of_residence || '',
    address: profile?.address || '',
    gender: profile?.gender || '',
    account_type: profile?.account_type || 'individual'
  });

  // Update form data when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        date_of_birth: profile.date_of_birth || '',
        nationality: profile.nationality || '',
        country_of_residence: profile.country_of_residence || '',
        address: profile.address || '',
        gender: profile.gender || '',
        account_type: profile.account_type || 'individual'
      });
    }
  }, [profile]);

  const renderBasicInfoStep = () => {

    const handleSave = async () => {
      // Validate form data
      const errors = validateBasicInfo(formData);
      setValidationErrors(errors);
      
      if (errors.length > 0) {
        toast.error('Please fix the errors below');
        return;
      }

      try {
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
          .from('profiles')
          .update(formData)
          .eq('id', user.id);

        if (error) throw error;
        
        toast.success('Profile updated successfully');
        setProfile({ ...profile, ...formData });
        setValidationErrors([]);
        handleStepComplete();
      } catch (error) {
        console.error('Error updating profile:', error);
        toast.error('Failed to update profile');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="space-y-6">
        <ValidationErrors errors={validationErrors} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              placeholder="Enter your full name"
              className={validationErrors.some(e => e.field === 'full_name') ? 'border-red-500' : ''}
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="Enter your phone number"
              className={validationErrors.some(e => e.field === 'phone') ? 'border-red-500' : ''}
            />
          </div>
          <div>
            <Label htmlFor="date_of_birth">
              {formData.account_type === 'business' || formData.account_type === 'organisation' 
                ? 'Date of Registration *' 
                : 'Date of Birth *'}
            </Label>
            <UnifiedDateInput
              id="date_of_birth"
              value={formData.date_of_birth}
              onChange={(value) => {
                setFormData({...formData, date_of_birth: value});
                // Validate age for individual accounts only
                if (formData.account_type === 'individual' && value) {
                  const validation = validateAgeForAccountType(formData.account_type, value);
                  if (!validation.isValid) {
                    toast.error(validation.message);
                    return; // Prevent setting invalid date
                  } else if (validation.requiresGuardian) {
                    toast.warning(validation.message);
                  }
                }
              }}
              max={formData.account_type === 'individual' ? getMinimumAgeDate(formData.account_type) : undefined}
              className={validationErrors.some(e => e.field === 'date_of_birth') ? 'border-red-500' : ''}
              placeholder="Select date"
            />
          </div>
          <div>
            <Label htmlFor="account_type">Account Type *</Label>
            <Select 
              value={formData.account_type} 
              onValueChange={(value) => setFormData({...formData, account_type: value})}
            >
              <SelectTrigger className={validationErrors.some(e => e.field === 'account_type') ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="organisation">Organization</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="gender">Gender</Label>
            <SearchableSelect
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "other", label: "Other" }
              ]}
              value={formData.gender}
              onValueChange={(value) => setFormData({...formData, gender: value})}
              placeholder="Select gender"
              searchPlaceholder="Search gender..."
              emptyMessage="No gender found."
            />
          </div>
          <div>
            <Label htmlFor="nationality">Nationality</Label>
            <SearchableSelect
              options={Array.isArray(allCountries) ? allCountries.map(country => ({ 
                value: country?.name || '', 
                label: country?.name || '' 
              })).filter(option => option.value) : []}
              value={formData.nationality || ''}
              onValueChange={(value) => setFormData({...formData, nationality: value})}
              placeholder="Select nationality"
              searchPlaceholder="Search countries..."
              emptyMessage="No country found."
            />
          </div>
          <div>
            <Label htmlFor="country_of_residence">Country of Residence</Label>
            <SearchableSelect
              options={Array.isArray(allCountries) ? allCountries.map(country => ({ 
                value: country?.name || '', 
                label: country?.name || '' 
              })).filter(option => option.value) : []}
              value={formData.country_of_residence || ''}
              onValueChange={(value) => setFormData({...formData, country_of_residence: value})}
              placeholder="Select country"
              searchPlaceholder="Search countries..."
              emptyMessage="No country found."
            />
          </div>
        </div>
        <div>
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => setFormData({...formData, address: e.target.value})}
            placeholder="Enter your address"
          />
        </div>
        
        <Button onClick={handleSave} className="w-full" disabled={saving}>
          {saving ? <EnhancedLoading size="sm" text="Saving..." /> : 'Save Basic Information'}
        </Button>
      </div>
    );
  };

  const renderProfilePictureStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Profile Picture</h2>
        <p className="text-muted-foreground">
          Upload a profile picture to help others recognize you.
        </p>
      </div>
      <ProfilePictureUpload
        currentImageUrl={profile?.profile_picture_url || ''}
        onUploadComplete={async () => {
          await loadProfileData();
          // Reload profile to get updated picture URL
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: updatedProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();
            if (updatedProfile) {
              setProfile(updatedProfile);
            }
          }
          handleStepComplete();
        }}
      />
    </div>
  );

  const renderDocumentsStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Upload Documents</h2>
        <p className="text-muted-foreground">
          Upload the required documents based on your account type for verification.
        </p>
      </div>
      <ImprovedDocumentUploadSection
        userType={profile?.account_type || 'individual'}
        dateOfBirth={profile?.date_of_birth}
        documents={documents}
        canEdit={true}
        onDocumentsUpdate={loadProfileData}
      />
      
      {documents.length > 0 && (
        <div className="text-center">
          <Button onClick={handleStepComplete} className="w-full">
            Continue to Next Step
          </Button>
        </div>
      )}
    </div>
  );

  const renderContactsStep = () => {
    return (
      <div className="space-y-4">
        <EmergencyContactsSection
          contactPersons={contacts}
          onContactsUpdate={async () => {
            await loadProfileData();
            const updatedSteps = getSteps();
            setSteps(updatedSteps);
          }}
          canEdit={true}
        />
        {contacts.length > 0 && (
          <div className="text-center">
            <Button onClick={handleStepComplete} className="w-full">
              Continue to Next Step
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderVerificationStep = () => {
    // Validate all data before allowing submission
    const verificationErrors = validateForVerification(profile, documents, contacts);
    const canSubmit = verificationErrors.length === 0;
    const isAlreadySubmitted = profile?.status === 'pending_verification' || profile?.status === 'active';
    
    const { percentage, isAutoVerificationEligible } = calculateProfileCompletion(profile, documents, contacts);
    
    const handleSubmit = async () => {
      if (!canSubmit) {
        toast.error('Please complete all required sections before submitting');
        return;
      }

      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Determine verification status based on auto-verification eligibility
        const newStatus = isAutoVerificationEligible ? 'active' : 'pending_verification';
        
        const { error } = await supabase
          .from('profiles')
          .update({ 
            status: newStatus,
            verification_submitted_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (error) throw error;
        
        // Update local profile state
        const updatedProfile = { ...profile, status: newStatus };
        setProfile(updatedProfile);
        
        if (isAutoVerificationEligible) {
          toast.success('Profile automatically verified! Welcome to YAWATU!');
        } else {
          toast.success('Profile submitted for verification successfully!');
        }
        
        // Complete the onboarding flow
        setTimeout(() => {
          handleComplete();
        }, 1500);
        
      } catch (error) {
        console.error('Error submitting for verification:', error);
        toast.error('Failed to submit for verification');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="space-y-6">
        {!canSubmit && <ValidationErrors errors={verificationErrors} />}
        
        <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="text-lg font-medium mb-4">Profile Review</h3>
          
          {/* Completion Progress */}
          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center">
              <span>Profile Completion</span>
              <span className="font-medium">{Math.round(percentage)}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Basic Information:</span>
              <Badge variant={profile?.full_name && profile?.phone && profile?.date_of_birth && profile?.account_type ? "default" : "outline"}>
                {profile?.full_name && profile?.phone && profile?.date_of_birth && profile?.account_type ? 'Complete' : 'Incomplete'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Profile Picture:</span>
              <Badge variant={profile?.profile_picture_url ? "default" : "outline"}>
                {profile?.profile_picture_url ? 'Uploaded' : 'Missing'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Documents:</span>
              <Badge variant={documents.length >= 2 ? "default" : "outline"}>
                {documents.length >= 2 ? `${documents.length} uploaded` : `${documents.length}/2 uploaded`}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Emergency Contacts:</span>
              <Badge variant={contacts.length > 0 ? "default" : "outline"}>
                {contacts.length > 0 ? `${contacts.length} added` : 'None'}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          {isAlreadySubmitted ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <p className="text-green-700 dark:text-green-300 font-medium">
                  Profile Successfully Submitted!
                </p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Your profile is now under review. You'll be notified once verification is complete.
                </p>
              </div>
              <Button onClick={handleComplete} className="w-full">
                Complete Setup
              </Button>
            </div>
          ) : canSubmit ? (
            <Button onClick={handleSubmit} className="w-full" disabled={loading}>
              {loading ? (
                <EnhancedLoading size="sm" text="Submitting..." />
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Submit for Verification
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertCircle className="h-6 w-6 mx-auto mb-2 text-amber-600" />
                <p className="text-amber-700 dark:text-amber-300 font-medium">
                  Profile Incomplete
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                  Please complete all required sections before submitting for verification.
                </p>
              </div>
              <Button variant="outline" onClick={() => setCurrentStep(0)}>
                Review Profile Sections
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    const stepId = steps[currentStep]?.id;
    
    switch (stepId) {
      case 'basic-info':
        return renderBasicInfoStep();
      case 'profile-picture':
        return renderProfilePictureStep();
      case 'documents':
        return renderDocumentsStep();
      case 'emergency-contact':
        return renderContactsStep();
      case 'verification':
        return renderVerificationStep();
      default:
        return (
          <div className="p-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-center">
            <p className="text-muted-foreground mb-4">
              This step will guide you through {steps[currentStep]?.title.toLowerCase()}.
            </p>
            {steps[currentStep]?.completed ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            ) : (
              <Badge variant="outline">
                {steps[currentStep]?.required ? 'Required' : 'Optional'}
              </Badge>
            )}
          </div>
        );
    }
  };

  const completedSteps = steps.filter(step => step.completed).length;
  const progress = getStepCompletionPercentage();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // On verification step, don't auto-complete - let user click submit button
      if (steps[currentStep]?.id === 'verification') {
        const isAlreadySubmitted = profile?.status === 'pending_verification' || profile?.status === 'active';
        if (isAlreadySubmitted) {
          handleComplete();
        } else {
          toast.error('Please submit your profile for verification first');
        }
      } else {
        handleComplete();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const [showPreviewReport, setShowPreviewReport] = useState(false);

  const handleComplete = () => {
    setShowPreviewReport(true);
  };

  const handlePreviewComplete = () => {
    setShowPreviewReport(false);
    toast.success('Welcome to YAWATU! Your profile setup is complete.');
    onComplete();
  };

  const handleSkipToProfile = () => {
    setShowWelcome(false);
    onComplete();
  };

  if (loading && showWelcome) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-100 dark:from-yawatu-black-light dark:to-black px-4">
        <EnhancedLoading size="lg" text="Loading your profile..." />
      </div>
    );
  }

  if (showWelcome && isWelcomeFlow) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-100 dark:from-yawatu-black-light dark:to-black px-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-yawatu-gold/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-yawatu-gold" />
            </div>
            <CardTitle className="text-2xl font-bold gold-text">
              Welcome to YAWATU!
            </CardTitle>
            <p className="text-muted-foreground">
              Your email has been verified successfully. Let's set up your profile to get started.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Onboarding Steps Preview */}
            <div className="space-y-4">
              <h3 className="font-medium">What's Next:</h3>
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-3">
                    <Badge variant={step.completed ? "default" : "outline"} className="min-w-6 h-6 p-0 flex items-center justify-center">
                      {step.completed ? <CheckCircle className="h-3 w-3" /> : index + 1}
                    </Badge>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{step.title}</div>
                      <div className="text-xs text-muted-foreground">{step.description}</div>
                    </div>
                    {step.completed && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Progress Overview */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Profile Completion</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button onClick={() => setShowWelcome(false)} className="flex-1">
                <ArrowRight className="h-4 w-4 mr-2" />
                Start Profile Setup
              </Button>
              <Button variant="outline" onClick={handleSkipToProfile}>
                Skip Guide
              </Button>
            </div>

            {/* Estimated Time */}
            <div className="text-center text-sm text-muted-foreground">
              Estimated time: 5-10 minutes
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStepData = steps[currentStep];

  return (
    <>
      <ProfilePreviewReport
        isOpen={showPreviewReport}
        onClose={() => setShowPreviewReport(false)}
        profile={profile}
        documents={documents}
        contacts={contacts}
        onPrint={() => {}}
        onComplete={handlePreviewComplete}
      />
      
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-100 dark:from-yawatu-black-light dark:to-black px-4">
        <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline">
              Step {currentStep + 1} of {steps.length}
            </Badge>
            <Badge variant="secondary">
              {Math.round(progress)}% Complete
            </Badge>
          </div>
          <Progress value={progress} className="mb-4" />
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yawatu-gold/20 rounded-lg">
              {currentStepData.icon}
            </div>
            <div>
              <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
              <p className="text-muted-foreground">{currentStepData.description}</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Step-specific content */}
          {renderStepContent()}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <div className="flex flex-col sm:flex-row gap-2 flex-1 sm:justify-end">
            <Button variant="ghost" onClick={handleSkipToProfile} className="w-full sm:w-auto">
              Skip Guide
            </Button>
            <Button 
              onClick={handleNext} 
              disabled={saving || loading}
              className="w-full sm:w-auto"
            >
              {currentStep === steps.length - 1 ? 'Complete Setup' : 'Next'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>

          {/* Steps Indicator */}
          <div className="flex justify-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentStep
                    ? 'bg-yawatu-gold'
                    : index < currentStep
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
};

export default ProfileOnboardingWizard;
