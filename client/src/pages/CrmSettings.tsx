import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/DashboardHeader";
import { CrmIntegrationSettings } from "@/components/CrmIntegrationSettings";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { Chatbot } from "@shared/schema";

export default function CrmSettings() {
  const [, params] = useRoute("/chatbot/:id/crm");
  const [, navigate] = useLocation();
  const chatbotId = params?.id || "";

  const { data: chatbot, isLoading } = useQuery<Chatbot>({
    queryKey: [`/api/chatbots/${chatbotId}`],
    enabled: !!chatbotId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="container mx-auto py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Chatbot not found</h2>
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="mt-4"
              data-testid="button-back-dashboard"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">{chatbot.name}</h1>
          <p className="text-muted-foreground mt-1">
            Configure CRM integration to automatically sync captured leads
          </p>
        </div>

        <CrmIntegrationSettings chatbotId={chatbotId} />
      </div>
    </div>
  );
}
