import React from 'react';
import { UnifiedLayout } from '@/components/layout/UnifiedLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Clock, CheckCircle, AlertCircle, Search, Filter } from 'lucide-react';

const AdminSupport = () => {
  return (
    <UnifiedLayout title="Support Management">
      <div className="space-y-8">
        <div>
          <p className="text-muted-foreground">
            Manage customer support tickets and inquiries
          </p>
        </div>

            <Tabs defaultValue="tickets" className="space-y-4">
              <TabsList className="w-full overflow-x-auto">
                <TabsTrigger value="tickets">
                  <span className="hidden sm:inline">Tickets</span>
                  <span className="sm:hidden">Tickets</span>
                </TabsTrigger>
                <TabsTrigger value="analytics">
                  <span className="hidden sm:inline">Analytics</span>
                  <span className="sm:hidden">Stats</span>
                </TabsTrigger>
                <TabsTrigger value="knowledge">
                  <span className="hidden sm:inline">Knowledge Base</span>
                  <span className="sm:hidden">KB</span>
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <span className="hidden sm:inline">Settings</span>
                  <span className="sm:hidden">Config</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="tickets">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">24</div>
                      <p className="text-xs text-muted-foreground">+3 from yesterday</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">12</div>
                      <p className="text-xs text-muted-foreground">Being handled</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">18</div>
                      <p className="text-xs text-muted-foreground">+2 from yesterday</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg. Response Time</CardTitle>
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">2.4h</div>
                      <p className="text-xs text-muted-foreground">-0.3h from yesterday</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Support Tickets</CardTitle>
                      <div className="flex gap-2">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Search tickets..." className="pl-8" />
                        </div>
                        <Select>
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Filter by status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { id: "#T001", user: "John Doe", subject: "Wallet withdrawal issue", priority: "high", status: "open", created: "2024-01-15", agent: "Unassigned" },
                        { id: "#T002", user: "Jane Smith", subject: "Share purchase problem", priority: "medium", status: "in_progress", created: "2024-01-15", agent: "Admin 1" },
                        { id: "#T003", user: "Bob Johnson", subject: "Profile verification", priority: "low", status: "resolved", created: "2024-01-14", agent: "Admin 2" },
                        { id: "#T004", user: "Alice Brown", subject: "Document upload error", priority: "medium", status: "open", created: "2024-01-14", agent: "Unassigned" }
                      ].map((ticket) => (
                        <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{ticket.id}</span>
                              <Badge 
                                className={
                                  ticket.priority === 'high' ? 'bg-red-500' :
                                  ticket.priority === 'medium' ? 'bg-yellow-500' :
                                  'bg-blue-500'
                                }
                              >
                                {ticket.priority}
                              </Badge>
                            </div>
                            <p className="font-medium">{ticket.subject}</p>
                            <p className="text-sm text-muted-foreground">
                              {ticket.user} • {ticket.created} • Assigned to: {ticket.agent}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={ticket.status === 'resolved' ? 'default' : 'outline'}
                              className={
                                ticket.status === 'open' ? 'bg-red-100 text-red-800' :
                                ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }
                            >
                              {ticket.status.replace('_', ' ')}
                            </Badge>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Ticket Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span>This Week</span>
                          <span className="font-bold">45 tickets</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Last Week</span>
                          <span className="font-bold">38 tickets</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Growth</span>
                          <span className="font-bold text-green-600">+18.4%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Common Issues</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          { issue: "Wallet Issues", count: 15, percentage: 30 },
                          { issue: "Profile Verification", count: 12, percentage: 24 },
                          { issue: "Share Trading", count: 10, percentage: 20 },
                          { issue: "Document Upload", count: 8, percentage: 16 },
                          { issue: "Other", count: 5, percentage: 10 }
                        ].map((item, index) => (
                          <div key={index} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{item.issue}</span>
                              <span>{item.count} ({item.percentage}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-yawatu-gold h-2 rounded-full" 
                                style={{ width: `${item.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="knowledge">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Knowledge Base Articles</CardTitle>
                      <Button>Add Article</Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { title: "How to verify your account", category: "Verification", views: 234, status: "published" },
                        { title: "Wallet deposit guide", category: "Wallet", views: 189, status: "published" },
                        { title: "Share trading basics", category: "Trading", views: 156, status: "draft" },
                        { title: "Document upload requirements", category: "Documents", views: 145, status: "published" }
                      ].map((article, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{article.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {article.category} • {article.views} views
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={article.status === 'published' ? 'default' : 'outline'}>
                              {article.status}
                            </Badge>
                            <Button variant="outline" size="sm">Edit</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Support Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Auto-assign tickets</label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select assignment method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="round_robin">Round Robin</SelectItem>
                            <SelectItem value="least_busy">Least Busy</SelectItem>
                            <SelectItem value="manual">Manual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Response Time Target (hours)</label>
                        <Input type="number" defaultValue="4" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Auto-close resolved tickets after (days)</label>
                        <Input type="number" defaultValue="7" />
                      </div>
                      <Button>Update Settings</Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Team Management</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Support Agents</p>
                        <div className="space-y-2">
                          {["Admin 1", "Admin 2", "Admin 3"].map((agent, index) => (
                            <div key={index} className="flex items-center justify-between p-2 border rounded">
                              <span className="text-sm">{agent}</span>
                              <Badge variant="outline">Active</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button>Manage Team</Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
        </Tabs>
      </div>
    </UnifiedLayout>
  );
};

export default AdminSupport;
