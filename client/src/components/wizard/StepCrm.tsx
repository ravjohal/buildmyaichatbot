import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Plus, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StepCrmProps {
  formData: {
    crmEnabled?: string;
    crmIntegrationType?: string;
    // Generic webhook fields
    crmWebhookUrl?: string;
    crmWebhookMethod?: string;
    crmAuthType?: string;
    crmAuthValue?: string;
    crmCustomHeaders?: Record<string, string>;
    crmFieldMapping?: Record<string, string>;
    crmRetryEnabled?: string;
    crmMaxRetries?: string;
    // Hyphen CRM fields
    crmHyphenEndpoint?: string;
    crmHyphenBuilderId?: string;
    crmHyphenUsername?: string;
    crmHyphenApiKey?: string;
    crmHyphenCommunityId?: string;
    crmHyphenSourceId?: string;
    crmHyphenGradeId?: string;
    crmHyphenInfluenceId?: string;
    crmHyphenContactMethodId?: string;
    crmHyphenReference?: string;
  };
  updateFormData: (data: any) => void;
}

export function StepCrm({ formData, updateFormData }: StepCrmProps) {
  const [enabled, setEnabled] = useState(formData.crmEnabled === "true");
  const [integrationType, setIntegrationType] = useState(formData.crmIntegrationType || "generic");
  
  // Generic webhook state
  const [webhookUrl, setWebhookUrl] = useState(formData.crmWebhookUrl || "");
  const [webhookMethod, setWebhookMethod] = useState(formData.crmWebhookMethod || "POST");
  const [authType, setAuthType] = useState(formData.crmAuthType || "none");
  const [authValue, setAuthValue] = useState(formData.crmAuthValue || "");
  const [customHeaders, setCustomHeaders] = useState<Record<string, string>>(formData.crmCustomHeaders || {});
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>(formData.crmFieldMapping || {
    name: "name",
    email: "email",
    phone: "phone",
    company: "company",
    message: "message",
  });
  const [retryEnabled, setRetryEnabled] = useState(formData.crmRetryEnabled !== "false");
  const [maxRetries, setMaxRetries] = useState(formData.crmMaxRetries || "3");
  const [newHeaderKey, setNewHeaderKey] = useState("");
  const [newHeaderValue, setNewHeaderValue] = useState("");

  // Hyphen CRM state
  const [hyphenEndpoint, setHyphenEndpoint] = useState(formData.crmHyphenEndpoint || "");
  const [hyphenBuilderId, setHyphenBuilderId] = useState(formData.crmHyphenBuilderId || "");
  const [hyphenUsername, setHyphenUsername] = useState(formData.crmHyphenUsername || "");
  const [hyphenApiKey, setHyphenApiKey] = useState(formData.crmHyphenApiKey || "");
  const [hyphenCommunityId, setHyphenCommunityId] = useState(formData.crmHyphenCommunityId || "");
  const [hyphenSourceId, setHyphenSourceId] = useState(formData.crmHyphenSourceId || "");
  const [hyphenGradeId, setHyphenGradeId] = useState(formData.crmHyphenGradeId || "");
  const [hyphenInfluenceId, setHyphenInfluenceId] = useState(formData.crmHyphenInfluenceId || "");
  const [hyphenContactMethodId, setHyphenContactMethodId] = useState(formData.crmHyphenContactMethodId || "");
  const [hyphenReference, setHyphenReference] = useState(formData.crmHyphenReference || "");

  const handleEnabledChange = (checked: boolean) => {
    setEnabled(checked);
    updateFormData({ ...formData, crmEnabled: checked ? "true" : "false" });
  };

  const handleIntegrationTypeChange = (value: string) => {
    setIntegrationType(value);
    updateFormData({ ...formData, crmIntegrationType: value });
  };

  const handleWebhookUrlChange = (value: string) => {
    setWebhookUrl(value);
    updateFormData({ ...formData, crmWebhookUrl: value });
  };

  const handleAddHeader = () => {
    if (newHeaderKey && newHeaderValue) {
      const updated = { ...customHeaders, [newHeaderKey]: newHeaderValue };
      setCustomHeaders(updated);
      updateFormData({ ...formData, crmCustomHeaders: updated });
      setNewHeaderKey("");
      setNewHeaderValue("");
    }
  };

  const handleRemoveHeader = (key: string) => {
    const updated = { ...customHeaders };
    delete updated[key];
    setCustomHeaders(updated);
    updateFormData({ ...formData, crmCustomHeaders: updated });
  };

  const handleFieldMappingChange = (leadField: string, crmField: string) => {
    const updated = { ...fieldMapping, [leadField]: crmField };
    setFieldMapping(updated);
    updateFormData({ ...formData, crmFieldMapping: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" data-testid="heading-crm">CRM Integration</h2>
        <p className="text-muted-foreground mt-1">
          Automatically send captured leads to your CRM system
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>CRM Integration</CardTitle>
              <CardDescription>
                Connect to your CRM system to automatically sync captured leads
              </CardDescription>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={handleEnabledChange}
              data-testid="switch-crm-enabled"
            />
          </div>
        </CardHeader>

        {enabled && (
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You can configure or skip this step now and set it up later from your chatbot settings.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Integration Type</Label>
              <Select value={integrationType} onValueChange={handleIntegrationTypeChange}>
                <SelectTrigger data-testid="select-integration-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generic">Generic Webhook (Any CRM)</SelectItem>
                  <SelectItem value="hyphen">Hyphen CRM (Native)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {integrationType === "generic" 
                  ? "Works with any CRM that supports webhooks (Salesforce, HubSpot, Pipedrive, etc.)"
                  : "Native integration with Hyphen CRM for home builders"}
              </p>
            </div>

            {integrationType === "generic" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Webhook URL *</Label>
                  <Input
                    id="webhook-url"
                    placeholder="https://your-crm.com/api/leads"
                    value={webhookUrl}
                    onChange={(e) => handleWebhookUrlChange(e.target.value)}
                    data-testid="input-webhook-url"
                  />
                  <p className="text-sm text-muted-foreground">
                    The endpoint where lead data will be sent
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>HTTP Method</Label>
                    <Select
                      value={webhookMethod}
                      onValueChange={(value) => {
                        setWebhookMethod(value);
                        updateFormData({ ...formData, crmWebhookMethod: value });
                      }}
                    >
                      <SelectTrigger data-testid="select-webhook-method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Authentication Type</Label>
                    <Select
                      value={authType}
                      onValueChange={(value) => {
                        setAuthType(value);
                        updateFormData({ ...formData, crmAuthType: value });
                      }}
                    >
                      <SelectTrigger data-testid="select-auth-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="bearer">Bearer Token</SelectItem>
                        <SelectItem value="api_key">API Key</SelectItem>
                        <SelectItem value="basic">Basic Auth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                        authType === "bearer" ? "your-bearer-token" :
                        authType === "api_key" ? "your-api-key" :
                        "base64-encoded-username:password"
                      }
                      value={authValue}
                      onChange={(e) => {
                        setAuthValue(e.target.value);
                        updateFormData({ ...formData, crmAuthValue: e.target.value });
                      }}
                      data-testid="input-auth-value"
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <Label>Custom Headers (Optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Header name"
                      value={newHeaderKey}
                      onChange={(e) => setNewHeaderKey(e.target.value)}
                      data-testid="input-header-key"
                    />
                    <Input
                      placeholder="Header value"
                      value={newHeaderValue}
                      onChange={(e) => setNewHeaderValue(e.target.value)}
                      data-testid="input-header-value"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleAddHeader}
                      data-testid="button-add-header"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {Object.entries(customHeaders).length > 0 && (
                    <div className="space-y-2">
                      {Object.entries(customHeaders).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                          <code className="flex-1 text-sm">{key}: {value}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveHeader(key)}
                            data-testid={`button-remove-header-${key}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label>Field Mapping</Label>
                  <p className="text-sm text-muted-foreground">
                    Map lead fields to your CRM's field names
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {["name", "email", "phone", "company", "message"].map((field) => (
                      <div key={field} className="space-y-2">
                        <Label className="text-xs text-muted-foreground capitalize">{field}</Label>
                        <Input
                          placeholder={`CRM field for ${field}`}
                          value={fieldMapping[field] || field}
                          onChange={(e) => handleFieldMappingChange(field, e.target.value)}
                          data-testid={`input-field-mapping-${field}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Retry on Failure</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically retry failed webhook calls
                    </p>
                  </div>
                  <Switch
                    checked={retryEnabled}
                    onCheckedChange={(checked) => {
                      setRetryEnabled(checked);
                      updateFormData({ ...formData, crmRetryEnabled: checked ? "true" : "false" });
                    }}
                    data-testid="switch-retry-enabled"
                  />
                </div>

                {retryEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="max-retries">Maximum Retries</Label>
                    <Input
                      id="max-retries"
                      type="number"
                      min="0"
                      max="10"
                      value={maxRetries}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^\d*$/.test(value)) {
                          setMaxRetries(value);
                          updateFormData({ ...formData, crmMaxRetries: value });
                        }
                      }}
                      data-testid="input-max-retries"
                    />
                    <p className="text-sm text-muted-foreground">
                      Number of retry attempts (0-10)
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="hyphen-endpoint">Hyphen API Endpoint *</Label>
                    <Input
                      id="hyphen-endpoint"
                      placeholder="https://api.hyphen.ai"
                      value={hyphenEndpoint}
                      onChange={(e) => {
                        setHyphenEndpoint(e.target.value);
                        updateFormData({ ...formData, crmHyphenEndpoint: e.target.value });
                      }}
                      data-testid="input-hyphen-endpoint"
                    />
                    <p className="text-sm text-muted-foreground">
                      Your Hyphen API base URL
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hyphen-builder-id">Home Builder ID *</Label>
                    <Input
                      id="hyphen-builder-id"
                      placeholder="12345"
                      value={hyphenBuilderId}
                      onChange={(e) => {
                        setHyphenBuilderId(e.target.value);
                        updateFormData({ ...formData, crmHyphenBuilderId: e.target.value });
                      }}
                      data-testid="input-hyphen-builder-id"
                    />
                    <p className="text-sm text-muted-foreground">
                      Your home builder ID from Hyphen
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hyphen-username">Username *</Label>
                      <Input
                        id="hyphen-username"
                        placeholder="api-user"
                        value={hyphenUsername}
                        onChange={(e) => {
                          setHyphenUsername(e.target.value);
                          updateFormData({ ...formData, crmHyphenUsername: e.target.value });
                        }}
                        data-testid="input-hyphen-username"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hyphen-api-key">API Key *</Label>
                      <Input
                        id="hyphen-api-key"
                        type="password"
                        placeholder="your-api-key"
                        value={hyphenApiKey}
                        onChange={(e) => {
                          setHyphenApiKey(e.target.value);
                          updateFormData({ ...formData, crmHyphenApiKey: e.target.value });
                        }}
                        data-testid="input-hyphen-api-key"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Label className="text-base">Optional Field Mapping</Label>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">
                      These fields will be included with every lead if specified
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="hyphen-community-id" className="text-sm">Community ID</Label>
                        <Input
                          id="hyphen-community-id"
                          placeholder="Optional"
                          value={hyphenCommunityId}
                          onChange={(e) => {
                            setHyphenCommunityId(e.target.value);
                            updateFormData({ ...formData, crmHyphenCommunityId: e.target.value });
                          }}
                          data-testid="input-hyphen-community-id"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="hyphen-source-id" className="text-sm">Source ID</Label>
                        <Input
                          id="hyphen-source-id"
                          placeholder="Optional"
                          value={hyphenSourceId}
                          onChange={(e) => {
                            setHyphenSourceId(e.target.value);
                            updateFormData({ ...formData, crmHyphenSourceId: e.target.value });
                          }}
                          data-testid="input-hyphen-source-id"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="hyphen-grade-id" className="text-sm">Grade ID</Label>
                        <Input
                          id="hyphen-grade-id"
                          placeholder="Optional"
                          value={hyphenGradeId}
                          onChange={(e) => {
                            setHyphenGradeId(e.target.value);
                            updateFormData({ ...formData, crmHyphenGradeId: e.target.value });
                          }}
                          data-testid="input-hyphen-grade-id"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="hyphen-influence-id" className="text-sm">Influence ID</Label>
                        <Input
                          id="hyphen-influence-id"
                          placeholder="Optional"
                          value={hyphenInfluenceId}
                          onChange={(e) => {
                            setHyphenInfluenceId(e.target.value);
                            updateFormData({ ...formData, crmHyphenInfluenceId: e.target.value });
                          }}
                          data-testid="input-hyphen-influence-id"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="hyphen-contact-method-id" className="text-sm">Contact Method ID</Label>
                        <Input
                          id="hyphen-contact-method-id"
                          placeholder="Optional"
                          value={hyphenContactMethodId}
                          onChange={(e) => {
                            setHyphenContactMethodId(e.target.value);
                            updateFormData({ ...formData, crmHyphenContactMethodId: e.target.value });
                          }}
                          data-testid="input-hyphen-contact-method-id"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="hyphen-reference" className="text-sm">Reference</Label>
                        <Input
                          id="hyphen-reference"
                          placeholder="Optional"
                          value={hyphenReference}
                          onChange={(e) => {
                            setHyphenReference(e.target.value);
                            updateFormData({ ...formData, crmHyphenReference: e.target.value });
                          }}
                          data-testid="input-hyphen-reference"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
