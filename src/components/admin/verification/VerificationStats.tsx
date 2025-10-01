
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, AlertTriangle, FileText, CheckCircle } from 'lucide-react';

interface VerificationStatsProps {
  stats: {
    total: number;
    pending: number;
    in_review: number;
    needs_resubmission: number;
    documents_pending: number;
  };
}

const VerificationStats: React.FC<VerificationStatsProps> = ({ stats }) => {
  const statCards = [
    {
      title: 'Total Requests',
      value: stats.total,
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Pending Review',
      value: stats.pending,
      icon: Clock,
      color: 'text-yellow-600'
    },
    {
      title: 'In Review',
      value: stats.in_review,
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      title: 'Needs Resubmission',
      value: stats.needs_resubmission,
      icon: AlertTriangle,
      color: 'text-red-600'
    },
    {
      title: 'Documents Pending',
      value: stats.documents_pending,
      icon: FileText,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default VerificationStats;
