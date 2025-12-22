import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Bot,
  Globe,
  FileText,
  MessageSquare,
  Palette,
  Phone,
  UserPlus,
  Zap,
  Loader2,
  Edit,
  ExternalLink,
  BarChart3,
  Calendar,
  Settings,
  BookOpen,
  Sparkles,
  LifeBuoy,
  TrendingUp,
  AlertCircle,
  Clock,
  Pencil,
  Trash2,
  Brain,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { Chatbot, Conversation, ConversationMessage } from "@shared/schema";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Sanitize hex color to prevent CSS injection
const sanitizeColor = (color: string): string => {
  const hexColorRegex = /^#[0-9A-F]{6}$/i;
  return hexColorRegex.test(color) ? color : "#0EA5E9";
};

// Helper function to convert 24-hour time to 12-hour AM/PM format
const formatTime12Hour = (time24: string): string => {
  const [hour, minute] = time24.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
};

interface AnalyticsData {
  metrics: {
    totalConversations: number;
    totalMessages: number;
    escalatedConversations: number;
    escalationRate: string;
  };
  recentConversations: Conversation[];
}

interface ConversationDetail {
  conversation: Conversation;
  messages: ConversationMessage[];
}

interface DocumentMetadata {
  path: string;
  originalName: string;
  title: string;
  text: string;
  size: number;
  type: string;
}

export default function ViewChatbot() {
  const [, params] = useRoute("/view/:id");
  const chatbotId = params?.id || "";
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<{ question: string; originalAnswer: string } | null>(null);
  const [editedAnswer, setEditedAnswer] = useState("");

  // Auto-select analytics tab if coming from analytics link
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get('tab');
    const conversationId = searchParams.get('conversation');
    if (conversationId) {
      setSelectedConversation(conversationId);
    }
  }, []);

  const { data: chatbot, isLoading } = useQuery<Chatbot>({
    queryKey: [`/api/chatbots/${chatbotId}`],
    enabled: !!chatbotId,
  });

  const { data: analytics } = useQuery<AnalyticsData>({
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

  const deleteOverrideMutation = useMutation({
    mutationFn: async (question: string) => {
      const response = await fetch(`/api/chatbots/${chatbotId}/manual-overrides`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!response.ok) {
        throw new Error("Failed to delete manual override");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Manual override deleted" });
      queryClient.invalidateQueries({ queryKey: [`/api/chatbots/${chatbotId}`] });
    },
  });

  // Regenerate suggested questions mutation
  const regenerateQuestionsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/chatbots/${chatbotId}/suggested-questions/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to regenerate questions");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Questions regenerated",
        description: `Successfully generated ${data.count} new suggested questions.`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/chatbots/${chatbotId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to regenerate questions",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleEditAnswer = (question: string, originalAnswer: string) => {
    setEditingMessage({ question, originalAnswer });
    setEditedAnswer(originalAnswer);
  };

  const handleSaveEditedAnswer = () => {
    if (!editingMessage) return;
    saveOverrideMutation.mutate({
      question: editingMessage.question,
      manualAnswer: editedAnswer,
    });
  };

  const handleDeleteOverride = (question: string) => {
    if (confirm("Are you sure you want to delete this manual override? The chatbot will return to using AI-generated answers.")) {
      deleteOverrideMutation.mutate(question);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" data-testid="loader-chatbot" />
        </div>
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Chatbot not found</h2>
            <p className="text-muted-foreground mb-4">The chatbot you're looking for doesn't exist.</p>
            <Link href="/">
              <Button variant="default" data-testid="button-back-dashboard">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isIndexing = chatbot.indexingStatus === 'pending' || chatbot.indexingStatus === 'processing';
  const documentMetadata = (chatbot.documentMetadata as DocumentMetadata[]) || [];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                {chatbot.logoUrl ? (
                  <img 
                    src={chatbot.logoUrl} 
                    alt={chatbot.name}
                    className="h-10 max-w-[120px] rounded-lg object-contain"
                  />
                ) : (
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: sanitizeColor(chatbot.primaryColor) + "20" }}
                  >
                    <Bot className="w-6 h-6" style={{ color: sanitizeColor(chatbot.primaryColor) }} />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold" data-testid="text-chatbot-name">{chatbot.name}</h1>
                  <p className="text-sm text-muted-foreground">Complete chatbot overview and analytics</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isIndexing && (
                <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300" data-testid="badge-indexing">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Indexing
                </Badge>
              )}
              <Link href={`/edit/${chatbot.id}`}>
                <Button variant="default" data-testid="button-edit-chatbot">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Configuration
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-8">
        <Tabs defaultValue={(new URLSearchParams(window.location.search).get('tab')) || "overview"} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 mb-8">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <Settings className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="knowledge" data-testid="tab-knowledge">
              <BookOpen className="w-4 h-4 mr-2" />
              Knowledge
            </TabsTrigger>
            <TabsTrigger value="personality" data-testid="tab-personality">
              <Sparkles className="w-4 h-4 mr-2" />
              Personality
            </TabsTrigger>
            <TabsTrigger value="customization" data-testid="tab-customization">
              <Palette className="w-4 h-4 mr-2" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="features" data-testid="tab-features">
              <LifeBuoy className="w-4 h-4 mr-2" />
              Features
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card data-testid="card-basic-info">
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Core chatbot settings and identification</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Chatbot Name</p>
                    <p className="text-lg">{chatbot.name}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Chatbot ID</p>
                    <p className="font-mono text-sm">{chatbot.id}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge variant={chatbot.indexingStatus === "completed" ? "default" : "secondary"}>
                      {chatbot.indexingStatus || "active"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-statistics">
                <CardHeader>
                  <CardTitle>Statistics & Usage</CardTitle>
                  <CardDescription>Chatbot metrics and metadata</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Questions Answered</p>
                    <p className="text-2xl font-bold" data-testid="text-question-count">
                      {chatbot.questionCount || "0"}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Created</p>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span data-testid="text-created-at">
                        {chatbot.createdAt ? formatDistanceToNow(new Date(chatbot.createdAt), { addSuffix: true }) : "Unknown"}
                      </span>
                    </div>
                  </div>
                  {chatbot.lastKnowledgeUpdate && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Last Knowledge Update</p>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span data-testid="text-last-update">
                            {formatDistanceToNow(new Date(chatbot.lastKnowledgeUpdate), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Knowledge Base Tab */}
          <TabsContent value="knowledge" className="space-y-6">
            <Card data-testid="card-knowledge-urls">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  <CardTitle>Website URLs</CardTitle>
                </div>
                <CardDescription>URLs indexed for chatbot knowledge</CardDescription>
              </CardHeader>
              <CardContent>
                {chatbot.websiteUrls && chatbot.websiteUrls.length > 0 ? (
                  <div className="space-y-2">
                    {chatbot.websiteUrls.map((url, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm p-2 border rounded hover-elevate" data-testid={`text-website-url-${index}`}>
                        <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline truncate"
                        >
                          {url}
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No website URLs configured</p>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-knowledge-docs">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <CardTitle>Documents</CardTitle>
                </div>
                <CardDescription>Uploaded files used for chatbot knowledge</CardDescription>
              </CardHeader>
              <CardContent>
                {documentMetadata.length > 0 ? (
                  <div className="space-y-3">
                    {documentMetadata.map((doc, index) => (
                      <div key={index} className="p-3 border rounded-lg" data-testid={`text-document-${index}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{doc.originalName}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.type} • {(doc.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No documents uploaded</p>
                )}
              </CardContent>
            </Card>

            {chatbot.websiteContent && (
              <Card>
                <CardHeader>
                  <CardTitle>Custom Website Content</CardTitle>
                  <CardDescription>Manually provided website content</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px] w-full rounded border p-4">
                    <pre className="text-sm whitespace-pre-wrap">{chatbot.websiteContent}</pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Personality Tab */}
          <TabsContent value="personality" className="space-y-6">
            <Card data-testid="card-personality-prompt">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <CardTitle>System Prompt</CardTitle>
                </div>
                <CardDescription>The AI's core instructions and behavior</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px] w-full rounded border p-4">
                  <p className="text-sm whitespace-pre-wrap">{chatbot.systemPrompt}</p>
                </ScrollArea>
              </CardContent>
            </Card>

            {chatbot.customInstructions && (
              <Card>
                <CardHeader>
                  <CardTitle>Custom Instructions</CardTitle>
                  <CardDescription>Additional behavioral guidelines</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px] w-full rounded border p-4">
                    <p className="text-sm whitespace-pre-wrap">{chatbot.customInstructions}</p>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            <Card data-testid="card-ai-model">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  <CardTitle>AI Model</CardTitle>
                </div>
                <CardDescription>The Gemini model powering this chatbot</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {chatbot.geminiModel === "gemini-2.0-flash-exp" && "Gemini 2.0 Flash (Experimental)"}
                    {chatbot.geminiModel === "gemini-2.5-flash" && "Gemini 2.5 Flash"}
                    {chatbot.geminiModel === "gemini-2.5-pro" && "Gemini 2.5 Pro"}
                    {chatbot.geminiModel === "gemini-3-flash" && "Gemini 3 Flash"}
                    {chatbot.geminiModel === "gemini-3-pro" && "Gemini 3 Pro"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {chatbot.geminiModel === "gemini-2.0-flash-exp" && "Fastest, best value"}
                    {chatbot.geminiModel === "gemini-2.5-flash" && "Latest flash model"}
                    {chatbot.geminiModel === "gemini-2.5-pro" && "Most capable 2.5 model"}
                    {chatbot.geminiModel === "gemini-3-flash" && "Next-gen fast model"}
                    {chatbot.geminiModel === "gemini-3-pro" && "Most advanced model"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customization Tab */}
          <TabsContent value="customization" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card data-testid="card-brand-colors">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    <CardTitle>Brand Colors</CardTitle>
                  </div>
                  <CardDescription>Visual styling for the chat widget</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-16 h-16 rounded border-2"
                        style={{ backgroundColor: chatbot.primaryColor }}
                      />
                      <div>
                        <p className="text-sm font-medium">Primary Color</p>
                        <p className="text-xs text-muted-foreground font-mono">{chatbot.primaryColor}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-16 h-16 rounded border-2"
                        style={{ backgroundColor: chatbot.accentColor }}
                      />
                      <div>
                        <p className="text-sm font-medium">Accent Color</p>
                        <p className="text-xs text-muted-foreground font-mono">{chatbot.accentColor}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {chatbot.logoUrl && (
                <Card>
                  <CardHeader>
                    <CardTitle>Logo</CardTitle>
                    <CardDescription>Chatbot branding image</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded p-4 bg-muted/30 flex items-center justify-center">
                      <img 
                        src={chatbot.logoUrl} 
                        alt="Chatbot logo" 
                        className="max-h-24 object-contain"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Welcome Message</CardTitle>
                <CardDescription>Initial greeting displayed to users</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{chatbot.welcomeMessage}</p>
              </CardContent>
            </Card>

            {chatbot.enableSuggestedQuestions === "true" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <CardTitle>Suggested Questions</CardTitle>
                      <CardDescription>Quick-start questions for users • {chatbot.suggestedQuestions?.length || 0} questions</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => regenerateQuestionsMutation.mutate()}
                      disabled={regenerateQuestionsMutation.isPending}
                      data-testid="button-regenerate-questions"
                    >
                      {regenerateQuestionsMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Regenerate
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {chatbot.suggestedQuestions && chatbot.suggestedQuestions.length > 0 ? (
                    <div className="space-y-2">
                      {chatbot.suggestedQuestions.map((question, index) => (
                        <div key={index} className="flex items-start gap-2 p-2 border rounded">
                          <Badge variant="outline" className="text-xs">{index + 1}</Badge>
                          <span className="text-sm">{question}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No suggested questions generated yet. Click "Regenerate" to create them.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6">
            <Card data-testid="card-escalation">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-primary" />
                  <CardTitle>Escalation & Support</CardTitle>
                </div>
                <CardDescription>Human support handoff configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {chatbot.supportPhoneNumber && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Support Phone</p>
                      <p className="text-lg font-mono">{chatbot.supportPhoneNumber}</p>
                    </div>
                    <Separator />
                  </>
                )}
                {chatbot.escalationMessage && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Escalation Message</p>
                      <p className="text-sm">{chatbot.escalationMessage}</p>
                    </div>
                    <Separator />
                  </>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Live Agent Hours</p>
                  <Badge variant={chatbot.liveAgentHoursEnabled === "true" ? "default" : "secondary"}>
                    {chatbot.liveAgentHoursEnabled === "true" ? "Enabled" : "Disabled"}
                  </Badge>
                  {chatbot.liveAgentHoursEnabled === "true" && (
                    <div className="mt-3 space-y-2 text-sm p-3 bg-muted/30 rounded">
                      <p><span className="font-medium">Hours:</span> {formatTime12Hour(chatbot.liveAgentStartTime || "09:00")} - {formatTime12Hour(chatbot.liveAgentEndTime || "17:00")}</p>
                      <p><span className="font-medium">Timezone:</span> {chatbot.liveAgentTimezone}</p>
                      <p><span className="font-medium">Days:</span> {(chatbot.liveAgentDaysOfWeek as string[] || []).join(", ")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-lead-capture">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  <CardTitle>Lead Capture</CardTitle>
                </div>
                <CardDescription>Contact information collection settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Status</p>
                  <Badge variant={chatbot.leadCaptureEnabled === "true" ? "default" : "secondary"}>
                    {chatbot.leadCaptureEnabled === "true" ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                {chatbot.leadCaptureEnabled === "true" && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Type</p>
                      <Badge variant="outline">{chatbot.leadCaptureType === "external_link" ? "External Link" : "Form"}</Badge>
                    </div>
                    {chatbot.leadCaptureType === "form" && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Title</p>
                          <p className="text-sm mt-1">{chatbot.leadCaptureTitle}</p>
                        </div>
                        <Separator />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Message</p>
                          <p className="text-sm mt-1">{chatbot.leadCaptureMessage}</p>
                        </div>
                        <Separator />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">Fields</p>
                          <div className="flex gap-2 flex-wrap">
                            {(chatbot.leadCaptureFields || []).map((field) => (
                              <Badge key={field} variant="outline">{field}</Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    {chatbot.leadCaptureType === "external_link" && chatbot.leadCaptureExternalUrl && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">External URL</p>
                          <a
                            href={chatbot.leadCaptureExternalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline mt-1 block"
                          >
                            {chatbot.leadCaptureExternalUrl}
                          </a>
                        </div>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {analytics ? (
              <>
                <div className="grid gap-6 md:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="metric-total-conversations">
                        {analytics.metrics.totalConversations}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="metric-total-messages">
                        {analytics.metrics.totalMessages}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Escalated</CardTitle>
                      <AlertCircle className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="metric-escalated">
                        {analytics.metrics.escalatedConversations}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
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
              </>
            ) : (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading analytics...</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Conversation Detail Dialog */}
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
                          {message.role === "assistant" && userQuestion && hasManualOverride(userQuestion) && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              Manual Override
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

      {/* Edit Answer Dialog */}
      <Dialog open={!!editingMessage} onOpenChange={(open) => !open && setEditingMessage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit AI Response</DialogTitle>
            <DialogDescription>
              Provide a better answer that the chatbot will use for similar questions in the future.
            </DialogDescription>
          </DialogHeader>
          {editingMessage && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">User Question:</p>
                <p className="text-sm p-3 bg-muted rounded-lg">{editingMessage.question}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Your Corrected Answer:</p>
                <Textarea
                  value={editedAnswer}
                  onChange={(e) => setEditedAnswer(e.target.value)}
                  rows={8}
                  placeholder="Enter the correct answer..."
                  data-testid="textarea-edited-answer"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {editingMessage && hasManualOverride(editingMessage.question) && (
              <Button
                variant="destructive"
                onClick={() => {
                  handleDeleteOverride(editingMessage.question);
                  setEditingMessage(null);
                }}
                data-testid="button-delete-override"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Override
              </Button>
            )}
            <Button variant="outline" onClick={() => setEditingMessage(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEditedAnswer}
              disabled={!editedAnswer.trim() || saveOverrideMutation.isPending}
              data-testid="button-save-edited-answer"
            >
              {saveOverrideMutation.isPending ? "Saving..." : "Save Answer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
