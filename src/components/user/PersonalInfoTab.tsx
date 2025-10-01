import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { allCountries } from '@/data/countries';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UnifiedDateInput } from '@/components/ui/unified-date-input';

interface PersonalInfoTabProps {
  profileData: any;
  onUpdate: (data: any) => Promise<void>;
  loading: boolean;
}

const PersonalInfoTab: React.FC<PersonalInfoTabProps> = ({ profileData, onUpdate, loading }) => {
  const [fullName, setFullName] = useState(profileData?.full_name || '');
  const [email, setEmail] = useState(profileData?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(profileData?.phone_number || '');
  const [country, setCountry] = useState(profileData?.country || '');
  const [address, setAddress] = useState(profileData?.address || '');
  const [bio, setBio] = useState(profileData?.bio || '');
  const [dateOfBirth, setDateOfBirth] = useState(profileData?.date_of_birth || '');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (profileData) {
      setFullName(profileData.full_name || '');
      setEmail(profileData.email || '');
      setPhoneNumber(profileData.phone_number || '');
      setCountry(profileData.country || '');
      setAddress(profileData.address || '');
      setBio(profileData.bio || '');
      setDateOfBirth(profileData.date_of_birth || '');
    }
  }, [profileData]);

  const handleSave = async () => {
    try {
      const updatedData = {
        full_name: fullName,
        phone_number: phoneNumber,
        country: country,
        address: address,
        bio: bio,
        date_of_birth: dateOfBirth
      };
      await onUpdate(updatedData);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleCancel = () => {
    setFullName(profileData?.full_name || '');
    setEmail(profileData?.email || '');
    setPhoneNumber(profileData?.phone_number || '');
    setCountry(profileData?.country || '');
    setAddress(profileData?.address || '');
    setBio(profileData?.bio || '');
    setDateOfBirth(profileData?.date_of_birth || '');
    setIsEditing(false);
  };

  if (loading) {
    return <div className="text-center py-4">Loading profile information...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Full Name */}
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={!isEditing}
            />
          </div>

          {/* Phone Number */}
          <div>
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              type="tel"
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={!isEditing}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Country */}
          <div>
            <Label htmlFor="country">Country</Label>
            <SearchableSelect
              options={Array.isArray(allCountries) ? allCountries.map(countryItem => ({ 
                value: countryItem?.name || '', 
                label: countryItem?.name || '' 
              })).filter(option => option.value) : []}
              value={country}
              onValueChange={setCountry}
              placeholder="Search country..."
              emptyMessage="No country found."
              searchPlaceholder="Search countries..."
              disabled={!isEditing}
            />
          </div>

          {/* Date of Birth */}
          <div>
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <UnifiedDateInput
              id="dateOfBirth"
              value={dateOfBirth}
              onChange={setDateOfBirth}
              placeholder="Select date of birth"
              disabled={!isEditing}
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <Label htmlFor="address">Address</Label>
          <Input
            type="text"
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={!isEditing}
          />
        </div>

        {/* Bio */}
        <div>
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            disabled={!isEditing}
          />
        </div>

        {/* Email - Display Only */}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            type="email"
            id="email"
            value={email}
            disabled
          />
        </div>

        {/* Action Buttons */}
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} disabled={loading}>
            Edit Profile
          </Button>
        ) : (
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              Save Changes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PersonalInfoTab;
