import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Fingerprint, Smartphone, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const BiometricSetup: React.FC = () => {
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);

  useEffect(() => {
    checkBiometricSupport();
    loadBiometricSettings();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      // Check if Web Authentication API is supported
      const isWebAuthnSupported = !!window.PublicKeyCredential;
      
      if (isWebAuthnSupported) {
        // Check for available authenticator types
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setIsSupported(available);
        
        if (available) {
          setAvailableTypes(['fingerprint', 'face', 'device']);
        }
      } else {
        // Fallback: Check for touch/device capabilities
        const hasTouchID = 'ontouchstart' in window;
        const hasDeviceAuth = navigator.userAgent.includes('Mobile');
        
        if (hasTouchID || hasDeviceAuth) {
          setIsSupported(true);
          setAvailableTypes(['device']);
        }
      }
    } catch (error) {
      console.error('Error checking biometric support:', error);
      setIsSupported(false);
    }
  };

  const loadBiometricSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: biometricData } = await supabase
        .from('biometric_settings')
        .select('enabled')
        .eq('user_id', user.id)
        .single();

      if (biometricData) {
        setBiometricEnabled(biometricData.enabled);
      }
    } catch (error) {
      console.error('Error loading biometric settings:', error);
    }
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    if (enabled && !isSupported) {
      toast.error('Biometric authentication is not supported on this device');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (enabled) {
        // Simulate biometric registration (in real app, would use WebAuthn)
        await simulateBiometricRegistration();
      }

      const { error } = await supabase
        .from('biometric_settings')
        .upsert({
          user_id: user.id,
          enabled: enabled,
          fingerprint_data: enabled ? { registered: true, timestamp: new Date().toISOString() } : null,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setBiometricEnabled(enabled);
      toast.success(enabled ? 'Biometric authentication enabled' : 'Biometric authentication disabled');
    } catch (error: any) {
      console.error('Error updating biometric settings:', error);
      toast.error('Failed to update biometric settings');
      // Reset the toggle if there was an error
      setBiometricEnabled(!enabled);
    } finally {
      setLoading(false);
    }
  };

  const simulateBiometricRegistration = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Simulate the biometric registration process
      setTimeout(() => {
        // In a real app, this would use navigator.credentials.create() with WebAuthn
        const success = Math.random() > 0.1; // 90% success rate for demo
        
        if (success) {
          resolve();
        } else {
          reject(new Error('Biometric registration failed'));
        }
      }, 2000);
    });
  };

  const testBiometricAuth = async () => {
    if (!biometricEnabled) {
      toast.error('Please enable biometric authentication first');
      return;
    }

    setLoading(true);
    try {
      // Simulate biometric authentication test
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          const success = Math.random() > 0.2; // 80% success rate for demo
          if (success) {
            resolve(true);
          } else {
            reject(new Error('Authentication failed'));
          }
        }, 1500);
      });

      toast.success('Biometric authentication test successful!');
    } catch (error: any) {
      console.error('Biometric test failed:', error);
      toast.error('Biometric authentication test failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5" />
          Biometric Authentication
          {biometricEnabled && <Badge variant="default">Active</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isSupported ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900">Not Supported</h4>
                <p className="text-sm text-amber-700 mt-1">
                  Biometric authentication is not supported on this device or browser. 
                  Please use a device with fingerprint, face recognition, or other biometric capabilities.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900">Biometrics Available</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Your device supports biometric authentication. Enable it for quick and secure access.
                  </p>
                  <div className="flex gap-2 mt-2">
                    {availableTypes.includes('fingerprint') && (
                      <Badge variant="outline" className="text-xs">
                        <Fingerprint className="h-3 w-3 mr-1" />
                        Fingerprint
                      </Badge>
                    )}
                    {availableTypes.includes('face') && (
                      <Badge variant="outline" className="text-xs">
                        <Smartphone className="h-3 w-3 mr-1" />
                        Face ID
                      </Badge>
                    )}
                    {availableTypes.includes('device') && (
                      <Badge variant="outline" className="text-xs">
                        Device Auth
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Enable Biometric Login</h3>
                <p className="text-sm text-muted-foreground">
                  Use your device's biometric authentication for secure login
                </p>
              </div>
              <Switch
                checked={biometricEnabled}
                onCheckedChange={handleBiometricToggle}
                disabled={loading}
              />
            </div>

            {biometricEnabled && (
              <div className="space-y-3">
                <Button
                  variant="outline"
                  onClick={testBiometricAuth}
                  disabled={loading}
                  className="w-full flex items-center gap-2"
                >
                  <Fingerprint className="h-4 w-4" />
                  {loading ? 'Testing...' : 'Test Biometric Authentication'}
                </Button>
                
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> This is a demonstration of biometric authentication. 
                    In a production app, this would integrate with your device's actual biometric sensors 
                    using WebAuthn API or native mobile biometric APIs.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Security Benefits</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Faster login without typing passwords</li>
            <li>• Enhanced security using your unique biometrics</li>
            <li>• Works offline on your device</li>
            <li>• Your biometric data never leaves your device</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default BiometricSetup;