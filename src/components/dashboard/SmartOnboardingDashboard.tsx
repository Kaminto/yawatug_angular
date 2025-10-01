import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  User, 
  FileText, 
  Shield, 
  Wallet, 
  TrendingUp,
  Gift,
  Target,
  BookOpen,
  Phone
} from 'lucide-react';
import { ProfileData, UserDocument, ContactPerson } from '@/types/profile';

interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'completed' | 'in_progress' | 'pending';
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
  reward?: string;
  action: () => void;
}

interface SmartOnboardingDashboardProps {
  profile: ProfileData;
  documents: UserDocument[];
  contacts: ContactPerson[];
  onTaskComplete: () => void;
}

const SmartOnboardingDashboard: React.FC<SmartOnboardingDashboardProps> = ({
  profile,
  documents,
  contacts,
  onTaskComplete
}) => {
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    generateSmartTasks();
  }, [profile, documents, contacts]);

  const generateSmartTasks = () => {
    const newTasks: OnboardingTask[] = [];

    // Basic Profile Completion
    if (!profile.full_name || !profile.phone || !profile.date_of_birth) {
      newTasks.push({
        id: 'basic_profile',
        title: 'Complete Basic Profile',
        description: 'Add your personal information to get started',
        icon: <User className="h-4 w-4" />,
        status: 'pending',
        priority: 'high',
        estimatedTime: '2 min',
        reward: '+10 points',
        action: () => window.location.href = '/profile?tab=personal'
      });
    }

    // Profile Picture
    if (!profile.profile_picture_url) {
      newTasks.push({
        id: 'profile_picture',
        title: 'Add Profile Picture',
        description: 'Upload a photo to personalize your account',
        icon: <User className="h-4 w-4" />,
        status: 'pending',
        priority: 'medium',
        estimatedTime: '1 min',
        reward: '+5 points',
        action: () => window.location.href = '/profile?tab=picture'
      });
    }

    // Document Upload
    const requiredDocs = profile.account_type === 'individual' ? 2 : 3;
    const approvedDocs = documents.filter(doc => doc.status === 'approved').length;
    
    if (documents.length < requiredDocs) {
      newTasks.push({
        id: 'upload_documents',
        title: 'Upload Required Documents',
        description: `Upload ${requiredDocs - documents.length} more document(s) for verification`,
        icon: <FileText className="h-4 w-4" />,
        status: 'pending',
        priority: 'high',
        estimatedTime: '5 min',
        reward: '+20 points',
        action: () => window.location.href = '/profile?tab=documents'
      });
    } else if (approvedDocs < documents.length) {
      newTasks.push({
        id: 'document_review',
        title: 'Documents Under Review',
        description: 'Your documents are being reviewed by our team',
        icon: <Clock className="h-4 w-4" />,
        status: 'in_progress',
        priority: 'medium',
        estimatedTime: '1-2 days',
        action: () => toast.info('Your documents are being reviewed')
      });
    }

    // Emergency Contacts
    if (contacts.length === 0) {
      newTasks.push({
        id: 'emergency_contact',
        title: 'Add Emergency Contact',
        description: 'Add a trusted contact for account security',
        icon: <Phone className="h-4 w-4" />,
        status: 'pending',
        priority: 'medium',
        estimatedTime: '2 min',
        reward: '+10 points',
        action: () => window.location.href = '/profile?tab=contacts'
      });
    }

    // Security Setup
    newTasks.push({
      id: 'security_setup',
      title: 'Enable Two-Factor Authentication',
      description: 'Secure your account with 2FA',
      icon: <Shield className="h-4 w-4" />,
      status: 'pending',
      priority: 'high',
      estimatedTime: '3 min',
      reward: '+15 points',
      action: () => toast.info('2FA setup coming soon')
    });

    // Wallet Setup
    newTasks.push({
      id: 'first_deposit',
      title: 'Make Your First Deposit',
      description: 'Add funds to start trading and earning',
      icon: <Wallet className="h-4 w-4" />,
      status: 'pending',
      priority: 'medium',
      estimatedTime: '5 min',
      reward: 'Welcome bonus',
      action: () => window.location.href = '/wallet'
    });

    // Learn About Trading
    newTasks.push({
      id: 'learn_trading',
      title: 'Learn About Share Trading',
      description: 'Understand how YAWATU shares work',
      icon: <BookOpen className="h-4 w-4" />,
      status: 'pending',
      priority: 'low',
      estimatedTime: '10 min',
      reward: 'Knowledge points',
      action: () => window.location.href = '/shares'
    });

    // Set Investment Goals
    newTasks.push({
      id: 'set_goals',
      title: 'Set Investment Goals',
      description: 'Define your financial objectives',
      icon: <Target className="h-4 w-4" />,
      status: 'pending',
      priority: 'low',
      estimatedTime: '5 min',
      reward: 'Goal tracking',
      action: () => toast.info('Goal setting coming soon')
    });

    setTasks(newTasks);
  };

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const calculateProgress = () => {
    const totalTasks = tasks.length;
    const completed = tasks.filter(task => task.status === 'completed').length;
    return totalTasks > 0 ? (completed / totalTasks) * 100 : 0;
  };

  const getPersonalizedMessage = () => {
    const completionPercentage = profile.profile_completion_percentage || 0;
    const firstName = profile.full_name?.split(' ')[0] || 'there';
    
    if (completionPercentage === 0) {
      return `Welcome ${firstName}! Let's get your account set up in just a few minutes.`;
    } else if (completionPercentage < 50) {
      return `Great start ${firstName}! Complete a few more steps to unlock full features.`;
    } else if (completionPercentage < 80) {
      return `You're doing well ${firstName}! Just a few more steps to complete verification.`;
    } else {
      return `Excellent progress ${firstName}! Your account is almost ready for trading.`;
    }
  };

  const highPriorityTasks = tasks.filter(task => task.priority === 'high' && task.status !== 'completed');
  const progress = calculateProgress();

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {getPersonalizedMessage()}
              </h2>
              <p className="text-muted-foreground">
                Complete these steps to unlock the full YAWATU experience
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">{Math.round(progress)}%</div>
              <div className="text-sm text-muted-foreground">Complete</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Your Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-primary/5 rounded-lg">
              <div className="text-lg font-bold text-primary">
                {tasks.filter(t => t.status === 'completed').length}
              </div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="p-3 bg-yellow-500/5 rounded-lg">
              <div className="text-lg font-bold text-yellow-600">
                {tasks.filter(t => t.status === 'in_progress').length}
              </div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-lg font-bold">
                {tasks.filter(t => t.status === 'pending').length}
              </div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* High Priority Tasks */}
      {highPriorityTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Priority Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription>
                Complete these high-priority tasks to ensure smooth account operation
              </AlertDescription>
            </Alert>
            <div className="space-y-3 mt-4">
              {highPriorityTasks.slice(0, 3).map((task) => (
                <div key={task.id} className="p-4 border border-red-200 rounded-lg bg-red-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded">
                        {task.icon}
                      </div>
                      <div>
                        <h4 className="font-medium">{task.title}</h4>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {task.estimatedTime}
                          </Badge>
                          {task.reward && (
                            <Badge variant="outline" className="text-xs bg-green-50">
                              {task.reward}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button onClick={task.action} size="sm">
                      Start
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            All Onboarding Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 border rounded-lg transition-all ${
                  task.status === 'completed' 
                    ? 'bg-green-50 border-green-200' 
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getTaskStatusIcon(task.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{task.title}</h4>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getPriorityColor(task.priority)} text-white border-0`}
                        >
                          {task.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {task.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {task.estimatedTime}
                        </Badge>
                        {task.reward && (
                          <Badge variant="outline" className="text-xs bg-green-50">
                            <Gift className="h-3 w-3 mr-1" />
                            {task.reward}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {task.status !== 'completed' && (
                    <Button 
                      onClick={task.action}
                      variant={task.priority === 'high' ? 'default' : 'outline'}
                      size="sm"
                    >
                      {task.status === 'in_progress' ? 'Continue' : 'Start'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartOnboardingDashboard;