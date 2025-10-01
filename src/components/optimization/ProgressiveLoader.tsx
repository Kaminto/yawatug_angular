import React, { useState, useEffect, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Zap
} from 'lucide-react';

interface LoadingStage {
  id: string;
  name: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedTime: number; // in milliseconds
  component: React.LazyExoticComponent<any>;
  fallback?: React.ReactNode;
}

interface ProgressiveLoaderProps {
  stages: LoadingStage[];
  showProgress?: boolean;
  onStageComplete?: (stageId: string) => void;
  onAllComplete?: () => void;
}

export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  stages,
  showProgress = true,
  onStageComplete,
  onAllComplete
}) => {
  const [completedStages, setCompletedStages] = useState<Set<string>>(new Set());
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [loadingQueue, setLoadingQueue] = useState<LoadingStage[]>([]);

  useEffect(() => {
    // Sort stages by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sortedStages = [...stages].sort((a, b) => 
      priorityOrder[a.priority] - priorityOrder[b.priority]
    );
    
    setLoadingQueue(sortedStages);
    
    // Start with critical stages
    const criticalStages = sortedStages.filter(s => s.priority === 'critical');
    if (criticalStages.length > 0) {
      setCurrentStage(criticalStages[0].id);
    }
  }, [stages]);

  const handleStageComplete = (stageId: string) => {
    setCompletedStages(prev => new Set([...prev, stageId]));
    onStageComplete?.(stageId);
    
    // Move to next stage
    const remainingStages = loadingQueue.filter(s => !completedStages.has(s.id) && s.id !== stageId);
    if (remainingStages.length > 0) {
      setCurrentStage(remainingStages[0].id);
    } else {
      setCurrentStage(null);
      onAllComplete?.();
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <Zap className="h-4 w-4 text-destructive" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-primary" />;
      default: return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      {showProgress && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loadingQueue.map((stage) => {
                const isCompleted = completedStages.has(stage.id);
                const isActive = currentStage === stage.id;
                
                return (
                  <div key={stage.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : isActive ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : (
                        getPriorityIcon(stage.priority)
                      )}
                      <div>
                        <p className={`font-medium ${isCompleted ? 'text-green-600' : isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                          {stage.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Est. {stage.estimatedTime}ms
                        </p>
                      </div>
                    </div>
                    <Badge variant={getPriorityColor(stage.priority) as any}>
                      {stage.priority}
                    </Badge>
                  </div>
                );
              })}
            </div>
            
            {/* Overall Progress */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Overall Progress</span>
                <span>{Math.round((completedStages.size / stages.length) * 100)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(completedStages.size / stages.length) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progressive Content Loading */}
      <div className="space-y-6">
        {loadingQueue.map((stage) => {
          const isCompleted = completedStages.has(stage.id);
          const isActive = currentStage === stage.id;
          const shouldRender = isCompleted || isActive || stage.priority === 'critical';
          
          if (!shouldRender) return null;
          
          return (
            <div key={stage.id} className="transition-opacity duration-300">
              <Suspense fallback={stage.fallback || <DefaultStageFallback name={stage.name} />}>
                <StageWrapper
                  stage={stage}
                  onComplete={() => handleStageComplete(stage.id)}
                  isActive={isActive}
                />
              </Suspense>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Wrapper component to handle stage lifecycle
const StageWrapper: React.FC<{
  stage: LoadingStage;
  onComplete: () => void;
  isActive: boolean;
}> = ({ stage, onComplete, isActive }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    if (isActive && !isLoaded) {
      // Simulate loading time based on priority
      const timer = setTimeout(() => {
        setIsLoaded(true);
        onComplete();
      }, Math.min(stage.estimatedTime, 100)); // Cap at 100ms for demo
      
      return () => clearTimeout(timer);
    }
  }, [isActive, isLoaded, onComplete, stage.estimatedTime]);
  
  const Component = stage.component;
  
  return (
    <div className={`transition-all duration-300 ${isLoaded ? 'opacity-100' : 'opacity-50'}`}>
      <Component />
    </div>
  );
};

// Default fallback component
const DefaultStageFallback: React.FC<{ name: string }> = ({ name }) => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <Skeleton className="h-6 w-48" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="text-center mt-4">
        <p className="text-sm text-muted-foreground">Loading {name}...</p>
      </div>
    </CardContent>
  </Card>
);

// Hook for managing progressive loading
export const useProgressiveLoading = (stages: LoadingStage[]) => {
  const [completedStages, setCompletedStages] = useState<Set<string>>(new Set());
  const [isAllComplete, setIsAllComplete] = useState(false);
  
  const handleStageComplete = (stageId: string) => {
    setCompletedStages(prev => new Set([...prev, stageId]));
  };
  
  const handleAllComplete = () => {
    setIsAllComplete(true);
  };
  
  const progress = (completedStages.size / stages.length) * 100;
  
  return {
    completedStages,
    isAllComplete,
    progress,
    handleStageComplete,
    handleAllComplete
  };
};

export default ProgressiveLoader;