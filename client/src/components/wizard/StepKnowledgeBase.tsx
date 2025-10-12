import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Globe, Upload, FileText, X, Plus, Loader2 } from "lucide-react";
import type { InsertChatbot } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

interface StepKnowledgeBaseProps {
  formData: Partial<InsertChatbot>;
  updateFormData: (updates: Partial<InsertChatbot>) => void;
}

export function StepKnowledgeBase({ formData, updateFormData }: StepKnowledgeBaseProps) {
  const [newUrl, setNewUrl] = useState("");
  const [urlError, setUrlError] = useState("");

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
    newDocs.splice(index, 1);
    updateFormData({ documents: newDocs });
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
            Upload Documents (Coming Soon)
          </Label>
          <div className="border-2 border-dashed rounded-lg p-8 text-center bg-muted/30">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              Document upload (.pdf, .txt, .md) will be available soon
            </p>
            <Button variant="secondary" disabled data-testid="button-upload-docs">
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </div>

          {formData.documents && formData.documents.length > 0 && (
            <div className="space-y-2">
              {formData.documents.map((doc, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 bg-muted rounded-lg"
                >
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="flex-1 text-sm">{doc}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveDocument(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
