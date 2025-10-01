
import React from 'react';
import { UserLayout } from '@/components/layout/UserLayout';
import EnhancedProjectFunding from '@/components/projects/EnhancedProjectFunding';

const Projects = () => {
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Projects' }
  ];

  return (
    <UserLayout title="Mining Projects" breadcrumbs={breadcrumbs}>
      <div className="space-y-8">
        <div>
          <p className="text-muted-foreground">
            Explore and fund our mining projects with detailed tracking, stage-based funding, and performance monitoring
          </p>
        </div>

        <EnhancedProjectFunding />
      </div>
    </UserLayout>
  );
};

export default Projects;
