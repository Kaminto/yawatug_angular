import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

interface WalletLoadingStateProps {
  message?: string;
}

const WalletLoadingState: React.FC<WalletLoadingStateProps> = ({ 
  message = "Syncing wallet balances..." 
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* UGX Wallet Loading */}
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </div>
        </CardContent>
      </Card>

      {/* USD Wallet Loading */}
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WalletLoadingState;