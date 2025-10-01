import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard,
  Wallet, 
  TrendingUp, 
  FolderOpen, 
  Gift, 
  Vote, 
  MessageSquare, 
  User,
  Settings, 
  LogOut,
  Bell,
  UserCog,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const mainMenuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/wallet', label: 'Wallet', icon: Wallet },
  { path: '/user-shares', label: 'My Shares', icon: TrendingUp },
];

const servicesItems = [
  { path: '/referrals', label: 'Referrals', icon: Gift },
  { path: '/agent', label: 'Agent Program', icon: User },
  { path: '/voting', label: 'Voting', icon: Vote },
  { path: '/support', label: 'Support', icon: MessageSquare },
];

const footerItems = [
  { path: '/profile', label: 'Profile', icon: UserCog },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function UserSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
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
    if (!profile) return null;
    
    // Enhanced verification badge to match demo
    if (profile.status === 'active' && profile.is_verified) {
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white">
          <CheckCircle className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    }
    
    if (profile.status === 'pending_verification') {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          Pending Verification
        </Badge>
      );
    }
    
    if (profile.status === 'blocked') {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Blocked
        </Badge>
      );
    }
    
    // Default status for demo user
    if (profile.email === 'demo@yawatu.com') {
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white">
          <CheckCircle className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline">
        <Clock className="h-3 w-3 mr-1" />
        Unverified
      </Badge>
    );
  };

  const getUserInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const isActivePath = (path: string) => location.pathname === path;

  return (
    <Sidebar className="bg-background border-r" collapsible="icon">
      <SidebarHeader className={cn("p-4 border-b bg-background", state === "collapsed" && "p-2")}>
        {/* Account Status Alert - Top Priority */}
        {!loading && user && (
          <div className={cn(
            "mb-4 p-2 rounded-lg bg-accent/50",
            state === "collapsed" && "text-center"
          )}>
            {state !== "collapsed" ? (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Account Status</span>
                {getStatusBadge()}
              </div>
            ) : (
              <div className="flex justify-center">
                {getStatusBadge()}
              </div>
            )}
          </div>
        )}

        <Link to="/" className={cn(
          "font-bold text-yawatu-gold mb-4 block transition-all",
          state === "collapsed" ? "text-lg text-center" : "text-2xl"
        )}>
          {state === "collapsed" ? "Y" : "YAWATU"}
        </Link>
        
        {!loading && user && (
          <div className={cn(
            "flex items-center space-x-3",
            state === "collapsed" && "flex-col space-x-0 space-y-2"
          )}>
            <Avatar className={cn(
              "transition-all",
              state === "collapsed" ? "h-8 w-8" : "h-12 w-12"
            )}>
              <AvatarImage src={profile?.profile_picture_url} alt={profile?.full_name} />
              <AvatarFallback className="bg-yawatu-gold text-white">
                {getUserInitials(profile?.full_name || user?.email || 'User')}
              </AvatarFallback>
            </Avatar>
            {state !== "collapsed" && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            )}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="bg-background">
        <SidebarGroup>
          <SidebarGroupLabel className={cn(state === "collapsed" && "sr-only")}>
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActivePath(item.path)}
                    tooltip={state === "collapsed" ? item.label : undefined}
                  >
                    <Link to={item.path} className="flex items-center space-x-2">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className={cn(state === "collapsed" && "sr-only")}>
                        {item.label}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className={cn(state === "collapsed" && "sr-only")}>
            Services
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {servicesItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActivePath(item.path)}
                    tooltip={state === "collapsed" ? item.label : undefined}
                  >
                    <Link to={item.path} className="flex items-center space-x-2">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className={cn(state === "collapsed" && "sr-only")}>
                        {item.label}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={cn("p-4 border-t bg-background", state === "collapsed" && "p-2")}>
        <SidebarMenu className="space-y-1">
          {footerItems.map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton 
                asChild 
                isActive={isActivePath(item.path)}
                tooltip={state === "collapsed" ? item.label : undefined}
              >
                <Link to={item.path} className="flex items-center space-x-2">
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className={cn(state === "collapsed" && "sr-only")}>
                    {item.label}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip={state === "collapsed" ? "Sign Out" : undefined}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className={cn(state === "collapsed" && "sr-only")}>
                Sign Out
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
