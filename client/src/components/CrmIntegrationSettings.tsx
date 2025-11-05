import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Plus, X, ExternalLink } from "lucide-react";
import type { CrmIntegration } from "@shared/schema";

interface CrmIntegrationSettingsProps {
  chatbotId: string;
}

export function CrmIntegrationSettings({ chatbotId }: CrmIntegrationSettingsProps) {
  const { toast } = useToast();
  
  // Fetch existing integration
  const { data: integration, isLoading } = useQuery<CrmIntegration | null>({
    queryKey: [`/api/chatbots/${chatbotId}/crm-integration`],
  });

  // Form state
  const [enabled, setEnabled] = useState(integration?.enabled === "true");
  const [webhookUrl, setWebhookUrl] = useState(integration?.webhookUrl || "");
  const [webhookMethod, setWebhookMethod] = useState(integration?.webhookMethod || "POST");
  const [authType, setAuthType] = useState(integration?.authType || "none");
  const [authValue, setAuthValue] = useState(integration?.authValue || "");
  const [customHeaders, setCustomHeaders] = useState<Record<string, string>>(
    (integration?.customHeaders as Record<string, string>) || {}
  );
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>(
    (integration?.fieldMapping as Record<string, string>) || {
      name: "name",
      email: "email",
      phone: "phone",
      company: "company",
      message: "message",
    }
  );
  const [retryEnabled, setRetryEnabled] = useState(integration?.retryEnabled === "true");
  const [maxRetries, setMaxRetries] = useState(integration?.maxRetries || "3");
  const [newHeaderKey, setNewHeaderKey] = useState("");
  const [newHeaderValue, setNewHeaderValue] = useState("");

  // Update form state when integration loads
  useEffect(() => {
    if (integration) {
      setEnabled(integration.enabled === "true");
      setWebhookUrl(integration.webhookUrl);
      setWebhookMethod(integration.webhookMethod);
      setAuthType(integration.authType);
      setAuthValue(integration.authValue || "");
      setCustomHeaders((integration.customHeaders as Record<string, string>) || {});
      setFieldMapping((integration.fieldMapping as Record<string, string>) || {
        name: "name",
        email: "email",
        phone: "phone",
        company: "company",
        message: "message",
      });
      setRetryEnabled(integration.retryEnabled === "true");
      setMaxRetries(integration.maxRetries);
    }
  }, [integration]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/chatbots/${chatbotId}/crm-integration`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chatbots/${chatbotId}/crm-integration`] });
      toast({
        title: "CRM Integration Saved",
        description: "Your CRM integration settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save CRM integration settings.",
        variant: "destructive",
      });
    },
  });

  // Test mutation
  const testMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/chatbots/${chatbotId}/crm-integration/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to test");
      return response.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({
          title: "Connection Successful",
          description: "Test payload sent successfully to your CRM webhook.",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: data.error || "Failed to connect to webhook.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Test Failed",
        description: "Failed to test webhook connection.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const data = {
      enabled: enabled ? "true" : "false",
      webhookUrl,
      webhookMethod,
      authType,
      authValue: authValue || null,
      customHeaders,
      fieldMapping,
      retryEnabled: retryEnabled ? "true" : "false",
      maxRetries,
    };
    saveMutation.mutate(data);
  };

  const handleTest = () => {
    const data = {
      webhookUrl,
      webhookMethod,
      authType,
      authValue: authValue || null,
      customHeaders,
      fieldMapping,
    };
    testMutation.mutate(data);
  };

  const addCustomHeader = () => {
    if (newHeaderKey && newHeaderValue) {
      setCustomHeaders({ ...customHeaders, [newHeaderKey]: newHeaderValue });
      setNewHeaderKey("");
      setNewHeaderValue("");
    }
  };

  const removeCustomHeader = (key: string) => {
    const updated = { ...customHeaders };
    delete updated[key];
    setCustomHeaders(updated);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>CRM Integration</CardTitle>
            <CardDescription>
              Automatically send captured leads to your CRM system via webhook
            </CardDescription>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            data-testid="switch-crm-enabled"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sync Stats */}
        {integration && (
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">
                {integration.successCount} successful
              </span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-muted-foreground">
                {integration.errorCount} failed
              </span>
            </div>
            {integration.lastError && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-muted-foreground truncate max-w-xs">
                  Last error: {integration.lastError}
                </span>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Webhook Configuration */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <Input
              id="webhook-url"
              type="url"
              placeholder="https://api.yourcrm.com/webhooks/leads"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              disabled={!enabled}
              data-testid="input-webhook-url"
            />
            <p className="text-xs text-muted-foreground">
              The endpoint where lead data will be sent
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook-method">HTTP Method</Label>
            <Select value={webhookMethod} onValueChange={setWebhookMethod} disabled={!enabled}>
              <SelectTrigger id="webhook-method" data-testid="select-webhook-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Authentication */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Authentication</h3>
          
          <div className="space-y-2">
            <Label htmlFor="auth-type">Authentication Type</Label>
            <Select value={authType} onValueChange={setAuthType} disabled={!enabled}>
              <SelectTrigger id="auth-type" data-testid="select-auth-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="bearer">Bearer Token</SelectItem>
                <SelectItem value="api_key">API Key</SelectItem>
                <SelectItem value="basic">Basic Auth (Base64)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {authType !== "none" && (
            <div className="space-y-2">
              <Label htmlFor="auth-value">
                {authType === "bearer" && "Bearer Token"}
                {authType === "api_key" && "API Key"}
                {authType === "basic" && "Base64 Encoded Credentials"}
              </Label>
              <Input
                id="auth-value"
                type="password"
                placeholder={
                  authType === "basic"
                    ? "dXNlcm5hbWU6cGFzc3dvcmQ="
                    : "your-secret-key"
                }
                value={authValue}
                onChange={(e) => setAuthValue(e.target.value)}
                disabled={!enabled}
                data-testid="input-auth-value"
              />
            </div>
          )}
        </div>

        <Separator />

        {/* Custom Headers */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Custom Headers</h3>
          
          <div className="space-y-2">
            {Object.entries(customHeaders).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <Badge variant="secondary" className="flex-1">
                  {key}: {value}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeCustomHeader(key)}
                  disabled={!enabled}
                  data-testid={`button-remove-header-${key}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Header name"
              value={newHeaderKey}
              onChange={(e) => setNewHeaderKey(e.target.value)}
              disabled={!enabled}
              data-testid="input-header-key"
            />
            <Input
              placeholder="Header value"
              value={newHeaderValue}
              onChange={(e) => setNewHeaderValue(e.target.value)}
              disabled={!enabled}
              data-testid="input-header-value"
            />
            <Button
              size="icon"
              onClick={addCustomHeader}
              disabled={!enabled || !newHeaderKey || !newHeaderValue}
              data-testid="button-add-header"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Field Mapping */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium">Field Mapping</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Map lead fields to your CRM's expected field names
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(fieldMapping).map(([leadField, crmField]) => (
              <div key={leadField} className="space-y-2">
                <Label htmlFor={`field-${leadField}`} className="text-xs text-muted-foreground">
                  {leadField.charAt(0).toUpperCase() + leadField.slice(1)}
                </Label>
                <Input
                  id={`field-${leadField}`}
                  placeholder={crmField}
                  value={crmField}
                  onChange={(e) =>
                    setFieldMapping({ ...fieldMapping, [leadField]: e.target.value })
                  }
                  disabled={!enabled}
                  data-testid={`input-field-${leadField}`}
                />
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Retry Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Retry on Failure</h3>
              <p className="text-xs text-muted-foreground">
                Automatically retry failed webhook calls
              </p>
            </div>
            <Switch
              checked={retryEnabled}
              onCheckedChange={setRetryEnabled}
              disabled={!enabled}
              data-testid="switch-retry-enabled"
            />
          </div>

          {retryEnabled && (
            <div className="space-y-2">
              <Label htmlFor="max-retries">Maximum Retries</Label>
              <Select value={maxRetries} onValueChange={setMaxRetries} disabled={!enabled}>
                <SelectTrigger id="max-retries" data-testid="select-max-retries">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 retry</SelectItem>
                  <SelectItem value="2">2 retries</SelectItem>
                  <SelectItem value="3">3 retries</SelectItem>
                  <SelectItem value="5">5 retries</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={!webhookUrl || saveMutation.isPending}
            data-testid="button-save-crm"
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Integration
          </Button>
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={!webhookUrl || testMutation.isPending}
            data-testid="button-test-crm"
          >
            {testMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
        </div>

        {/* Documentation Link */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Need help setting up your CRM integration?{" "}
            <a
              href="https://docs.buildmychatbot.ai/crm-integration"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              View documentation
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
