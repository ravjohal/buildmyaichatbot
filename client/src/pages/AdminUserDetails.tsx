import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, User, CreditCard, BarChart3, Bot, Users, MessageSquare, Mail, Calendar, Shield, Crown, Building2, Globe, FileText, Palette, Bell, Phone, Clock, ChevronDown, Copy, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { DashboardHeader } from "@/components/DashboardHeader";
import { formatDistanceToNow } from "date-fns";
import type { User as UserType, Chatbot } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useState } from "react";

interface AdminUserDetails {
  user: UserType;
  chatbots: Chatbot[];
  stats: {
    totalChatbots: number;
    totalConversations: number;
    totalMessages: number;
    escalatedConversations: number;
    totalLeads: number;
  };
  teamMembers: UserType[];
  parentUser: UserType | null;
  recentConversations: Array<{
    id: string;
    chatbotId: string;
    chatbotName: string;
    startedAt: string;
    wasEscalated: string;
    messageCount: number;
  }>;
}

// Utility helper functions for rendering chatbot data
const BooleanBadge = ({ value, trueLabel = "Enabled", falseLabel = "Disabled" }: { value: string | boolean | undefined | null, trueLabel?: string, falseLabel?: string }) => {
  // Handle both string "true"/"false" and actual boolean values
  const isTrue = value === true || value === "true" || value === 1 || value === "1";
  return (
    <Badge variant={isTrue ? "outline" : "secondary"} className={isTrue ? "bg-green-50 dark:bg-green-950" : ""}>
      {isTrue ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
      {isTrue ? trueLabel : falseLabel}
    </Badge>
  );
};

const ArrayTags = ({ items, emptyMessage = "None configured" }: { items: string[] | undefined | null, emptyMessage?: string }) => {
  if (!items || items.length === 0) {
    return <span className="text-sm text-muted-foreground">{emptyMessage}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item, idx) => (
        <Badge key={idx} variant="secondary" className="text-xs">{item}</Badge>
      ))}
    </div>
  );
};

const ExpandableText = ({ text, label }: { text: string | undefined | null, label: string }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!text) {
    return <span className="text-sm text-muted-foreground">Not configured</span>;
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1"
        onClick={handleCopy}
        data-testid={`button-copy-${label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <Copy className="w-3 h-3" />
      </Button>
      <pre className="text-xs bg-muted p-3 rounded border overflow-x-auto max-h-32 pr-10">
        {text}
      </pre>
    </div>
  );
};

export default function AdminUserDetails() {
  const [, params] = useRoute("/admin/users/:userId");
  const userId = params?.userId || "";

  const { data, isLoading, error } = useQuery<AdminUserDetails>({
    queryKey: ["/api/admin/users", userId],
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Error Loading User Details</CardTitle>
              <CardDescription>
                {error instanceof Error ? error.message : "Failed to load user details"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin">
                <Button variant="default">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { user, chatbots, stats, teamMembers, parentUser, recentConversations } = data;

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case "scale":
        return "default";
      case "business":
      case "pro":
        return "secondary";
      case "starter":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin">
                <Button variant="ghost" size="icon" data-testid="button-back-admin">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-user-email">{user.email}</h1>
                <p className="text-sm text-muted-foreground">Account Details</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user.isAdmin === "true" && (
                <Badge variant="default" data-testid="badge-admin">
                  <Crown className="w-3 h-3 mr-1" />
                  Admin
                </Badge>
              )}
              <Badge variant={getTierBadgeVariant(user.subscriptionTier)} data-testid="badge-tier">
                {user.subscriptionTier.charAt(0).toUpperCase() + user.subscriptionTier.slice(1)}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid gap-6">
          
          {/* Profile Information */}
          <Card data-testid="card-profile">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <CardTitle>Profile Information</CardTitle>
              </div>
              <CardDescription>User account details and metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Email</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-email">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Name</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-name">
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user.firstName || user.lastName || "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">User ID</p>
                  <p className="text-sm text-muted-foreground font-mono" data-testid="text-user-id">{user.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Role</p>
                  <div className="flex items-center gap-2">
                    {user.role === "owner" ? (
                      <Badge variant="outline" data-testid="badge-role">
                        <Building2 className="w-3 h-3 mr-1" />
                        Account Owner
                      </Badge>
                    ) : (
                      <Badge variant="secondary" data-testid="badge-role">
                        <Users className="w-3 h-3 mr-1" />
                        Team Member
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Account Created</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-created">
                    {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : "Unknown"}
                  </p>
                </div>
                {user.googleId && (
                  <div>
                    <p className="text-sm font-medium mb-1">Google OAuth</p>
                    <Badge variant="outline">Connected</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Subscription & Billing */}
          <Card data-testid="card-billing">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <CardTitle>Subscription & Billing</CardTitle>
              </div>
              <CardDescription>Payment and subscription information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Subscription Tier</p>
                  <Badge variant={getTierBadgeVariant(user.subscriptionTier)} data-testid="text-subscription-tier">
                    {user.subscriptionTier.charAt(0).toUpperCase() + user.subscriptionTier.slice(1)}
                  </Badge>
                </div>
                {user.stripeCustomerId && (
                  <div>
                    <p className="text-sm font-medium mb-1">Stripe Customer ID</p>
                    <p className="text-sm text-muted-foreground font-mono" data-testid="text-stripe-customer">{user.stripeCustomerId}</p>
                  </div>
                )}
                {user.stripeSubscriptionId && (
                  <div>
                    <p className="text-sm font-medium mb-1">Stripe Subscription ID</p>
                    <p className="text-sm text-muted-foreground font-mono" data-testid="text-stripe-subscription">{user.stripeSubscriptionId}</p>
                  </div>
                )}
                {user.stripePriceId && (
                  <div>
                    <p className="text-sm font-medium mb-1">Stripe Price ID</p>
                    <p className="text-sm text-muted-foreground font-mono" data-testid="text-stripe-price">{user.stripePriceId}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Usage Statistics */}
          <Card data-testid="card-usage">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <CardTitle>Usage Statistics</CardTitle>
              </div>
              <CardDescription>Resource usage and limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Chatbots</p>
                  <p className="text-2xl font-bold" data-testid="text-chatbot-count">{stats.totalChatbots}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Conversations</p>
                  <p className="text-2xl font-bold" data-testid="text-conversation-count">{stats.totalConversations}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Messages</p>
                  <p className="text-2xl font-bold" data-testid="text-message-count">{stats.totalMessages}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Leads Captured</p>
                  <p className="text-2xl font-bold" data-testid="text-lead-count">{stats.totalLeads}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Monthly Conversations</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-monthly-conversations">{user.monthlyConversationCount || "0"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Knowledge Base Size</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-kb-size">{user.totalKnowledgeBaseSizeMB || "0"} MB</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Escalations</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-escalation-count">
                    {stats.escalatedConversations} ({stats.totalConversations > 0 ? ((stats.escalatedConversations / stats.totalConversations) * 100).toFixed(1) : 0}%)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Relationships */}
          {(parentUser || teamMembers.length > 0) && (
            <Card data-testid="card-team">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <CardTitle>Team Relationships</CardTitle>
                </div>
                <CardDescription>Team structure and membership</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {parentUser && (
                  <div>
                    <p className="text-sm font-medium mb-2">Parent Account</p>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm" data-testid="text-parent-user">{parentUser.email}</span>
                      {parentUser.isAdmin === "true" && (
                        <Badge variant="outline" className="ml-2">
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                
                {teamMembers.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Team Members ({teamMembers.length})</p>
                    <div className="space-y-2">
                      {teamMembers.map((member) => (
                        <div key={member.id} className="flex items-center gap-2 p-2 rounded bg-muted/50" data-testid={`team-member-${member.id}`}>
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{member.email}</span>
                          {member.firstName && member.lastName && (
                            <span className="text-sm text-muted-foreground">({member.firstName} {member.lastName})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Chatbots */}
          {chatbots.length > 0 && (
            <Card data-testid="card-chatbots">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  <CardTitle>Chatbots ({chatbots.length})</CardTitle>
                </div>
                <CardDescription>All chatbots created by this user</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Questions</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chatbots.map((chatbot) => (
                      <TableRow key={chatbot.id} data-testid={`chatbot-row-${chatbot.id}`}>
                        <TableCell className="font-medium">{chatbot.name}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={chatbot.indexingStatus === "completed" ? "outline" : chatbot.indexingStatus === "failed" ? "destructive" : "secondary"}
                            data-testid={`badge-status-${chatbot.id}`}
                          >
                            {chatbot.indexingStatus}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-questions-${chatbot.id}`}>{chatbot.questionCount || 0}</TableCell>
                        <TableCell>{chatbot.createdAt ? formatDistanceToNow(new Date(chatbot.createdAt), { addSuffix: true }) : "Unknown"}</TableCell>
                        <TableCell>
                          <Link href={`/view/${chatbot.id}`}>
                            <Button variant="ghost" size="sm" data-testid={`button-view-${chatbot.id}`}>
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Recent Conversations */}
          {recentConversations.length > 0 && (
            <Card data-testid="card-conversations">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <CardTitle>Recent Conversations</CardTitle>
                </div>
                <CardDescription>Last 10 chatbot conversations</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Chatbot</TableHead>
                      <TableHead>Messages</TableHead>
                      <TableHead>Escalated</TableHead>
                      <TableHead>Started</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentConversations.map((conv) => (
                      <TableRow key={conv.id} data-testid={`conversation-row-${conv.id}`}>
                        <TableCell className="font-medium">{conv.chatbotName}</TableCell>
                        <TableCell>{conv.messageCount}</TableCell>
                        <TableCell>
                          {conv.wasEscalated === "true" ? (
                            <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950">Yes</Badge>
                          ) : (
                            <span className="text-muted-foreground">No</span>
                          )}
                        </TableCell>
                        <TableCell>{formatDistanceToNow(new Date(conv.startedAt), { addSuffix: true })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
