import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Bot, Trash2, ExternalLink, Copy, LogOut, Pencil, MessageSquare, FileText, BarChart3, Globe, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export default function Dashboard() {
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewKnowledgeBase, setViewKnowledgeBase] = useState<Chatbot | null>(null);

  const { data: chatbots, isLoading } = useQuery<Chatbot[]>({
    queryKey: ["/api/chatbots"],
  });

  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const isFreeTier = user?.subscriptionTier === "free";

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
    if (isFreeTier) {
      toast({
        title: "Upgrade Required",
        description: "Embedding chatbots requires a paid plan. Upgrade to unlock this feature.",
        variant: "destructive",
      });
      return;
    }
    
    const embedCode = `<script src="${window.location.origin}/widget.js" data-chatbot-id="${chatbotId}" async></script>`;
    navigator.clipboard.writeText(embedCode);
    toast({
      title: "Embed code copied!",
      description: "Paste this code into your website.",
    });
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
              <Link href="/create">
                <Button size="lg" variant={isFreeTier ? "outline" : "default"} data-testid="button-create-chatbot">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Chatbot
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => window.location.href = "/api/logout"}
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
                    <Badge variant="secondary" className="text-xs">Active</Badge>
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
                  <Link href={`/test/${chatbot.id}`}>
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
    </div>
  );
}
