
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Upload, File, Trash2, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EnhancedDocumentUploadSectionProps {
  userType: string;
  dateOfBirth?: string;
  documents: any[];
  canEdit: boolean;
  onDocumentsUpdate: () => void;
}

const EnhancedDocumentUploadSection: React.FC<EnhancedDocumentUploadSectionProps> = ({
  userType,
  dateOfBirth,
  documents,
  canEdit,
  onDocumentsUpdate
}) => {
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const getRequiredDocuments = () => {
    console.log('Getting required documents for userType:', userType, 'dateOfBirth:', dateOfBirth);
    
    if (userType === 'organisation') {
      return ['business_registration', 'trading_license', 'proof_of_address'];
    }
    
    const base = ['national_id', 'proof_of_address'];
    
    if (dateOfBirth && new Date().getFullYear() - new Date(dateOfBirth).getFullYear() < 18) {
      base.push('guardian_consent');
    }
    
    return base;
  };

  const getDocumentLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      national_id: 'National ID',
      proof_of_address: 'Proof of Address',
      business_registration: 'Business Registration',
      trading_license: 'Trading License',
      guardian_consent: 'Guardian Consent'
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedType) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload file to Supabase storage
      const fileName = `${user.id}/${selectedType}_${Date.now()}.${file.name.split('.').pop()}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      const { error } = await supabase
        .from('user_documents')
        .insert({
          user_id: user.id,
          type: selectedType as any,
          url: publicUrl,
          status: 'pending' as any
        });

      if (error) throw error;

      toast.success('Document uploaded successfully');
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

  const requiredDocs = getRequiredDocuments();
  const uploadedTypes = documents.map(doc => doc.type);
  const missingDocs = requiredDocs.filter(type => !uploadedTypes.includes(type));
  const availableDocTypes = requiredDocs.filter(type => !uploadedTypes.includes(type));

  console.log('Required docs:', requiredDocs);
  console.log('Uploaded types:', uploadedTypes);
  console.log('Available doc types:', availableDocTypes);

  return (
    <div className="space-y-4">
      {/* Upload New Document */}
      {canEdit && availableDocTypes.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <Label>Document Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDocTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {getDocumentLabel(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Upload File</Label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  disabled={uploading || !selectedType}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Accepted formats: PDF, JPG, PNG (max 10MB)
                </p>
              </div>
              
              {uploading && (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm">Uploading document...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Missing Documents Alert */}
      {missingDocs.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-2">
              <Upload className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-800">Missing Required Documents</h4>
                <p className="text-sm text-orange-700 mt-1">
                  Please upload the following documents to complete your profile:
                </p>
                <ul className="list-disc list-inside text-sm text-orange-700 mt-2">
                  {missingDocs.map((type) => (
                    <li key={type}>{getDocumentLabel(type)}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Documents */}
      <div className="space-y-3">
        {documents.map((document) => (
          <Card key={document.id} className="border">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <File className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium">{getDocumentLabel(document.type)}</h4>
                    <p className="text-sm text-muted-foreground">
                      Uploaded: {new Date(document.uploaded_at).toLocaleDateString()}
                    </p>
                    {document.feedback && (
                      <p className="text-sm text-red-600 mt-1">{document.feedback}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(document.status)}>
                    {document.status}
                  </Badge>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(document.url, '_blank')}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  {canEdit && document.status !== 'approved' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline"
                          disabled={deleting === document.id}
                        >
                          {deleting === document.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-500" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Document</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this document? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteDocument(document.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {documents.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="text-center py-6">
                <File className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No documents uploaded yet</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EnhancedDocumentUploadSection;
