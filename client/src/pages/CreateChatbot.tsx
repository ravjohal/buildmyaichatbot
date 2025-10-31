import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Check, Bot, Loader2, CheckCircle, XCircle } from "lucide-react";
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
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
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
  });

  const updateFormData = (updates: Partial<InsertChatbot>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // Poll for indexing status
  useEffect(() => {
    if (indexingStatus && indexingStatus.status !== 'completed' && indexingStatus.status !== 'failed') {
      const pollStatus = async () => {
        try {
          const res = await fetch(`/api/indexing/status/${indexingStatus.jobId}`, {
            credentials: 'include',
          });
          
          if (res.ok) {
            const status: IndexingStatus = await res.json();
            // Update state with complete status including result
            setIndexingStatus({
              jobId: status.jobId,
              status: status.status,
              progress: status.progress,
              result: status.result,
              error: status.error,
            });
            
            if (status.status === 'completed' && status.result) {
              toast({
                title: "Indexing complete",
                description: "Your content has been successfully indexed.",
              });
              
              // Stop polling
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
            } else if (status.status === 'failed') {
              toast({
                title: "Indexing failed",
                description: status.error || "Failed to index content. You can proceed without indexed URLs.",
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
      
      // Poll every 2 seconds
      pollingIntervalRef.current = setInterval(pollStatus, 2000);
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [indexingStatus?.jobId, indexingStatus?.status]);

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

  const startIndexing = async (urls: string[]) => {
    if (urls.length === 0) return;
    
    try {
      const res = await apiRequest("POST", "/api/indexing/start", { urls });
      const data = await res.json();
      
      setIndexingStatus({
        jobId: data.jobId,
        status: data.status,
        progress: data.progress,
      });
      
      toast({
        title: "Indexing started",
        description: "We're crawling your website content in the background.",
      });
    } catch (error) {
      console.error("Error starting indexing:", error);
      toast({
        title: "Indexing failed",
        description: "Failed to start indexing. You can proceed without indexed URLs.",
        variant: "destructive",
      });
    }
  };

  const handleNext = async () => {
    if (currentStep === 2 && formData.websiteUrls && formData.websiteUrls.length > 0) {
      // Trigger indexing on Step 2 -> Step 3 transition
      await startIndexing(formData.websiteUrls);
    }
    
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
      // Prepare payload with current formData
      let payload = { ...formData };
      
      // Wait for indexing to complete if it's still in progress
      let finalIndexingStatus = indexingStatus;
      if (indexingStatus && (indexingStatus.status === 'in_progress' || indexingStatus.status === 'pending')) {
        toast({
          title: "Waiting for indexing",
          description: "Waiting for content indexing to complete...",
        });
        
        // Poll until complete or failed
        while (finalIndexingStatus && (finalIndexingStatus.status === 'in_progress' || finalIndexingStatus.status === 'pending')) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const res = await fetch(`/api/indexing/status/${finalIndexingStatus.jobId}`, {
            credentials: 'include',
          });
          
          if (res.ok) {
            const status: IndexingStatus = await res.json();
            finalIndexingStatus = status;
            setIndexingStatus(status);
            
            if (status.status === 'completed' && status.result) {
              // Merge indexed content directly into payload (not relying on state)
              payload = {
                ...payload,
                websiteContent: status.result.websiteContent,
                urlMetadata: status.result.urlMetadata as any,
              };
              break;
            } else if (status.status === 'failed') {
              break;
            }
          } else {
            break;
          }
        }
      } else if (indexingStatus?.status === 'completed' && indexingStatus.result) {
        // Indexing already complete - use the result
        payload = {
          ...payload,
          websiteContent: indexingStatus.result.websiteContent,
          urlMetadata: indexingStatus.result.urlMetadata as any,
        };
      }
      
      // Create chatbot with pre-indexed content merged into payload
      const res = await apiRequest("POST", "/api/chatbots", payload as InsertChatbot);
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
    <div className="min-h-screen bg-background relative">
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
              {indexingStatus.status === 'in_progress' || indexingStatus.status === 'pending' ? (
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
                  {indexingStatus.status === 'in_progress' && 'Indexing your content in the background...'}
                  {indexingStatus.status === 'pending' && 'Starting content indexing...'}
                  {indexingStatus.status === 'completed' && 'Content indexed successfully!'}
                  {indexingStatus.status === 'failed' && 'Indexing failed'}
                </p>
                {(indexingStatus.status === 'in_progress' || indexingStatus.status === 'pending') && (
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
