
import React from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import ThemeToggle from '@/components/theme/ThemeToggle';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title, breadcrumbs }) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2 mr-4">
              <img src="/lovable-uploads/559efa00-0cf1-46d0-98ec-626971938a1a.png" alt="Yawatu" className="h-8 w-8" />
            </div>
            <div className="flex flex-1 items-center justify-between">
              <div>
                {breadcrumbs && (
                  <nav className="mb-2">
                    <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
                      {breadcrumbs.map((crumb, index) => (
                        <li key={index} className="flex items-center">
                          {index > 0 && <span className="mx-2">/</span>}
                          {crumb.href ? (
                            <a href={crumb.href} className="hover:text-foreground transition-colors">
                              {crumb.label}
                            </a>
                          ) : (
                            <span className="text-foreground">{crumb.label}</span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </nav>
                )}
                <h1 className="text-xl font-semibold">{title}</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-muted-foreground">
                  Admin Dashboard
                </span>
                <ThemeToggle />
              </div>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pb-20 md:pb-4 overflow-auto">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
