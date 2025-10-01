
import React from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { UserSidebar } from './UserSidebar';
import { Separator } from '@/components/ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

interface UserLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function UserLayout({ children, title, breadcrumbs }: UserLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background overflow-x-hidden">
        <UserSidebar />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex items-center gap-2">
              <img src="/yawatu-logo.png" alt="Yawatu" className="h-6 w-6 object-contain drop-shadow-sm" />
            </div>
            <Separator orientation="vertical" className="ml-2 h-4" />
            {breadcrumbs && (
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs.map((crumb, index) => (
                    <div key={index} className="flex items-center">
                      <BreadcrumbItem className="hidden md:block">
                        {crumb.href ? (
                          <BreadcrumbLink href={crumb.href} className="text-sm">
                            {crumb.label}
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage className="text-sm">{crumb.label}</BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                      {index < breadcrumbs.length - 1 && (
                        <BreadcrumbSeparator className="hidden md:block" />
                      )}
                    </div>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            )}
          </header>
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="min-h-[calc(100vh-3.5rem)] p-3 pb-20 md:pb-4 md:p-4">
                {title && (
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
