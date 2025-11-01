import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Bot, Trash2, ExternalLink, Copy, LogOut, Pencil, MessageSquare, FileText, BarChart3, Globe, Crown, Share2, QrCode, User as UserIcon, Shield, UserPlus, RefreshCw, Settings, Loader2, CheckCircle, XCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { Chatbot, User } from "@shared/schema";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Dashboard() {
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewKnowledgeBase, setViewKnowledgeBase] = useState<Chatbot | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [shareDialogChatbot, setShareDialogChatbot] = useState<Chatbot | null>(null);
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const [selectedEmbedCode, setSelectedEmbedCode] = useState("");

  const { data: chatbots, isLoading } = useQuery<Chatbot[]>({
    queryKey: ["/api/chatbots"],
  });

  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const isAdmin = user?.isAdmin === "true";
  const isFreeTier = user?.subscriptionTier === "free" && !isAdmin;
  const hasReachedFreeTierLimit = isFreeTier && (chatbots?.length ?? 0) >= 1;

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await apiRequest("DELETE", `/api/chatbots/${deleteId}`);
      await queryClient.invalidateQueries({ queryKey: ["/api/chatbots"] });
      toast({
        title: "Chatbot deleted",
        description: "Your chatbot has been successfully deleted.",
      });
      setDeleteId(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete chatbot. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCopyEmbed = (chatbotId: string) => {
    const embedCode = `<script src="${window.location.origin}/widget.js" data-chatbot-id="${chatbotId}" async></script>`;
    setSelectedEmbedCode(embedCode);
    setEmbedDialogOpen(true);
  };

  const handleCopyEmbedToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(selectedEmbedCode);
      toast({
        title: "Embed code copied!",
        description: "Paste this code into your website.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please manually copy the code from the dialog.",
        variant: "destructive",
      });
    }
  };

  const handleCopyShareLink = (chatbotId: string) => {
    const shareUrl = `${window.location.origin}/widget/${chatbotId}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link copied!",
      description: "Share this link with your users to access the chatbot directly.",
    });
  };

  const handleRefreshKnowledge = async (chatbotId: string) => {
    setRefreshingId(chatbotId);
    try {
      const response = await apiRequest("POST", `/api/chatbots/${chatbotId}/refresh-knowledge`, {});
      
      if (!response.ok) {
        throw new Error("Refresh failed");
      }
      
      const data = await response.json();
      
      await queryClient.invalidateQueries({ queryKey: ["/api/chatbots"] });
      
      toast({
        title: "Knowledge base refreshed",
        description: data.message || "Your chatbot's knowledge base has been updated.",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Failed to refresh knowledge base. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefreshingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-12">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="h-12 w-64 bg-muted animate-pulse rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">My Chatbots</h1>
              <p className="text-muted-foreground mt-1">Create and manage your AI-powered support assistants</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              {isFreeTier && (
                <Link href="/pricing">
                  <Button size="lg" variant="default" data-testid="button-upgrade-pro">
                    <Crown className="w-5 h-5 mr-2" />
                    Upgrade to Pro
                  </Button>
                </Link>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  {hasReachedFreeTierLimit ? (
                    <span>
                      <Button size="lg" variant="outline" disabled data-testid="button-create-chatbot">
                        <Plus className="w-5 h-5 mr-2" />
                        Create Chatbot
                      </Button>
                    </span>
                  ) : (
                    <Link href="/create">
                      <Button size="lg" variant={isFreeTier ? "outline" : "default"} data-testid="button-create-chatbot">
                        <Plus className="w-5 h-5 mr-2" />
                        Create Chatbot
                      </Button>
                    </Link>
                  )}
                </TooltipTrigger>
                {hasReachedFreeTierLimit && (
                  <TooltipContent>
                    <p>Free tier is limited to 1 chatbot. Upgrade to Pro for unlimited chatbots.</p>
                  </TooltipContent>
                )}
              </Tooltip>
              <Link href="/analytics">
                <Button 
                  variant="outline" 
                  size="lg"
                  data-testid="button-analytics"
                >
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Analytics
                </Button>
              </Link>
              <Link href="/leads">
                <Button 
                  variant="outline" 
                  size="lg"
                  data-testid="button-leads"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Leads
                </Button>
              </Link>
              <Link href="/account">
                <Button 
                  variant="outline" 
                  size="lg"
                  data-testid="button-account"
                >
                  <UserIcon className="w-5 h-5 mr-2" />
                  Account
                </Button>
              </Link>
              <Link href="/account/notifications">
                <Button 
                  variant="outline" 
                  size="lg"
                  data-testid="button-notifications"
                >
                  <Settings className="w-5 h-5 mr-2" />
                  Notifications
                </Button>
              </Link>
              {user?.isAdmin === "true" && (
                <Link href="/admin">
                  <Button 
                    variant="destructive" 
                    size="lg"
                    data-testid="button-admin"
                  >
                    <Shield className="w-5 h-5 mr-2" />
                    Admin
                  </Button>
                </Link>
              )}
              <Button 
                variant="outline" 
                size="lg"
                onClick={async () => {
                  await apiRequest("POST", "/api/auth/logout", {});
                  queryClient.clear();
                  window.location.href = "/";
                }}
                data-testid="button-logout"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        {!chatbots || chatbots.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No chatbots yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Get started by creating your first AI chatbot. It only takes a few minutes to set up!
              </p>
              <Link href="/create">
                <Button size="lg" data-testid="button-create-first-chatbot">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Chatbot
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chatbots.map((chatbot) => (
              <Card key={chatbot.id} className="hover-elevate" data-testid={`card-chatbot-${chatbot.id}`}>
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    {chatbot.logoUrl ? (
                      <img 
                        src={chatbot.logoUrl} 
                        alt={chatbot.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: chatbot.primaryColor + "20" }}
                      >
                        <Bot className="w-6 h-6" style={{ color: chatbot.primaryColor }} />
                      </div>
                    )}
                    {chatbot.indexingStatus === 'pending' || chatbot.indexingStatus === 'processing' ? (
                      <Badge variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300" data-testid={`badge-indexing-${chatbot.id}`}>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Indexing
                      </Badge>
                    ) : chatbot.indexingStatus === 'failed' ? (
                      <Badge variant="secondary" className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300" data-testid={`badge-failed-${chatbot.id}`}>
                        <XCircle className="w-3 h-3 mr-1" />
                        Failed
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs" data-testid={`badge-active-${chatbot.id}`}>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-xl" data-testid={`text-chatbot-name-${chatbot.id}`}>
                      {chatbot.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {chatbot.websiteUrls && chatbot.websiteUrls.length > 0 ? (
                        <a 
                          href={chatbot.websiteUrls[0]} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm hover:underline flex items-center gap-1"
                        >
                          {new URL(chatbot.websiteUrls[0]).hostname}
                          {chatbot.websiteUrls.length > 1 && ` +${chatbot.websiteUrls.length - 1} more`}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-sm">No website linked</span>
                      )}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chatbot.primaryColor }} />
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chatbot.accentColor }} />
                    </div>
                    <span>Custom colors</span>
                  </div>
                  {chatbot.suggestedQuestions && chatbot.suggestedQuestions.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {chatbot.suggestedQuestions.length} suggested question{chatbot.suggestedQuestions.length !== 1 ? 's' : ''}
                    </div>
                  )}
                  {chatbot.websiteContent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewKnowledgeBase(chatbot)}
                      className="w-full justify-start text-sm text-muted-foreground hover:text-foreground"
                      data-testid={`button-view-knowledge-${chatbot.id}`}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      View indexed content ({Math.round(chatbot.websiteContent.length / 1000)}k characters)
                    </Button>
                  )}
                </CardContent>
                <CardFooter className="flex gap-2 flex-wrap">
                  <Link href={`/chat/${chatbot.id}`} target="_blank">
                    <Button
                      variant="default"
                      size="sm"
                      data-testid={`button-test-${chatbot.id}`}
                      className="flex-1"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Test
                    </Button>
                  </Link>
                  {isFreeTier ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      data-testid={`button-analytics-${chatbot.id}`}
                      className="flex-1"
                      onClick={() => {
                        toast({
                          title: "Upgrade Required",
                          description: "Analytics are only available on the Pro plan.",
                          variant: "destructive",
                        });
                      }}
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Analytics
                    </Button>
                  ) : (
                    <Link href={`/analytics/${chatbot.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`button-analytics-${chatbot.id}`}
                        className="flex-1"
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Analytics
                      </Button>
                    </Link>
                  )}
                  <Link href={`/edit/${chatbot.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid={`button-edit-${chatbot.id}`}
                      className="flex-1"
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRefreshKnowledge(chatbot.id)}
                        disabled={refreshingId === chatbot.id || !chatbot.websiteUrls || chatbot.websiteUrls.length === 0}
                        data-testid={`button-refresh-${chatbot.id}`}
                        className="flex-1"
                      >
                        {refreshingId === chatbot.id ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Refresh
                      </Button>
                    </TooltipTrigger>
                    {(!chatbot.websiteUrls || chatbot.websiteUrls.length === 0) && (
                      <TooltipContent>
                        <p>No website URLs to refresh. Add URLs in the edit page.</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyEmbed(chatbot.id)}
                    data-testid={`button-copy-embed-${chatbot.id}`}
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Embed
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/demo.html?chatbotId=${chatbot.id}`, '_blank')}
                    data-testid={`button-demo-${chatbot.id}`}
                    className="flex-1"
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Demo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShareDialogChatbot(chatbot)}
                    data-testid={`button-share-${chatbot.id}`}
                    className="flex-1"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteId(chatbot.id)}
                    data-testid={`button-delete-${chatbot.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chatbot?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your chatbot and remove it from your dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={embedDialogOpen} onOpenChange={setEmbedDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Embed Code</DialogTitle>
            <DialogDescription>
              Copy this code and paste it into your website's HTML, right before the closing &lt;/body&gt; tag.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <pre className="p-4 bg-muted rounded-md overflow-x-auto text-sm">
                <code data-testid="text-embed-code">{selectedEmbedCode}</code>
              </pre>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEmbedDialogOpen(false)}
                data-testid="button-close-embed-dialog"
              >
                Close
              </Button>
              <Button
                onClick={handleCopyEmbedToClipboard}
                data-testid="button-copy-embed-code"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy to Clipboard
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewKnowledgeBase} onOpenChange={(open) => !open && setViewKnowledgeBase(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Knowledge Base Content</DialogTitle>
            <DialogDescription>
              Content indexed from your website URLs
            </DialogDescription>
          </DialogHeader>
          
          {viewKnowledgeBase && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Crawled URLs</h4>
                <div className="space-y-1">
                  {viewKnowledgeBase.websiteUrls?.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-2"
                      data-testid={`link-crawled-url-${index}`}
                    >
                      <ExternalLink className="w-3 h-3" />
                      {url}
                    </a>
                  )) || <p className="text-sm text-muted-foreground">No URLs indexed</p>}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Indexed Text Content</h4>
                  {viewKnowledgeBase.websiteContent && (
                    <Badge variant="secondary" className="text-xs">
                      {viewKnowledgeBase.websiteContent.split(/\s+/).length.toLocaleString()} words
                    </Badge>
                  )}
                </div>
                <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                  {viewKnowledgeBase.websiteContent ? (
                    <div className="text-sm whitespace-pre-wrap font-mono text-muted-foreground" data-testid="text-indexed-content">
                      {viewKnowledgeBase.websiteContent}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No content has been indexed yet</p>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!shareDialogChatbot} onOpenChange={(open) => !open && setShareDialogChatbot(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Chatbot</DialogTitle>
            <DialogDescription>
              Share this link or QR code with your users to give them direct access to the chatbot
            </DialogDescription>
          </DialogHeader>
          
          {shareDialogChatbot && (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium">Shareable Link</label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/widget/${shareDialogChatbot.id}`}
                    className="flex-1 bg-muted"
                    data-testid="input-share-link"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleCopyShareLink(shareDialogChatbot.id)}
                    data-testid="button-copy-share-link"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Users can access the chatbot directly through this link without embedding it on a website
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">QR Code</label>
                <div className="flex justify-center p-6 bg-background dark:bg-white rounded-lg border">
                  <QRCodeSVG
                    value={`${window.location.origin}/widget/${shareDialogChatbot.id}`}
                    size={200}
                    level="H"
                    data-testid="qr-code"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Scan this QR code to access the chatbot on mobile devices
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
