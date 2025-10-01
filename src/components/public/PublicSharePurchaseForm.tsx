
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { Calculator, ShoppingCart } from 'lucide-react';

const PublicSharePurchaseForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    shareQuantity: '',
    investmentAmount: '',
    currency: 'UGX'
  });
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const navigate = useNavigate();

  const sharePrice = 20000; // UGX

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate based on quantity or amount
      if (field === 'shareQuantity' && value) {
        updated.investmentAmount = (parseInt(value) * sharePrice).toString();
      } else if (field === 'investmentAmount' && value) {
        updated.shareQuantity = Math.floor(parseInt(value) / sharePrice).toString();
      }
      
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Store the purchase intent in localStorage
    localStorage.setItem('pendingPurchase', JSON.stringify(formData));
    
    // Show login/register prompt
    setShowLoginPrompt(true);
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleRegister = () => {
    navigate('/register');
  };

  return (
    <>
      <Card className="max-w-md mx-auto bg-white/90 dark:bg-black/90 backdrop-blur-sm border border-yawatu-gold/30">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-yawatu-gold">
            <ShoppingCart className="h-5 w-5" />
            Buy Shares
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Start your investment journey with Yawatu
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+256 700 000000"
                required
              />
            </div>

            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UGX">UGX (Ugandan Shilling)</SelectItem>
                  <SelectItem value="USD">USD (US Dollar)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="shareQuantity">Number of Shares</Label>
                <Input
                  id="shareQuantity"
                  type="number"
                  min="1"
                  value={formData.shareQuantity}
                  onChange={(e) => handleInputChange('shareQuantity', e.target.value)}
                  placeholder="1"
                />
              </div>
              <div>
                <Label htmlFor="investmentAmount">Investment Amount</Label>
                <Input
                  id="investmentAmount"
                  type="number"
                  min={sharePrice}
                  step={sharePrice}
                  value={formData.investmentAmount}
                  onChange={(e) => handleInputChange('investmentAmount', e.target.value)}
                  placeholder="20000"
                />
              </div>
            </div>

            <div className="bg-yawatu-gold/10 border border-yawatu-gold/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-yawatu-gold" />
                <span className="text-sm font-medium">Calculation</span>
              </div>
              <div className="text-sm space-y-1">
                <p>Share Price: UGX {sharePrice.toLocaleString()}</p>
                <p>Shares: {formData.shareQuantity || 0}</p>
                <p className="font-semibold">Total: UGX {(parseInt(formData.investmentAmount || '0')).toLocaleString()}</p>
              </div>
            </div>

            <Button type="submit" className="w-full bg-yawatu-gold text-black hover:bg-yawatu-gold-dark">
              Continue to Purchase
            </Button>
          </form>

          <p className="text-xs text-center text-gray-500 mt-4">
            Minimum investment: UGX 20,000 (1 share)
          </p>
        </CardContent>
      </Card>

      <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Your Purchase</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              To complete your share purchase, you need to have an account with us.
            </p>
            
            <div className="bg-yawatu-gold/10 border border-yawatu-gold/30 rounded-lg p-4">
              <h4 className="font-medium mb-2">Your Purchase Summary:</h4>
              <div className="text-sm space-y-1">
                <p>Shares: {formData.shareQuantity}</p>
                <p>Amount: UGX {parseInt(formData.investmentAmount || '0').toLocaleString()}</p>
                <p>Email: {formData.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={handleLogin} variant="outline" className="border-yawatu-gold text-yawatu-gold">
                Login
              </Button>
              <Button onClick={handleRegister} className="bg-yawatu-gold text-black hover:bg-yawatu-gold-dark">
                Register
              </Button>
            </div>

            <p className="text-xs text-center text-gray-500">
              Your purchase details will be saved and you can complete the transaction after logging in.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PublicSharePurchaseForm;
