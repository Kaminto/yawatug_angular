
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { allCountries } from '@/data/countries';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUser } from '@/providers/UserProvider';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  date_of_birth: string;
  country_of_residence: string;
  address: string;
  bio: string;
  profile_picture_url: string;
  account_type: string;
  status: string;
  user_role: string;
}

const EnhancedProfileEditor: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [countryOfResidence, setCountryOfResidence] = useState('');
  const [address, setAddress] = useState('');
  const [bio, setBio] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [accountType, setAccountType] = useState('');
  const [status, setStatus] = useState('');
  const [userRole, setUserRole] = useState('');
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      loadProfile(user.id);
    }
  }, [user]);

  const loadProfile = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        // Map database fields to component state
        const mappedProfile: Profile = {
          id: data.id,
          email: data.email || '',
          full_name: data.full_name || '',
          phone: data.phone || '',
          date_of_birth: data.date_of_birth || '',
          country_of_residence: data.country_of_residence || '',
          address: data.address || '',
          bio: '', // Not in database schema
          profile_picture_url: data.profile_picture_url || '',
          account_type: data.account_type || '',
          status: data.status || 'unverified',
          user_role: data.user_role || 'user'
        };
        
        setProfile(mappedProfile);
        setFullName(mappedProfile.full_name);
        setPhone(mappedProfile.phone);
        // Format date from YYYY-MM-DD to DD/MM/YYYY for display
        if (data.date_of_birth) {
          const dateObj = new Date(data.date_of_birth);
          const day = String(dateObj.getDate()).padStart(2, '0');
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const year = dateObj.getFullYear();
          setDateOfBirth(`${day}/${month}/${year}`);
        } else {
          setDateOfBirth('');
        }
        setCountryOfResidence(mappedProfile.country_of_residence);
        setAddress(mappedProfile.address);
        setBio(mappedProfile.bio);
        setProfilePictureUrl(mappedProfile.profile_picture_url);
        setAccountType(mappedProfile.account_type);
        setStatus(mappedProfile.status);
        setUserRole(mappedProfile.user_role);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const validateAndFormatDate = (dateStr: string): string | null => {
    // Check DD/MM/YYYY format
    const ddmmyyyyRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = dateStr.match(ddmmyyyyRegex);
    
    if (!match) return null;
    
    const day = parseInt(match[1]);
    const month = parseInt(match[2]);
    const year = parseInt(match[3]);
    
    // Validate ranges
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    
    // Create date object and validate it's a real date
    const dateObj = new Date(year, month - 1, day);
    if (dateObj.getFullYear() !== year || 
        dateObj.getMonth() !== month - 1 || 
        dateObj.getDate() !== day) {
      return null;
    }
    
    // Return in YYYY-MM-DD format for database
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const saveProfile = async () => {
    if (!user) {
      toast.error('You must be logged in to save your profile.');
      return;
    }

    // Validate date if provided
    let formattedDate = null;
    if (dateOfBirth) {
      formattedDate = validateAndFormatDate(dateOfBirth);
      if (!formattedDate) {
        toast.error('Please enter date of birth in DD/MM/YYYY format');
        return;
      }
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
          date_of_birth: formattedDate,
          country_of_residence: countryOfResidence,
          address: address,
          profile_picture_url: profilePictureUrl,
          account_type: accountType,
          user_role: userRole,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully!');
      loadProfile(user.id);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>Loading profile...</CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent>Failed to load profile.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Profile</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              type="text"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input
            type="text"
            id="dateOfBirth"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            placeholder="DD/MM/YYYY"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Please enter your date of birth in DD/MM/YYYY format
          </p>
        </div>

        <div>
          <Label htmlFor="countryOfResidence">Country of Residence</Label>
          <SearchableSelect
            options={Array.isArray(allCountries) ? allCountries.map(country => ({ 
              value: country?.name || '', 
              label: country?.name || '' 
            })).filter(option => option.value) : []}
            value={countryOfResidence}
            onValueChange={setCountryOfResidence}
            placeholder="Search country..."
            emptyMessage="No country found."
            searchPlaceholder="Search countries..."
          />
        </div>

        <div>
          <Label htmlFor="address">Address</Label>
          <Input
            type="text"
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="profilePictureUrl">Profile Picture URL</Label>
          <Input
            type="text"
            id="profilePictureUrl"
            value={profilePictureUrl}
            onChange={(e) => setProfilePictureUrl(e.target.value)}
          />
        </div>

        <Button onClick={saveProfile} disabled={saving}>
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default EnhancedProfileEditor;
