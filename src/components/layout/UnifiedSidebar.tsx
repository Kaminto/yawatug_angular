
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
  LogOut,
  FolderOpen,
  Gift,
  ToggleLeft,
  ToggleRight,
  Image,
  Bot,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAdminUser } from '@/contexts/AdminUserContext';
import UserSwitcher from '@/components/admin/UserSwitcher';

const adminMenuItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Verification', href: '/admin/verification', icon: UserCheck },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Wallet', href: '/admin/wallet', icon: Wallet },
  { label: 'Shares', href: '/admin/shares', icon: TrendingUp },
  { label: 'Projects', href: '/admin/projects', icon: BarChart3 },
  { label: 'Referrals', href: '/admin/referrals', icon: Users2 },
  { label: 'Agent', href: '/admin/agent', icon: Shield },
  { label: 'Support', href: '/admin/support', icon: MessageSquare },
  { label: 'Promotion Management', href: '/admin/promotions', icon: Gift },
  { label: 'Voting', href: '/admin/voting', icon: Vote },
  { label: 'Analytics', href: '/admin/analytics', icon: Activity },
  { label: 'System Health', href: '/admin/system-health', icon: Activity },
  { label: 'Media Management', href: '/admin/media', icon: Image },
  { label: 'Chatbot Management', href: '/admin/chatbot', icon: Bot },
  { label: 'Reports', href: '/admin/reports', icon: FileText },
];

const userMenuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/wallet', label: 'Wallet', icon: Wallet },
  { path: '/user-shares', label: 'My Shares', icon: TrendingUp },
];

const userServicesItems = [
  { path: '/referrals', label: 'Referrals', icon: Gift },
  { path: '/agent', label: 'Agent Program', icon: User },
  { path: '/voting', label: 'Voting', icon: Vote },
  { path: '/support', label: 'Support', icon: MessageSquare },
];

export function UnifiedSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdminMode, currentUser, originalAdmin, toggleMode, switchToUser, loading } = useAdminUser();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate(originalAdmin ? '/admin/login' : '/login');
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
    if (!name) return originalAdmin ? 'AD' : 'U';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const menuItems = (!loading && isAdminMode && originalAdmin) ? adminMenuItems : userMenuItems;
  
  // Hide admin-specific menus until user role is confirmed
  const shouldShowAdminMenus = !loading && currentUser?.user_role === 'admin' && originalAdmin;
  const isActivePath = (path: string) => location.pathname === path;

  return (
    <Sidebar className="z-[40]">
      <SidebarHeader className="p-4 border-b">
        <Link to="/" className="font-bold text-2xl text-yawatu-gold mb-4 block">
          YAWATU
        </Link>
        
        {/* Admin-User Mode Switch - Enhanced */}
        {shouldShowAdminMenus && (
          <div className="mb-4 space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                {isAdminMode ? (
                  <Shield className="h-4 w-4 text-blue-600" />
                ) : (
                  <User className="h-4 w-4 text-green-600" />
                )}
                <span className="text-sm font-medium">
                  {isAdminMode ? "Admin Mode" : "User Mode"}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMode}
                className="h-8 w-8 p-0"
                title={isAdminMode ? "Switch to User View" : "Switch to Admin View"}
              >
                {isAdminMode ? (
                  <ToggleRight className="h-4 w-4 text-blue-600" />
                ) : (
                  <ToggleLeft className="h-4 w-4 text-green-600" />
                )}
              </Button>
            </div>
            
            {isAdminMode && (
              <UserSwitcher 
                trigger={
                  <Button variant="outline" size="sm" className="w-full">
                    <User className="h-4 w-4 mr-2" />
                    Switch to User Account
                  </Button>
                }
              />
            )}
          </div>
        )}
        
        {currentUser && (
          <div className="flex items-center space-x-3">
            <Avatar className="h-16 w-16">
              <AvatarImage src={currentUser.profile_picture_url} alt={currentUser.full_name} />
              <AvatarFallback className="bg-yawatu-gold text-white text-sm">
                {getUserInitials(currentUser.full_name || currentUser.email || 'User')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {currentUser.full_name || (originalAdmin ? 'Admin User' : 'User')}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {currentUser.email}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Badge 
                  variant={getStatusBadge(currentUser.status || 'active').variant}
                  className="text-xs"
                >
                  {getStatusBadge(currentUser.status || 'active').label}
                </Badge>
                {originalAdmin && (
                  <Badge variant="outline" className="text-xs">
                    {isAdminMode ? "Admin" : "Viewing as User"}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {isAdminMode ? 'Admin Panel' : 'Main Menu'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.label || item.path}>
                  <SidebarMenuButton asChild isActive={isActivePath(item.href || item.path)}>
                    <Link to={item.href || item.path}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!isAdminMode && (
          <SidebarGroup>
            <SidebarGroupLabel>Services</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {userServicesItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActivePath(item.path)}>
                      <Link to={item.path}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActivePath(isAdminMode ? '/admin/settings' : '/profile')}>
              <Link to={isAdminMode ? '/admin/settings' : '/profile'}>
                <Settings className="h-4 w-4" />
                <span>{isAdminMode ? 'Settings' : 'Profile & Settings'}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Button
              variant="ghost"
              className="w-full justify-start p-2 h-auto font-normal"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span>Log Out</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
