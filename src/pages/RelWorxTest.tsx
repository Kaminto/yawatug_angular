import React from 'react';
import { UserLayout } from '@/components/layout/UserLayout';
import { RelWorxTestComponent } from '@/components/RelWorxTestComponent';
import { RelWorxAuthGuide } from '@/components/relworx/RelWorxAuthGuide';

const RelWorxTest = () => {
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'RelWorx Test' }
  ];

  return (
    <UserLayout title="RelWorx API Test" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">RelWorx Authentication & API Test</h1>
          <p className="text-muted-foreground">
            Configure authentication methods and test RelWorx payment gateway integration
          </p>
        </div>

        {/* Authentication Configuration Guide */}
        <RelWorxAuthGuide />
        
        {/* API Testing Component */}
        <RelWorxTestComponent />
      </div>
    </UserLayout>
  );
};

export default RelWorxTest;