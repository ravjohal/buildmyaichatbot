import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowRight, ArrowLeft, Check, Bot, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StepIndicator } from "@/components/StepIndicator";
import { StepName } from "@/components/wizard/StepName";
import { StepKnowledgeBase } from "@/components/wizard/StepKnowledgeBase";
import { StepPersonality } from "@/components/wizard/StepPersonality";
import { StepCustomization } from "@/components/wizard/StepCustomization";
import { StepEscalation } from "@/components/wizard/StepEscalation";
import { StepLeadCapture } from "@/components/wizard/StepLeadCapture";
import { StepComplete } from "@/components/wizard/StepComplete";
import type { InsertChatbot, User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/DashboardHeader";

const STEPS = [
  { number: 1, title: "Name", description: "Identify your chatbot" },
  { number: 2, title: "Knowledge Base", description: "Add your content" },
  { number: 3, title: "Personality", description: "Define behavior" },
  { number: 4, title: "Customization", description: "Brand your widget" },
  { number: 5, title: "Escalation", description: "Set up support" },
  { number: 6, title: "Lead Capture", description: "Collect contact info" },
];

interface IndexingStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    totalUrls: number;
    processedUrls: number;
    currentUrl?: string;
  };
  result?: {
    websiteContent: string;
    urlMetadata: any[];
  };
  error?: string;
}

export default function CreateChatbot() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdChatbotId, setCreatedChatbotId] = useState<string | null>(null);
  const [indexingStatus, setIndexingStatus] = useState<IndexingStatus | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const isFreeTier = user?.subscriptionTier === "free";
  
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
    leadCaptureEnabled: "false",
    leadCaptureFields: ["name", "email"],
    leadCaptureTitle: "Get in Touch",
    leadCaptureMessage: "Leave your contact information and we'll get back to you.",
    leadCaptureTiming: "after_first_message",
    leadCaptureMessageCount: "1",
    proactiveChatEnabled: "false",
    proactiveChatDelay: "5",
    proactiveChatMessage: "Hi! Need any help?",
  });

  const updateFormData = (updates: Partial<InsertChatbot>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // Poll for indexing status
  useEffect(() => {
    if (createdChatbotId && indexingStatus && indexingStatus.status !== 'completed' && indexingStatus.status !== 'failed') {
      const pollStatus = async () => {
        try {
          const res = await fetch(`/api/chatbots/${createdChatbotId}/indexing-status`, {
            credentials: 'include',
          });
          
          if (res.ok) {
            const data = await res.json();
            
            setIndexingStatus({
              jobId: data.jobId,
              status: data.status,
              progress: {
                totalUrls: data.totalTasks || 0,
                processedUrls: data.completedTasks || 0,
              },
              error: data.error,
            });
            
            if (data.status === 'completed') {
              toast({
                title: "Indexing complete",
                description: "Your website content has been successfully indexed.",
              });
              
              // Stop polling
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
            } else if (data.status === 'failed') {
              toast({
                title: "Indexing failed",
                description: "Some URLs failed to index. Your chatbot will still work with available content.",
                variant: "destructive",
              });
              
              // Stop polling
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
            }
          }
        } catch (error) {
          console.error("Error polling indexing status:", error);
        }
      };
      
      // Poll every 3 seconds
      pollingIntervalRef.current = setInterval(pollStatus, 3000);
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [createdChatbotId, indexingStatus?.status]);

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
      case 6:
        return true; // Lead capture is optional
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (currentStep < 6) {
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
      // Create chatbot immediately - backend handles async indexing
      const res = await apiRequest("POST", "/api/chatbots", formData as any);
      const chatbot = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/chatbots"] });
      
      // If chatbot has an indexing job, start polling for status
      if (chatbot.indexingJobId) {
        setIndexingStatus({
          jobId: chatbot.indexingJobId,
          status: chatbot.indexingStatus || 'pending',
          progress: {
            totalUrls: formData.websiteUrls?.length || 0,
            processedUrls: 0,
          },
        });
      }
      
      setCreatedChatbotId(chatbot.id);
      toast({
        title: "Chatbot created!",
        description: chatbot.indexingJobId 
          ? "Your chatbot is ready! URLs are being indexed in the background."
          : "Your AI assistant is ready to deploy.",
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
    return <StepComplete chatbotId={createdChatbotId} indexingStatus={indexingStatus} />;
  }

  return (
    <div className="min-h-screen bg-background relative">
      <DashboardHeader />
      
      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" data-testid="loader-creating" />
            <div className="text-center">
              <p className="text-lg font-semibold">Creating your chatbot...</p>
              <p className="text-sm text-muted-foreground">This may take a moment</p>
            </div>
          </div>
        </div>
      )}
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
                <p className="text-sm text-muted-foreground">Step {currentStep} of 6</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <StepIndicator steps={STEPS} currentStep={currentStep} />

        {/* Indexing Status Indicator */}
        {indexingStatus && (
          <div className={`mt-6 p-4 rounded-lg border ${
            indexingStatus.status === 'completed' 
              ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' 
              : indexingStatus.status === 'failed'
              ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
              : 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
          }`} data-testid="indexing-status">
            <div className="flex items-center gap-3">
              {indexingStatus.status === 'processing' || indexingStatus.status === 'pending' ? (
                <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
              ) : indexingStatus.status === 'completed' ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${
                  indexingStatus.status === 'completed'
                    ? 'text-green-900 dark:text-green-100'
                    : indexingStatus.status === 'failed'
                    ? 'text-red-900 dark:text-red-100'
                    : 'text-blue-900 dark:text-blue-100'
                }`}>
                  {indexingStatus.status === 'processing' && 'Indexing your content in the background...'}
                  {indexingStatus.status === 'pending' && 'Starting content indexing...'}
                  {indexingStatus.status === 'completed' && 'Content indexed successfully!'}
                  {indexingStatus.status === 'failed' && 'Indexing failed'}
                </p>
                {(indexingStatus.status === 'processing' || indexingStatus.status === 'pending') && (
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Processing {indexingStatus.progress.processedUrls} of {indexingStatus.progress.totalUrls} URLs
                  </p>
                )}
                {indexingStatus.status === 'failed' && indexingStatus.error && (
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {indexingStatus.error}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <Card className="mt-8">
          <CardContent className="p-8">
            {currentStep === 1 && (
              <StepName formData={formData} updateFormData={updateFormData} />
            )}
            {currentStep === 2 && (
              // @ts-ignore - documentMetadata type mismatch is safe, validated on backend
              <StepKnowledgeBase formData={formData} updateFormData={updateFormData} />
            )}
            {currentStep === 3 && (
              <StepPersonality formData={formData} updateFormData={updateFormData} />
            )}
            {currentStep === 4 && (
              <StepCustomization formData={formData} updateFormData={updateFormData} isFreeTier={isFreeTier} />
            )}
            {currentStep === 5 && (
              <StepEscalation formData={formData} updateFormData={updateFormData} />
            )}
            {currentStep === 6 && (
              <StepLeadCapture formData={formData} updateFormData={updateFormData} />
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

          {currentStep < 6 ? (
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
