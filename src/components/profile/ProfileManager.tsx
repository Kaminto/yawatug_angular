
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, FileText, Calendar, MapPin, Phone, Mail, AlertCircle, CheckCircle, Clock, Shield } from 'lucide-react';
import { allCountries } from '@/data/countries';
import { ProfileData } from '@/types/profile';
import EnhancedProfileManager from './EnhancedProfileManager';

const ProfileManager = () => {
  return <EnhancedProfileManager />;
};

export default ProfileManager;
