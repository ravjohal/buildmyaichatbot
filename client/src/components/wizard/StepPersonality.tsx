import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Zap } from "lucide-react";
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

      <div className="border-t pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Proactive Chat</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Automatically greet visitors with a popup message after a delay
        </p>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="proactiveChatEnabled" className="text-base font-medium">
              Enable Proactive Popup
            </Label>
            <p className="text-sm text-muted-foreground">
              Show chat widget automatically to engage visitors
            </p>
          </div>
          <Switch
            id="proactiveChatEnabled"
            checked={formData.proactiveChatEnabled === "true"}
            onCheckedChange={(checked) =>
              updateFormData({ proactiveChatEnabled: checked ? "true" : "false" })
            }
            data-testid="switch-proactive-chat"
          />
        </div>

        {formData.proactiveChatEnabled === "true" && (
          <div className="space-y-4 pl-4 border-l-2">
            <div className="space-y-2">
              <Label htmlFor="proactiveChatDelay">
                Delay Before Popup (seconds)
              </Label>
              <Input
                id="proactiveChatDelay"
                type="number"
                min="0"
                max="60"
                value={formData.proactiveChatDelay || "5"}
                onChange={(e) => updateFormData({ proactiveChatDelay: e.target.value })}
                data-testid="input-proactive-delay"
              />
              <p className="text-sm text-muted-foreground">
                How long to wait before showing the chat popup (0-60 seconds)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="proactiveChatMessage">
                Popup Message
              </Label>
              <Input
                id="proactiveChatMessage"
                placeholder="Hi! Need any help?"
                value={formData.proactiveChatMessage || ""}
                onChange={(e) => updateFormData({ proactiveChatMessage: e.target.value })}
                data-testid="input-proactive-message"
              />
              <p className="text-sm text-muted-foreground">
                The message shown in the popup notification
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
