
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarDays, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { UserStatus } from "@/types/custom";

const VerificationQueue: React.FC = () => {
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPendingVerifications = async () => {
      try {
        setLoading(true);
        
        // Get all users with status 'pending_verification'
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('status', 'pending_verification')
          .order('updated_at', { ascending: false });
        
        if (error) throw error;
        
        setPendingUsers(data || []);
      } catch (error: any) {
        console.error("Error fetching verification queue:", error);
        toast.error('Failed to load verification queue');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPendingVerifications();
    
    // Set up subscription for real-time updates
    const subscription = supabase
      .channel('profiles_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'profiles',
          filter: 'status=eq.pending_verification'
        }, 
        payload => {
          fetchPendingVerifications();
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verification Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-40">
            <div className="h-8 w-8 border-4 border-yawatu-gold border-t-transparent rounded-full animate-spin"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Verification Queue</CardTitle>
        <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
          {pendingUsers.length} Pending
        </Badge>
      </CardHeader>
      <CardContent>
        {pendingUsers.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
            <p className="text-gray-500 dark:text-gray-400">No pending verifications</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border border-yellow-200 dark:border-yellow-900 rounded-lg bg-yellow-50 dark:bg-yellow-900/20"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    {user.profile_picture_url ? (
                      <AvatarImage src={user.profile_picture_url} alt={user.full_name || ""} />
                    ) : (
                      <AvatarFallback>
                        {(user.full_name || "").substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.full_name || "No Name"}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <CalendarDays className="h-3 w-3" />
                      <span>Submitted: {formatDate(user.updated_at)}</span>
                    </div>
                  </div>
                </div>
                <Button asChild>
                  <Link to={`/admin/verify/${user.id}`}>
                    Review
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VerificationQueue;
