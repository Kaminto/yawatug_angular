import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, FileText, Calendar, MapPin, Phone, Mail, AlertCircle, CheckCircle, Clock, Shield, Eye, Plus, Trash2 } from 'lucide-react';
import { allCountries } from '@/data/countries';
import { ProfileData, ContactPerson, UserDocument, AccountType } from '@/types/profile';
import FixedDocumentUploadSection from '@/components/user/FixedDocumentUploadSection';
import EmergencyContactsSection from '@/components/user/EmergencyContactsSection';
import { validateAgeForAccountType, getMinimumAgeDate } from '@/utils/ageValidation';
import ProfilePictureUpload from './ProfilePictureUpload';
import { useAutoApproval } from '@/hooks/useAutoApproval';
import ProfilePreviewReport from './ProfilePreviewReport';
import { UnifiedDateInput } from '@/components/ui/unified-date-input';

interface EnhancedProfileManagerProps {
  isAdmin?: boolean;
  userId?: string;
}

const EnhancedProfileManager: React.FC<EnhancedProfileManagerProps> = ({ 
  isAdmin = false, 
  userId 
}) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<ProfileData>>({});
  const [activeTab, setActiveTab] = useState('overview');
  const [showPreviewReport, setShowPreviewReport] = useState(false);
  const { checkAutoApproval } = useAutoApproval();

  useEffect(() => {
    loadProfileData();
  }, [userId]);

  const loadProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user && !isAdmin) return;

      const targetUserId = userId || user?.id;
      if (!targetUserId) return;

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (profileError) throw profileError;

      // Load documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', targetUserId);

      if (documentsError) throw documentsError;

      // Load contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('contact_persons')
        .select('*')
        .eq('user_id', targetUserId);

      if (contactsError) throw contactsError;

      setProfile(profileData as ProfileData);
      setDocuments(documentsData || []);
      setContacts(contactsData || []);
      setFormData(profileData as ProfileData);
    } catch (error) {
      console.error('Error loading profile data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user && !isAdmin) return;

      const targetUserId = userId || user?.id;
      if (!targetUserId) return;

      const updateData = {
        full_name: formData.full_name,
        phone: formData.phone,
        address: formData.address,
        date_of_birth: formData.date_of_birth,
        nationality: formData.nationality,
        country_of_residence: formData.country_of_residence,
        town_city: formData.town_city,
        gender: formData.gender,
        tin: formData.tin,
        account_type: formData.account_type,
        updated_at: new Date().toISOString()
      };

      // Handle email update for temporary emails
      const isTempEmail = profile?.email?.includes('@yawatu.app');
      if (isTempEmail && formData.email && formData.email !== profile.email) {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          toast.error('Please enter a valid email address');
          return;
        }

        // Check if email already exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', formData.email)
          .neq('id', targetUserId)
          .single();

        if (existingProfile) {
          toast.error('This email is already in use');
          return;
        }

        // Update email in profile
        Object.assign(updateData, { email: formData.email });

        // Update auth email
        const { error: authError } = await supabase.auth.updateUser({
          email: formData.email
        });

        if (authError) {
          toast.error('Failed to update email in authentication system');
          console.error('Auth email update error:', authError);
          return;
        }

        toast.success('Email verification sent to your new email address');
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', targetUserId);

      if (error) throw error;
      
      toast.success('Profile updated successfully');
      setEditing(false);
      
      // Check for auto-approval after successful update
      await checkAutoApproval(targetUserId);
      
      loadProfileData();
      
      // Show preview report if profile is substantially complete
      const completionPercentage = profile?.profile_completion_percentage || 0;
      if (completionPercentage >= 80) {
        setShowPreviewReport(true);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case 'pending_verification':
        return <Badge variant="secondary">Pending Verification</Badge>;
      case 'blocked':
        return <Badge variant="destructive">Blocked</Badge>;
      default:
        return <Badge variant="outline">Unverified</Badge>;
    }
  };

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return <div className="animate-pulse">Loading profile...</div>;
  }

  if (!profile) {
    return <div>Profile not found</div>;
  }

  const completionPercentage = profile.profile_completion_percentage || 0;

  return (
    <>
      <ProfilePreviewReport
        isOpen={showPreviewReport}
        onClose={() => setShowPreviewReport(false)}
        profile={profile}
        documents={documents}
        contacts={contacts}
        onPrint={() => {}}
        onComplete={() => setShowPreviewReport(false)}
      />
      
    <div className="space-y-6">
      {/* Profile Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Overview 1
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(profile.status)}
              <Badge variant="outline" className={getCompletionColor(completionPercentage)}>
                {completionPercentage}% Complete
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Profile Completion</span>
              <span className="text-sm text-muted-foreground">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>

          {profile.verification_notes && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Admin Feedback:</strong> {profile.verification_notes}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{documents.length}</div>
              <div className="text-sm text-muted-foreground">Documents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{contacts.length}</div>
              <div className="text-sm text-muted-foreground">Contacts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{profile.login_count || 0}</div>
              <div className="text-sm text-muted-foreground">Logins</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Profile Information */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="personal" className="text-xs sm:text-sm">Personal Info</TabsTrigger>
          <TabsTrigger value="picture" className="text-xs sm:text-sm">Picture</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs sm:text-sm">Documents</TabsTrigger>
          <TabsTrigger value="contacts" className="text-xs sm:text-sm">Contacts</TabsTrigger>
        </TabsList>

        {/* Tab Navigation */}
        <div className="flex justify-between items-center mt-4 mb-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              const tabs = ['overview', 'personal', 'picture', 'documents', 'contacts'];
              const currentIndex = tabs.indexOf(activeTab);
              if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1]);
            }}
            disabled={activeTab === 'overview'}
          >
            ← Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              const tabs = ['overview', 'personal', 'picture', 'documents', 'contacts'];
              const currentIndex = tabs.indexOf(activeTab);
              if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1]);
            }}
            disabled={activeTab === 'contacts'}
          >
            Next →
          </Button>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={formData.full_name || ''}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    disabled={!editing}
                  />
                </div>
                <div>
                  <Label>Email {profile?.email?.includes('@yawatu.app') && <span className="text-xs text-muted-foreground">(Temporary - Please update)</span>}</Label>
                  <Input 
                    value={formData.email || ''} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    disabled={!editing || !profile?.email?.includes('@yawatu.app')}
                    type="email"
                    placeholder="Enter your email address"
                  />
                  {profile?.email?.includes('@yawatu.app') && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Add your real email address to receive important notifications
                    </p>
                  )}
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    disabled={!editing}
                  />
                </div>
                <div>
                  <Label>
                    {formData.account_type === 'business' || formData.account_type === 'organisation' 
                      ? 'Date of Registration' 
                      : 'Date of Birth'}
                  </Label>
                   <UnifiedDateInput
                    value={formData.date_of_birth || ''}
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
                    disabled={!editing}
                    max={formData.account_type === 'individual' ? getMinimumAgeDate(formData.account_type) : undefined}
                    placeholder={formData.account_type === 'business' || formData.account_type === 'organisation' 
                      ? 'DD/MM/YYYY - Registration Date' 
                      : 'DD/MM/YYYY - Date of Birth'}
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                {!editing ? (
                  <Button onClick={() => setEditing(true)}>
                    <User className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button onClick={handleUpdate}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Gender</Label>
                  <Select 
                    value={formData.gender || ''} 
                    onValueChange={(value) => setFormData({...formData, gender: value})}
                    disabled={!editing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nationality</Label>
                  <SearchableSelect
                    options={Array.isArray(allCountries) ? allCountries.map(country => ({ 
                      value: country?.name || '', 
                      label: country?.name || '' 
                    })).filter(option => option.value) : []}
                    value={formData.nationality || ''}
                    onValueChange={(value) => setFormData({...formData, nationality: value})}
                    placeholder="Search nationality..."
                    disabled={!editing}
                  />
                </div>
                <div>
                  <Label>Country of Residence</Label>
                  <SearchableSelect
                    options={Array.isArray(allCountries) ? allCountries.map(country => ({ 
                      value: country?.name || '', 
                      label: country?.name || '' 
                    })).filter(option => option.value) : []}
                    value={formData.country_of_residence || ''}
                    onValueChange={(value) => setFormData({...formData, country_of_residence: value})}
                    placeholder="Search country..."
                    disabled={!editing}
                  />
                </div>
                <div>
                  <Label>Town/City</Label>
                  <Input
                    value={formData.town_city || ''}
                    onChange={(e) => setFormData({...formData, town_city: e.target.value})}
                    disabled={!editing}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Address</Label>
                  <Input
                    value={formData.address || ''}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    disabled={!editing}
                  />
                </div>
                <div>
                  <Label>TIN (Tax Identification Number) <span className="text-muted-foreground text-sm">(Optional)</span></Label>
                  <Input
                    value={formData.tin || ''}
                    onChange={(e) => setFormData({...formData, tin: e.target.value})}
                    disabled={!editing}
                    placeholder="Enter TIN if available"
                  />
                </div>
                <div>
                  <Label>Account Type</Label>
                  <Select 
                    value={formData.account_type || ''} 
                    onValueChange={(value) => setFormData({...formData, account_type: value as AccountType})}
                    disabled={!editing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="organisation">Organization</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="picture" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-muted-foreground mb-4">
                Upload a profile picture to help others recognize you.
              </p>
              <div className="flex justify-center">
                <div className="w-48 h-48">
                  <ProfilePictureUpload
                    currentImageUrl={profile.profile_picture_url || ''}
                    onUploadComplete={loadProfileData}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <FixedDocumentUploadSection
            userType={profile.account_type || 'individual'}
            dateOfBirth={profile.date_of_birth || ''}
            documents={documents}
            canEdit={!isAdmin || profile.status !== 'blocked'}
            onDocumentsUpdate={loadProfileData}
          />
        </TabsContent>

        <TabsContent value="contacts">
          <EmergencyContactsSection
            contactPersons={contacts}
            onContactsUpdate={loadProfileData}
            canEdit={!isAdmin || profile.status !== 'blocked'}
          />
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
};

export default EnhancedProfileManager;