import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { InsertChatbot } from "@shared/schema";

interface StepNameProps {
  formData: Partial<InsertChatbot>;
  updateFormData: (updates: Partial<InsertChatbot>) => void;
}

export function StepName({ formData, updateFormData }: StepNameProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Name Your Chatbot</h2>
        <p className="text-muted-foreground mt-2">
          Give your AI assistant a name for internal identification. This won't be visible to your customers.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-base">
            Chatbot Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            placeholder="e.g., Customer Support Bot"
            value={formData.name || ""}
            onChange={(e) => updateFormData({ name: e.target.value })}
            className="text-lg h-12"
            data-testid="input-chatbot-name"
          />
          <p className="text-sm text-muted-foreground">
            Choose a descriptive name that helps you identify this chatbot in your dashboard
          </p>
        </div>
      </div>
    </div>
  );
}
