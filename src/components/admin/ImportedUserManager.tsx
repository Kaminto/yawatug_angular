import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, UserCheck, AlertCircle, Clock } from "lucide-react";
import { getBaseUrl } from "@/lib/constants";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

interface ImportedUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  import_batch_id: string;
  account_activation_status: string;
  created_at: string;
}

const ImportedUserManager = () => {
  const [importedUsers, setImportedUsers] = useState<ImportedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [sendingInvites, setSendingInvites] = useState<Set<string>>(new Set());
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchImportedUsers();
  }, [currentPage, searchQuery]);

  const fetchImportedUsers = async () => {
    try {
      console.log('Fetching imported users...');
      
      // Build query with server-side filtering
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, phone, import_batch_id, account_activation_status, created_at')
        .not('import_batch_id', 'is', null)
        .order('created_at', { ascending: false });
      
      let countQuery = supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .not('import_batch_id', 'is', null);

      // Apply search filter on server-side
      if (searchQuery.trim()) {
        const searchFilter = `full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`;
        query = query.or(searchFilter);
        countQuery = countQuery.or(searchFilter);
      }

      // Get total count with filters applied
      const { count: totalImported, error: countError } = await countQuery;
      if (countError) throw countError;
      setTotalCount(totalImported || 0);

      // Get paginated data with filters applied
      const { data, error } = await query
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (error) throw error;
      console.log(`Fetched ${data?.length || 0} imported users (page ${currentPage} of ${Math.ceil((totalImported || 0) / pageSize)}, total: ${totalImported})`);
      setImportedUsers(data || []);
      
    } catch (error: any) {
      console.error('Error fetching imported users:', error);
      toast.error("Failed to load imported users");
    } finally {
      setLoading(false);
    }
  };

  const sendActivationInvite = async (userId: string, email: string) => {
    setSendingInvites(prev => new Set(prev).add(userId));
    
    try {
      console.log('Sending invitation for user:', userId, email);
      
      // First, check if user exists and is imported
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, import_batch_id')
        .eq('email', email)
        .eq('id', userId)
        .single();

      if (profileError || !profile || !profile.import_batch_id) {
        throw new Error('User not found or not imported');
      }

      console.log('Found profile:', profile);

      // Generate invitation token using the database function
      const { data: token, error: tokenError } = await supabase
        .rpc('generate_invitation_token', {
          p_user_id: profile.id,
          p_created_by: null
        });

      console.log('Token generation result:', { token, tokenError });

      if (tokenError) {
        throw tokenError;
      }

      if (!token) {
        throw new Error('Failed to generate invitation token');
      }

      // Create activation URL
      const activationUrl = `${getBaseUrl()}/activate-account?token=${encodeURIComponent(token)}`;
      
      console.log('Generated activation URL:', activationUrl);

      // Send activation email using the new edge function
      try {
        const { data: emailResult, error: emailError } = await supabase.functions.invoke('unified-communication-sender', {
          body: {
            recipient: profile.email,
            subject: 'Activate Your Yawatu Account',
            message: `Welcome to Yawatu! Click the link below to activate your account.`,
            channel: 'email',
            templateType: 'account_activation',
            templateData: {
              name: profile.full_name,
              activationUrl: activationUrl
            }
          }
        });

        if (emailError) {
          console.error('Email sending error:', emailError);
          toast.error(`Failed to send activation email to ${email}: ${emailError.message}`);
        } else {
          console.log('Email sent successfully:', emailResult);
          toast.success(`Activation email sent successfully to ${email}!`);
        }
      } catch (emailError: any) {
        console.error('Email function error:', emailError);
        toast.error(`Failed to send activation email to ${email}. Token generated but email failed.`);
      }

      await fetchImportedUsers(); // Refresh the list
      
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast.error(`Failed to send invitation: ${error.message}`);
    } finally {
      setSendingInvites(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const checkUserStatus = async () => {
    if (!searchEmail) {
      toast.error("Please enter an email address");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('handle-imported-user-auth', {
        body: {
          action: 'check',
          email: searchEmail
        }
      });

      if (error) throw error;

      if (data.exists) {
        toast.success(
          `User found: ${data.isImported ? 'Imported' : 'Regular'} user, ${
            data.hasAuthAccount ? 'Has auth account' : 'No auth account'
          }`
        );
      } else {
        toast.info("User not found in system");
      }
    } catch (error: any) {
      console.error('Error checking user status:', error);
      toast.error("Failed to check user status");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'activated':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><UserCheck className="w-3 h-3 mr-1" />Activated</Badge>;
      case 'invited':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Mail className="w-3 h-3 mr-1" />Invited</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800"><AlertCircle className="w-3 h-3 mr-1" />Unknown</Badge>;
    }
  };

  useEffect(() => {
    if (searchQuery.trim() !== "") {
      setCurrentPage(1); // Reset to first page when search changes
    }
  }, [searchQuery]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yawatu-gold mx-auto mb-4"></div>
            <p>Loading imported users...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Check User Status</CardTitle>
          <CardDescription>
            Check if a user exists and their authentication status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search-email">Email Address</Label>
              <Input
                id="search-email"
                type="email"
                placeholder="Enter email to check status"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={checkUserStatus}>
                Check Status
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Imported Users ({totalCount} total, showing {importedUsers.length} on page {currentPage})</CardTitle>
          <CardDescription>
            Manage activation for imported user accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Name</TableHead>
                  <TableHead className="min-w-[200px]">Email</TableHead>
                  <TableHead className="min-w-[120px]">Phone</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[100px]">Batch ID</TableHead>
                  <TableHead className="min-w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name || 'No name'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || 'No phone'}</TableCell>
                    <TableCell>{getStatusBadge(user.account_activation_status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {user.import_batch_id}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.account_activation_status !== 'activated' && (
                        <Button
                          size="sm"
                          onClick={() => sendActivationInvite(user.id, user.email)}
                          disabled={sendingInvites.has(user.id)}
                          className="bg-yawatu-gold text-black hover:bg-yawatu-gold-dark text-xs"
                        >
                          {sendingInvites.has(user.id) ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-black mr-1"></div>
                              <span className="hidden sm:inline">Sending...</span>
                              <span className="sm:hidden">...</span>
                            </>
                          ) : (
                            <>
                              <Mail className="w-3 h-3 mr-1" />
                              <span className="hidden sm:inline">Send Invite</span>
                              <span className="sm:hidden">Invite</span>
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {importedUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? 'No users found matching your search.' : 'No imported users found.'}
            </div>
          )}

          {/* Pagination */}
          {totalCount > pageSize && (
            <div className="mt-4 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) setCurrentPage(currentPage - 1);
                      }}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(5, Math.ceil(totalCount / pageSize)) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(page);
                          }}
                          isActive={currentPage === page}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < Math.ceil(totalCount / pageSize)) setCurrentPage(currentPage + 1);
                      }}
                      className={currentPage >= Math.ceil(totalCount / pageSize) ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportedUserManager;
