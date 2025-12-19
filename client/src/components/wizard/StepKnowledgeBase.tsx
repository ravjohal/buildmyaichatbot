import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Globe, Upload, FileText, X, Plus, Loader2, RefreshCw, Clock, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import type { InsertChatbot } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface StepKnowledgeBaseProps {
  formData: Partial<InsertChatbot> & { documentMetadata?: DocumentMetadata[] };
  updateFormData: (updates: Partial<InsertChatbot> & { documentContent?: string; documentMetadata?: DocumentMetadata[] }) => void;
}

interface DocumentMetadata {
  path: string;
  originalName: string;
  title: string;
  text: string;
  size: number;
  type: string;
}

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
];

const DAYS_OF_WEEK = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
];

export function StepKnowledgeBase({ formData, updateFormData }: StepKnowledgeBaseProps) {
  const [newUrl, setNewUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const { toast } = useToast();
  
  // Get document metadata from formData (persisted across remounts)
  const documentMetadata = (formData.documentMetadata || []) as DocumentMetadata[];
  
  // Scheduling state from formData
  const scheduleEnabled = formData.reindexScheduleEnabled === "true";
  const scheduleMode = formData.reindexScheduleMode || "daily";
  const scheduleTime = formData.reindexScheduleTime || "03:00";
  const scheduleTimezone = formData.reindexScheduleTimezone || "America/New_York";
  const scheduleDays = formData.reindexScheduleDaysOfWeek || ["monday"];
  
  const toggleDayOfWeek = (day: string) => {
    const currentDays = scheduleDays || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    updateFormData({ reindexScheduleDaysOfWeek: newDays.length > 0 ? newDays : ["monday"] });
  };

  const handleAddUrl = () => {
    setUrlError("");
    
    if (!newUrl.trim()) {
      setUrlError("Please enter a URL");
      return;
    }

    try {
      new URL(newUrl.trim());
    } catch {
      setUrlError("Please enter a valid URL");
      return;
    }

    const currentUrls = formData.websiteUrls || [];
    if (currentUrls.includes(newUrl.trim())) {
      setUrlError("This URL has already been added");
      return;
    }

    updateFormData({ 
      websiteUrls: [...currentUrls, newUrl.trim()] 
    });
    setNewUrl("");
  };

  const handleRemoveUrl = (index: number) => {
    const newUrls = [...(formData.websiteUrls || [])];
    newUrls.splice(index, 1);
    updateFormData({ websiteUrls: newUrls });
  };

  const handleRemoveDocument = (index: number) => {
    const newDocs = [...(formData.documents || [])];
    const newMetadata = [...documentMetadata];
    
    newDocs.splice(index, 1);
    newMetadata.splice(index, 1);
    
    // Rebuild document content from remaining documents
    const documentContent = newMetadata
      .map(doc => `Document: ${doc.title}\n\n${doc.text}`)
      .join('\n\n---\n\n');
    
    updateFormData({ 
      documents: newDocs,
      documentMetadata: newMetadata,
      documentContent: documentContent || undefined
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedExtensions = ['.pdf', '.txt', '.md'];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, TXT, or MD file.",
        variant: "destructive",
      });
      event.target.value = ''; // Reset input
      return;
    }

    setUploadingDoc(true);

    try {
      const formDataObj = new FormData();
      formDataObj.append('file', file);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formDataObj,
        credentials: 'include', // Important for authentication
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      // Add document to the list
      const currentDocs = formData.documents || [];
      const newDocMetadata = result.document;
      
      const updatedMetadata = [...documentMetadata, newDocMetadata];
      
      // Build combined document content
      const documentContent = updatedMetadata
        .map(doc => `Document: ${doc.title}\n\n${doc.text}`)
        .join('\n\n---\n\n');
      
      updateFormData({ 
        documents: [...currentDocs, newDocMetadata.path],
        documentMetadata: updatedMetadata,
        documentContent
      });

      toast({
        title: "Document uploaded",
        description: `${file.name} has been successfully uploaded and processed.`,
      });

    } catch (error: any) {
      console.error("Document upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingDoc(false);
      event.target.value = ''; // Reset input
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddUrl();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Knowledge Base Setup</h2>
        <p className="text-muted-foreground mt-2">
          Provide content for your chatbot to learn from. This will be used to answer customer questions.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="websiteUrl" className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Website URLs (Optional)
          </Label>
          <div className="flex gap-2">
            <Input
              id="websiteUrl"
              type="url"
              placeholder="https://www.yourbusiness.com"
              value={newUrl}
              onChange={(e) => {
                setNewUrl(e.target.value);
                setUrlError("");
              }}
              onKeyPress={handleKeyPress}
              className="h-11 flex-1"
              data-testid="input-website-url"
            />
            <Button
              type="button"
              onClick={handleAddUrl}
              className="h-11"
              data-testid="button-add-url"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add URL
            </Button>
          </div>
          {urlError && (
            <p className="text-sm text-destructive">{urlError}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Add website URLs to automatically crawl and extract content. Your chatbot will learn from the content on these pages.
          </p>
        </div>

        {formData.websiteUrls && formData.websiteUrls.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Added URLs</Label>
            {formData.websiteUrls.map((url, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-3 bg-muted rounded-lg"
                data-testid={`url-item-${index}`}
              >
                <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="flex-1 text-sm truncate">{url}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveUrl(index)}
                  data-testid={`button-remove-url-${index}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <Label className="text-base flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload Documents (Optional)
          </Label>
          <div className="border-2 border-dashed rounded-lg p-8 text-center bg-muted/30">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              Upload PDF, TXT, or MD files to add to your chatbot's knowledge base
            </p>
            <Button 
              variant="secondary" 
              disabled={uploadingDoc}
              data-testid="button-upload-docs"
              onClick={() => document.getElementById('doc-upload-input')?.click()}
            >
              {uploadingDoc ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Files
                </>
              )}
            </Button>
            <input
              id="doc-upload-input"
              type="file"
              accept=".pdf,.txt,.md"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {documentMetadata && documentMetadata.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Uploaded Documents</Label>
              {documentMetadata.map((doc, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 bg-muted rounded-lg"
                  data-testid={`doc-item-${index}`}
                >
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{doc.originalName}</p>
                    <p className="text-xs text-muted-foreground">
                      {(doc.size / 1024).toFixed(1)} KB • {doc.text.length} characters extracted
                    </p>
                  </div>
                  <Badge variant="secondary" className="no-default-active-elevate">
                    {doc.type.toUpperCase()}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveDocument(index)}
                    data-testid={`button-remove-doc-${index}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scheduled Reindexing Section */}
        <Collapsible open={scheduleOpen} onOpenChange={setScheduleOpen} className="border rounded-lg">
          <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover-elevate">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              <span className="font-medium">Automatic Knowledge Refresh</span>
              {scheduleEnabled && (
                <Badge variant="secondary" className="ml-2 no-default-active-elevate">
                  {scheduleMode === "daily" ? "Daily" : scheduleMode === "weekly" ? "Weekly" : scheduleMode === "once" ? "One-time" : "Disabled"}
                </Badge>
              )}
            </div>
            {scheduleOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 pt-0 space-y-4">
              <p className="text-sm text-muted-foreground">
                Keep your chatbot's knowledge up-to-date by scheduling automatic website re-crawls. Your existing knowledge remains intact if a refresh fails.
              </p>

              <div className="flex items-center justify-between">
                <Label htmlFor="schedule-enabled" className="text-sm">Enable Scheduled Refresh</Label>
                <Switch
                  id="schedule-enabled"
                  checked={scheduleEnabled}
                  onCheckedChange={(checked) => {
                    updateFormData({ 
                      reindexScheduleEnabled: checked ? "true" : "false",
                      reindexScheduleMode: checked ? scheduleMode : "disabled"
                    });
                  }}
                  data-testid="switch-schedule-enabled"
                />
              </div>

              {scheduleEnabled && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="schedule-mode" className="text-sm">Frequency</Label>
                    <Select
                      value={scheduleMode}
                      onValueChange={(value) => updateFormData({ reindexScheduleMode: value })}
                    >
                      <SelectTrigger id="schedule-mode" data-testid="select-schedule-mode">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="once">One-time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {scheduleMode === "weekly" && (
                    <div className="space-y-2">
                      <Label className="text-sm">Days of Week</Label>
                      <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map((day) => (
                          <Button
                            key={day.value}
                            type="button"
                            variant={scheduleDays.includes(day.value) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleDayOfWeek(day.value)}
                            data-testid={`button-day-${day.value}`}
                          >
                            {day.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {scheduleMode === "once" && (
                    <div className="space-y-2">
                      <Label htmlFor="schedule-date" className="text-sm">Date</Label>
                      <Input
                        id="schedule-date"
                        type="date"
                        value={formData.reindexScheduleDate ? new Date(formData.reindexScheduleDate).toISOString().split('T')[0] : ''}
                        onChange={(e) => updateFormData({ reindexScheduleDate: e.target.value ? new Date(e.target.value) : null })}
                        min={new Date().toISOString().split('T')[0]}
                        data-testid="input-schedule-date"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="schedule-time" className="text-sm flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Time
                      </Label>
                      <Input
                        id="schedule-time"
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => updateFormData({ reindexScheduleTime: e.target.value })}
                        data-testid="input-schedule-time"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schedule-timezone" className="text-sm flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Timezone
                      </Label>
                      <Select
                        value={scheduleTimezone}
                        onValueChange={(value) => updateFormData({ reindexScheduleTimezone: value })}
                      >
                        <SelectTrigger id="schedule-timezone" data-testid="select-schedule-timezone">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
                    Your chatbot will automatically re-crawl website URLs at the scheduled time. If a refresh fails, your chatbot will continue using its existing knowledge - nothing will break.
                  </p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
