import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Bell, AlertCircle } from "lucide-react";

interface EmailSettings {
  id: string;
  userId: string;
  enableNewLeadNotifications: string;
  enableUnansweredQuestionNotifications: string;
  unansweredThresholdMinutes: string;
  emailAddress: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function NotificationSettings() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<EmailSettings>({
    queryKey: ['/api/notification-settings'],
  });

  const [formData, setFormData] = useState({
    enableNewLeadNotifications: true,
    enableUnansweredQuestionNotifications: true,
    unansweredThresholdMinutes: "30",
    emailAddress: "",
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      setFormData({
        enableNewLeadNotifications: settings.enableNewLeadNotifications === "true",
        enableUnansweredQuestionNotifications: settings.enableUnansweredQuestionNotifications === "true",
        unansweredThresholdMinutes: settings.unansweredThresholdMinutes || "30",
        emailAddress: settings.emailAddress || "",
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const res = await fetch("/api/notification-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notification-settings'] });
      toast({
        title: "Settings updated",
        description: "Your notification preferences have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      enableNewLeadNotifications: formData.enableNewLeadNotifications ? "true" : "false",
      enableUnansweredQuestionNotifications: formData.enableUnansweredQuestionNotifications ? "true" : "false",
      unansweredThresholdMinutes: formData.unansweredThresholdMinutes,
      emailAddress: formData.emailAddress || null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" data-testid="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="container max-width mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Email Notifications</h1>
        <p className="text-muted-foreground">
          Configure how and when you receive email alerts about your chatbots
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 max-w-2xl">
          <Card data-testid="card-email-address">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Address
              </CardTitle>
              <CardDescription>
                Where should we send notifications? Leave blank to use your account email.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="emailAddress">Custom Email (Optional)</Label>
                <Input
                  id="emailAddress"
                  type="email"
                  placeholder="notifications@example.com"
                  value={formData.emailAddress}
                  onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
                  data-testid="input-email-address"
                />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-lead-notifications">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                New Lead Notifications
              </CardTitle>
              <CardDescription>
                Get notified immediately when someone submits their contact information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="newLeads" className="flex-1">
                  Email me when a new lead is captured
                </Label>
                <Switch
                  id="newLeads"
                  checked={formData.enableNewLeadNotifications}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, enableNewLeadNotifications: checked })
                  }
                  data-testid="switch-new-leads"
                />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-unanswered-notifications">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Unanswered Question Alerts
              </CardTitle>
              <CardDescription>
                Get alerted when your chatbot may have provided an insufficient answer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="unanswered" className="flex-1">
                  Alert me about potentially unanswered questions
                </Label>
                <Switch
                  id="unanswered"
                  checked={formData.enableUnansweredQuestionNotifications}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, enableUnansweredQuestionNotifications: checked })
                  }
                  data-testid="switch-unanswered"
                />
              </div>

              {formData.enableUnansweredQuestionNotifications && (
                <div className="space-y-2 pt-4 border-t">
                  <Label htmlFor="threshold">Alert Threshold (minutes)</Label>
                  <Input
                    id="threshold"
                    type="number"
                    min="1"
                    max="1440"
                    value={formData.unansweredThresholdMinutes}
                    onChange={(e) =>
                      setFormData({ ...formData, unansweredThresholdMinutes: e.target.value })
                    }
                    data-testid="input-threshold"
                  />
                  <p className="text-sm text-muted-foreground">
                    You'll be notified if a question hasn't been adequately answered within this time
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="w-full"
            data-testid="button-save-settings"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
