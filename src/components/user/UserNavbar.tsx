
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, User, Settings, Bell, Wallet, PieChart, Menu, X, Gift, Users, MessageSquare, Vote, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

const UserNavbar = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(profileData);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Signed out successfully');
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error signing out');
    }
  };

  const getStatusBadge = () => {
    if (!profile?.status) return null;
    
    const statusConfig = {
      active: { color: 'bg-green-500', text: 'Verified' },
      pending_verification: { color: 'bg-yellow-500', text: 'Pending' },
      unverified: { color: 'bg-gray-500', text: 'Unverified' },
      blocked: { color: 'bg-red-500', text: 'Blocked' }
    };
    
    const config = statusConfig[profile.status as keyof typeof statusConfig];
    return config ? (
      <Badge className={`${config.color} text-white text-xs`}>
        {config.text}
      </Badge>
    ) : null;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src="/lovable-uploads/1fd2bc66-b830-488d-b442-e2cf372e915b.png" 
              alt="Yawatu Minerals & Mining Logo" 
              className="h-8 w-auto"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <span className="text-yawatu-gold font-bold text-xl hidden">YAWATU</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/dashboard" className="text-gray-700 hover:text-yawatu-gold transition-colors">
              Dashboard
            </Link>
            <Link to="/shares" className="text-gray-700 hover:text-yawatu-gold transition-colors">
              Shares
            </Link>
            <Link to="/wallet" className="text-gray-700 hover:text-yawatu-gold transition-colors">
              Wallet
            </Link>
            <Link to="/projects" className="text-gray-700 hover:text-yawatu-gold transition-colors">
              Projects
            </Link>
            <Link to="/referrals" className="text-gray-700 hover:text-yawatu-gold transition-colors">
              Referrals
            </Link>
            <Link to="/voting" className="text-gray-700 hover:text-yawatu-gold transition-colors">
              Voting
            </Link>
            <Link to="/support" className="text-gray-700 hover:text-yawatu-gold transition-colors">
              Support
            </Link>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.profile_picture_url} alt={profile?.full_name} />
                    <AvatarFallback>
                      {profile?.full_name?.substring(0, 2)?.toUpperCase() || user?.email?.substring(0, 2)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none">{profile?.full_name || 'User'}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  <div className="mt-2">{getStatusBadge()}</div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/wallet" className="cursor-pointer">
                    <Wallet className="mr-2 h-4 w-4" />
                    Wallet
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/shares" className="cursor-pointer">
                    <PieChart className="mr-2 h-4 w-4" />
                    Shares
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/referrals" className="cursor-pointer">
                    <Gift className="mr-2 h-4 w-4" />
                    Referrals
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-2">
              <Link 
                to="/dashboard" 
                className="block px-3 py-2 text-gray-700 hover:text-yawatu-gold transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link 
                to="/shares" 
                className="block px-3 py-2 text-gray-700 hover:text-yawatu-gold transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Shares
              </Link>
              <Link 
                to="/wallet" 
                className="block px-3 py-2 text-gray-700 hover:text-yawatu-gold transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Wallet
              </Link>
              <Link 
                to="/projects" 
                className="block px-3 py-2 text-gray-700 hover:text-yawatu-gold transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Projects
              </Link>
              <Link 
                to="/referrals" 
                className="block px-3 py-2 text-gray-700 hover:text-yawatu-gold transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Referrals
              </Link>
              <Link 
                to="/voting" 
                className="block px-3 py-2 text-gray-700 hover:text-yawatu-gold transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Voting
              </Link>
              <Link 
                to="/support" 
                className="block px-3 py-2 text-gray-700 hover:text-yawatu-gold transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Support
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default UserNavbar;
