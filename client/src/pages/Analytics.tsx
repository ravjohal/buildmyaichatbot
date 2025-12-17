import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { MessageSquare, TrendingUp, AlertCircle, Clock, Pencil, Trash2, ArrowLeft, Timer, Users, TrendingDown, Calendar, Eye, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { Chatbot, Conversation, ConversationMessage, QaCache } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DashboardHeader } from "@/components/DashboardHeader";

interface AnalyticsData {
  metrics: {
    totalConversations: number;
    totalMessages: number;
    escalatedConversations: number;
    escalationRate: string;
    avgResponseTimeMs: number;
    minResponseTimeMs: number;
    maxResponseTimeMs: number;
    fallthroughCount: number;
    fallthroughRate: string;
    avgSessionDurationMs: number;
    minSessionDurationMs: number;
    maxSessionDurationMs: number;
    uniqueVisitors: number;
    returnVisitors: number;
    returnVisitorRate: string;
    peakHour: { hour: number; count: number };
    quietestHour: { hour: number; count: number };
    busyDays: Array<{ day: string; count: number }>;
  };
  recentConversations: Conversation[];
}

interface ConversationDetail {
  conversation: Conversation;
  messages: ConversationMessage[];
}

// Helper to format duration in milliseconds to readable format
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  return `${hours}h`;
}

export default function Analytics() {
  const [, params] = useRoute("/analytics/:id");
  const chatbotId = params?.id || "";
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<{ question: string; originalAnswer: string } | null>(null);
  const [editedAnswer, setEditedAnswer] = useState("");
  const [showCacheViewer, setShowCacheViewer] = useState(false);
  const { toast } = useToast();

  // Auto-open conversation dialog when coming from keyword alert
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const conversationId = searchParams.get('conversation');
    if (conversationId) {
      console.log('[Analytics] Auto-opening conversation:', conversationId);
      setSelectedConversation(conversationId);
    }
  }, []);

  const { data: chatbot } = useQuery<Chatbot>({
    queryKey: [`/api/chatbots/${chatbotId}`],
    enabled: !!chatbotId,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: [`/api/chatbots/${chatbotId}/analytics`],
    enabled: !!chatbotId,
  });

  const { data: conversationDetail } = useQuery<ConversationDetail>({
    queryKey: [`/api/conversations/${selectedConversation}`],
    enabled: !!selectedConversation,
  });

  const { data: manualOverrides } = useQuery<any[]>({
    queryKey: [`/api/chatbots/${chatbotId}/manual-overrides`],
    enabled: !!chatbotId,
  });

  const { data: cachedEntries, isLoading: cacheLoading } = useQuery<QaCache[]>({
    queryKey: ['/api/chatbots', chatbotId, 'cache'],
    enabled: !!chatbotId && showCacheViewer,
  });

  // Helper to check if a question has a manual override
  const hasManualOverride = (question: string): boolean => {
    if (!manualOverrides) return false;
    const normalizedQuestion = question.toLowerCase().trim();
    return manualOverrides.some(override => 
      override.question.toLowerCase().trim() === normalizedQuestion
    );
  };

  const saveOverrideMutation = useMutation({
    mutationFn: async ({ question, manualAnswer }: { question: string; manualAnswer: string }) => {
      const response = await fetch(`/api/chatbots/${chatbotId}/manual-overrides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, manualAnswer }),
      });
      if (!response.ok) {
        throw new Error("Failed to save manual override");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Answer updated",
        description: "The chatbot will now use your corrected answer for similar questions.",
      });
      setEditingMessage(null);
      setEditedAnswer("");
      // Invalidate manual overrides cache to show the badge
      queryClient.invalidateQueries({ queryKey: [`/api/chatbots/${chatbotId}/manual-overrides`] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save",
        description: error.message || "Could not save the corrected answer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/chatbots/${chatbotId}/cache`);
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Cache cleared",
        description: data.message || "Successfully cleared all cached answers.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/chatbots', chatbotId, 'cache'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to clear cache",
        description: error.message || "Could not clear the cache. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEditAnswer = (userQuestion: string, aiAnswer: string) => {
    setEditingMessage({ question: userQuestion, originalAnswer: aiAnswer });
    setEditedAnswer(aiAnswer);
  };

  const handleSaveEdit = () => {
    if (!editingMessage || !editedAnswer.trim()) return;
    saveOverrideMutation.mutate({
      question: editingMessage.question,
      manualAnswer: editedAnswer.trim(),
    });
  };

  if (analyticsLoading || !chatbot || !analytics) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <MessageSquare className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">{chatbot.name} - Analytics</h1>
                <p className="text-sm text-muted-foreground">View conversation history and metrics</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCacheViewer(true)}
                data-testid="button-view-cache"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Cache
              </Button>
              <Button
                variant="outline"
                onClick={() => clearCacheMutation.mutate()}
                disabled={clearCacheMutation.isPending}
                data-testid="button-clear-cache"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {clearCacheMutation.isPending ? "Clearing..." : "Clear Q&A Cache"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-conversations">
                {analytics.metrics.totalConversations}
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-messages">
                {analytics.metrics.totalMessages}
              </div>
              <p className="text-xs text-muted-foreground">
                Avg: {analytics.metrics.totalConversations > 0 
                  ? (analytics.metrics.totalMessages / analytics.metrics.totalConversations).toFixed(1) 
                  : "0"} per conversation
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Escalations</CardTitle>
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-escalations">
                {analytics.metrics.escalatedConversations}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.metrics.escalationRate}% of conversations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Escalation Rate</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-escalation-rate">
                {analytics.metrics.escalationRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.metrics.escalatedConversations === 0 ? "Great job!" : "Monitor closely"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-avg-response-time">
                {analytics.metrics.avgResponseTimeMs}ms
              </div>
              <p className="text-xs text-muted-foreground">
                Min: {analytics.metrics.minResponseTimeMs}ms • Max: {analytics.metrics.maxResponseTimeMs}ms
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fall-Through Rate</CardTitle>
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-fallthrough-rate">
                {analytics.metrics.fallthroughRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.metrics.fallthroughCount} unanswered question{analytics.metrics.fallthroughCount !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Session Duration</CardTitle>
              <Timer className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-avg-session-duration">
                {formatDuration(analytics.metrics.avgSessionDurationMs)}
              </div>
              <p className="text-xs text-muted-foreground">
                Min: {formatDuration(analytics.metrics.minSessionDurationMs)} • Max: {formatDuration(analytics.metrics.maxSessionDurationMs)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Return Visitor Rate</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-return-visitor-rate">
                {analytics.metrics.returnVisitorRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.metrics.uniqueVisitors} unique • {analytics.metrics.returnVisitors} repeat
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Peak Usage Time</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-peak-hour">
                {String(analytics.metrics.peakHour.hour).padStart(2, '0')}:00
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.metrics.peakHour.count} conversations • Quietest: {String(analytics.metrics.quietestHour.hour).padStart(2, '0')}:00
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Busiest Days (7-day)</CardTitle>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.metrics.busyDays.length > 0 ? (
                  analytics.metrics.busyDays.map((day, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span data-testid={`busy-day-${idx}`}>{day.day}</span>
                      <span className="font-medium">{day.count} conversations</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No data yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Conversations</CardTitle>
            <CardDescription>View detailed conversation history and user interactions</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.recentConversations.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
                <p className="text-sm text-muted-foreground">
                  Conversations will appear here once users start interacting with your chatbot.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {analytics.recentConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover-elevate cursor-pointer"
                    onClick={() => setSelectedConversation(conversation.id)}
                    data-testid={`conversation-${conversation.id}`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <MessageSquare className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          Session: {conversation.sessionId}
                        </p>
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">
                            {conversation.messageCount} messages
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Started {formatDistanceToNow(new Date(conversation.startedAt), { addSuffix: true })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Last message {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {conversation.wasEscalated === "true" && (
                          <Badge variant="destructive" className="text-xs">
                            Escalated
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedConversation} onOpenChange={(open) => !open && setSelectedConversation(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Conversation Details</DialogTitle>
          </DialogHeader>
          {conversationDetail && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b">
                <div>
                  <p className="text-sm font-medium">Session: {conversationDetail.conversation.sessionId}</p>
                  <p className="text-xs text-muted-foreground">
                    Started {formatDistanceToNow(new Date(conversationDetail.conversation.startedAt), { addSuffix: true })}
                  </p>
                </div>
                {conversationDetail.conversation.wasEscalated === "true" && (
                  <Badge variant="destructive">Escalated</Badge>
                )}
              </div>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4 pr-4">
                  {conversationDetail.messages.map((message, index) => {
                    const previousMessage = index > 0 ? conversationDetail.messages[index - 1] : null;
                    const userQuestion = previousMessage?.role === "user" ? previousMessage.content : "";
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`rounded-2xl p-3 max-w-[80%] ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : "bg-muted rounded-tl-sm"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm whitespace-pre-wrap flex-1">{message.content}</p>
                            {message.role === "assistant" && userQuestion && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 flex-shrink-0"
                                onClick={() => handleEditAnswer(userQuestion, message.content)}
                                data-testid={`button-edit-answer-${message.id}`}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                          {message.suggestedQuestions && message.suggestedQuestions.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border/50">
                              <p className="text-xs opacity-70 mb-1">Suggested:</p>
                              <div className="flex flex-wrap gap-1">
                                {message.suggestedQuestions.map((q, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {q}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {message.wasEscalated === "true" && (
                            <Badge variant="destructive" className="mt-2 text-xs">
                              Escalation triggered
                            </Badge>
                          )}
                          {message.role === "assistant" && userQuestion && hasManualOverride(userQuestion) && (
                            <Badge variant="secondary" className="mt-2 text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300">
                              Manually trained
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingMessage} onOpenChange={(open) => !open && setEditingMessage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit AI Response</DialogTitle>
            <DialogDescription>
              Correct this answer to improve your chatbot's accuracy. The chatbot will use your corrected answer for similar questions in the future.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">User Question</label>
              <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted rounded-md">
                {editingMessage?.question}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Original AI Answer</label>
              <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted rounded-md">
                {editingMessage?.originalAnswer}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Corrected Answer</label>
              <Textarea
                value={editedAnswer}
                onChange={(e) => setEditedAnswer(e.target.value)}
                placeholder="Enter the corrected answer..."
                className="mt-1 min-h-[150px]"
                data-testid="textarea-edited-answer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingMessage(null)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editedAnswer.trim() || saveOverrideMutation.isPending}
              data-testid="button-save-edit"
            >
              {saveOverrideMutation.isPending ? "Saving..." : "Save Corrected Answer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCacheViewer} onOpenChange={setShowCacheViewer}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Cached Q&A Entries
            </DialogTitle>
            <DialogDescription>
              View all cached question-answer pairs. These are automatically generated from conversations and help speed up responses.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {cacheLoading ? (
              <div className="text-center py-8">
                <Database className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
                <p className="text-sm text-muted-foreground">Loading cached entries...</p>
              </div>
            ) : cachedEntries && cachedEntries.length > 0 ? (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {cachedEntries.map((entry) => (
                    <div key={entry.id} className="p-4 border rounded-lg space-y-2" data-testid={`cache-entry-${entry.id}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Question</p>
                            <p className="text-sm font-medium">{entry.question}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cached Answer</p>
                            <p className="text-sm text-muted-foreground line-clamp-3">{entry.answer}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <Badge variant="secondary" className="text-xs">
                            {entry.hitCount} hits
                          </Badge>
                          {entry.lastUsedAt && (
                            <span className="text-xs text-muted-foreground">
                              Last used {formatDistanceToNow(new Date(entry.lastUsedAt), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8">
                <Database className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No cached entries found.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cache entries are created when users ask questions.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              {cachedEntries ? `${cachedEntries.length} cached entries` : ''}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCacheViewer(false)}
                data-testid="button-close-cache-viewer"
              >
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  clearCacheMutation.mutate();
                  setShowCacheViewer(false);
                }}
                disabled={clearCacheMutation.isPending || !cachedEntries || cachedEntries.length === 0}
                data-testid="button-clear-cache-from-viewer"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
