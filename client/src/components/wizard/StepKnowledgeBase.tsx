import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Globe, Upload, FileText, X } from "lucide-react";
import type { InsertChatbot } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

interface StepKnowledgeBaseProps {
  formData: Partial<InsertChatbot>;
  updateFormData: (updates: Partial<InsertChatbot>) => void;
}

export function StepKnowledgeBase({ formData, updateFormData }: StepKnowledgeBaseProps) {
  const handleRemoveDocument = (index: number) => {
    const newDocs = [...(formData.documents || [])];
    newDocs.splice(index, 1);
    updateFormData({ documents: newDocs });
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
            Website URL (Optional)
          </Label>
          <Input
            id="websiteUrl"
            type="url"
            placeholder="https://www.yourbusiness.com"
            value={formData.websiteUrl || ""}
            onChange={(e) => updateFormData({ websiteUrl: e.target.value })}
            className="h-11"
            data-testid="input-website-url"
          />
          <p className="text-sm text-muted-foreground">
            For MVP: Website crawling will be mocked. You can manually paste content below.
          </p>
        </div>

        <div className="space-y-3">
          <Label htmlFor="websiteContent" className="text-base">
            Website Content (Manual Entry)
          </Label>
          <Textarea
            id="websiteContent"
            placeholder="Paste your website content here that you want the chatbot to learn from..."
            value={formData.websiteContent || ""}
            onChange={(e) => updateFormData({ websiteContent: e.target.value })}
            rows={6}
            data-testid="input-website-content"
          />
        </div>

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
