import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useWalletDebug = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      // Check frontend session
      const { data: session } = await supabase.auth.getSession();
      
      // Check backend auth
      const { data: dbUser, error: dbError } = await supabase
        .from('profiles')
        .select('id, email')
        .limit(1);

      console.log('🔍 AUTH DEBUG:', {
        frontendSession: !!session?.session,
        frontendUserId: session?.session?.user?.id,
        dbQueryResult: dbUser,
        dbError: dbError
      });

      setDebugInfo({
        hasSession: !!session?.session,
        userId: session?.session?.user?.id,
        email: session?.session?.user?.email,
        dbWorking: !dbError,
        timestamp: new Date().toISOString()
      });
    };

    checkAuth();
  }, []);

  return debugInfo;
};