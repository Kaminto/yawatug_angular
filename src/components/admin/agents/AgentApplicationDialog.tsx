import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, MapPin, Users, Briefcase, FileText } from 'lucide-react';

interface AgentApplication {
  id: string;
  location: string;
  expected_customers: number;
  reason: string;
  business_plan?: string;
  experience?: string;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
    phone?: string;
  };
}

interface AgentApplicationDialogProps {
  application: AgentApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (applicationId: string, action: 'approved') => void;
  onReject: (applicationId: string, action: 'rejected') => void;
}

export function AgentApplicationDialog({
  application,
  open,
  onOpenChange,
  onApprove,
  onReject,
}: AgentApplicationDialogProps) {
  if (!application) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Agent Application Details
          </DialogTitle>
          <DialogDescription>
            Review the agent application details before making a decision
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Applicant Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Applicant Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <p className="text-base">{application.profiles?.full_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-base">{application.profiles?.email}</p>
              </div>
              {application.profiles?.phone && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p className="text-base">{application.profiles.phone}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Application Date</label>
                <p className="text-base">{new Date(application.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Application Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Application Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Location
                </label>
                <p className="text-base">{application.location}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Expected Customers
                </label>
                <p className="text-base">{application.expected_customers}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Reason for Application
              </label>
              <p className="text-base whitespace-pre-wrap bg-muted p-3 rounded-lg">
                {application.reason}
              </p>
            </div>

            {application.business_plan && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Business Plan</label>
                <p className="text-base whitespace-pre-wrap bg-muted p-3 rounded-lg">
                  {application.business_plan}
                </p>
              </div>
            )}

            {application.experience && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Experience</label>
                <p className="text-base whitespace-pre-wrap bg-muted p-3 rounded-lg">
                  {application.experience}
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-muted-foreground">Current Status</label>
              <div className="mt-1">
                <Badge variant={
                  application.status === 'pending' ? 'secondary' : 
                  application.status === 'approved' ? 'default' : 'destructive'
                }>
                  {application.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Actions */}
          {application.status === 'pending' && (
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  onReject(application.id, 'rejected');
                  onOpenChange(false);
                }}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Reject
              </Button>
              <Button
                onClick={() => {
                  onApprove(application.id, 'approved');
                  onOpenChange(false);
                }}
                className="flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                Approve
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}