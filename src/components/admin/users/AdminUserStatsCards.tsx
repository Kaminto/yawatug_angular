
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Filter, UserX } from "lucide-react";

interface AdminUserStatsCardsProps {
  stats: {
    total: number;
    active: number;
    unverified: number;
    pending: number;
    blocked: number;
  };
}

const AdminUserStatsCards: React.FC<AdminUserStatsCardsProps> = ({ stats }) => (
  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stats.total}</div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Active</CardTitle>
        <UserCheck className="h-4 w-4 text-green-600" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-green-600">{stats.active}</div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Pending</CardTitle>
        <Filter className="h-4 w-4 text-yellow-600" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Unverified</CardTitle>
        <UserX className="h-4 w-4 text-red-600" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-red-600">{stats.unverified}</div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Blocked</CardTitle>
        <UserX className="h-4 w-4 text-red-800" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-red-800">{stats.blocked}</div>
      </CardContent>
    </Card>
  </div>
);

export default AdminUserStatsCards;
