import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Check } from "lucide-react";
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

type WizardStep = "name" | "knowledge" | "personality" | "customization" | "escalation" | "leadcapture";

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
  const [formData, setFormData] = useState<Partial<InsertChatbot>>({});

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
        systemPrompt: chatbot.systemPrompt,
        primaryColor: chatbot.primaryColor,
        accentColor: chatbot.accentColor,
        logoUrl: chatbot.logoUrl || undefined,
        welcomeMessage: chatbot.welcomeMessage,
        suggestedQuestions: chatbot.suggestedQuestions || [],
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
      navigate("/");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update chatbot. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleUpdateData = (data: Partial<InsertChatbot>) => {
    setFormData((prev) => ({ ...prev, ...data }));
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading chatbot...</p>
        </div>
      </div>
    );
  }

  const isLastStep = currentStep === "escalation";

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <Button variant="ghost" onClick={() => navigate("/")} data-testid="button-back-dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>

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
    </div>
  );
}
