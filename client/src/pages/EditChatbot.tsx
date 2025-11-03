import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Chatbot, InsertChatbot } from "@shared/schema";

import { StepName } from "@/components/wizard/StepName";
import { StepKnowledgeBase } from "@/components/wizard/StepKnowledgeBase";
import { StepPersonality } from "@/components/wizard/StepPersonality";
import { StepCustomization } from "@/components/wizard/StepCustomization";
import { StepEscalation } from "@/components/wizard/StepEscalation";
import { StepLeadCapture } from "@/components/wizard/StepLeadCapture";
import { DashboardHeader } from "@/components/DashboardHeader";
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
import { RefreshCw } from "lucide-react";

type WizardStep = "name" | "knowledge" | "personality" | "customization" | "escalation" | "leadcapture";

interface DocumentMetadata {
  path: string;
  originalName: string;
  title: string;
  text: string;
  size: number;
  type: string;
}

interface ExtendedFormData extends Partial<InsertChatbot> {
  documentMetadata?: DocumentMetadata[];
}

const steps: { id: WizardStep; label: string; number: number }[] = [
  { id: "name", label: "Name & Description", number: 1 },
  { id: "knowledge", label: "Knowledge Base", number: 2 },
  { id: "personality", label: "Personality & Tone", number: 3 },
  { id: "customization", label: "Customization", number: 4 },
  { id: "escalation", label: "Escalation", number: 5 },
  { id: "leadcapture", label: "Lead Capture", number: 6 },
];

export default function EditChatbot() {
  const [, params] = useRoute("/edit/:id");
  const [, navigate] = useLocation();
  const chatbotId = params?.id || "";
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState<WizardStep>("name");
  const [formData, setFormData] = useState<ExtendedFormData>({});
  const [showReindexDialog, setShowReindexDialog] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);

  const { data: chatbot, isLoading } = useQuery<Chatbot>({
    queryKey: [`/api/chatbots/${chatbotId}`],
    enabled: !!chatbotId,
  });

  useEffect(() => {
    if (chatbot) {
      // Normalize null values to undefined/arrays for InsertChatbot schema compatibility
      setFormData({
        name: chatbot.name,
        websiteUrls: chatbot.websiteUrls || [],
        websiteContent: chatbot.websiteContent || undefined,
        documents: chatbot.documents || [],
        documentMetadata: (chatbot.documentMetadata as DocumentMetadata[]) || [],
        systemPrompt: chatbot.systemPrompt,
        primaryColor: chatbot.primaryColor,
        accentColor: chatbot.accentColor,
        logoUrl: chatbot.logoUrl || undefined,
        welcomeMessage: chatbot.welcomeMessage,
        suggestedQuestions: chatbot.suggestedQuestions || [],
        enableSuggestedQuestions: chatbot.enableSuggestedQuestions || "false",
        supportPhoneNumber: chatbot.supportPhoneNumber || undefined,
        escalationMessage: chatbot.escalationMessage || undefined,
        leadCaptureEnabled: chatbot.leadCaptureEnabled || "false",
        leadCaptureFields: chatbot.leadCaptureFields || ["name", "email"],
        leadCaptureTitle: chatbot.leadCaptureTitle || "Get in Touch",
        leadCaptureMessage: chatbot.leadCaptureMessage || "Leave your contact information and we'll get back to you.",
        leadCaptureTiming: chatbot.leadCaptureTiming || "after_first_message",
        leadCaptureMessageCount: chatbot.leadCaptureMessageCount || "1",
      });
    }
  }, [chatbot]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertChatbot>) => {
      const response = await apiRequest("PUT", `/api/chatbots/${chatbotId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots"] });
      queryClient.invalidateQueries({ queryKey: [`/api/chatbots/${chatbotId}`] });
      toast({
        title: "Chatbot updated!",
        description: "Your changes have been saved successfully.",
      });
      // Only show re-index dialog if knowledge sources were actually modified
      if (hasKnowledgeSourcesChanged()) {
        setShowReindexDialog(true);
      } else {
        navigate("/");
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update chatbot. Please try again.",
        variant: "destructive",
      });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/chatbots/${chatbotId}/refresh-knowledge`, {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots"] });
      queryClient.invalidateQueries({ queryKey: [`/api/chatbots/${chatbotId}`] });
      toast({
        title: "Re-indexing started",
        description: data.message || "Your chatbot's knowledge base is being updated.",
      });
      setIsReindexing(false);
      setShowReindexDialog(false);
      navigate("/");
    },
    onError: () => {
      toast({
        title: "Re-index failed",
        description: "Failed to start re-indexing. Please try again from the dashboard.",
        variant: "destructive",
      });
      setIsReindexing(false);
      setShowReindexDialog(false);
      navigate("/");
    },
  });

  const handleUpdateData = (data: Partial<InsertChatbot> | ExtendedFormData) => {
    setFormData((prev) => {
      const updated = { ...prev, ...data };
      // Ensure documentMetadata is properly typed
      if ('documentMetadata' in data && data.documentMetadata !== undefined) {
        updated.documentMetadata = data.documentMetadata as DocumentMetadata[];
      }
      return updated as ExtendedFormData;
    });
  };

  // Check if knowledge sources have changed by comparing current form data to original chatbot
  const hasKnowledgeSourcesChanged = (): boolean => {
    if (!chatbot) return false;
    
    // Normalize array values for comparison (treat null, undefined, and [] as equivalent)
    const normalizeArray = (val: any[] | null | undefined) => JSON.stringify(val || []);
    
    // Normalize string values for comparison (treat null, undefined, and "" as equivalent)
    const normalizeString = (val: string | null | undefined) => (val || "").trim();
    
    // Compare all knowledge-related fields
    const urlsChanged = normalizeArray(formData.websiteUrls) !== normalizeArray(chatbot.websiteUrls);
    const docsChanged = normalizeArray(formData.documents) !== normalizeArray(chatbot.documents);
    const contentChanged = normalizeString(formData.websiteContent) !== normalizeString(chatbot.websiteContent);
    const metadataChanged = normalizeArray(formData.documentMetadata) !== normalizeArray(chatbot.documentMetadata as DocumentMetadata[]);
    
    return urlsChanged || docsChanged || contentChanged || metadataChanged;
  };

  const handleReindex = () => {
    setIsReindexing(true);
    refreshMutation.mutate();
  };

  const handleSkipReindex = () => {
    setShowReindexDialog(false);
    navigate("/");
  };

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case "name":
        return formData.name && formData.name.trim().length > 0;
      case "knowledge":
        return true;
      case "personality":
        return formData.systemPrompt && formData.systemPrompt.trim().length > 0;
      case "customization":
        return formData.primaryColor && formData.accentColor;
      case "escalation":
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  if (isLoading || !chatbot) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading chatbot...</p>
          </div>
        </div>
      </div>
    );
  }

  const isLastStep = currentStep === "escalation";

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Edit Chatbot</h1>
          <p className="text-muted-foreground">
            Update your chatbot settings and configuration
          </p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {steps[currentStepIndex].label}
            </span>
          </div>
          <Progress value={progress} />
        </div>

        <div className="bg-card rounded-lg border p-8 mb-6">
          {currentStep === "name" && (
            <StepName formData={formData} updateFormData={handleUpdateData} />
          )}
          {currentStep === "knowledge" && (
            <StepKnowledgeBase formData={formData} updateFormData={handleUpdateData} />
          )}
          {currentStep === "personality" && (
            <StepPersonality formData={formData} updateFormData={handleUpdateData} />
          )}
          {currentStep === "customization" && (
            <StepCustomization formData={formData} updateFormData={handleUpdateData} />
          )}
          {currentStep === "escalation" && (
            <StepEscalation formData={formData} updateFormData={handleUpdateData} />
          )}
          {currentStep === "leadcapture" && (
            <StepLeadCapture formData={formData} updateFormData={handleUpdateData} />
          )}
        </div>

        <div className="flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
            data-testid="button-previous-step"
          >
            Previous
          </Button>

          {!isLastStep ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              data-testid="button-next-step"
            >
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={!canProceed() || updateMutation.isPending}
              data-testid="button-save-chatbot"
            >
              {updateMutation.isPending ? (
                <>Saving...</>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Re-index Knowledge Dialog */}
      <AlertDialog open={showReindexDialog} onOpenChange={setShowReindexDialog}>
        <AlertDialogContent data-testid="dialog-reindex-prompt">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Re-index Knowledge Base?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-left">
              <p>
                Your chatbot configuration has been updated successfully!
              </p>
              <p>
                Would you like to re-index your knowledge sources now? This will:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Re-crawl all website URLs for fresh content</li>
                <li>Update embeddings with latest information</li>
                <li>May take a few minutes to complete</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                You can also refresh the knowledge base later from your dashboard.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleSkipReindex}
              disabled={isReindexing}
              data-testid="button-skip-reindex"
            >
              Skip for Now
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReindex}
              disabled={isReindexing}
              data-testid="button-confirm-reindex"
            >
              {isReindexing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Re-index Now
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
