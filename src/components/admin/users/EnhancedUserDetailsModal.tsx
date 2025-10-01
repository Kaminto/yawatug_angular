
import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, FileText, Eye, Edit2, Upload, Download, Trash2, Plus, Calendar, Save, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/dateFormatter';
import { allCountries } from '@/data/countries';

type UserStatus = 'active' | 'blocked' | 'unverified' | 'pending_verification';

interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  account_type: string;
  status: UserStatus;
  profile_picture_url?: string;
  nationality?: string;
  country_of_residence?: string;
  user_documents?: any[];
  gender?: string;
  date_of_birth?: string;
  address?: string;
  tin?: string;
}

interface EnhancedUserDetailsModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
}

const EnhancedUserDetailsModal = ({
  user,
  isOpen,
  onClose,
  onUserUpdated
}: EnhancedUserDetailsModalProps) => {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [newDocumentType, setNewDocumentType] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [autoSaving, setAutoSaving] = useState(false);
  const [saveTimeoutId, setSaveTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  React.useEffect(() => {
    if (user) {
      setEditData({
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        nationality: user.nationality,
        country_of_residence: user.country_of_residence,
        address: user.address,
        tin: user.tin,
        gender: user.gender,
        date_of_birth: user.date_of_birth,
        status: user.status
      });
      setDocuments(user.user_documents || []);
      setHasUnsavedChanges(false);
      setEditing(false); // Reset edit mode when user changes
    }
  }, [user?.id]); // Only depend on user ID to prevent unnecessary resets

  // Auto-save functionality with debouncing
  const debouncedAutoSave = useCallback(async (fieldData: any) => {
    if (!user?.id || !editing) return;

    try {
      setAutoSaving(true);
      console.log('Auto-saving field:', fieldData);
      
      const { error } = await supabase
        .from('profiles')
        .update(fieldData)
        .eq('id', user.id);

      if (error) throw error;
      
      setHasUnsavedChanges(false);
      toast.success(`Updated ${Object.keys(fieldData)[0]} successfully`);
      onUserUpdated();
    } catch (error: any) {
      console.error('Auto-save error:', error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setAutoSaving(false);
    }
  }, [user?.id, editing, onUserUpdated]);

  // Handle field changes with auto-save
  const handleFieldChange = useCallback((field: string, value: any) => {
    if (!editing) return; // Prevent changes when not in edit mode
    
    console.log('Field change:', field, '=', value);
    setEditData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);

    // Clear existing timeout
    if (saveTimeoutId) {
      clearTimeout(saveTimeoutId);
    }

    // Only auto-save certain fields immediately, others need manual save
    const autoSaveFields = ['status', 'nationality', 'country_of_residence', 'gender'];
    
    if (autoSaveFields.includes(field)) {
      const timeoutId = setTimeout(() => {
        debouncedAutoSave({ [field]: value });
      }, 1500); // Increased delay to prevent rapid updates
      
      setSaveTimeoutId(timeoutId);
    }
  }, [user?.id, editing, debouncedAutoSave, saveTimeoutId]);

  // Cleanup timeouts on unmount
  React.useEffect(() => {
    return () => {
      if (saveTimeoutId) {
        clearTimeout(saveTimeoutId);
      }
    };
  }, [saveTimeoutId]);

  const getStatusBadge = (status: UserStatus) => {
    const variants = {
      active: 'default',
      pending_verification: 'secondary',
      blocked: 'destructive',
      unverified: 'outline'
    } as const;

    const labels = {
      active: 'Verified',
      pending_verification: 'Pending',
      blocked: 'Blocked',
      unverified: 'Unverified'
    };

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const getDocumentStatusBadge = (status: string) => {
    const variants = {
      approved: 'default',
      pending: 'secondary',
      rejected: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const handleApproveDocument = async (documentId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('user_documents')
        .update({ status: 'approved' })
        .eq('id', documentId);

      if (error) throw error;
      
      // Update local state
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === documentId 
            ? { ...doc, status: 'approved' }
            : doc
        )
      );
      
      toast.success('Document approved');
      onUserUpdated();
    } catch (error: any) {
      toast.error('Failed to approve document');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectDocument = async (documentId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('user_documents')
        .update({ 
          status: 'rejected',
          feedback: rejectionReason 
        })
        .eq('id', documentId);

      if (error) throw error;
      
      // Update local state
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === documentId 
            ? { ...doc, status: 'rejected', feedback: rejectionReason }
            : doc
        )
      );
      
      toast.success('Document rejected');
      setRejectionReason('');
      setShowRejectForm(null);
      onUserUpdated();
    } catch (error: any) {
      toast.error('Failed to reject document');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        throw new Error('No user selected for update');
      }

      // Only save fields that need manual saving (text fields)
      const manualSaveFields = {
        full_name: editData.full_name,
        email: editData.email,
        phone: editData.phone,
        address: editData.address,
        tin: editData.tin,
        date_of_birth: editData.date_of_birth
      };
      
      const { error } = await supabase
        .from('profiles')
        .update(manualSaveFields)
        .eq('id', user.id);

      if (error) throw error;
      
      setHasUnsavedChanges(false);
      toast.success('Profile updated successfully');
      onUserUpdated();
      
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast.error(`Failed to update profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user || !newDocumentType) {
      toast.error('Please select a document type first');
      return;
    }

    if (uploadingDocument) {
      console.log('Upload already in progress, skipping...');
      return; // Prevent double uploads
    }

    setUploadingDocument(true);
    console.log('Starting document upload for:', newDocumentType);
    
    try {
      const file = acceptedFiles[0];
      const fileName = `${user.id}/${newDocumentType}_${Date.now()}.${file.name.split('.').pop()}`;
      
      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-documents')
        .getPublicUrl(fileName);

      // Create document record
      const { data: docData, error: docError } = await supabase
        .from('user_documents')
        .insert({
          user_id: user.id,
          type: newDocumentType as any,
          url: publicUrl,
          status: 'pending',
          uploaded_at: new Date().toISOString()
        })
        .select()
        .single();

      if (docError) throw docError;

      // Update local state to prevent duplicate loading
      setDocuments(prev => {
        const exists = prev.find(doc => doc.id === docData.id);
        if (exists) return prev; // Prevent duplicates
        return [...prev, docData];
      });
      
      setNewDocumentType('');
      toast.success('Document uploaded successfully');
      onUserUpdated(); // This may cause a reload, but local state is already updated
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload document: ${error.message}`);
    } finally {
      setUploadingDocument(false);
    }
  }, [user, newDocumentType, uploadingDocument, onUserUpdated]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    disabled: !newDocumentType || uploadingDocument
  });

  const handleDeleteDocument = async (docId: string, docUrl?: string) => {
    try {
      setLoading(true);
      
      // Extract file path from URL for storage deletion
      if (docUrl) {
        try {
          // Extract the path after the bucket name from the URL
          // URL format: https://...supabase.co/storage/v1/object/public/user-documents/path
          const urlParts = docUrl.split('/user-documents/');
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            await supabase.storage
              .from('user-documents')
              .remove([filePath]);
          }
        } catch (storageError) {
          console.warn('Storage deletion failed:', storageError);
          // Continue with database deletion even if storage fails
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('user_documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;

      setDocuments(prev => prev.filter(doc => doc.id !== docId));
      toast.success('Document deleted successfully');
      onUserUpdated();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDocument = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      toast.error('Failed to download document');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <React.Fragment>
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open && hasUnsavedChanges && editing) {
          // Prevent closing if there are unsaved changes
          const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
          if (confirmClose) {
            onClose();
          }
        } else {
          onClose();
        }
      }}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>User Details - {user.full_name}</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (editing) {
                  // Cancel edit mode - reset data to original values
                  setEditData({
                    full_name: user.full_name,
                    email: user.email,
                    phone: user.phone,
                    nationality: user.nationality,
                    country_of_residence: user.country_of_residence,
                    address: user.address,
                    tin: user.tin,
                    gender: user.gender,
                    date_of_birth: user.date_of_birth,
                    status: user.status
                  });
                  setHasUnsavedChanges(false);
                  if (saveTimeoutId) {
                    clearTimeout(saveTimeoutId);
                    setSaveTimeoutId(null);
                  }
                }
                setEditing(!editing);
              }}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              {editing ? 'Cancel Edit' : 'Edit Profile'}
            </Button>
          </div>
          <DialogDescription>
            View and edit user profile information, documents, and account status.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-8">
          {/* Auto-save indicator */}
          {editing && (autoSaving || hasUnsavedChanges) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              {autoSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Auto-saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Unsaved changes</span>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h5 className="text-lg font-semibold border-b pb-2">Personal Information</h5>
              <div className="space-y-4">
                {editing ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={editData.full_name || ''}
                        onChange={(e) => handleFieldChange('full_name', e.target.value)}
                        className="focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={editData.email || ''}
                        onChange={(e) => handleFieldChange('email', e.target.value)}
                        className="focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={editData.phone || ''}
                        onChange={(e) => handleFieldChange('phone', e.target.value)}
                        className="focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                     <div className="space-y-2">
                       <Label htmlFor="gender">Gender</Label>
                       <Select 
                         value={editData.gender || ''} 
                         onValueChange={(value) => {
                           if (editing) {
                             handleFieldChange('gender', value);
                           }
                         }}
                         disabled={!editing}
                       >
                         <SelectTrigger className="w-full focus:ring-2 focus:ring-primary/20 bg-background">
                           <SelectValue placeholder="Select gender" />
                         </SelectTrigger>
                         <SelectContent className="bg-popover border shadow-md z-[100] max-h-[200px] overflow-y-auto">
                           <SelectItem value="male" className="cursor-pointer hover:bg-accent hover:text-accent-foreground">Male</SelectItem>
                           <SelectItem value="female" className="cursor-pointer hover:bg-accent hover:text-accent-foreground">Female</SelectItem>
                           <SelectItem value="other" className="cursor-pointer hover:bg-accent hover:text-accent-foreground">Other</SelectItem>
                           <SelectItem value="prefer_not_to_say" className="cursor-pointer hover:bg-accent hover:text-accent-foreground">Prefer not to say</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                    <div className="space-y-2">
                      <Label>Date of Birth</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal focus:ring-2 focus:ring-primary/20",
                              !editData.date_of_birth && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {editData.date_of_birth ? (
                              formatDate(editData.date_of_birth)
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-background border shadow-md z-[100]" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={editData.date_of_birth ? new Date(editData.date_of_birth) : undefined}
                            onSelect={(date) => handleFieldChange('date_of_birth', date ? format(date, 'yyyy-MM-dd') : '')}
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tin">TIN (Tax Identification Number)</Label>
                      <Input
                        id="tin"
                        value={editData.tin || ''}
                        onChange={(e) => handleFieldChange('tin', e.target.value)}
                        className="focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-muted">
                      <span className="font-medium">Name:</span>
                      <span>{user.full_name || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-muted">
                      <span className="font-medium">Email:</span>
                      <span>{user.email || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-muted">
                      <span className="font-medium">Phone:</span>
                      <span>{user.phone || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-muted">
                      <span className="font-medium">Gender:</span>
                      <span>{user.gender || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-muted">
                      <span className="font-medium">Date of Birth:</span>
                      <span>{user.date_of_birth ? format(new Date(user.date_of_birth), "dd/MM/yyyy") : 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-muted">
                      <span className="font-medium">TIN:</span>
                      <span>{user.tin || 'Not provided'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-6">
              <h5 className="text-lg font-semibold border-b pb-2">Location & Account</h5>
              <div className="space-y-4">
                {editing ? (
                  <>
                     <div className="space-y-2">
                       <Label>Nationality</Label>
                       <Select 
                         value={editData.nationality || ''} 
                         onValueChange={(value) => {
                           if (editing) {
                             handleFieldChange('nationality', value);
                           }
                         }}
                         disabled={!editing}
                       >
                         <SelectTrigger className="w-full focus:ring-2 focus:ring-primary/20 bg-background">
                           <SelectValue placeholder="Select nationality" />
                         </SelectTrigger>
                         <SelectContent className="bg-popover border shadow-md z-[100] max-h-[200px] overflow-y-auto">
                           {allCountries.map((country) => (
                             <SelectItem 
                               key={country.code} 
                               value={country.name}
                               className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                             >
                               {country.name}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
                     <div className="space-y-2">
                       <Label>Country of Residence</Label>
                       <Select 
                         value={editData.country_of_residence || ''} 
                         onValueChange={(value) => {
                           if (editing) {
                             handleFieldChange('country_of_residence', value);
                           }
                         }}
                         disabled={!editing}
                       >
                         <SelectTrigger className="w-full focus:ring-2 focus:ring-primary/20 bg-background">
                           <SelectValue placeholder="Select country" />
                         </SelectTrigger>
                         <SelectContent className="bg-popover border shadow-md z-[100] max-h-[200px] overflow-y-auto">
                           {allCountries.map((country) => (
                             <SelectItem 
                               key={country.code} 
                               value={country.name}
                               className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                             >
                               {country.name}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        value={editData.address || ''}
                        onChange={(e) => handleFieldChange('address', e.target.value)}
                        className="focus:ring-2 focus:ring-primary/20 min-h-[80px]"
                        placeholder="Enter full address..."
                      />
                    </div>
                     <div className="space-y-2">
                       <Label>Account Status</Label>
                       <Select 
                         value={editData.status || ''} 
                         onValueChange={(value: UserStatus) => {
                           if (editing) {
                             handleFieldChange('status', value);
                           }
                         }}
                         disabled={!editing}
                       >
                         <SelectTrigger className="w-full focus:ring-2 focus:ring-primary/20 bg-background">
                           <SelectValue placeholder="Select status" />
                         </SelectTrigger>
                         <SelectContent className="bg-popover border shadow-md z-[100] max-h-[200px] overflow-y-auto">
                           <SelectItem value="active" className="cursor-pointer hover:bg-accent hover:text-accent-foreground">✅ Active</SelectItem>
                           <SelectItem value="pending_verification" className="cursor-pointer hover:bg-accent hover:text-accent-foreground">⏳ Pending Verification</SelectItem>
                           <SelectItem value="unverified" className="cursor-pointer hover:bg-accent hover:text-accent-foreground">❓ Unverified</SelectItem>
                           <SelectItem value="blocked" className="cursor-pointer hover:bg-accent hover:text-accent-foreground">🚫 Blocked</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                  </>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-muted">
                      <span className="font-medium">Nationality:</span>
                      <span>{user.nationality || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-muted">
                      <span className="font-medium">Country:</span>
                      <span>{user.country_of_residence || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-muted">
                      <span className="font-medium">Address:</span>
                      <span className="text-right max-w-[200px]">{user.address || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-muted">
                      <span className="font-medium">Account Type:</span>
                      <span>{user.account_type || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-muted">
                      <span className="font-medium">Status:</span>
                      <span>{getStatusBadge(user.status)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {editing && (
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                <span className="text-primary">●</span> Dropdowns save automatically
                <br />
                <span className="text-secondary">●</span> Text fields require manual save
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditing(false);
                    setHasUnsavedChanges(false);
                    if (saveTimeoutId) clearTimeout(saveTimeoutId);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveProfile} 
                  disabled={loading || !hasUnsavedChanges}
                  className="min-w-[120px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <h5 className="font-medium">Documents & Verification</h5>
              <Badge variant="outline">
                {documents.length} document{documents.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {/* Document Upload Section */}
            <div className="mb-6 p-4 border-2 border-dashed border-muted-foreground/25 rounded-lg">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label htmlFor="documentType">Document Type</Label>
                       <Select value={newDocumentType} onValueChange={setNewDocumentType}>
                          <SelectTrigger className="w-full bg-background">
                            <SelectValue placeholder="Select document type" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border shadow-md z-[100] max-h-[200px] overflow-y-auto">
                            {[
                              { value: "national_id", label: "National ID" },
                              { value: "passport", label: "Passport" },
                              { value: "birth_certificate", label: "Birth Certificate" },
                              { value: "proof_of_address", label: "Proof of Address" },
                              { value: "business_registration", label: "Business Registration" },
                              { value: "trading_license", label: "Trading License" },
                              { value: "operational_permit", label: "Operational Permit" },
                              { value: "registration_certificate", label: "Registration Certificate" },
                              { value: "guardian_id", label: "Guardian ID" }
                            ].filter(docType => 
                              !documents.some(doc => doc.type === docType.value)
                            ).map(docType => (
                              <SelectItem 
                                key={docType.value} 
                                value={docType.value} 
                                className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                              >
                                {docType.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                    </div>
                </div>

                <div
                  {...getRootProps()}
                  className={`p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    isDragActive 
                      ? 'border-primary bg-primary/5' 
                      : newDocumentType 
                        ? 'border-muted-foreground/50 hover:border-primary hover:bg-muted/25' 
                        : 'border-muted-foreground/25 bg-muted/10'
                  } ${!newDocumentType || uploadingDocument ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <input {...getInputProps()} />
                  <div className="text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    {uploadingDocument ? (
                      <p className="text-sm text-muted-foreground">Uploading...</p>
                    ) : !newDocumentType ? (
                      <p className="text-sm text-muted-foreground">Select document type first</p>
                    ) : isDragActive ? (
                      <p className="text-sm text-muted-foreground">Drop the file here...</p>
                    ) : (
                      <div>
                        <p className="text-sm font-medium">Drop file here or click to upload</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Supports: JPEG, PNG, PDF (Max 50MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Documents List */}
            {documents.length > 0 ? (
              <div className="space-y-4">
                {documents.map((doc: any) => (
                  <div key={doc.id} className="border rounded-lg overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium">{doc.type.replace('_', ' ').toUpperCase()}</p>
                            {getDocumentStatusBadge(doc.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {doc.document_number && `#${doc.document_number} • `}
                            Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                          </p>
                          {doc.feedback && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                              <p className="text-sm text-red-700">
                                <strong>Feedback:</strong> {doc.feedback}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 ml-4">
                          {doc.url && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setViewingDocument(doc.url)}
                                title="View Document"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadDocument(doc.url, `${doc.type}_${doc.id}`)}
                                title="Download Document"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteDocument(doc.id, doc.url)}
                            disabled={loading}
                            title="Delete Document"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Verification Actions */}
                      {doc.status === 'pending' && (
                        <div className="flex gap-2 mt-3 pt-3 border-t">
                          <Button
                            size="sm"
                            onClick={() => handleApproveDocument(doc.id)}
                            disabled={loading}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setShowRejectForm(doc.id)}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {showRejectForm === doc.id && (
                      <div className="border-t bg-muted/25 p-4">
                        <div className="space-y-3">
                          <Label>Rejection Reason</Label>
                          <Textarea
                            placeholder="Please provide a clear reason for rejection..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectDocument(doc.id)}
                              disabled={!rejectionReason.trim() || loading}
                            >
                              {loading ? 'Rejecting...' : 'Confirm Rejection'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowRejectForm(null);
                                setRejectionReason('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No documents uploaded yet</p>
                <p className="text-sm">Upload documents above to get started</p>
              </div>
            )}
          </div>
        </div>

        {/* Save button for manual fields */}
        {editing && hasUnsavedChanges && (
          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveProfile} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Document Viewer Modal - Separate Dialog */}
    {viewingDocument && (
      <Dialog open={!!viewingDocument} onOpenChange={() => setViewingDocument(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Document Viewer</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            <img 
              src={viewingDocument} 
              alt="Document" 
              className="max-w-full max-h-[70vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    )}
    </React.Fragment>
  );
};

export default EnhancedUserDetailsModal;
