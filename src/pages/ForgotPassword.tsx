
import React, { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Use the public function to check user status
      const { data: userStatus, error: statusError } = await supabase.rpc(
        'check_user_status_public',
        { p_email: email }
      );

      if (statusError) {
        console.error('Error checking user status:', statusError);
        toast.error("An error occurred while checking your account.");
        return;
      }

      // Type assertion for the response since we know the structure
      const response = userStatus as {
        success: boolean;
        exists: boolean;
        needs_activation: boolean;
        error?: string;
        profile?: {
          id: string;
          email: string;
          full_name: string;
          phone: string;
        };
      };

      if (!response.success) {
        toast.error(response.error || "An error occurred while checking your account.");
        return;
      }

      if (!response.exists) {
        toast.error("No account found with this email address. Please check your email or sign up for a new account.");
        return;
      }

      // For users who need activation OR users with existing auth accounts,
      // send password reset email - this will work for both cases
      console.log('Sending password reset email to:', email);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      console.log('Password reset result:', error);

      if (error) {
        console.error('Password reset error:', error);
        toast.error(error.message);
      } else {
        if (response.needs_activation) {
          toast.success("Account activation link sent to your email! This will also allow you to set your password.");
        } else {
          toast.success("Password reset link sent to your email!");
        }
        setEmail("");
      }
    } catch (error) {
      console.error('Unexpected error in handleEmailReset:', error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Use the public function to check user status by phone
      const { data: userStatus, error: statusError } = await supabase.rpc(
        'check_user_status_public',
        { p_phone: phone }
      );

      if (statusError) {
        console.error('Error checking user status:', statusError);
        toast.error("An error occurred while checking your account.");
        return;
      }

      // Type assertion for the response since we know the structure
      const response = userStatus as {
        success: boolean;
        exists: boolean;
        needs_activation: boolean;
        error?: string;
        profile?: {
          id: string;
          email: string;
          full_name: string;
          phone: string;
        };
      };

      if (!response.success) {
        toast.error(response.error || "An error occurred while checking your account.");
        return;
      }

      if (!response.exists) {
        toast.error("No account found with this phone number. Please check your phone number or sign up for a new account.");
        return;
      }

      const userProfile = response.profile;
      if (!userProfile?.email) {
        toast.error("No email address associated with this phone number. Please contact support.");
        return;
      }

      // For users who need activation OR users with existing auth accounts,
      // send password reset email using their associated email
      console.log('Sending password reset email to profile email:', userProfile.email);
      const { error } = await supabase.auth.resetPasswordForEmail(userProfile.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      console.log('Phone-based password reset result:', error);

      if (error) {
        console.error('Password reset error:', error);
        toast.error(error.message);
      } else {
        if (response.needs_activation) {
          toast.success(`Account activation link sent to ${userProfile.email}! This will also allow you to set your password.`);
        } else {
          toast.success(`Password reset link sent to ${userProfile.email}!`);
        }
        setPhone("");
      }
    } catch (error) {
      console.error('Unexpected error in handlePhoneReset:', error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-gray-100 dark:from-yawatu-black-light dark:to-black text-black dark:text-white">
      <Navbar />
      <main className="flex-grow pt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-yawatu-gold/30 p-8 shadow-md">
            <div className="text-center mb-6">
              <img src="/lovable-uploads/1fd2bc66-b830-488d-b442-e2cf372e915b.png" alt="Yawatu Minerals & Mining Logo" className="h-14 mx-auto mb-2" />
              <h1 className="text-2xl font-bold gold-text">Reset Password</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Choose how to reset your password</p>
            </div>

            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="phone">Phone</TabsTrigger>
              </TabsList>
              
              <TabsContent value="email">
                <form className="space-y-6" onSubmit={handleEmailReset}>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="john@example.com" 
                      className="bg-white/50 dark:bg-black/50 border-gray-300 dark:border-yawatu-gold/30 focus:border-yawatu-gold"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required 
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-yawatu-gold text-black hover:bg-yawatu-gold-dark"
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending..." : "Reset Password"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="phone">
                <form className="space-y-6" onSubmit={handlePhoneReset}>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone" 
                      type="tel" 
                      placeholder="+256 700 000000" 
                      className="bg-white/50 dark:bg-black/50 border-gray-300 dark:border-yawatu-gold/30 focus:border-yawatu-gold"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required 
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-yawatu-gold text-black hover:bg-yawatu-gold-dark"
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending..." : "Reset Password"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
              Remember your password?{" "}
              <Link to="/login" className="text-yawatu-gold hover:underline">
                Login here
              </Link>
            </div>

            <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
              Don't have an account?{" "}
              <Link to="/register" className="text-yawatu-gold hover:underline">
                Sign up here
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ForgotPassword;
