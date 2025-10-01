import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DatabaseCleanup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const handleCleanup = async () => {
    setIsLoading(true);
    try {
      console.log('Starting cleanup process...');
      
      // Call the database function directly via RPC
      const { data, error } = await supabase.rpc('cleanup_orphaned_auth_users_db');
      
      if (error) {
        console.error('Cleanup error:', error);
        toast.error(`Failed to cleanup orphaned users: ${error.message}`);
      } else {
        console.log('Cleanup result:', data);
        setLastResult(data);
        
        // Type cast the response to handle JSON type
        const result = data as any;
        if (result?.success) {
          toast.success(result.message || 'Cleanup analysis completed');
        } else {
          toast.error(`Cleanup failed: ${result?.error || 'Unknown error'}`);
        }
      }
    } catch (err: any) {
      console.error('Cleanup exception:', err);
      toast.error(`An error occurred during cleanup: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Database Cleanup</CardTitle>
        <CardDescription>
          Remove orphaned authentication users that don't have corresponding profiles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleCleanup} 
          disabled={isLoading}
          variant="destructive"
        >
          {isLoading ? 'Cleaning up...' : 'Remove Orphaned Auth Users'}
        </Button>
        
        {lastResult && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Last Cleanup Result:</h4>
            <ul className="text-sm space-y-1">
              <li>Total Auth Users: {lastResult.results?.total_auth_users}</li>
              <li>Total Profiles: {lastResult.results?.total_profiles}</li>
              <li>Orphaned Users Found: {lastResult.results?.orphaned_users_count}</li>
              <li className="text-green-600">Users Removed: {lastResult.results?.removed_users?.length || 0}</li>
              {lastResult.results?.errors?.length > 0 && (
                <li className="text-red-600">Errors: {lastResult.results.errors.length}</li>
              )}
              {lastResult.results?.orphaned_users_list?.length > 0 && (
                <li>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-orange-600">
                      Orphaned Users List ({lastResult.results.orphaned_users_list.length})
                    </summary>
                    <ul className="mt-1 ml-4 text-xs">
                      {lastResult.results.orphaned_users_list.map((user: string, index: number) => (
                        <li key={index}>• {user}</li>
                      ))}
                    </ul>
                  </details>
                </li>
              )}
              {lastResult.results?.removed_users?.length > 0 && (
                <li>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-green-600">
                      Successfully Removed ({lastResult.results.removed_users.length})
                    </summary>
                    <ul className="mt-1 ml-4 text-xs">
                      {lastResult.results.removed_users.map((user: string, index: number) => (
                        <li key={index}>• {user}</li>
                      ))}
                    </ul>
                  </details>
                </li>
              )}
              <li className="text-blue-600">Status: {lastResult.results?.recommendation}</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DatabaseCleanup;