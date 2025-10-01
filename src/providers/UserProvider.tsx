
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useStandardizedWallet } from '@/hooks/useStandardizedWallet';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  user_role: string;
  status: string;
  phone?: string;
  date_of_birth?: string;
  nationality?: string;
  country_of_residence?: string;
  address?: string;
  profile_picture_url?: string;
  is_verified?: boolean;
  referral_code?: string;
}

interface UserContextType {
  user: User | null;
  userId: string | null;
  userProfile: UserProfile | null;
  wallets: any[];
  balances: { UGX: number; USD: number };
  loading: boolean;
  refreshWallets: () => Promise<void>;
  getBalance: (currency: 'UGX' | 'USD') => number;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Use standardized wallet hook
  const { 
    wallets, 
    balances, 
    loading: walletsLoading, 
    refreshWallets, 
    getBalance 
  } = useStandardizedWallet(user?.id || null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Load profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setUserProfile(profile);
      }
      
      setAuthLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (!session?.user) {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{
      user,
      userId: user?.id || null,
      userProfile,
      wallets,
      balances,
      loading: authLoading || walletsLoading,
      refreshWallets,
      getBalance
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
