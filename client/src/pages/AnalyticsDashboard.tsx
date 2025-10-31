import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, BarChart3, ArrowLeft, LogOut, User as UserIcon, Crown, UserPlus, 
  MessageSquare, Mail, Users, Star, TrendingUp, Send, Settings 
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ChatbotStat {
  chatbotId: string;
  chatbotName: string;
  totalConversations: number;
  totalMessages: number;
  totalLeads: number;
  averageRating: number;
  ratingCount: number;
  topQuestions: { question: string; count: number }[];
}

interface AnalyticsOverview {
  chatbotStats: ChatbotStat[];
  totalStats: {
    totalConversations: number;
    totalMessages: number;
    totalLeads: number;
    averageRating: number;
    ratingCount: number;
  };
  dateStart: string;
  dateEnd: string;
}

export default function AnalyticsDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState("7");

  const { data: analytics, isLoading } = useQuery<AnalyticsOverview>({
    queryKey: ['/api/analytics/overview', dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/overview?days=${dateRange}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/analytics/generate-report", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to generate report");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Report sent!",
        description: "Your analytics report has been sent to your email.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" data-testid="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid="button-back-dashboard"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
                  Analytics Overview
                </h1>
                <p className="text-muted-foreground mt-1">
                  Comprehensive performance metrics across all your chatbots
                </p>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              {user?.isAdmin === "true" && (
                <Link href="/admin">
                  <Button variant="outline" className="gap-2" data-testid="button-admin">
                    <Crown className="w-4 h-4" />
                    Admin
                  </Button>
                </Link>
              )}
              <Link href="/leads">
                <Button variant="outline" className="gap-2" data-testid="button-leads">
                  <UserPlus className="w-4 h-4" />
                  Leads
                </Button>
              </Link>
              <Link href="/account/notifications">
                <Button variant="outline" className="gap-2" data-testid="button-notifications">
                  <Settings className="w-4 h-4" />
                  Notifications
                </Button>
              </Link>
              <Link href="/account">
                <Button variant="outline" className="gap-2" data-testid="button-account">
                  <UserIcon className="w-4 h-4" />
                  Account
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="gap-2"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-8">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-48" data-testid="select-date-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            {analytics && (
              <p className="text-sm text-muted-foreground">
                {formatDate(analytics.dateStart)} - {formatDate(analytics.dateEnd)}
              </p>
            )}
          </div>
          <Button
            onClick={() => generateReportMutation.mutate()}
            disabled={generateReportMutation.isPending}
            className="gap-2"
            data-testid="button-generate-report"
          >
            {generateReportMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Email Report Now
              </>
            )}
          </Button>
        </div>

        {analytics && analytics.chatbotStats.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No activity yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Analytics will appear here once your chatbots start receiving interactions
              </p>
            </CardContent>
          </Card>
        ) : analytics && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card data-testid="card-total-conversations">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-conversations">
                    {analytics.totalStats.totalConversations}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Across all chatbots
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-total-messages">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-messages">
                    {analytics.totalStats.totalMessages}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Questions & responses
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-total-leads">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Leads Captured</CardTitle>
                  <Users className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-leads">
                    {analytics.totalStats.totalLeads}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Contact information collected
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-avg-rating">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                  <Star className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-avg-rating">
                    {analytics.totalStats.averageRating > 0 
                      ? analytics.totalStats.averageRating.toFixed(1) 
                      : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analytics.totalStats.ratingCount > 0 
                      ? `Based on ${analytics.totalStats.ratingCount} ratings`
                      : 'No ratings yet'}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Chatbot Performance Breakdown
                  </CardTitle>
                  <CardDescription>
                    Individual performance metrics for each chatbot
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {analytics.chatbotStats.map((chatbot) => (
                    <div
                      key={chatbot.chatbotId}
                      className="border rounded-lg p-4 space-y-4"
                      data-testid={`chatbot-stats-${chatbot.chatbotId}`}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{chatbot.chatbotName}</h3>
                        <Link href={`/analytics/${chatbot.chatbotId}`}>
                          <Button variant="outline" size="sm" data-testid={`button-view-details-${chatbot.chatbotId}`}>
                            View Details
                          </Button>
                        </Link>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Conversations</p>
                          <p className="text-2xl font-bold">{chatbot.totalConversations}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Messages</p>
                          <p className="text-2xl font-bold">{chatbot.totalMessages}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Leads</p>
                          <p className="text-2xl font-bold">{chatbot.totalLeads}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Avg Rating</p>
                          <p className="text-2xl font-bold">
                            {chatbot.averageRating > 0 ? chatbot.averageRating.toFixed(1) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Ratings</p>
                          <p className="text-2xl font-bold">{chatbot.ratingCount}</p>
                        </div>
                      </div>

                      {chatbot.topQuestions.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Top Questions</h4>
                          <div className="space-y-2">
                            {chatbot.topQuestions.map((q, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-2 text-sm"
                                data-testid={`top-question-${chatbot.chatbotId}-${idx}`}
                              >
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                                  {idx + 1}
                                </span>
                                <span className="flex-1 text-muted-foreground">
                                  {q.question}
                                </span>
                                <span className="flex-shrink-0 text-xs text-muted-foreground">
                                  {q.count}x
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
