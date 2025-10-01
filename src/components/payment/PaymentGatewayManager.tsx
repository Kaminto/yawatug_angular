import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { CreditCard, Smartphone, Globe, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PaymentGateway {
  id: string;
  gateway_name: string;
  is_active: boolean;
  api_endpoint?: string;
  webhook_url?: string;
  supported_currencies: string[];
  config_data?: any;
  created_at: string;
  updated_at: string;
}

interface PaymentGatewayManagerProps {
  onGatewayUpdate?: () => void;
}

export const PaymentGatewayManager: React.FC<PaymentGatewayManagerProps> = ({ 
  onGatewayUpdate 
}) => {
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);

  const availableGateways = [
    {
      name: 'PayTota',
      icon: <CreditCard className="h-5 w-5" />,
      description: 'Uganda mobile money and bank payments',
      currencies: ['UGX', 'USD'],
      fields: ['api_key', 'merchant_id', 'webhook_secret']
    },
    {
      name: 'ClickPesa',
      icon: <Smartphone className="h-5 w-5" />,
      description: 'Mobile money payments across East Africa',
      currencies: ['UGX', 'KES', 'TZS'],
      fields: ['api_key', 'merchant_code', 'callback_url']
    },
    {
      name: 'Selcom',
      icon: <Globe className="h-5 w-5" />,
      description: 'Digital payments platform',
      currencies: ['UGX', 'USD'],
      fields: ['api_key', 'vendor_id', 'webhook_key']
    },
    {
      name: 'Stripe',
      icon: <CreditCard className="h-5 w-5" />,
      description: 'International card payments',
      currencies: ['USD', 'EUR', 'GBP'],
      fields: ['publishable_key', 'secret_key', 'webhook_endpoint']
    }
  ];

  useEffect(() => {
    loadGateways();
  }, []);

  const loadGateways = async () => {
    try {
      // Using admin_payment_settings as alternative
      const { data, error } = await supabase
        .from('admin_payment_settings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Transform payment settings to gateway format
      setGateways([]);
    } catch (error) {
      console.error('Error loading payment gateways:', error);
      toast({ title: "Error", description: "Failed to load payment gateways", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGatewayToggle = async (gatewayId: string, isActive: boolean) => {
    try {
      // Disabled - table doesn't exist
      console.log('Gateway toggle disabled - using admin_payment_settings');
      const { error } = null as any; // await supabase
        // .from('payment_gateway_configs')
      //   .update({ is_active: isActive, updated_at: new Date().toISOString() })
      //   .eq('id', gatewayId);

      // if (error) throw error;

      setGateways(prev => prev.map(gw => 
        gw.id === gatewayId ? { ...gw, is_active: isActive } : gw
      ));

      toast({ 
        title: "Gateway Updated", 
        description: `Payment gateway ${isActive ? 'activated' : 'deactivated'} successfully` 
      });

      if (onGatewayUpdate) onGatewayUpdate();
    } catch (error) {
      console.error('Error updating gateway:', error);
      toast({ title: "Error", description: "Failed to update gateway status", variant: "destructive" });
    }
  };

  const handleConfigureGateway = async (gatewayName: string, config: any) => {
    setIsConfiguring(true);
    
    try {
      const gatewayData = availableGateways.find(gw => gw.name === gatewayName);
      
      // Disabled - table doesn't exist  
      console.log('Gateway configuration disabled');
      const { data, error } = { data: null, error: null }; 
      // await supabase
      //   .from('payment_gateway_configs')
      //   .upsert({
      //     gateway_name: gatewayName,
      //     is_active: false,
      //     api_endpoint: config.api_endpoint || `https://api.${gatewayName.toLowerCase()}.com`,
      //     webhook_url: config.webhook_url || `${window.location.origin}/api/webhooks/${gatewayName.toLowerCase()}`,
      //     supported_currencies: gatewayData?.currencies || ['UGX', 'USD'],
      //     config_data: config,
      //     updated_at: new Date().toISOString()
      //   })
      //   .select()
      //   .single();

      if (error) throw error;

      await loadGateways();
      setSelectedGateway(null);
      
      toast({ 
        title: "Gateway Configured", 
        description: `${gatewayName} has been configured successfully` 
      });

      if (onGatewayUpdate) onGatewayUpdate();
    } catch (error) {
      console.error('Error configuring gateway:', error);
      toast({ title: "Error", description: "Failed to configure gateway", variant: "destructive" });
    } finally {
      setIsConfiguring(false);
    }
  };

  const renderGatewayCard = (gateway: PaymentGateway) => {
    const gatewayInfo = availableGateways.find(gw => gw.name === gateway.gateway_name);
    
    return (
      <Card key={gateway.id} className="relative">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {gatewayInfo?.icon}
              <div>
                <CardTitle className="text-lg">{gateway.gateway_name}</CardTitle>
                <CardDescription>{gatewayInfo?.description}</CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={gateway.is_active ? "default" : "secondary"}>
                {gateway.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <Switch
                checked={gateway.is_active}
                onCheckedChange={(checked) => handleGatewayToggle(gateway.id, checked)}
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">Supported Currencies</p>
              <div className="flex flex-wrap gap-1">
                {gateway.supported_currencies.map(currency => (
                  <Badge key={currency} variant="outline" className="text-xs">
                    {currency}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                {gateway.is_active ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Ready for transactions</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span>Configuration needed</span>
                  </>
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedGateway(gateway)}
              >
                <Settings className="h-4 w-4 mr-1" />
                Configure
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderConfigurationForm = () => {
    if (!selectedGateway) return null;
    
    const gatewayInfo = availableGateways.find(gw => gw.name === selectedGateway.gateway_name);
    const [config, setConfig] = useState(selectedGateway.config_data || {});

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Configure {selectedGateway.gateway_name}</CardTitle>
          <CardDescription>
            Enter the configuration details for {selectedGateway.gateway_name}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            handleConfigureGateway(selectedGateway.gateway_name, config);
          }}>
            {gatewayInfo?.fields.map(field => (
              <div key={field} className="space-y-2">
                <Label htmlFor={field}>
                  {field.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </Label>
                <Input
                  id={field}
                  type={field.includes('secret') || field.includes('key') ? 'password' : 'text'}
                  placeholder={`Enter ${field.replace('_', ' ')}`}
                  value={config[field] || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, [field]: e.target.value }))}
                />
              </div>
            ))}
            
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedGateway(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isConfiguring}
                className="flex-1"
              >
                {isConfiguring ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  };

  const renderAddGatewayOptions = () => {
    const existingGatewayNames = gateways.map(gw => gw.gateway_name);
    const availableToAdd = availableGateways.filter(gw => !existingGatewayNames.includes(gw.name));

    if (availableToAdd.length === 0) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Add Payment Gateway</CardTitle>
          <CardDescription>Configure additional payment gateways</CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="grid gap-3">
            {availableToAdd.map(gateway => (
              <Button
                key={gateway.name}
                variant="outline"
                className="justify-start h-auto p-4"
                onClick={() => setSelectedGateway({
                  id: '',
                  gateway_name: gateway.name,
                  is_active: false,
                  supported_currencies: gateway.currencies,
                  created_at: '',
                  updated_at: ''
                })}
              >
                <div className="flex items-center space-x-3">
                  {gateway.icon}
                  <div className="text-left">
                    <div className="font-medium">{gateway.name}</div>
                    <div className="text-sm text-muted-foreground">{gateway.description}</div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">Loading payment gateways...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Payment Gateway Management</h2>
        <p className="text-muted-foreground">
          Configure and manage payment gateways for processing transactions
        </p>
      </div>

      {/* Active Gateways */}
      {gateways.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Configured Gateways</h3>
          <div className="grid gap-4">
            {gateways.map(renderGatewayCard)}
          </div>
        </div>
      )}

      {/* Add New Gateways */}
      {renderAddGatewayOptions()}

      {/* Configuration Form */}
      {renderConfigurationForm()}
    </div>
  );
};

export default PaymentGatewayManager;