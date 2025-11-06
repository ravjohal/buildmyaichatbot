import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info, UserPlus, Mail, Phone, Building2, MessageSquare, Crown, ExternalLink } from "lucide-react";
import type { InsertChatbot, SubscriptionTier } from "@shared/schema";
import { hasFeatureAccess } from "@shared/pricing";
import { Link } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StepLeadCaptureProps {
  formData: Partial<InsertChatbot>;
  updateFormData: (updates: Partial<InsertChatbot>) => void;
  userTier: SubscriptionTier;
  isAdmin: boolean;
}

export function StepLeadCapture({ formData, updateFormData, userTier, isAdmin }: StepLeadCaptureProps) {
  const hasLeadCapture = isAdmin || hasFeatureAccess(userTier, "leadExport");
  const leadCaptureEnabled = formData.leadCaptureEnabled === "true";
  const leadCaptureType = formData.leadCaptureType || "form";
  const leadCaptureFields = formData.leadCaptureFields || ["name", "email"];

  const toggleField = (field: string) => {
    const currentFields = formData.leadCaptureFields || ["name", "email"];
    const newFields = currentFields.includes(field)
      ? currentFields.filter((f) => f !== field)
      : [...currentFields, field];
    
    // Ensure at least one field is selected
    if (newFields.length > 0) {
      updateFormData({ leadCaptureFields: newFields });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold">Lead Capture</h2>
          {!hasLeadCapture && (
            <Badge variant="secondary" className="ml-2" data-testid="badge-lead-premium">
              <Crown className="w-3 h-3 mr-1" />
              Starter+
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-2">
          Turn conversations into qualified leads by collecting contact information from your visitors.
        </p>
      </div>

      {!hasLeadCapture ? (
        <div className="rounded-lg border border-muted bg-muted/30 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Crown className="w-5 h-5 text-primary mt-0.5" />
            <div className="space-y-2 flex-1">
              <h4 className="font-medium">Upgrade to capture leads</h4>
              <p className="text-sm text-muted-foreground">
                Unlock the ability to collect visitor contact information directly through your chatbot. Export leads to CSV or sync them automatically to your CRM. Available on Starter, Business, and Scale plans.
              </p>
              <Button asChild variant="default" size="sm" className="mt-2" data-testid="button-upgrade-lead-capture">
                <Link href="/pricing">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade Plan
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="leadCaptureEnabled" className="text-base font-medium">
                Enable Lead Capture
              </Label>
              <p className="text-sm text-muted-foreground">
                Show a contact form during chat conversations
              </p>
            </div>
            <Switch
              id="leadCaptureEnabled"
              checked={leadCaptureEnabled}
              onCheckedChange={(checked) => 
                updateFormData({ leadCaptureEnabled: checked ? "true" : "false" })
              }
              data-testid="switch-lead-capture"
            />
          </div>

      {leadCaptureEnabled && (
        <div className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="leadCaptureType" className="text-base">
              Lead Capture Method
            </Label>
            <Select
              value={leadCaptureType}
              onValueChange={(value) => updateFormData({ leadCaptureType: value })}
            >
              <SelectTrigger id="leadCaptureType" data-testid="select-lead-capture-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="form">Built-in Form</SelectItem>
                <SelectItem value="external_link">External Link</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {leadCaptureType === "form" 
                ? "Collect leads using the built-in contact form with customizable fields" 
                : "Direct visitors to your own external form or landing page"}
            </p>
          </div>

          {leadCaptureType === "external_link" && (
            <div className="space-y-3">
              <Label htmlFor="leadCaptureExternalUrl" className="text-base flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                External Form URL
              </Label>
              <Input
                id="leadCaptureExternalUrl"
                type="url"
                placeholder="https://forms.example.com/contact"
                value={formData.leadCaptureExternalUrl || ""}
                onChange={(e) => updateFormData({ leadCaptureExternalUrl: e.target.value })}
                className="h-11"
                data-testid="input-external-url"
                required={leadCaptureType === "external_link"}
                pattern="https?://.*"
              />
              <p className="text-sm text-muted-foreground">
                Must be a valid http:// or https:// URL. Visitors will be shown a button that opens this URL in a new tab.
              </p>
            </div>
          )}

          {leadCaptureType === "form" && (
            <>
              <div className="space-y-3">
                <Label htmlFor="leadCaptureTitle" className="text-base flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Form Title
                </Label>
            <Input
              id="leadCaptureTitle"
              placeholder="Get in Touch"
              value={formData.leadCaptureTitle || ""}
              onChange={(e) => updateFormData({ leadCaptureTitle: e.target.value })}
              className="h-11"
              data-testid="input-lead-title"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="leadCaptureMessage" className="text-base">
              Form Message
            </Label>
            <Textarea
              id="leadCaptureMessage"
              placeholder="Leave your contact information and we'll get back to you."
              value={formData.leadCaptureMessage || ""}
              onChange={(e) => updateFormData({ leadCaptureMessage: e.target.value })}
              rows={3}
              data-testid="input-lead-message"
            />
            <p className="text-sm text-muted-foreground">
              This message will be shown above the contact form
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-base">Fields to Collect</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="field-name"
                  checked={leadCaptureFields.includes("name")}
                  onCheckedChange={() => toggleField("name")}
                  data-testid="checkbox-field-name"
                />
                <Label htmlFor="field-name" className="flex items-center gap-2 font-normal cursor-pointer">
                  <UserPlus className="w-4 h-4" />
                  Name
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="field-email"
                  checked={leadCaptureFields.includes("email")}
                  onCheckedChange={() => toggleField("email")}
                  data-testid="checkbox-field-email"
                />
                <Label htmlFor="field-email" className="flex items-center gap-2 font-normal cursor-pointer">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="field-phone"
                  checked={leadCaptureFields.includes("phone")}
                  onCheckedChange={() => toggleField("phone")}
                  data-testid="checkbox-field-phone"
                />
                <Label htmlFor="field-phone" className="flex items-center gap-2 font-normal cursor-pointer">
                  <Phone className="w-4 h-4" />
                  Phone
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="field-company"
                  checked={leadCaptureFields.includes("company")}
                  onCheckedChange={() => toggleField("company")}
                  data-testid="checkbox-field-company"
                />
                <Label htmlFor="field-company" className="flex items-center gap-2 font-normal cursor-pointer">
                  <Building2 className="w-4 h-4" />
                  Company
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="field-message"
                  checked={leadCaptureFields.includes("message")}
                  onCheckedChange={() => toggleField("message")}
                  data-testid="checkbox-field-message"
                />
                <Label htmlFor="field-message" className="flex items-center gap-2 font-normal cursor-pointer">
                  <MessageSquare className="w-4 h-4" />
                  Message
                </Label>
              </div>
            </div>
          </div>
            </>
          )}

          <div className="space-y-3">
            <Label htmlFor="leadCaptureTiming" className="text-base">
              {leadCaptureType === "form" ? "When to Show Form" : "When to Show Link"}
            </Label>
            <Select
              value={formData.leadCaptureTiming || "after_first_message"}
              onValueChange={(value) => updateFormData({ leadCaptureTiming: value })}
            >
              <SelectTrigger id="leadCaptureTiming" data-testid="select-lead-timing">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediately">Immediately when chat opens</SelectItem>
                <SelectItem value="after_first_message">After first message</SelectItem>
                <SelectItem value="after_n_messages">After several messages</SelectItem>
                <SelectItem value="manual">Only when manually triggered</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.leadCaptureTiming === "after_n_messages" && (
            <div className="space-y-3">
              <Label htmlFor="leadCaptureMessageCount" className="text-base">
                Number of Messages
              </Label>
              <Input
                id="leadCaptureMessageCount"
                type="number"
                min="1"
                max="10"
                placeholder="3"
                value={formData.leadCaptureMessageCount ?? ""}
                onChange={(e) => updateFormData({ leadCaptureMessageCount: e.target.value })}
                className="h-11"
                data-testid="input-message-count"
              />
              <p className="text-sm text-muted-foreground">
                Show the lead capture form after this many messages
              </p>
            </div>
          )}

          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-medium">Lead Capture Benefits</h4>
                <p className="text-sm text-muted-foreground">
                  Converting conversations into qualified leads helps you:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-2">
                  <li>Identify interested prospects automatically</li>
                  <li>Build your contact database while providing support</li>
                  <li>Follow up with potential customers proactively</li>
                  <li>Export leads to CSV for use in your CRM</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
