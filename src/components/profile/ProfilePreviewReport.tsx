import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User, FileText, Phone, MapPin, Calendar, Mail, Building, Printer, Download, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface ProfilePreviewReportProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  documents: any[];
  contacts: any[];
  onPrint: () => void;
  onComplete: () => void;
}

const ProfilePreviewReport: React.FC<ProfilePreviewReportProps> = ({
  isOpen,
  onClose,
  profile,
  documents,
  contacts,
  onPrint,
  onComplete
}) => {
  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Verified</Badge>;
      case 'pending_verification':
        return <Badge variant="secondary">Pending Verification</Badge>;
      default:
        return <Badge variant="outline">Unverified</Badge>;
    }
  };

  const getAccountTypeLabel = (type: string) => {
    const labels = {
      'individual': 'Individual Account',
      'business': 'Business Account',
      'organisation': 'Organization Account'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const handlePrint = () => {
    onPrint();
    window.print();
  };

  const handleDownload = () => {
    // Create a downloadable version
    const content = document.getElementById('profile-report');
    if (content) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>YAWATU Profile Report - ${profile.full_name}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .header { text-align: center; margin-bottom: 30px; }
                .section { margin-bottom: 20px; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
                .status-active { background: #22c55e; color: white; }
                .status-pending { background: #6b7280; color: white; }
                .status-unverified { border: 1px solid #d1d5db; }
              </style>
            </head>
            <body>
              ${content.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Profile Preview Report
          </DialogTitle>
        </DialogHeader>

        <div id="profile-report" className="space-y-6 p-4">
          {/* Header */}
          <div className="text-center border-b pb-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden border-4 border-yawatu-gold">
              {profile.profile_picture_url ? (
                <img 
                  src={profile.profile_picture_url} 
                  alt={profile.full_name || 'Profile'} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-yawatu-blue to-yawatu-gold flex items-center justify-center text-white text-2xl font-bold">
                  {profile.full_name?.charAt(0) || 'Y'}
                </div>
              )}
            </div>
            <h1 className="text-2xl font-bold text-yawatu-blue">YAWATU MINERALS & MINING PLC</h1>
            <h2 className="text-xl font-semibold mt-2">Profile Summary Report</h2>
            <p className="text-muted-foreground mt-1">Generated on {format(new Date(), 'MMMM dd, yyyy')}</p>
          </div>

          {/* Profile Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Status
                </div>
                {getStatusBadge(profile.status)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yawatu-gold">{profile.profile_completion_percentage || 0}%</div>
                  <div className="text-sm text-muted-foreground">Profile Complete</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yawatu-blue">{documents.length}</div>
                  <div className="text-sm text-muted-foreground">Documents Uploaded</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{contacts.length}</div>
                  <div className="text-sm text-muted-foreground">Emergency Contacts</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                  <p className="font-medium">{profile.full_name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                  <p className="font-medium">{profile.email || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                  <p className="font-medium">{profile.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {profile.account_type === 'business' || profile.account_type === 'organisation' 
                      ? 'Date of Registration' 
                      : 'Date of Birth'}
                  </label>
                  <p className="font-medium">
                    {profile.date_of_birth ? format(new Date(profile.date_of_birth), 'dd/MM/yyyy') : 'Not provided'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Account Type</label>
                  <p className="font-medium">{getAccountTypeLabel(profile.account_type || 'individual')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Gender</label>
                  <p className="font-medium">{profile.gender || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nationality</label>
                  <p className="font-medium">{profile.nationality || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Country of Residence</label>
                  <p className="font-medium">{profile.country_of_residence || 'Not provided'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Address</label>
                  <p className="font-medium">{profile.address || 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Uploaded Documents ({documents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{doc.document_type?.replace('_', ' ').toUpperCase()}</p>
                        <p className="text-sm text-muted-foreground">
                          Uploaded: {format(new Date(doc.uploaded_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <Badge variant={doc.status === 'approved' ? 'default' : doc.status === 'rejected' ? 'destructive' : 'secondary'}>
                        {doc.status || 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No documents uploaded</p>
              )}
            </CardContent>
          </Card>

          {/* Emergency Contacts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Emergency Contacts ({contacts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contacts.length > 0 ? (
                <div className="space-y-3">
                  {contacts.map((contact, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-muted-foreground">{contact.relationship}</p>
                        <p className="text-sm">{contact.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No emergency contacts added</p>
              )}
            </CardContent>
          </Card>

          {/* Verification Notice */}
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Clock className="h-6 w-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">Account Verification Process</h3>
                  <p className="text-blue-700 dark:text-blue-200 mt-1">
                    Your profile has been submitted for verification. Our admin team will review your information and documents within 3 business days. 
                    You will receive an email notification once the verification is complete.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-300">
                    <CheckCircle className="h-4 w-4" />
                    Expected completion: {format(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), 'MMMM dd, yyyy')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground border-t pt-4">
            <p>This report was generated automatically by YAWATU Minerals & Mining PLC system.</p>
            <p>For any questions, please contact our support team.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button onClick={handlePrint} variant="outline" className="flex-1">
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
          <Button onClick={handleDownload} variant="outline" className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button onClick={onComplete} className="flex-1">
            <CheckCircle className="h-4 w-4 mr-2" />
            Continue to Dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfilePreviewReport;