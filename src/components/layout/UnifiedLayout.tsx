
import React from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { UnifiedSidebar } from './UnifiedSidebar';
import { Separator } from '@/components/ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useAdminUser } from '@/contexts/AdminUserContext';
import ThemeToggle from '@/components/theme/ThemeToggle';

interface UnifiedLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function UnifiedLayout({ children, title, breadcrumbs }: UnifiedLayoutProps) {
  const { isAdminMode } = useAdminUser();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <UnifiedSidebar />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            
            <div className="flex flex-1 items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <img src="/yawatu-logo.png" alt="Yawatu" className="h-6 w-6 object-contain drop-shadow-sm flex-shrink-0" />
                {breadcrumbs && (
                  <nav className="hidden md:block">
                    <Breadcrumb>
                      <BreadcrumbList>
                        {breadcrumbs.map((crumb, index) => (
                          <div key={index} className="flex items-center">
                            <BreadcrumbItem>
                              {crumb.href ? (
                                <BreadcrumbLink href={crumb.href} className="text-sm">
                                  {crumb.label}
                                </BreadcrumbLink>
                              ) : (
                                <BreadcrumbPage className="text-sm">{crumb.label}</BreadcrumbPage>
                              )}
                            </BreadcrumbItem>
                            {index < breadcrumbs.length - 1 && (
                              <BreadcrumbSeparator />
                            )}
                          </div>
                        ))}
                      </BreadcrumbList>
                    </Breadcrumb>
                  </nav>
                )}
                {title && <h1 className="text-lg font-semibold truncate">{title}</h1>}
              </div>
              
              <div className="flex items-center space-x-2 flex-shrink-0">
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {isAdminMode ? 'Admin' : 'User'}
                </span>
                <ThemeToggle />
              </div>
            </div>
          </header>
          
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-auto">
              <div className="min-h-[calc(100vh-3.5rem)] p-3 pb-20 md:pb-4 md:p-4">
                {title && !breadcrumbs && (
                  <div className="mx-auto w-full max-w-6xl mb-4">
                    <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
                  </div>
                )}
                <div className="mx-auto w-full max-w-6xl">
                  {children}
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
