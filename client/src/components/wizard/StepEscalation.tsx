import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Phone, Info, Clock } from "lucide-react";
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

        <div className="border-t pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="liveAgentHours" className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Configure Live Agent Hours
              </Label>
              <p className="text-sm text-muted-foreground">
                Set when human agents are available for live chat handoff
              </p>
            </div>
            <Switch
              id="liveAgentHours"
              checked={formData.liveAgentHoursEnabled === "true"}
              onCheckedChange={(checked) => 
                updateFormData({ liveAgentHoursEnabled: checked ? "true" : "false" })
              }
              data-testid="switch-live-agent-hours"
            />
          </div>

          {formData.liveAgentHoursEnabled === "true" && (
            <div className="space-y-4 pl-6 border-l-2 border-primary/20">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime" className="text-sm">Start Time</Label>
                  <Select
                    value={formData.liveAgentStartTime || "09:00"}
                    onValueChange={(value) => updateFormData({ liveAgentStartTime: value })}
                  >
                    <SelectTrigger id="startTime" data-testid="select-start-time">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <SelectItem key={`${hour}:00`} value={`${hour}:00`}>
                            {`${hour}:00`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime" className="text-sm">End Time</Label>
                  <Select
                    value={formData.liveAgentEndTime || "17:00"}
                    onValueChange={(value) => updateFormData({ liveAgentEndTime: value })}
                  >
                    <SelectTrigger id="endTime" data-testid="select-end-time">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <SelectItem key={`${hour}:00`} value={`${hour}:00`}>
                            {`${hour}:00`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone" className="text-sm">Timezone</Label>
                <Select
                  value={formData.liveAgentTimezone || "America/New_York"}
                  onValueChange={(value) => updateFormData({ liveAgentTimezone: value })}
                >
                  <SelectTrigger id="timezone" data-testid="select-timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                    <SelectItem value="America/Phoenix">Arizona (MST)</SelectItem>
                    <SelectItem value="America/Anchorage">Alaska (AKT)</SelectItem>
                    <SelectItem value="Pacific/Honolulu">Hawaii (HST)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT)</SelectItem>
                    <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                    <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                    <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                    <SelectItem value="Asia/Singapore">Singapore (SGT)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                    <SelectItem value="Australia/Sydney">Sydney (AEDT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Days Available</Label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: "monday" as const, label: "Monday" },
                    { value: "tuesday" as const, label: "Tuesday" },
                    { value: "wednesday" as const, label: "Wednesday" },
                    { value: "thursday" as const, label: "Thursday" },
                    { value: "friday" as const, label: "Friday" },
                    { value: "saturday" as const, label: "Saturday" },
                    { value: "sunday" as const, label: "Sunday" },
                  ] as const).map((day) => {
                    const days = formData.liveAgentDaysOfWeek || ["monday", "tuesday", "wednesday", "thursday", "friday"];
                    const isChecked = days.includes(day.value);
                    
                    return (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={day.value}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            const currentDays = formData.liveAgentDaysOfWeek || ["monday", "tuesday", "wednesday", "thursday", "friday"];
                            const newDays = checked
                              ? [...currentDays, day.value]
                              : currentDays.filter((d) => d !== day.value);
                            updateFormData({ liveAgentDaysOfWeek: newDays });
                          }}
                          data-testid={`checkbox-day-${day.value}`}
                        />
                        <Label
                          htmlFor={day.value}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {day.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                When outside these hours, visitors will see a message instead of the live agent handoff button
              </p>
            </div>
          )}
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
