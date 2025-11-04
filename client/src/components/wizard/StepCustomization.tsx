import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, X, Upload, Palette } from "lucide-react";
import type { InsertChatbot } from "@shared/schema";
import { ChatPreview } from "@/components/ChatPreview";
import { Badge } from "@/components/ui/badge";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import { apiRequest } from "@/lib/queryClient";

interface StepCustomizationProps {
  formData: Partial<InsertChatbot>;
  updateFormData: (updates: Partial<InsertChatbot>) => void;
  isFreeTier?: boolean;
}

export function StepCustomization({ formData, updateFormData, isFreeTier = false }: StepCustomizationProps) {
  const [newQuestion, setNewQuestion] = useState("");

  const addSuggestedQuestion = () => {
    if (!newQuestion.trim()) return;
    const questions = [...(formData.suggestedQuestions || []), newQuestion.trim()];
    updateFormData({ suggestedQuestions: questions });
    setNewQuestion("");
  };

  const removeSuggestedQuestion = (index: number) => {
    const questions = [...(formData.suggestedQuestions || [])];
    questions.splice(index, 1);
    updateFormData({ suggestedQuestions: questions });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Customize Appearance</h2>
        <p className="text-muted-foreground mt-2">
          {isFreeTier 
            ? "Upgrade to Pro to customize colors and logo. Welcome messages and suggested questions are available on all plans."
            : "Make the chatbot widget match your brand with custom colors and messaging."
          }
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Brand Colors
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor" className="text-sm">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={formData.primaryColor || "#0EA5E9"}
                    onChange={(e) => updateFormData({ primaryColor: e.target.value })}
                    className="w-16 h-11 p-1 cursor-pointer"
                    data-testid="input-primary-color"
                    disabled={isFreeTier}
                  />
                  <Input
                    type="text"
                    value={formData.primaryColor || "#0EA5E9"}
                    onChange={(e) => updateFormData({ primaryColor: e.target.value })}
                    className="flex-1 h-11 font-mono"
                    placeholder="#0EA5E9"
                    disabled={isFreeTier}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accentColor" className="text-sm">Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="accentColor"
                    type="color"
                    value={formData.accentColor || "#0284C7"}
                    onChange={(e) => updateFormData({ accentColor: e.target.value })}
                    className="w-16 h-11 p-1 cursor-pointer"
                    data-testid="input-accent-color"
                    disabled={isFreeTier}
                  />
                  <Input
                    type="text"
                    value={formData.accentColor || "#0284C7"}
                    onChange={(e) => updateFormData({ accentColor: e.target.value })}
                    className="flex-1 h-11 font-mono"
                    placeholder="#0284C7"
                    disabled={isFreeTier}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Company Logo (Optional)
            </Label>
            {isFreeTier ? (
              <div className="border-2 border-dashed rounded-lg p-6 text-center bg-muted/30 opacity-60">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Logo uploads require a Pro plan
                </p>
                <Button variant="secondary" disabled data-testid="button-upload-logo">
                  <Upload className="w-4 h-4 mr-2" />
                  Upgrade to Upload
                </Button>
              </div>
            ) : formData.logoUrl ? (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <img src={formData.logoUrl} alt="Logo preview" className="w-12 h-12 rounded object-cover" />
                <span className="flex-1 text-sm">Logo uploaded successfully</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateFormData({ logoUrl: "" })}
                  data-testid="button-remove-logo"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center bg-muted/30">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Upload a logo for your chatbot (PNG, JPG, max 10MB)
                </p>
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={10485760}
                  onGetUploadParameters={async () => {
                    const response = await apiRequest("POST", "/api/objects/upload");
                    const data = await response.json() as { uploadURL: string };
                    return {
                      method: "PUT" as const,
                      url: data.uploadURL,
                    };
                  }}
                  onComplete={(result: UploadResult) => {
                    if (result.successful && result.successful.length > 0) {
                      const uploadURL = result.successful[0].uploadURL;
                      if (uploadURL) {
                        const objectPath = `/objects/${uploadURL.split("/").pop()}`;
                        updateFormData({ logoUrl: objectPath });
                      }
                    }
                  }}
                  buttonVariant="secondary"
                  testId="button-upload-logo"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Logo
                </ObjectUploader>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label htmlFor="welcomeMessage" className="text-base">
              Welcome Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="welcomeMessage"
              placeholder="Hello! How can I help you today?"
              value={formData.welcomeMessage || ""}
              onChange={(e) => updateFormData({ welcomeMessage: e.target.value })}
              rows={3}
              data-testid="input-welcome-message"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-base">Quick Start Questions (Optional)</Label>
            <p className="text-sm text-muted-foreground">
              These questions appear when the chat first opens to help visitors get started
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., What are your business hours?"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addSuggestedQuestion()}
                data-testid="input-suggested-question"
              />
              <Button
                onClick={addSuggestedQuestion}
                disabled={!newQuestion.trim()}
                data-testid="button-add-question"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.suggestedQuestions && formData.suggestedQuestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.suggestedQuestions.map((q, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="gap-2"
                    data-testid={`badge-question-${i}`}
                  >
                    {q}
                    <button
                      onClick={() => removeSuggestedQuestion(i)}
                      className="hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-3">
            <Label className="text-base">Live Preview</Label>
            <ChatPreview
              primaryColor={formData.primaryColor || "#0EA5E9"}
              accentColor={formData.accentColor || "#0284C7"}
              logoUrl={formData.logoUrl}
              welcomeMessage={formData.welcomeMessage || "Hello! How can I help you today?"}
              suggestedQuestions={formData.suggestedQuestions || []}
              chatbotName={formData.name || "Chatbot"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
