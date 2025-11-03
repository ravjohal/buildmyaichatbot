import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bot, Globe, FileText, MessageSquare, Palette, Phone, UserPlus, Zap, Loader2, Edit, ExternalLink, BarChart3, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Chatbot } from "@shared/schema";
import { DashboardHeader } from "@/components/DashboardHeader";
import { formatDistanceToNow } from "date-fns";

// Sanitize hex color to prevent CSS injection
const sanitizeColor = (color: string): string => {
  const hexColorRegex = /^#[0-9A-F]{6}$/i;
  return hexColorRegex.test(color) ? color : "#0EA5E9";
};

export default function ViewChatbot() {
  const [, params] = useRoute("/view/:id");
  const chatbotId = params?.id || "";

  const { data: chatbot, isLoading } = useQuery<Chatbot>({
    queryKey: [`/api/chatbots/${chatbotId}`],
    enabled: !!chatbotId,
  });

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

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <div className="border-b">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                {chatbot.logoUrl ? (
                  <img 
                    src={chatbot.logoUrl} 
                    alt={chatbot.name}
                    className="w-10 h-10 rounded-lg object-cover"
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
                  <p className="text-sm text-muted-foreground">Chatbot Configuration</p>
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

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Knowledge Base */}
          <Card data-testid="card-knowledge">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                <CardTitle>Knowledge Base</CardTitle>
              </div>
              <CardDescription>Content sources for AI responses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Website URLs</h4>
                {chatbot.websiteUrls && chatbot.websiteUrls.length > 0 ? (
                  <div className="space-y-2">
                    {chatbot.websiteUrls.map((url, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm" data-testid={`text-website-url-${index}`}>
                        <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
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
              </div>
              
              <Separator />
              
              <div>
                <h4 className="text-sm font-semibold mb-2">Documents</h4>
                {chatbot.documents && chatbot.documents.length > 0 ? (
                  <div className="space-y-2">
                    {chatbot.documents.map((doc, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm" data-testid={`text-document-${index}`}>
                        <FileText className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{doc.split('/').pop()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No documents uploaded</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Personality & Tone */}
          <Card data-testid="card-personality">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <CardTitle>Personality & Tone</CardTitle>
              </div>
              <CardDescription>How your chatbot communicates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">System Prompt</h4>
                <p className="text-sm text-muted-foreground" data-testid="text-system-prompt">{chatbot.systemPrompt}</p>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="text-sm font-semibold mb-2">Welcome Message</h4>
                <p className="text-sm text-muted-foreground" data-testid="text-welcome-message">{chatbot.welcomeMessage}</p>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="text-sm font-semibold mb-2">Suggested Questions</h4>
                {chatbot.suggestedQuestions && chatbot.suggestedQuestions.length > 0 ? (
                  <div className="space-y-1">
                    {chatbot.suggestedQuestions.map((question, index) => (
                      <div key={index} className="text-sm text-muted-foreground" data-testid={`text-suggested-question-${index}`}>
                        • {question}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No suggested questions</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Customization */}
          <Card data-testid="card-customization">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                <CardTitle>Visual Customization</CardTitle>
              </div>
              <CardDescription>Branding and appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-3">Colors</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Primary Color</p>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: sanitizeColor(chatbot.primaryColor) }}
                        data-testid="color-primary"
                      />
                      <span className="text-sm font-mono">{chatbot.primaryColor}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Accent Color</p>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: sanitizeColor(chatbot.accentColor) }}
                        data-testid="color-accent"
                      />
                      <span className="text-sm font-mono">{chatbot.accentColor}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="text-sm font-semibold mb-2">Logo</h4>
                {chatbot.logoUrl ? (
                  <div className="flex items-center gap-3">
                    <img 
                      src={chatbot.logoUrl} 
                      alt="Chatbot logo"
                      className="w-12 h-12 rounded object-cover border"
                      data-testid="img-logo"
                    />
                    <a 
                      href={chatbot.logoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline truncate"
                    >
                      View logo
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No logo uploaded</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Escalation */}
          <Card data-testid="card-escalation">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" />
                <CardTitle>Support Escalation</CardTitle>
              </div>
              <CardDescription>Handling complex inquiries</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Support Phone Number</h4>
                {chatbot.supportPhoneNumber ? (
                  <p className="text-sm text-muted-foreground" data-testid="text-phone">{chatbot.supportPhoneNumber}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Not configured</p>
                )}
              </div>
              
              <Separator />
              
              <div>
                <h4 className="text-sm font-semibold mb-2">Escalation Message</h4>
                <p className="text-sm text-muted-foreground" data-testid="text-escalation-message">
                  {chatbot.escalationMessage || "No escalation message"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Lead Capture */}
          <Card data-testid="card-lead-capture">
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                <CardTitle>Lead Capture</CardTitle>
              </div>
              <CardDescription>Collecting visitor information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Status</h4>
                <Badge 
                  variant={chatbot.leadCaptureEnabled === "true" ? "default" : "secondary"}
                  data-testid="badge-lead-capture-status"
                >
                  {chatbot.leadCaptureEnabled === "true" ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              
              {chatbot.leadCaptureEnabled === "true" && (
                <>
                  <Separator />
                  
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Capture Fields</h4>
                    <div className="flex flex-wrap gap-2">
                      {chatbot.leadCaptureFields?.map((field, index) => (
                        <Badge key={index} variant="outline" data-testid={`badge-field-${field}`}>
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Form Title</h4>
                    <p className="text-sm text-muted-foreground" data-testid="text-lead-title">
                      {chatbot.leadCaptureTitle}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Form Message</h4>
                    <p className="text-sm text-muted-foreground" data-testid="text-lead-message">
                      {chatbot.leadCaptureMessage}
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Timing</h4>
                    <p className="text-sm text-muted-foreground capitalize" data-testid="text-lead-timing">
                      {chatbot.leadCaptureTiming?.replace(/_/g, ' ')}
                      {chatbot.leadCaptureTiming === 'after_x_messages' && 
                        ` (${chatbot.leadCaptureMessageCount} messages)`
                      }
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Proactive Chat */}
          <Card data-testid="card-proactive-chat">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <CardTitle>Proactive Chat</CardTitle>
              </div>
              <CardDescription>Automatic engagement popup</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Status</h4>
                <Badge 
                  variant={chatbot.proactiveChatEnabled === "true" ? "default" : "secondary"}
                  data-testid="badge-proactive-status"
                >
                  {chatbot.proactiveChatEnabled === "true" ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              
              {chatbot.proactiveChatEnabled === "true" && (
                <>
                  <Separator />
                  
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Delay</h4>
                    <p className="text-sm text-muted-foreground" data-testid="text-proactive-delay">
                      {chatbot.proactiveChatDelay} seconds
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Popup Message</h4>
                    <p className="text-sm text-muted-foreground" data-testid="text-proactive-message">
                      {chatbot.proactiveChatMessage}
                    </p>
                  </div>
                  
                  {chatbot.proactiveChatTriggerUrls && chatbot.proactiveChatTriggerUrls.length > 0 && (
                    <>
                      <Separator />
                      
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Trigger URLs</h4>
                        <div className="space-y-1">
                          {chatbot.proactiveChatTriggerUrls.map((url, index) => (
                            <p key={index} className="text-sm text-muted-foreground" data-testid={`text-trigger-url-${index}`}>
                              • {url}
                            </p>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Statistics & Metadata */}
          <Card data-testid="card-statistics">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <CardTitle>Statistics & Info</CardTitle>
              </div>
              <CardDescription>Usage and metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Total Questions Answered</h4>
                <p className="text-2xl font-bold" data-testid="text-question-count">
                  {chatbot.questionCount || "0"}
                </p>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="text-sm font-semibold mb-2">Created</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span data-testid="text-created-at">
                    {chatbot.createdAt ? formatDistanceToNow(new Date(chatbot.createdAt), { addSuffix: true }) : "Unknown"}
                  </span>
                </div>
              </div>
              
              {chatbot.lastKnowledgeUpdate && (
                <>
                  <Separator />
                  
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Last Knowledge Update</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
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
      </div>
    </div>
  );
}
