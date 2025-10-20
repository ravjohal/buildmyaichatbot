import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Users, MessageSquare, Bot, TrendingUp, Crown, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import type { User } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AdminStats {
  totalUsers: number;
  totalChatbots: number;
  totalConversations: number;
  totalMessages: number;
  paidUsers: number;
  freeUsers: number;
}

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  subscriptionTier: "free" | "paid";
  isAdmin: string;
  createdAt: string;
}

interface AdminChatbot {
  id: string;
  name: string;
  userId: string;
  userEmail: string;
  userName: string;
  questionCount: string;
  subscriptionTier: "free" | "paid";
  createdAt: string;
}

export default function Admin() {
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: currentUser?.isAdmin === "true",
  });

  const { data: users, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    enabled: currentUser?.isAdmin === "true",
  });

  const { data: chatbots, isLoading: chatbotsLoading } = useQuery<AdminChatbot[]>({
    queryKey: ["/api/admin/chatbots"],
    enabled: currentUser?.isAdmin === "true",
  });

  // Check if user is not an admin
  if (currentUser && currentUser.isAdmin !== "true") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                <p className="text-muted-foreground">
                  You do not have permission to access the admin dashboard. This area is restricted to administrators only.
                </p>
              </div>
              <Link href="/">
                <Button data-testid="button-back-dashboard">
                  Return to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold" data-testid="heading-admin">Admin Dashboard</h1>
            <p className="text-muted-foreground">System-wide statistics and management</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card data-testid="card-stat-users">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div>
                  <div className="text-2xl font-bold" data-testid="text-total-users">
                    {stats?.totalUsers || 0}
                  </div>
                  <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      {stats?.paidUsers || 0} paid
                    </span>
                    <span>•</span>
                    <span>{stats?.freeUsers || 0} free</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-stat-chatbots">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Chatbots</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-total-chatbots">
                  {stats?.totalChatbots || 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-stat-conversations">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div>
                  <div className="text-2xl font-bold" data-testid="text-total-conversations">
                    {stats?.totalConversations || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.totalMessages || 0} messages
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card data-testid="card-users-table">
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>Complete list of registered users</CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users && users.length > 0 ? (
                      users.map((user) => (
                        <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                          <TableCell className="font-medium">
                            {user.firstName} {user.lastName}
                          </TableCell>
                          <TableCell data-testid={`text-email-${user.id}`}>{user.email}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={user.subscriptionTier === "paid" ? "default" : "secondary"}
                              data-testid={`badge-tier-${user.id}`}
                            >
                              {user.subscriptionTier === "paid" ? "Pro" : "Free"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.isAdmin === "true" ? (
                              <Badge variant="destructive" data-testid={`badge-admin-${user.id}`}>
                                <Shield className="w-3 h-3 mr-1" />
                                Admin
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(user.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chatbots Table */}
        <Card data-testid="card-chatbots-table">
          <CardHeader>
            <CardTitle>All Chatbots</CardTitle>
            <CardDescription>Complete list of created chatbots</CardDescription>
          </CardHeader>
          <CardContent>
            {chatbotsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Chatbot Name</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Questions</TableHead>
                      <TableHead>Owner Tier</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chatbots && chatbots.length > 0 ? (
                      chatbots.map((chatbot) => (
                        <TableRow key={chatbot.id} data-testid={`row-chatbot-${chatbot.id}`}>
                          <TableCell className="font-medium" data-testid={`text-chatbot-name-${chatbot.id}`}>
                            {chatbot.name}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-sm">{chatbot.userName || "Unknown"}</div>
                              <div className="text-xs text-muted-foreground">{chatbot.userEmail}</div>
                            </div>
                          </TableCell>
                          <TableCell data-testid={`text-questions-${chatbot.id}`}>
                            {chatbot.questionCount}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={chatbot.subscriptionTier === "paid" ? "default" : "secondary"}
                              data-testid={`badge-owner-tier-${chatbot.id}`}
                            >
                              {chatbot.subscriptionTier === "paid" ? "Pro" : "Free"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(chatbot.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No chatbots found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
