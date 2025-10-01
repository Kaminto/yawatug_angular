import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Key, Shield, Webhook } from 'lucide-react';

export const RelWorxAuthGuide = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            RelWorx Authentication Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Setup Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium">API Key Auth</div>
                <div className="text-sm text-muted-foreground">Configured</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium">Account Number</div>
                <div className="text-sm text-muted-foreground">Configured</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium">Webhook Signature</div>
                <div className="text-sm text-muted-foreground">Configured</div>
              </div>
            </div>
          </div>

          {/* Authentication Methods */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Authentication Methods in Use</h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <Key className="h-5 w-5 text-blue-600 mt-1" />
                <div className="flex-1">
                  <div className="font-medium">API Key Authentication</div>
                  <div className="text-sm text-muted-foreground mb-2">
                    Bearer token sent in Authorization header for all API calls
                  </div>
                  <Badge variant="outline">Header: Authorization: Bearer [API_KEY]</Badge>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <Shield className="h-5 w-5 text-green-600 mt-1" />
                <div className="flex-1">
                  <div className="font-medium">Account Number Verification</div>
                  <div className="text-sm text-muted-foreground mb-2">
                    Account number included in all payment requests for authorization
                  </div>
                  <Badge variant="outline">Field: account_no</Badge>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <Webhook className="h-5 w-5 text-purple-600 mt-1" />
                <div className="flex-1">
                  <div className="font-medium">Webhook HMAC-SHA256 Signature</div>
                  <div className="text-sm text-muted-foreground mb-2">
                    All webhook callbacks verified using shared secret
                  </div>
                  <Badge variant="outline">Header: x-relworx-signature</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Current Issue */}
          <div className="border-l-4 border-amber-500 bg-amber-50 p-4 rounded-r-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div className="font-medium text-amber-800">Current Issue</div>
            </div>
            <div className="text-sm text-amber-700">
              RelWorx is still enforcing IP whitelisting despite proper authentication being configured.
              Contact RelWorx support to disable IP restrictions and rely on the configured authentication methods.
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="font-medium text-blue-800 mb-2">Next Steps</div>
            <div className="text-sm text-blue-700 space-y-1">
              <p>1. Contact RelWorx support to disable IP whitelisting for your account</p>
              <p>2. Confirm they will rely on API key authentication and webhook signatures</p>
              <p>3. Request that they enable the following authentication methods only:</p>
              <ul className="list-disc list-inside ml-4 mt-2">
                <li>Bearer token authentication (API key)</li>
                <li>Account number verification</li>
                <li>HMAC-SHA256 webhook signature verification</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};