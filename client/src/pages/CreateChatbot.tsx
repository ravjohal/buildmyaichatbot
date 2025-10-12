import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Check, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StepIndicator } from "@/components/StepIndicator";
import { StepName } from "@/components/wizard/StepName";
import { StepKnowledgeBase } from "@/components/wizard/StepKnowledgeBase";
import { StepPersonality } from "@/components/wizard/StepPersonality";
import { StepCustomization } from "@/components/wizard/StepCustomization";
import { StepEscalation } from "@/components/wizard/StepEscalation";
import { StepComplete } from "@/components/wizard/StepComplete";
import type { InsertChatbot } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const STEPS = [
  { number: 1, title: "Name", description: "Identify your chatbot" },
  { number: 2, title: "Knowledge Base", description: "Add your content" },
  { number: 3, title: "Personality", description: "Define behavior" },
  { number: 4, title: "Customization", description: "Brand your widget" },
  { number: 5, title: "Escalation", description: "Set up support" },
];

export default function CreateChatbot() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdChatbotId, setCreatedChatbotId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<InsertChatbot>>({
    name: "",
    websiteUrls: [],
    documents: [],
    systemPrompt: "",
    primaryColor: "#0EA5E9",
    accentColor: "#0284C7",
    logoUrl: "",
    welcomeMessage: "Hello! How can I help you today?",
    suggestedQuestions: [],
    supportPhoneNumber: "",
    escalationMessage: "If you need more help, you can reach our team at {phone}.",
  });

  const updateFormData = (updates: Partial<InsertChatbot>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name && formData.name.trim().length > 0;
      case 2:
        return true; // Knowledge base is optional
      case 3:
        return formData.systemPrompt && formData.systemPrompt.trim().length > 0;
      case 4:
        return formData.primaryColor && formData.accentColor && formData.welcomeMessage;
      case 5:
        return true; // Escalation is optional
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate("/");
    }
  };

  const handleComplete = async () => {
    if (!canProceed()) return;

    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/chatbots", formData as InsertChatbot);
      const chatbot = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/chatbots"] });
      setCreatedChatbotId(chatbot.id);
      toast({
        title: "Chatbot created!",
        description: "Your AI assistant is ready to deploy.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create chatbot. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdChatbotId) {
    return <StepComplete chatbotId={createdChatbotId} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Create Chatbot</h1>
                <p className="text-sm text-muted-foreground">Step {currentStep} of 5</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <StepIndicator steps={STEPS} currentStep={currentStep} />

        <Card className="mt-8">
          <CardContent className="p-8">
            {currentStep === 1 && (
              <StepName formData={formData} updateFormData={updateFormData} />
            )}
            {currentStep === 2 && (
              <StepKnowledgeBase formData={formData} updateFormData={updateFormData} />
            )}
            {currentStep === 3 && (
              <StepPersonality formData={formData} updateFormData={updateFormData} />
            )}
            {currentStep === 4 && (
              <StepCustomization formData={formData} updateFormData={updateFormData} />
            )}
            {currentStep === 5 && (
              <StepEscalation formData={formData} updateFormData={updateFormData} />
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-4 mt-8">
          <Button
            variant="outline"
            onClick={handleBack}
            data-testid="button-back-step"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {currentStep < 5 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              data-testid="button-next-step"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={!canProceed() || isSubmitting}
              data-testid="button-create-chatbot"
            >
              {isSubmitting ? (
                <>Creating...</>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Create Chatbot
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
