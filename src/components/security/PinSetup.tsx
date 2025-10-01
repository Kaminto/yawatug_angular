import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PinSetup: React.FC = () => {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lastFailedAttempt, setLastFailedAttempt] = useState<Date | null>(null);

  useEffect(() => {
    checkExistingPin();
  }, []);

  const checkExistingPin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: pinData } = await supabase
        .from('user_pins')
        .select('id')
        .eq('user_id', user.id)
        .single();

      setHasPin(!!pinData);
    } catch (error) {
      console.error('Error checking PIN:', error);
    }
  };

  const validatePin = (pin: string): boolean => {
    if (pin.length !== 4) {
      toast.error('PIN must be exactly 4 digits');
      return false;
    }
    if (!/^\d{4}$/.test(pin)) {
      toast.error('PIN must contain only numbers');
      return false;
    }
    return true;
  };

  const handleSetPin = async () => {
    if (!validatePin(newPin)) return;
    
    if (newPin !== confirmPin) {
      toast.error('PINs do not match');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Hash the PIN using the database function
      const { data: hashData, error: hashError } = await supabase
        .rpc('hash_pin', { pin: newPin });

      if (hashError) throw hashError;

      const { error } = await supabase
        .from('user_pins')
        .upsert({
          user_id: user.id,
          pin_hash: hashData[0].hash,
          salt: hashData[0].salt,
          failed_attempts: 0,
          locked_until: null
        });

      if (error) throw error;

      setHasPin(true);
      setNewPin('');
      setConfirmPin('');
      setCurrentPin('');
      setIsChanging(false);
      toast.success('Transaction PIN set successfully');
    } catch (error: any) {
      console.error('Error setting PIN:', error);
      toast.error('Failed to set PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPin = async () => {
    if (!validatePin(currentPin)) return;

    // SECURITY FIX: Client-side rate limiting
    const now = new Date();
    if (lastFailedAttempt && failedAttempts >= 5) {
      const timeDiff = now.getTime() - lastFailedAttempt.getTime();
      const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds
      
      if (timeDiff < fifteenMinutes) {
        const remainingTime = Math.ceil((fifteenMinutes - timeDiff) / 60000);
        toast.error(`Too many failed attempts. Please try again in ${remainingTime} minutes.`);
        return;
      } else {
        // Reset after timeout
        setFailedAttempts(0);
        setLastFailedAttempt(null);
      }
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: isValid, error } = await supabase
        .rpc('verify_pin', { 
          user_id: user.id, 
          pin: currentPin 
        });

      if (error) throw error;

      if (isValid) {
        // Reset failed attempts on success
        setFailedAttempts(0);
        setLastFailedAttempt(null);
        setIsChanging(true);
        setCurrentPin('');
        toast.success('PIN verified. Enter your new PIN.');
      } else {
        // Increment failed attempts
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);
        setLastFailedAttempt(now);
        setCurrentPin(''); // Clear PIN on failure for security
        
        if (newFailedAttempts >= 5) {
          toast.error('Too many failed attempts. Account temporarily locked for 15 minutes.');
        } else {
          toast.error(`Invalid PIN. ${5 - newFailedAttempts} attempts remaining.`);
        }
      }
    } catch (error: any) {
      console.error('Error verifying PIN:', error);
      toast.error('Failed to verify PIN. Please try again.');
      setCurrentPin(''); // Clear PIN on error
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePin = async () => {
    if (!validatePin(currentPin)) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: isValid, error: verifyError } = await supabase
        .rpc('verify_pin', { 
          user_id: user.id, 
          pin: currentPin 
        });

      if (verifyError) throw verifyError;

      if (!isValid) {
        toast.error('Invalid PIN');
        return;
      }

      const { error } = await supabase
        .from('user_pins')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setHasPin(false);
      setCurrentPin('');
      toast.success('Transaction PIN removed successfully');
    } catch (error: any) {
      console.error('Error removing PIN:', error);
      toast.error('Failed to remove PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Transaction PIN
          {hasPin && <Badge variant="default">Active</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Secure Your Transactions</h4>
              <p className="text-sm text-blue-700 mt-1">
                A 4-digit PIN adds an extra layer of security to all your wallet transactions.
              </p>
            </div>
          </div>
        </div>

        {!hasPin ? (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="new-pin">Create Transaction PIN</Label>
              <Input
                id="new-pin"
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Enter 4-digit PIN"
                maxLength={4}
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="confirm-pin">Confirm PIN</Label>
              <Input
                id="confirm-pin"
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Confirm 4-digit PIN"
                maxLength={4}
              />
            </div>
            
            <Button 
              onClick={handleSetPin}
              disabled={!newPin || !confirmPin || loading}
              className="w-full"
            >
              {loading ? 'Setting PIN...' : 'Set Transaction PIN'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {!isChanging ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="current-pin">Enter Current PIN</Label>
                  <Input
                    id="current-pin"
                    type="password"
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value)}
                    placeholder="Enter current PIN"
                    maxLength={4}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleVerifyPin}
                    disabled={!currentPin || loading}
                    className="flex-1"
                  >
                    {loading ? 'Verifying...' : 'Change PIN'}
                  </Button>
                  
                  <Button 
                    variant="destructive"
                    onClick={handleRemovePin}
                    disabled={!currentPin || loading}
                  >
                    {loading ? 'Removing...' : 'Remove PIN'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="new-pin-change">New Transaction PIN</Label>
                  <Input
                    id="new-pin-change"
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="Enter new 4-digit PIN"
                    maxLength={4}
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="confirm-pin-change">Confirm New PIN</Label>
                  <Input
                    id="confirm-pin-change"
                    type="password"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="Confirm new 4-digit PIN"
                    maxLength={4}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSetPin}
                    disabled={!newPin || !confirmPin || loading}
                    className="flex-1"
                  >
                    {loading ? 'Updating...' : 'Update PIN'}
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setIsChanging(false);
                      setNewPin('');
                      setConfirmPin('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900">Important</h4>
              <p className="text-sm text-amber-700 mt-1">
                Keep your PIN secure and don't share it with anyone. You'll need it for all wallet transactions.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PinSetup;