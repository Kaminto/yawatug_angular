import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Upload, File, Trash2, Eye, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getDocumentTypesByUserType, getDocumentLabel, DocumentType } from '@/types/documents';
import NationalIdCapture from '@/components/document/NationalIdCapture';

interface Document {
  id: string;
  type: string;
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  feedback?: string;
  uploaded_at: string;
  document_number?: string;
}

interface ImprovedDocumentUploadSectionProps {
  userType: string;
  dateOfBirth?: string;
  documents: Document[];
  canEdit: boolean;
  onDocumentsUpdate: () => void;
}

const ImprovedDocumentUploadSection: React.FC<ImprovedDocumentUploadSectionProps> = ({
  userType,
  dateOfBirth,
  documents,
  canEdit,
  onDocumentsUpdate
}) => {
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  // Get required documents based on account type and age
  const requiredDocuments = getDocumentTypesByUserType(userType, dateOfBirth);
  
  // Get uploaded document types
  const uploadedTypes = documents.map(doc => doc.type);
  
  // Get available document types (not yet uploaded)
  const availableDocTypes = requiredDocuments.filter(type => !uploadedTypes.includes(type));

  // Special handling for individual account type - user can choose either National ID OR Passport
  const getAvailableDocumentOptions = (): DocumentType[] => {
    if (userType === 'individual') {
      const age = getAge();
      if (age !== null && age >= 18) {
        // For adults, show National ID and Passport as options, but only if neither is uploaded
        const hasIdentityDoc = uploadedTypes.includes('national_id') || uploadedTypes.includes('passport');
        if (!hasIdentityDoc) {
          return ['national_id', 'passport', ...availableDocTypes.filter(type => type !== 'national_id' && type !== 'passport')];
        } else {
          return availableDocTypes.filter(type => type !== 'national_id' && type !== 'passport');
        }
      }
    }
    return availableDocTypes;
  };

  const getAge = () => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedType) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a valid file (PDF, JPG, PNG)');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${selectedType}_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Insert document record
      const { error } = await supabase
        .from('user_documents')
        .insert({
          user_id: user.id,
          type: selectedType as any,
          url: publicUrl,
          status: 'pending' as any,
          uploaded_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success(`${getDocumentLabel(selectedType as DocumentType)} uploaded successfully`);
      setSelectedType('');
      onDocumentsUpdate();
      
      // Reset file input
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    setDeleting(documentId);
    try {
      const { error } = await supabase
        .from('user_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      toast.success('Document deleted successfully');
      onDocumentsUpdate();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    } finally {
      setDeleting(null);
    }
  };

  const availableOptions = getAvailableDocumentOptions();
  const missingRequiredDocs = requiredDocuments.filter(type => {
    if (userType === 'individual') {
      const age = getAge();
      if (age !== null && age >= 18) {
        // For adults, they need either National ID OR Passport, not both
        if (type === 'national_id' || type === 'passport') {
          return !uploadedTypes.includes('national_id') && !uploadedTypes.includes('passport');
        }
      }
    }
    return !uploadedTypes.includes(type);
  });

  return (
    <div className="space-y-6">
      {/* Upload New Document Section */}
      {canEdit && availableOptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Document
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="documentType">Select Document Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Choose document type to upload" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg">
                  {availableOptions.map((type) => (
                    <SelectItem key={type} value={type} className="hover:bg-accent">
                      {getDocumentLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedType === 'national_id' ? (
              <NationalIdCapture
                onComplete={() => {
                  setSelectedType('');
                  onDocumentsUpdate();
                }}
                currentDocument={documents.find(doc => doc.type === selectedType)}
              />
            ) : selectedType && (
              <>
                <div>
                  <Label htmlFor="documentFile">Choose File</Label>
                  <Input
                    id="documentFile"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    disabled={uploading || !selectedType}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Accepted formats: PDF, JPG, PNG (max 10MB)
                  </p>
                </div>
                
                {uploading && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-md">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-blue-700">Uploading {selectedType ? getDocumentLabel(selectedType as DocumentType) : 'document'}...</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Missing Documents Alert */}
      {missingRequiredDocs.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-orange-800 mb-2">Required Documents Missing</h4>
                <p className="text-sm text-orange-700 mb-3">
                  Please upload the following documents to complete your verification:
                </p>
                <ul className="space-y-1">
                  {missingRequiredDocs.map((type) => (
                    <li key={type} className="text-sm text-orange-700 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-orange-600 rounded-full"></div>
                      {getDocumentLabel(type)}
                      {userType === 'individual' && getAge() !== null && getAge()! >= 18 && 
                       (type === 'national_id' || type === 'passport') && (
                        <span className="text-xs text-orange-600">(either National ID or Passport required)</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Documents */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Uploaded Documents</h3>
        
        {documents.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <File className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground font-medium">No documents uploaded yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload your required documents to start the verification process
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {documents.map((document) => (
              <Card key={document.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-md">
                        <File className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="font-medium">{getDocumentLabel(document.type as DocumentType)}</h4>
                        <p className="text-sm text-muted-foreground">
                          Uploaded: {new Date(document.uploaded_at).toLocaleDateString()}
                        </p>
                        {document.feedback && document.status === 'rejected' && (
                          <p className="text-sm text-red-600 mt-1 bg-red-50 px-2 py-1 rounded">
                            <strong>Feedback:</strong> {document.feedback}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(document.status)}>
                        {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
                      </Badge>
                      
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(document.url, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {canEdit && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline"
                                disabled={deleting === document.id}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                {deleting === document.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Document</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{getDocumentLabel(document.type as DocumentType)}"? 
                                  This action cannot be undone and you'll need to upload it again.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteDocument(document.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete Document
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* All Documents Uploaded Message */}
      {missingRequiredDocs.length === 0 && documents.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Upload className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-medium text-green-800 mb-1">All Required Documents Uploaded</h4>
              <p className="text-sm text-green-700">
                Your documents are under review. You'll be notified once the verification is complete.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ImprovedDocumentUploadSection;