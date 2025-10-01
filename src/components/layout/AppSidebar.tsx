
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  Wallet, 
  TrendingUp, 
  Settings, 
  BarChart3, 
  Shield, 
  Users2, 
  MessageSquare, 
  Megaphone,
  Vote,
  Activity,
  User,
  LogOut
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const menuItems = [
  { 
    label: 'Dashboard', 
    href: '/admin', 
    icon: LayoutDashboard 
  },
  { 
    label: 'Verification', 
    href: '/admin/verification', 
    icon: UserCheck 
  },
  { 
    label: 'Users', 
    href: '/admin/users', 
    icon: Users 
  },
  { 
    label: 'Wallet', 
    href: '/admin/wallet', 
    icon: Wallet 
  },
  { 
    label: 'Shares', 
    href: '/admin/shares', 
    icon: TrendingUp 
  },
  { 
    label: 'Projects', 
    href: '/admin/projects', 
    icon: BarChart3 
  },
  { 
    label: 'Referrals', 
    href: '/admin/referrals', 
    icon: Users2 
  },
  { 
    label: 'Agent', 
    href: '/admin/agent', 
    icon: Shield 
  },
  { 
    label: 'Support', 
    href: '/admin/support', 
    icon: MessageSquare 
  },
  { 
    label: 'Promotions', 
    href: '/admin/promotions', 
    icon: Megaphone 
  },
  { 
    label: 'Voting', 
    href: '/admin/voting', 
    icon: Vote 
  },
  { 
    label: 'Analytics', 
    href: '/admin/analytics', 
    icon: Activity 
  },
  { 
    label: 'System Health', 
    href: '/admin/system-health', 
    icon: Activity 
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return;
      }

      setUserProfile({
        ...profile,
        email: user.email,
        avatar_url: profile?.profile_picture_url
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/admin/login');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Error logging out');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Active', variant: 'default' as const },
      pending_verification: { label: 'Pending', variant: 'secondary' as const },
      blocked: { label: 'Blocked', variant: 'destructive' as const },
      incomplete: { label: 'Incomplete', variant: 'outline' as const }
    };
    
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.incomplete;
  };

  const getUserInitials = (name: string) => {
    if (!name) return 'AD';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Sidebar className="bg-background border-r" collapsible="icon">
      <SidebarHeader className={cn("p-4 border-b bg-background", state === "collapsed" && "p-2")}>
        <Link to="/" className={cn(
          "font-bold text-yawatu-gold mb-4 block transition-all",
          state === "collapsed" ? "text-lg text-center" : "text-2xl"
        )}>
          {state === "collapsed" ? "Y" : "YAWATU"}
        </Link>
        
        {!loading && userProfile && (
          <div className={cn(
            "flex items-center space-x-3",
            state === "collapsed" && "flex-col space-x-0 space-y-2"
          )}>
            <Avatar className={cn(
              "transition-all",
              state === "collapsed" ? "h-8 w-8" : "h-16 w-16"
            )}>
              <AvatarImage src={userProfile.avatar_url} alt={userProfile.full_name} />
              <AvatarFallback className="bg-yawatu-gold text-white">
                {getUserInitials(userProfile.full_name || 'Admin')}
              </AvatarFallback>
            </Avatar>
            {state !== "collapsed" && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {userProfile.full_name || 'Admin User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {userProfile.email}
                </p>
                <Badge 
                  variant={getStatusBadge(userProfile.status || 'active').variant}
                  className="text-xs mt-1"
                >
                  {getStatusBadge(userProfile.status || 'active').label}
                </Badge>
              </div>
            )}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="bg-background">
        <SidebarGroup>
          <SidebarGroupLabel className={cn(state === "collapsed" && "sr-only")}>
            Admin Panel
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.href}
                    tooltip={state === "collapsed" ? item.label : undefined}
                  >
                    <Link to={item.href}>
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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              isActive={location.pathname === '/admin/settings'}
              tooltip={state === "collapsed" ? "Settings" : undefined}
            >
              <Link to="/admin/settings">
                <Settings className="h-4 w-4 shrink-0" />
                <span className={cn(state === "collapsed" && "sr-only")}>
                  Settings
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild
              tooltip={state === "collapsed" ? "Profile" : undefined}
            >
              <Link to="/profile">
                <User className="h-4 w-4 shrink-0" />
                <span className={cn(state === "collapsed" && "sr-only")}>
                  Profile
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip={state === "collapsed" ? "Log Out" : undefined}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className={cn(state === "collapsed" && "sr-only")}>
                Log Out
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
