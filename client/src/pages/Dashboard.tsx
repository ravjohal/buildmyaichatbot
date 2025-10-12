import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Bot, Trash2, ExternalLink, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Chatbot } from "@shared/schema";
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

export default function Dashboard() {
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: chatbots, isLoading } = useQuery<Chatbot[]>({
    queryKey: ["/api/chatbots"],
  });

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
            <Link href="/create">
              <Button size="lg" data-testid="button-create-chatbot">
                <Plus className="w-5 h-5 mr-2" />
                Create Chatbot
              </Button>
            </Link>
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
                      {chatbot.websiteUrl ? (
                        <a 
                          href={chatbot.websiteUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm hover:underline flex items-center gap-1"
                        >
                          {new URL(chatbot.websiteUrl).hostname}
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
                </CardContent>
                <CardFooter className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyEmbed(chatbot.id)}
                    data-testid={`button-copy-embed-${chatbot.id}`}
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Embed
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
    </div>
  );
}
