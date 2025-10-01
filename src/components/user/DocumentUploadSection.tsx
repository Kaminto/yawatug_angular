
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import DocumentUploadTab from './DocumentUploadTab';
import { supabase } from '@/integrations/supabase/client';

interface Document {
  id: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  url?: string;
  feedback?: string;
  uploaded_at: string;
  document_number?: string;
}

interface DocumentUploadSectionProps {
  userType?: string;
  dateOfBirth?: string;
}

const DocumentUploadSection: React.FC<DocumentUploadSectionProps> = ({ userType, dateOfBirth }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    const availableTypes = getDocumentTypesByUserType(userType, dateOfBirth);
    if (availableTypes.length > 0 && !selectedDocumentType) {
      // Find first document type not yet uploaded
      const notUploadedType = availableTypes.find(type => !documents.some(doc => doc.type === type));
      setSelectedDocumentType(notUploadedType || availableTypes[0]);
    }
  }, [userType, dateOfBirth, documents]);

  const getDocumentTypesByUserType = (userType?: string, dateOfBirth?: string): string[] => {
    const birthDate = dateOfBirth ? new Date(dateOfBirth) : null;
    const age = birthDate ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;

    switch (userType) {
      case 'individual':
        if (age !== null && age < 18) {
          // Minor: birth certificate + guardian ID + proof of address
          return ['birth_certificate', 'guardian_id', 'proof_of_address'];
        }
        // Adult: National ID or Passport + proof of address
        return ['national_id', 'passport', 'proof_of_address'];
      case 'business':
        return ['business_registration', 'trading_license', 'proof_of_address'];
      case 'organisation':
        return ['registration_certificate', 'operational_permit', 'proof_of_address'];
      default:
        return ['national_id', 'proof_of_address'];
    }
  };

  const loadDocuments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDocumentDisplayName = (type: string) => {
    const names = {
      national_id: 'National ID',
      passport: 'Passport',
      birth_certificate: 'Birth Certificate',
      guardian_id: 'Guardian National ID/Passport',
      proof_of_address: 'Proof of Address',
      business_registration: 'Business Registration Certificate',
      trading_license: 'Trading License',
      operational_permit: 'Operational Permit',
      registration_certificate: 'Registration Certificate'
    };
    return names[type as keyof typeof names] || type.replace('_', ' ').toUpperCase();
  };

  if (loading) {
    return <div>Loading documents...</div>;
  }

  const availableDocumentTypes = getDocumentTypesByUserType(userType, dateOfBirth);
  // Filter out already uploaded and approved documents
  const uploadableTypes = availableDocumentTypes.filter(type => {
    const existingDoc = documents.find(doc => doc.type === type);
    return !existingDoc || existingDoc.status === 'rejected';
  });

  const currentDocument = documents.find(doc => doc.type === selectedDocumentType);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Upload</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="documentType">Document Type</Label>
          <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
            <SelectTrigger>
              <SelectValue placeholder="Select document type" />
            </SelectTrigger>
            <SelectContent>
              {uploadableTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {getDocumentDisplayName(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {uploadableTypes.length === 0 && (
            <p className="text-sm text-green-600 mt-2">
              All required documents have been uploaded and approved.
            </p>
          )}
        </div>

        {selectedDocumentType && (
          <DocumentUploadTab
            documentType={selectedDocumentType}
            currentDocument={currentDocument}
            onUploadComplete={loadDocuments}
            canDelete={true}
          />
        )}

        {/* Show uploaded documents summary */}
        {documents.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium mb-3">Uploaded Documents</h4>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">{getDocumentDisplayName(doc.type)}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    doc.status === 'approved' ? 'bg-green-100 text-green-700' :
                    doc.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentUploadSection;
