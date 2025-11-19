import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, User, CreditCard, BarChart3, Bot, Users, MessageSquare, Mail, Calendar, Shield, Crown, Building2, Globe, FileText, Palette, Bell, Phone, Clock, ChevronDown, Copy, CheckCircle2, XCircle, Settings } from "lucide-react";
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
  const isTrue = value === true || value === "true" || value === "1";
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

// Helper function to convert 24-hour time to 12-hour AM/PM format
const formatTime12Hour = (time24: string): string => {
  const [hour, minute] = time24.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
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
          <Card data-testid="card-chatbots">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                <CardTitle>Chatbots ({chatbots.length})</CardTitle>
              </div>
              <CardDescription>All chatbots created by this user - expand for full configuration details</CardDescription>
            </CardHeader>
            <CardContent>
              {chatbots.length === 0 ? (
                <div className="text-center py-8" data-testid="empty-chatbots">
                  <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">This user has not created any chatbots yet.</p>
                </div>
              ) : (
                <Accordion type="multiple" className="space-y-2">
                  {chatbots.map((chatbot) => (
                    <AccordionItem 
                      key={chatbot.id} 
                      value={chatbot.id} 
                      className="border rounded-lg px-4"
                      data-testid={`accordion-item-chatbot-${chatbot.id}`}
                    >
                      <AccordionTrigger 
                        className="hover:no-underline py-3"
                        data-testid={`accordion-trigger-chatbot-${chatbot.id}`}
                      >
                        <div className="flex items-center gap-3 flex-1 text-left">
                          <div className="flex-1">
                            <div className="font-medium">{chatbot.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge 
                                variant={chatbot.indexingStatus === "completed" ? "outline" : chatbot.indexingStatus === "failed" ? "destructive" : "secondary"}
                                data-testid={`badge-status-${chatbot.id}`}
                              >
                                {chatbot.indexingStatus}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {chatbot.questionCount || 0} questions
                              </span>
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-3 pb-4">
                        <div className="space-y-6">
                          {/* Overview Section */}
                          <div>
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                              <BarChart3 className="w-4 h-4" />
                              Overview
                            </h4>
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Indexing Status</p>
                                <Badge 
                                  variant={chatbot.indexingStatus === "completed" ? "outline" : chatbot.indexingStatus === "failed" ? "destructive" : "secondary"}
                                  data-testid={`text-indexing-status-${chatbot.id}`}
                                >
                                  {chatbot.indexingStatus}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Questions Answered</p>
                                <p className="text-sm font-medium" data-testid={`text-question-count-${chatbot.id}`}>
                                  {chatbot.questionCount || 0}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Created</p>
                                <p className="text-sm" data-testid={`text-created-${chatbot.id}`}>
                                  {chatbot.createdAt ? formatDistanceToNow(new Date(chatbot.createdAt), { addSuffix: true }) : "Unknown"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Last Knowledge Update</p>
                                <p className="text-sm" data-testid={`text-last-update-${chatbot.id}`}>
                                  {chatbot.lastKnowledgeUpdate ? formatDistanceToNow(new Date(chatbot.lastKnowledgeUpdate), { addSuffix: true }) : "Never"}
                                </p>
                              </div>
                              {chatbot.lastIndexingJobId && (
                                <div className="md:col-span-2">
                                  <p className="text-xs text-muted-foreground mb-1">Last Indexing Job ID</p>
                                  <p className="text-xs font-mono bg-muted px-2 py-1 rounded" data-testid={`text-job-id-${chatbot.id}`}>
                                    {chatbot.lastIndexingJobId}
                                  </p>
                                </div>
                              )}
                              <div className="md:col-span-2 flex gap-2">
                                <Link href={`/view/${chatbot.id}`}>
                                  <Button variant="outline" size="sm" data-testid={`button-view-${chatbot.id}`}>
                                    View Analytics
                                  </Button>
                                </Link>
                                <Link href={`/edit/${chatbot.id}`}>
                                  <Button variant="default" size="sm" data-testid={`button-edit-${chatbot.id}`}>
                                    <Settings className="w-4 h-4 mr-2" />
                                    Edit Chatbot
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>

                          <Separator />

                          {/* Knowledge Sources Section */}
                          <div>
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                              <Globe className="w-4 h-4" />
                              Knowledge Sources
                            </h4>
                            <div className="space-y-3">
                              <div>
                                <p className="text-xs text-muted-foreground mb-2">Website URLs</p>
                                <ArrayTags items={chatbot.websiteUrls} emptyMessage="No websites configured" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-2">Documents</p>
                                <ArrayTags items={chatbot.documents} emptyMessage="No documents uploaded" />
                              </div>
                            </div>
                          </div>

                          <Separator />

                          {/* Visual & Messaging Section */}
                          <div>
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                              <Palette className="w-4 h-4" />
                              Visual & Messaging
                            </h4>
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground mb-2">Primary Color</p>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="h-5 w-5 rounded border"
                                    style={{ backgroundColor: chatbot.primaryColor }}
                                    data-testid={`color-primary-${chatbot.id}`}
                                  />
                                  <span className="text-sm font-mono">{chatbot.primaryColor}</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-2">Accent Color</p>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="h-5 w-5 rounded border"
                                    style={{ backgroundColor: chatbot.accentColor }}
                                    data-testid={`color-accent-${chatbot.id}`}
                                  />
                                  <span className="text-sm font-mono">{chatbot.accentColor}</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-2">Logo URL</p>
                                {chatbot.logoUrl ? (
                                  <a 
                                    href={chatbot.logoUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline truncate block"
                                    data-testid={`link-logo-${chatbot.id}`}
                                  >
                                    {chatbot.logoUrl}
                                  </a>
                                ) : (
                                  <span className="text-sm text-muted-foreground">No logo configured</span>
                                )}
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-2">Suggested Questions</p>
                                <BooleanBadge value={chatbot.enableSuggestedQuestions} trueLabel="Enabled" falseLabel="Disabled" />
                              </div>
                              <div className="md:col-span-2">
                                <p className="text-xs text-muted-foreground mb-2">Welcome Message</p>
                                <p className="text-sm" data-testid={`text-welcome-${chatbot.id}`}>{chatbot.welcomeMessage}</p>
                              </div>
                              {chatbot.enableSuggestedQuestions === "true" && chatbot.suggestedQuestions && chatbot.suggestedQuestions.length > 0 && (
                                <div className="md:col-span-2">
                                  <p className="text-xs text-muted-foreground mb-2">Suggested Question List</p>
                                  <ArrayTags items={chatbot.suggestedQuestions} />
                                </div>
                              )}
                            </div>
                          </div>

                          <Separator />

                          {/* Lead Capture & Proactive Section */}
                          <div>
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                              <Bell className="w-4 h-4" />
                              Lead Capture & Proactive Chat
                            </h4>
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground mb-2">Lead Capture</p>
                                <BooleanBadge value={chatbot.leadCaptureEnabled} trueLabel="Enabled" falseLabel="Disabled" />
                              </div>
                              {chatbot.leadCaptureEnabled === "true" && (
                                <>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-2">Capture Type</p>
                                    <Badge variant="secondary">{chatbot.leadCaptureType}</Badge>
                                  </div>
                                  {chatbot.leadCaptureType === "external_link" && chatbot.leadCaptureExternalUrl && (
                                    <div className="md:col-span-2">
                                      <p className="text-xs text-muted-foreground mb-2">External URL</p>
                                      <a 
                                        href={chatbot.leadCaptureExternalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-primary hover:underline"
                                      >
                                        {chatbot.leadCaptureExternalUrl}
                                      </a>
                                    </div>
                                  )}
                                  {chatbot.leadCaptureType === "form" && (
                                    <>
                                      <div className="md:col-span-2">
                                        <p className="text-xs text-muted-foreground mb-2">Form Fields</p>
                                        <ArrayTags items={chatbot.leadCaptureFields} />
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-2">Form Title</p>
                                        <p className="text-sm">{chatbot.leadCaptureTitle}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-2">Form Message</p>
                                        <p className="text-sm">{chatbot.leadCaptureMessage}</p>
                                      </div>
                                    </>
                                  )}
                                </>
                              )}
                              <div>
                                <p className="text-xs text-muted-foreground mb-2">Proactive Chat</p>
                                <BooleanBadge value={chatbot.proactiveChatEnabled} trueLabel="Enabled" falseLabel="Disabled" />
                              </div>
                              {chatbot.proactiveChatEnabled === "true" && (
                                <>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-2">Delay (seconds)</p>
                                    <p className="text-sm">{chatbot.proactiveChatDelay || 5}</p>
                                  </div>
                                  <div className="md:col-span-2">
                                    <p className="text-xs text-muted-foreground mb-2">Proactive Message</p>
                                    <p className="text-sm">{chatbot.proactiveChatMessage}</p>
                                  </div>
                                  {chatbot.proactiveChatTriggerUrls && chatbot.proactiveChatTriggerUrls.length > 0 && (
                                    <div className="md:col-span-2">
                                      <p className="text-xs text-muted-foreground mb-2">Trigger URLs</p>
                                      <ArrayTags items={chatbot.proactiveChatTriggerUrls} />
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          <Separator />

                          {/* Support & AI Behavior Section */}
                          <div>
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              Support & AI Behavior
                            </h4>
                            <div className="space-y-4">
                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-2">Support Phone</p>
                                  <p className="text-sm">{chatbot.supportPhoneNumber || "Not configured"}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-2">Live Agent Hours</p>
                                  <BooleanBadge value={chatbot.liveAgentHoursEnabled} trueLabel="Enabled" falseLabel="Disabled" />
                                </div>
                                {chatbot.liveAgentHoursEnabled === "true" && (
                                  <>
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-2">Operating Hours</p>
                                      <p className="text-sm">{formatTime12Hour(chatbot.liveAgentStartTime || "09:00")} - {formatTime12Hour(chatbot.liveAgentEndTime || "17:00")}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-2">Timezone</p>
                                      <p className="text-sm">{chatbot.liveAgentTimezone}</p>
                                    </div>
                                    <div className="md:col-span-2">
                                      <p className="text-xs text-muted-foreground mb-2">Operating Days</p>
                                      <ArrayTags items={chatbot.liveAgentDaysOfWeek} />
                                    </div>
                                  </>
                                )}
                              </div>
                              
                              <div>
                                <p className="text-xs text-muted-foreground mb-2">Escalation Message</p>
                                <p className="text-sm bg-muted p-2 rounded">{chatbot.escalationMessage}</p>
                              </div>
                              
                              <div>
                                <p className="text-xs text-muted-foreground mb-2">System Prompt</p>
                                <ExpandableText text={chatbot.systemPrompt} label="System Prompt" />
                              </div>
                              
                              {chatbot.customInstructions && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-2">Custom Instructions</p>
                                  <ExpandableText text={chatbot.customInstructions} label="Custom Instructions" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>

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
