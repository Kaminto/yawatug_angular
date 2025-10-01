import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { allCountries } from '@/data/countries';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  bio: string | null;
  profile_picture_url: string | null;
  account_type: string | null;
  user_role: string | null;
  status: string | null;
  created_at: string;
}

interface FixedProfileEditorProps {
  profile: Profile | null;
  onUpdate: () => void;
}

const FixedProfileEditor: React.FC<FixedProfileEditorProps> = ({ profile, onUpdate }) => {
  const [fullName, setFullName] = useState<string>(profile?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState<string>(profile?.phone_number || '');
  const [address, setAddress] = useState<string>(profile?.address || '');
  const [city, setCity] = useState<string>(profile?.city || '');
  const [country, setCountry] = useState<string>(profile?.country || '');
  const [bio, setBio] = useState<string>(profile?.bio || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhoneNumber(profile.phone_number || '');
      setAddress(profile.address || '');
      setCity(profile.city || '');
      setCountry(profile.country || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!profile) {
        toast.error('Profile not loaded');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone_number: phoneNumber,
          address: address,
          city: city,
          country: country,
          bio: bio,
        })
        .eq('id', profile.id);

      if (error) {
        console.error('Error updating profile:', error);
        toast.error('Failed to update profile');
      } else {
        toast.success('Profile updated successfully!');
        onUpdate();
      }
    } catch (error) {
      console.error('Unexpected error updating profile:', error);
      toast.error('Unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              type="tel"
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
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
            <Label htmlFor="city">City</Label>
            <Input
              type="text"
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="country">Country</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent>
                {allCountries.map((country) => (
                  <SelectItem key={country.code} value={country.name}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="resize-none"
            />
          </div>
          <Button disabled={loading} type="submit">
            {loading ? 'Updating...' : 'Update Profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default FixedProfileEditor;
