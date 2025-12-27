import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Chatbot, InsertChatbot, User } from "@shared/schema";

import { StepName } from "@/components/wizard/StepName";
import { StepKnowledgeBase } from "@/components/wizard/StepKnowledgeBase";
import { StepPersonality } from "@/components/wizard/StepPersonality";
import { StepCustomization } from "@/components/wizard/StepCustomization";
import { StepEscalation } from "@/components/wizard/StepEscalation";
import { StepLeadCapture } from "@/components/wizard/StepLeadCapture";
import { StepCrm } from "@/components/wizard/StepCrm";
import { StepComplete } from "@/components/wizard/StepComplete";
import { DashboardHeader } from "@/components/DashboardHeader";
import { StepIndicator } from "@/components/StepIndicator";
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

type WizardStep = "name" | "knowledge" | "personality" | "customization" | "escalation" | "leadcapture" | "crm";

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
  crmEnabled?: string;
  crmIntegrationType?: string;
  crmWebhookUrl?: string;
  crmWebhookMethod?: string;
  crmAuthType?: string;
  crmAuthValue?: string;
  crmCustomHeaders?: Record<string, string>;
  crmFieldMapping?: Record<string, string>;
  crmRetryEnabled?: string;
  crmMaxRetries?: string;
  crmHyphenEndpoint?: string;
  crmHyphenBuilderId?: string;
  crmHyphenUsername?: string;
  crmHyphenApiKey?: string;
  crmHyphenCommunityId?: string;
  crmHyphenSourceId?: string;
  crmHyphenGradeId?: string;
  crmHyphenInfluenceId?: string;
  crmHyphenContactMethodId?: string;
  crmHyphenReference?: string;
  keywordAlertsEnabled?: string;
  keywordAlertKeywords?: string[];
  keywordAlertsEmailEnabled?: string;
  keywordAlertsInAppEnabled?: string;
}

type ChatbotWithCrm = Chatbot & Partial<Pick<ExtendedFormData, 
  'crmEnabled' | 'crmIntegrationType' | 'crmWebhookUrl' | 'crmWebhookMethod' | 
  'crmAuthType' | 'crmAuthValue' | 'crmCustomHeaders' | 'crmFieldMapping' | 
  'crmRetryEnabled' | 'crmMaxRetries' | 'crmHyphenEndpoint' | 'crmHyphenBuilderId' | 
  'crmHyphenUsername' | 'crmHyphenApiKey' | 'crmHyphenCommunityId' | 'crmHyphenSourceId' | 
  'crmHyphenGradeId' | 'crmHyphenInfluenceId' | 'crmHyphenContactMethodId' | 'crmHyphenReference'
>>;

const steps: { id: WizardStep; label: string; number: number }[] = [
  { id: "name", label: "Name & Description", number: 1 },
  { id: "knowledge", label: "Knowledge Base", number: 2 },
  { id: "personality", label: "Personality & Tone", number: 3 },
  { id: "customization", label: "Customization", number: 4 },
  { id: "escalation", label: "Escalation", number: 5 },
  { id: "leadcapture", label: "Lead Capture", number: 6 },
  { id: "crm", label: "CRM Integration", number: 7 },
];

const STEPS = [
  { number: 1, title: "Name", description: "Identify your chatbot" },
  { number: 2, title: "Knowledge Base", description: "Add your content" },
  { number: 3, title: "Personality", description: "Define behavior" },
  { number: 4, title: "Customization", description: "Brand your widget" },
  { number: 5, title: "Escalation", description: "Set up support" },
  { number: 6, title: "Lead Capture", description: "Collect contact info" },
  { number: 7, title: "CRM Integration", description: "Sync leads to CRM" },
];

export default function EditChatbot() {
  const [, params] = useRoute("/edit/:id");
  const [, navigate] = useLocation();
  const chatbotId = params?.id || "";
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState<WizardStep>("name");
  const [formData, setFormData] = useState<ExtendedFormData>({});
  const [originalKnowledgeSources, setOriginalKnowledgeSources] = useState<{
    websiteUrls: string[];
    documents: string[];
    documentMetadata: DocumentMetadata[];
    websiteContent: string | null;
  } | null>(null);
  const [showReindexDialog, setShowReindexDialog] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [indexingStatus, setIndexingStatus] = useState<{
    jobId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: { totalUrls: number; processedUrls: number; };
  } | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const isAdmin = user?.isAdmin === "true" || (typeof user?.isAdmin === "boolean" && user?.isAdmin === true);
  const userTier = user?.subscriptionTier || "free";

  const { data: chatbot, isLoading } = useQuery<ChatbotWithCrm>({
    queryKey: [`/api/chatbots/${chatbotId}`],
    enabled: !!chatbotId,
  });

  const { data: crmIntegration } = useQuery<any>({
    queryKey: [`/api/chatbots/${chatbotId}/crm-integration`],
    enabled: !!chatbotId,
  });

  const { data: keywordAlerts } = useQuery<any>({
    queryKey: [`/api/chatbots/${chatbotId}/keyword-alerts`],
    enabled: !!chatbotId,
  });

  useEffect(() => {
    if (chatbot) {
      // Default values with proper typing for enums
      const DEFAULT_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"] as ("monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday")[];
      
      // Debug: Log the chatbot data to see if geminiModel is present
      console.log("[EditChatbot] Loaded chatbot data:", {
        id: chatbot.id,
        name: chatbot.name,
        geminiModel: chatbot.geminiModel,
        hasGeminiModel: 'geminiModel' in chatbot,
        allKeys: Object.keys(chatbot)
      });
      
      // Capture baseline knowledge sources for comparison
      if (!originalKnowledgeSources) {
        setOriginalKnowledgeSources({
          websiteUrls: chatbot.websiteUrls || [],
          documents: chatbot.documents || [],
          documentMetadata: (chatbot.documentMetadata as DocumentMetadata[]) || [],
          websiteContent: chatbot.websiteContent || null,
        });
      }
      
      // Normalize null values to undefined/arrays for InsertChatbot schema compatibility
      setFormData(prev => ({
        ...prev,
        name: chatbot.name,
        websiteUrls: chatbot.websiteUrls || [],
        excludedUrls: chatbot.excludedUrls || [],
        websiteContent: chatbot.websiteContent || undefined,
        documents: chatbot.documents || [],
        documentMetadata: (chatbot.documentMetadata as DocumentMetadata[]) || [],
        systemPrompt: chatbot.systemPrompt,
        customInstructions: chatbot.customInstructions || undefined,
        geminiModel: chatbot.geminiModel || "gemini-2.5-flash",
        primaryColor: chatbot.primaryColor,
        accentColor: chatbot.accentColor,
        logoUrl: chatbot.logoUrl || undefined,
        welcomeMessage: chatbot.welcomeMessage,
        suggestedQuestions: chatbot.suggestedQuestions || [],
        enableSuggestedQuestions: chatbot.enableSuggestedQuestions || "false",
        supportPhoneNumber: chatbot.supportPhoneNumber || undefined,
        supportEmail: chatbot.supportEmail || undefined,
        escalationMessage: chatbot.escalationMessage || undefined,
        persistentQuestion: chatbot.persistentQuestion || undefined,
        liveAgentHoursEnabled: chatbot.liveAgentHoursEnabled || "false",
        liveAgentStartTime: chatbot.liveAgentStartTime || "09:00",
        liveAgentEndTime: chatbot.liveAgentEndTime || "17:00",
        liveAgentTimezone: chatbot.liveAgentTimezone || "America/New_York",
        liveAgentDaysOfWeek: (chatbot.liveAgentDaysOfWeek as ("monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday")[] | null) || DEFAULT_DAYS,
        leadCaptureEnabled: chatbot.leadCaptureEnabled || "false",
        leadCaptureType: (chatbot.leadCaptureType || "form") as "form" | "external_link",
        leadCaptureExternalUrl: chatbot.leadCaptureExternalUrl || undefined,
        leadCaptureFields: chatbot.leadCaptureFields || ["name", "email"],
        leadCaptureTitle: chatbot.leadCaptureTitle || "Get in Touch",
        leadCaptureMessage: chatbot.leadCaptureMessage || "Leave your contact information and we'll get back to you.",
        leadCaptureTiming: chatbot.leadCaptureTiming || "after_first_message",
        leadCaptureMessageCount: chatbot.leadCaptureMessageCount || "1",
        // Scheduled reindexing fields
        reindexScheduleEnabled: chatbot.reindexScheduleEnabled || "false",
        reindexScheduleMode: chatbot.reindexScheduleMode || "daily",
        reindexScheduleTime: chatbot.reindexScheduleTime || "03:00",
        reindexScheduleTimezone: chatbot.reindexScheduleTimezone || "America/New_York",
        reindexScheduleDaysOfWeek: (chatbot.reindexScheduleDaysOfWeek as ("monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday")[] | null) || ["monday"],
        reindexScheduleDate: chatbot.reindexScheduleDate || null,
        reindexNotificationEmail: chatbot.reindexNotificationEmail || "",
        // CRM fields populated separately from crmIntegration query
        crmEnabled: "false",
        crmIntegrationType: "generic",
        crmWebhookUrl: undefined,
        crmWebhookMethod: "POST",
        crmAuthType: "none",
        crmAuthValue: undefined,
        crmCustomHeaders: {},
        crmFieldMapping: {},
        crmRetryEnabled: "true",
        crmMaxRetries: "3",
        crmHyphenEndpoint: undefined,
        crmHyphenBuilderId: undefined,
        crmHyphenUsername: undefined,
        crmHyphenApiKey: undefined,
        crmHyphenCommunityId: undefined,
        crmHyphenSourceId: undefined,
        crmHyphenGradeId: undefined,
        crmHyphenInfluenceId: undefined,
        crmHyphenContactMethodId: undefined,
        crmHyphenReference: undefined,
      }));
    }
  }, [chatbot]);

  // Populate CRM fields from separate crmIntegration query
  useEffect(() => {
    if (crmIntegration) {
      setFormData(prev => ({
        ...prev,
        crmEnabled: crmIntegration.enabled || "false",
        crmIntegrationType: crmIntegration.integrationType || "generic",
        crmWebhookUrl: crmIntegration.webhookUrl || undefined,
        crmWebhookMethod: crmIntegration.webhookMethod || "POST",
        crmAuthType: crmIntegration.authType || "none",
        crmAuthValue: crmIntegration.authValue || undefined,
        crmCustomHeaders: crmIntegration.customHeaders || {},
        crmFieldMapping: crmIntegration.fieldMapping || {},
        crmRetryEnabled: crmIntegration.retryEnabled || "true",
        crmMaxRetries: crmIntegration.maxRetries || "3",
        crmHyphenEndpoint: crmIntegration.hyphenEndpoint || undefined,
        crmHyphenBuilderId: crmIntegration.hyphenBuilderId || undefined,
        crmHyphenUsername: crmIntegration.hyphenUsername || undefined,
        crmHyphenApiKey: crmIntegration.hyphenApiKey || undefined,
        crmHyphenCommunityId: crmIntegration.hyphenCommunityId || undefined,
        crmHyphenSourceId: crmIntegration.hyphenSourceId || undefined,
        crmHyphenGradeId: crmIntegration.hyphenGradeId || undefined,
        crmHyphenInfluenceId: crmIntegration.hyphenInfluenceId || undefined,
        crmHyphenContactMethodId: crmIntegration.hyphenContactMethodId || undefined,
        crmHyphenReference: crmIntegration.hyphenReference || undefined,
      }));
    }
  }, [crmIntegration]);

  // Populate keyword alerts fields from separate keywordAlerts query
  useEffect(() => {
    if (keywordAlerts) {
      setFormData(prev => ({
        ...prev,
        keywordAlertsEnabled: keywordAlerts.enabled || "false",
        keywordAlertKeywords: keywordAlerts.keywords || [],
        keywordAlertsEmailEnabled: keywordAlerts.emailNotifications || "true",
        keywordAlertsInAppEnabled: keywordAlerts.inAppNotifications || "true",
      }));
    }
  }, [keywordAlerts]);

  // Poll for indexing status when re-indexing after knowledge source changes
  useEffect(() => {
    if (showComplete && indexingStatus && indexingStatus.status !== 'completed' && indexingStatus.status !== 'failed') {
      const pollStatus = async () => {
        try {
          const res = await fetch(`/api/chatbots/${chatbotId}/indexing-status`, {
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
            });
            
            if (data.status === 'completed') {
              toast({
                title: "Re-indexing complete",
                description: "Your chatbot's knowledge base has been updated successfully.",
              });
              
              // Stop polling
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
            } else if (data.status === 'failed') {
              toast({
                title: "Re-indexing failed",
                description: "Some content failed to re-index. Your chatbot will still work with available content.",
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
  }, [showComplete, indexingStatus?.status, chatbotId, toast]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertChatbot>) => {
      const response = await apiRequest("PUT", `/api/chatbots/${chatbotId}`, data);
      return response.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots"] });
      queryClient.invalidateQueries({ queryKey: [`/api/chatbots/${chatbotId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/chatbots/${chatbotId}/crm-integration`] });
      
      // Save CRM data separately only if CRM has been configured or there's existing CRM data
      // This prevents validation errors when saving from non-CRM steps
      const hasCrmData = crmIntegration != null || 
                         formData.crmEnabled === "true" || 
                         !!formData.crmWebhookUrl || 
                         !!formData.crmHyphenEndpoint;
      
      if (hasCrmData) {
        try {
          const crmData = {
            enabled: formData.crmEnabled || "false",
            integrationType: formData.crmIntegrationType || "generic",
            webhookUrl: formData.crmWebhookUrl,
            webhookMethod: formData.crmWebhookMethod || "POST",
            authType: formData.crmAuthType || "none",
            authValue: formData.crmAuthValue,
            customHeaders: formData.crmCustomHeaders || {},
            fieldMapping: formData.crmFieldMapping || {},
            retryEnabled: formData.crmRetryEnabled !== "false" ? "true" : "false",
            maxRetries: formData.crmMaxRetries || "3",
            hyphenEndpoint: formData.crmHyphenEndpoint,
            hyphenBuilderId: formData.crmHyphenBuilderId,
            hyphenUsername: formData.crmHyphenUsername,
            hyphenApiKey: formData.crmHyphenApiKey,
            hyphenCommunityId: formData.crmHyphenCommunityId,
            hyphenSourceId: formData.crmHyphenSourceId,
            hyphenGradeId: formData.crmHyphenGradeId,
            hyphenInfluenceId: formData.crmHyphenInfluenceId,
            hyphenContactMethodId: formData.crmHyphenContactMethodId,
            hyphenReference: formData.crmHyphenReference,
          };
          
          await apiRequest("PUT", `/api/chatbots/${chatbotId}/crm-integration`, crmData);
        } catch (error) {
          console.error("Failed to save CRM integration:", error);
          toast({
            title: "Warning",
            description: "Chatbot saved but CRM settings failed to update. Please check CRM configuration.",
            variant: "destructive",
          });
        }
      }

      // Save keyword alerts data separately (always call to support disabling)
      try {
        const keywordAlertsData = {
          enabled: formData.keywordAlertsEnabled || "false",
          keywords: formData.keywordAlertKeywords || [],
          emailNotifications: formData.keywordAlertsEmailEnabled || "true",
          inAppNotifications: formData.keywordAlertsInAppEnabled || "true",
        };
        
        await apiRequest("PUT", `/api/chatbots/${chatbotId}/keyword-alerts`, keywordAlertsData);
      } catch (error) {
        console.error("Failed to save keyword alerts:", error);
        toast({
          title: "Warning",
          description: "Chatbot saved but keyword alerts settings failed to update.",
          variant: "destructive",
        });
      }
      
      // Check if knowledge sources were actually modified
      if (hasKnowledgeSourcesChanged()) {
        // Auto-trigger re-indexing and show StepComplete
        try {
          const response = await apiRequest("POST", `/api/chatbots/${chatbotId}/refresh-knowledge`, {});
          const data = await response.json();
          
          // Set up indexing status for StepComplete
          setIndexingStatus({
            jobId: data.jobId || '',
            status: 'pending',
            progress: {
              totalUrls: formData.websiteUrls?.length || 0,
              processedUrls: 0,
            },
          });
          
          // Update baseline to current knowledge sources to prevent false positives on next edit
          setOriginalKnowledgeSources({
            websiteUrls: formData.websiteUrls || [],
            documents: formData.documents || [],
            documentMetadata: formData.documentMetadata || [],
            websiteContent: formData.websiteContent || null,
          });
          
          // Show StepComplete component
          setShowComplete(true);
        } catch (error) {
          toast({
            title: "Re-indexing failed",
            description: "Failed to start re-indexing. Your changes were saved.",
            variant: "destructive",
          });
          navigate("/");
        }
      } else {
        // No knowledge changes - just show success toast and go to dashboard
        toast({
          title: "Chatbot updated!",
          description: "Your changes have been saved successfully.",
        });
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

  // Check if knowledge sources have changed by comparing current form data to original baseline
  const hasKnowledgeSourcesChanged = (): boolean => {
    if (!originalKnowledgeSources) return false;
    
    // Normalize string values for comparison (treat null, undefined, and "" as equivalent)
    const normalizeString = (val: string | null | undefined) => (val || "").trim();
    
    // Compare website URLs
    const currentUrls = (formData.websiteUrls || []).filter(url => url.trim());
    const baselineUrls = originalKnowledgeSources.websiteUrls.filter(url => url.trim());
    const urlsChanged = JSON.stringify([...currentUrls].sort()) !== JSON.stringify([...baselineUrls].sort());
    
    // Compare documents by checking array lengths and paths/names
    const currentDocs = formData.documents || [];
    const baselineDocs = originalKnowledgeSources.documents;
    let docsChanged = currentDocs.length !== baselineDocs.length;
    
    // If lengths are the same, compare paths (for stored docs) or check for File objects (new uploads)
    if (!docsChanged && currentDocs.length > 0) {
      // Check if there are any File objects (new uploads)
      const hasNewFiles = currentDocs.some((doc: any) => doc instanceof File);
      if (hasNewFiles) {
        docsChanged = true;
      } else {
        // Compare document paths (clone arrays before sorting to avoid mutation)
        docsChanged = JSON.stringify([...currentDocs].sort()) !== JSON.stringify([...baselineDocs].sort());
      }
    }
    
    // Compare document metadata
    const currentMetadata = formData.documentMetadata || [];
    const baselineMetadata = originalKnowledgeSources.documentMetadata;
    let metadataChanged = currentMetadata.length !== baselineMetadata.length;
    
    // If lengths are the same, compare metadata paths (map already creates new array, but sort in-place)
    if (!metadataChanged && currentMetadata.length > 0) {
      const currentPaths = [...currentMetadata.map(m => m.path)].sort();
      const baselinePaths = [...baselineMetadata.map(m => m.path)].sort();
      metadataChanged = JSON.stringify(currentPaths) !== JSON.stringify(baselinePaths);
    }
    
    // Compare website content
    const contentChanged = normalizeString(formData.websiteContent) !== normalizeString(originalKnowledgeSources.websiteContent);
    
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
      case "leadcapture":
        return true;
      case "crm":
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

  const handleStepClick = (stepNumber: number) => {
    // Allow direct navigation to any step
    const stepIndex = stepNumber - 1;
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(steps[stepIndex].id);
    }
  };

  const handleKeywordAlertsChange = (config: {
    enabled: boolean;
    keywords: string[];
    emailEnabled: boolean;
    inAppEnabled: boolean;
  }) => {
    setFormData(prev => ({
      ...prev,
      keywordAlertsEnabled: config.enabled ? "true" : "false",
      keywordAlertKeywords: config.keywords,
      keywordAlertsEmailEnabled: config.emailEnabled ? "true" : "false",
      keywordAlertsInAppEnabled: config.inAppEnabled ? "true" : "false",
    }));
  };

  const handleSave = () => {
    // Separate chatbot fields from CRM and keyword alerts fields (saved separately in mutation's onSuccess)
    const chatbotData: Partial<InsertChatbot> = { ...formData };
    
    // Remove CRM-specific fields from chatbot data (they're in a separate table)
    delete (chatbotData as any).crmEnabled;
    delete (chatbotData as any).crmIntegrationType;
    delete (chatbotData as any).crmWebhookUrl;
    delete (chatbotData as any).crmWebhookMethod;
    delete (chatbotData as any).crmAuthType;
    delete (chatbotData as any).crmAuthValue;
    delete (chatbotData as any).crmCustomHeaders;
    delete (chatbotData as any).crmFieldMapping;
    delete (chatbotData as any).crmRetryEnabled;
    delete (chatbotData as any).crmMaxRetries;
    delete (chatbotData as any).crmHyphenEndpoint;
    delete (chatbotData as any).crmHyphenBuilderId;
    delete (chatbotData as any).crmHyphenUsername;
    delete (chatbotData as any).crmHyphenApiKey;
    delete (chatbotData as any).crmHyphenCommunityId;
    delete (chatbotData as any).crmHyphenSourceId;
    delete (chatbotData as any).crmHyphenGradeId;
    delete (chatbotData as any).crmHyphenInfluenceId;
    delete (chatbotData as any).crmHyphenContactMethodId;
    delete (chatbotData as any).crmHyphenReference;
    
    // Remove keyword alerts fields from chatbot data (they're in a separate table)
    delete (chatbotData as any).keywordAlertsEnabled;
    delete (chatbotData as any).keywordAlertKeywords;
    delete (chatbotData as any).keywordAlertsEmailEnabled;
    delete (chatbotData as any).keywordAlertsInAppEnabled;
    
    // Trigger mutation (CRM and keyword alerts data will be saved in onSuccess callback)
    updateMutation.mutate(chatbotData);
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

  // Show StepComplete when re-indexing after knowledge source changes
  if (showComplete) {
    return <StepComplete chatbotId={chatbotId} indexingStatus={indexingStatus} />;
  }

  const isLastStep = currentStep === "crm";

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Edit Chatbot: {chatbot?.name || "Loading..."}</h1>
          <p className="text-muted-foreground">
            Update your chatbot settings and configuration
          </p>
        </div>

        <div className="mb-8">
          <StepIndicator steps={STEPS} currentStep={currentStepIndex + 1} onStepClick={handleStepClick} />
        </div>

        <div className="bg-card rounded-lg border p-8 mb-6">
          {currentStep === "name" && (
            <StepName formData={formData} updateFormData={handleUpdateData} />
          )}
          {currentStep === "knowledge" && (
            <StepKnowledgeBase formData={formData} updateFormData={handleUpdateData} />
          )}
          {currentStep === "personality" && (
            <StepPersonality 
              formData={formData} 
              updateFormData={handleUpdateData}
              userTier={userTier}
              isAdmin={isAdmin}
            />
          )}
          {currentStep === "customization" && (
            <StepCustomization formData={formData} updateFormData={handleUpdateData} />
          )}
          {currentStep === "escalation" && (
            <StepEscalation 
              formData={formData} 
              updateFormData={handleUpdateData}
              keywordAlertsEnabled={formData.keywordAlertsEnabled === "true"}
              keywordAlertKeywords={formData.keywordAlertKeywords || []}
              keywordAlertsEmailEnabled={formData.keywordAlertsEmailEnabled !== "false"}
              keywordAlertsInAppEnabled={formData.keywordAlertsInAppEnabled !== "false"}
              onKeywordAlertsChange={handleKeywordAlertsChange}
            />
          )}
          {currentStep === "leadcapture" && (
            <StepLeadCapture 
              formData={formData} 
              updateFormData={handleUpdateData}
              userTier={userTier}
              isAdmin={isAdmin}
            />
          )}
          {currentStep === "crm" && (
            <StepCrm formData={formData} updateFormData={handleUpdateData} />
          )}
        </div>

        <div className="flex justify-between gap-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStepIndex === 0}
              data-testid="button-previous-step"
            >
              Previous
            </Button>
            {!isLastStep && (
              <Button
                variant="ghost"
                onClick={handleNext}
                disabled={!canProceed()}
                data-testid="button-next-step"
              >
                Next
              </Button>
            )}
          </div>

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
