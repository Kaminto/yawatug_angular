
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface WalletSkeletonProps {
  className?: string;
}

export const WalletSkeleton = ({ className }: WalletSkeletonProps) => (
  <div className={cn("space-y-4", className)}>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-8 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const TransactionSkeleton = ({ className }: { className?: string }) => (
  <div className={cn("space-y-3", className)}>
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="text-right space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const FormSkeleton = ({ className }: { className?: string }) => (
  <div className={cn("space-y-4", className)}>
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-10 w-full" />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
    <Skeleton className="h-10 w-full" />
  </div>
);

export const DashboardSkeleton = ({ className }: { className?: string }) => (
  <div className={cn("space-y-6", className)}>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="border rounded-lg p-4 space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="border rounded-lg p-4 space-y-4">
        <Skeleton className="h-6 w-32" />
        <WalletSkeleton />
      </div>
      <div className="border rounded-lg p-4 space-y-4">
        <Skeleton className="h-6 w-40" />
        <TransactionSkeleton />
      </div>
    </div>
  </div>
);

export const ShareSkeleton = ({ className }: { className?: string }) => (
  <div className={cn("space-y-4", className)}>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const UserDashboardSkeleton = ({ className }: { className?: string }) => (
  <div className={cn("space-y-6", className)}>
    {/* Header Stats */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card rounded-lg p-6 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-5 rounded" />
          </div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
    
    {/* Main Content */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="bg-card rounded-lg p-6">
          <Skeleton className="h-6 w-24 mb-4" />
          <WalletSkeleton />
        </div>
        <div className="bg-card rounded-lg p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <ShareSkeleton />
        </div>
      </div>
      <div className="bg-card rounded-lg p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <TransactionSkeleton />
      </div>
    </div>
  </div>
);
