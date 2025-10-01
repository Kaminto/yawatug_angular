
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const InitializeAdmin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminName, setAdminName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create admin user with Supabase function
      const { error } = await supabase.functions.invoke('initialize-admin', {
        body: { email, password, adminName }
      });

      if (error) throw error;

      toast.success("Admin account created successfully");
      navigate('/admin/login');
    } catch (error: any) {
      console.error("Error setting up admin:", error);
      toast.error(error.message || "Failed to set up admin account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-white to-gray-100 dark:from-yawatu-black-light dark:to-black text-black dark:text-white">
      <div className="m-auto w-full max-w-md p-8 bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-yawatu-gold/30 shadow-xl">
        <div className="text-center mb-8">
          <img src="/lovable-uploads/1fd2bc66-b830-488d-b442-e2cf372e915b.png" alt="Yawatu Minerals & Mining Logo" className="h-14 mx-auto mb-2" />
          <h1 className="text-2xl font-bold gold-text">Initialize Admin</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Set up the first admin account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="adminName">Admin Name</Label>
            <Input
              id="adminName"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              required
              className="bg-white/50 dark:bg-black/50"
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white/50 dark:bg-black/50"
              placeholder="admin@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-white/50 dark:bg-black/50"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-yawatu-gold text-black hover:bg-yawatu-gold-dark"
            disabled={isLoading}
          >
            {isLoading ? "Creating Account..." : "Create Admin Account"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default InitializeAdmin;
