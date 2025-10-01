
import React from 'react';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import ThemeToggle from '@/components/theme/ThemeToggle';

interface AdminNavbarProps {
  onMenuClick: () => void;
}

const AdminNavbar = ({ onMenuClick }: AdminNavbarProps) => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-6 py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu className="h-6 w-6" />
        </Button>
        
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Admin Dashboard
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export default AdminNavbar;
