import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import type { InsertChatbot } from "@shared/schema";

interface StepPersonalityProps {
  formData: Partial<InsertChatbot>;
  updateFormData: (updates: Partial<InsertChatbot>) => void;
}

export function StepPersonality({ formData, updateFormData }: StepPersonalityProps) {
  const useTemplate = () => {
    const businessName = formData.name || "your business";
    const template = `You are a friendly and helpful customer service assistant for ${businessName}. Your goal is to answer questions based ONLY on the provided information from the website and documents. Be conversational and professional. Do not make up information you don't know. If you cannot find an answer, politely let the customer know and offer to escalate to a human representative.`;
    updateFormData({ systemPrompt: template });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Define Personality & Instructions</h2>
        <p className="text-muted-foreground mt-2">
          Set how your chatbot should behave and respond to customer inquiries.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="systemPrompt" className="text-base">
              System Prompt <span className="text-destructive">*</span>
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={useTemplate}
              data-testid="button-use-template"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Use Template
            </Button>
          </div>
          <Textarea
            id="systemPrompt"
            placeholder="Define how your chatbot should behave..."
            value={formData.systemPrompt || ""}
            onChange={(e) => updateFormData({ systemPrompt: e.target.value })}
            rows={10}
            className="font-mono text-sm"
            data-testid="input-system-prompt"
          />
          <p className="text-sm text-muted-foreground">
            This prompt guides your chatbot's behavior and response style. Be specific about tone, boundaries, and when to escalate.
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm">Best Practices:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Instruct the bot to answer ONLY from provided knowledge</li>
            <li>Define a clear tone (professional, friendly, casual)</li>
            <li>Specify when to escalate to human support</li>
            <li>Include any specific policies or guidelines</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
