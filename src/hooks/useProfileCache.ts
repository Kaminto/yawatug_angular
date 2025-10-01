
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProfileData {
  id: string;
  full_name: string;
  email: string;
  user_role: string;
  status: string;
  profile_completion_percentage?: number;
}

interface CacheEntry {
  data: ProfileData;
  timestamp: number;
  loading: boolean;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const profileCache = new Map<string, CacheEntry>();
const activeRequests = new Map<string, Promise<ProfileData>>();

export const useProfileCache = (userId?: string) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const fetchProfileWithRetry = useCallback(async (id: string): Promise<ProfileData> => {
    const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 5000);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, user_role, status, profile_completion_percentage')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      retryCountRef.current = 0; // Reset on success
      return data;
    } catch (err: any) {
      if (retryCountRef.current < maxRetries && 
          (err.message?.includes('fetch') || err.message?.includes('network'))) {
        retryCountRef.current++;
        console.log(`Profile fetch retry ${retryCountRef.current}/${maxRetries} in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchProfileWithRetry(id);
      }
      throw err;
    }
  }, []);

  const loadProfile = useCallback(async (id: string) => {
    // Check cache first
    const cached = profileCache.get(id);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION && !cached.loading) {
      setProfile(cached.data);
      setLoading(false);
      setError(null);
      return;
    }

    // Check if request is already in progress
    if (activeRequests.has(id)) {
      try {
        const data = await activeRequests.get(id)!;
        setProfile(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const request = fetchProfileWithRetry(id);
    activeRequests.set(id, request);

    try {
      const data = await request;
      
      // Update cache
      profileCache.set(id, {
        data,
        timestamp: now,
        loading: false
      });
      
      setProfile(data);
      setError(null);
    } catch (err: any) {
      console.error('Profile fetch error:', err);
      setError(err.message || 'Failed to load profile');
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
      activeRequests.delete(id);
    }
  }, [fetchProfileWithRetry]);

  const clearCache = useCallback((id?: string) => {
    if (id) {
      profileCache.delete(id);
    } else {
      profileCache.clear();
    }
  }, []);

  const updateCache = useCallback((id: string, updates: Partial<ProfileData>) => {
    const cached = profileCache.get(id);
    if (cached) {
      profileCache.set(id, {
        ...cached,
        data: { ...cached.data, ...updates },
        timestamp: Date.now()
      });
      
      if (id === userId) {
        setProfile(prev => prev ? { ...prev, ...updates } : null);
      }
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadProfile(userId);
    }
  }, [userId, loadProfile]);

  return {
    profile,
    loading,
    error,
    refetch: () => userId && loadProfile(userId),
    clearCache,
    updateCache
  };
};
