import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Info } from "lucide-react";
import type { InsertChatbot } from "@shared/schema";

interface StepEscalationProps {
  formData: Partial<InsertChatbot>;
  updateFormData: (updates: Partial<InsertChatbot>) => void;
}

export function StepEscalation({ formData, updateFormData }: StepEscalationProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Support Escalation</h2>
        <p className="text-muted-foreground mt-2">
          Configure how customers can reach your human support team when needed.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="supportPhoneNumber" className="text-base flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Support Phone Number (Optional)
          </Label>
          <Input
            id="supportPhoneNumber"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={formData.supportPhoneNumber || ""}
            onChange={(e) => updateFormData({ supportPhoneNumber: e.target.value })}
            className="h-11"
            data-testid="input-support-phone"
          />
          <p className="text-sm text-muted-foreground">
            This number will be provided when the chatbot cannot answer a question or when the customer requests human support
          </p>
        </div>

        <div className="space-y-3">
          <Label htmlFor="escalationMessage" className="text-base">
            Escalation Message
          </Label>
          <Textarea
            id="escalationMessage"
            placeholder="If you need more help, you can reach our team at {phone}."
            value={formData.escalationMessage || ""}
            onChange={(e) => updateFormData({ escalationMessage: e.target.value })}
            rows={4}
            data-testid="input-escalation-message"
          />
          <p className="text-sm text-muted-foreground">
            Use <code className="bg-muted px-1 py-0.5 rounded text-xs">{"{phone}"}</code> as a placeholder for the phone number
          </p>
        </div>

        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-medium">When Escalation Happens</h4>
              <p className="text-sm text-muted-foreground">
                The chatbot will automatically escalate to human support when:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-2">
                <li>It cannot find a relevant answer in the knowledge base</li>
                <li>The customer explicitly asks to speak with a person</li>
                <li>The confidence in the answer is too low</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
