import type { Lead, CrmIntegration } from "@shared/schema";
import { HyphenCRMService } from "./hyphen-crm";

interface WebhookRetryConfig {
  maxRetries: number;
  enabled: boolean;
}

export class CrmWebhookService {
  /**
   * Sends a lead to the configured CRM (generic webhook or Hyphen CRM)
   * Routes to appropriate service based on integration type
   */
  async sendLeadToWebhook(
    lead: Lead,
    integration: CrmIntegration
  ): Promise<{ success: boolean; error?: string }> {
    if (integration.enabled !== "true") {
      console.log(`[CRM] Integration disabled for chatbot ${integration.chatbotId}`);
      return { success: false, error: "Integration is disabled" };
    }

    // Route to Hyphen CRM service if integration type is "hyphen"
    if (integration.integrationType === "hyphen") {
      return this.sendToHyphen(lead, integration);
    }

    // Otherwise use generic webhook service
    return this.sendToGenericWebhook(lead, integration);
  }

  /**
   * Sends a lead to Hyphen CRM using native API integration
   */
  private async sendToHyphen(
    lead: Lead,
    integration: CrmIntegration
  ): Promise<{ success: boolean; error?: string }> {
    console.log(`[CRM] Sending lead ${lead.id} to Hyphen CRM`);

    if (!integration.hyphenEndpoint || !integration.hyphenBuilderId || 
        !integration.hyphenUsername || !integration.hyphenApiKey) {
      return { success: false, error: "Missing Hyphen CRM credentials" };
    }

    try {
      const hyphenService = new HyphenCRMService({
        endpoint: integration.hyphenEndpoint,
        builderId: integration.hyphenBuilderId,
        username: integration.hyphenUsername,
        apiKey: integration.hyphenApiKey,
        communityId: integration.hyphenCommunityId ?? undefined,
        sourceId: integration.hyphenSourceId ?? undefined,
        gradeId: integration.hyphenGradeId ?? undefined,
        influenceId: integration.hyphenInfluenceId ?? undefined,
        contactMethodId: integration.hyphenContactMethodId ?? undefined,
        reference: integration.hyphenReference ?? undefined,
      });

      const result = await hyphenService.submitLead(lead);
      return result;
    } catch (error) {
      console.error(`[CRM] Hyphen error for lead ${lead.id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown Hyphen error",
      };
    }
  }

  /**
   * Sends a lead to a generic webhook endpoint
   * Implements retry logic with exponential backoff
   */
  private async sendToGenericWebhook(
    lead: Lead,
    integration: CrmIntegration
  ): Promise<{ success: boolean; error?: string }> {
    if (!integration.webhookUrl) {
      return { success: false, error: "Missing webhook URL" };
    }

    const retryConfig: WebhookRetryConfig = {
      maxRetries: parseInt(integration.maxRetries),
      enabled: integration.retryEnabled === "true",
    };

    console.log(`[CRM] Sending lead ${lead.id} to ${integration.webhookUrl}`);

    // Build webhook payload with field mapping
    const payload = this.buildPayload(lead, integration.fieldMapping as Record<string, string>);
    
    // Try sending with retries
    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const result = await this.sendRequest(
          integration.webhookUrl,
          integration.webhookMethod,
          payload,
          integration
        );

        if (result.success) {
          console.log(`[CRM] Successfully sent lead ${lead.id} to CRM`);
          return { success: true };
        }

        // If not last attempt and retries enabled, wait before retry
        if (attempt < retryConfig.maxRetries && retryConfig.enabled) {
          const delay = this.calculateBackoff(attempt);
          console.log(`[CRM] Retry attempt ${attempt + 1}/${retryConfig.maxRetries} after ${delay}ms`);
          await this.sleep(delay);
        } else {
          return { success: false, error: result.error };
        }
      } catch (error: any) {
        const errorMsg = error.message || "Unknown error";
        console.error(`[CRM] Error sending lead ${lead.id}:`, errorMsg);

        // If last attempt or retries disabled, return error
        if (attempt >= retryConfig.maxRetries || !retryConfig.enabled) {
          return { success: false, error: errorMsg };
        }

        // Wait before retry
        const delay = this.calculateBackoff(attempt);
        console.log(`[CRM] Retry attempt ${attempt + 1}/${retryConfig.maxRetries} after ${delay}ms`);
        await this.sleep(delay);
      }
    }

    return { success: false, error: "Max retries exceeded" };
  }

  /**
   * Builds the webhook payload by mapping lead fields to CRM fields
   */
  private buildPayload(lead: Lead, fieldMapping: Record<string, string>): Record<string, any> {
    const payload: Record<string, any> = {};

    // Default mapping if no custom mapping provided
    const defaultMapping: Record<string, string> = {
      name: "name",
      email: "email",
      phone: "phone",
      company: "company",
      message: "message",
    };

    const mapping = Object.keys(fieldMapping).length > 0 ? fieldMapping : defaultMapping;

    // Map each lead field to CRM field name
    for (const [leadField, crmField] of Object.entries(mapping)) {
      const value = (lead as any)[leadField];
      if (value !== null && value !== undefined) {
        payload[crmField] = value;
      }
    }

    // Always include metadata
    payload.lead_id = lead.id;
    payload.chatbot_id = lead.chatbotId;
    payload.source = lead.source;
    payload.source_url = lead.sourceUrl;
    payload.created_at = lead.createdAt;

    // Include custom fields if present
    if (lead.customFields) {
      payload.custom_fields = lead.customFields;
    }

    return payload;
  }

  /**
   * Sends the HTTP request to the webhook URL
   */
  private async sendRequest(
    url: string,
    method: string,
    payload: Record<string, any>,
    integration: CrmIntegration
  ): Promise<{ success: boolean; error?: string }> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "BuildMyChatbot-CRM-Integration/1.0",
    };

    // Add authentication
    if (integration.authType !== "none" && integration.authValue) {
      switch (integration.authType) {
        case "bearer":
          headers["Authorization"] = `Bearer ${integration.authValue}`;
          break;
        case "api_key":
          headers["X-API-Key"] = integration.authValue;
          break;
        case "basic":
          headers["Authorization"] = `Basic ${integration.authValue}`;
          break;
      }
    }

    // Add custom headers
    if (integration.customHeaders) {
      const customHeaders = integration.customHeaders as Record<string, string>;
      Object.assign(headers, customHeaders);
    }

    try {
      const response = await fetch(url, {
        method: method,
        headers: headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return { success: true };
      }

      const errorText = await response.text().catch(() => "No response body");
      return { 
        success: false, 
        error: `HTTP ${response.status}: ${errorText.substring(0, 200)}` 
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Network error",
      };
    }
  }

  /**
   * Calculate exponential backoff delay with jitter
   * Pattern: 1s -> 2s -> 4s -> 8s
   */
  private calculateBackoff(attempt: number): number {
    const baseDelay = 1000; // 1 second
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 500; // Add up to 500ms random jitter
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Test webhook connection (doesn't count towards retry limits)
   */
  async testWebhook(integration: Pick<CrmIntegration, 'webhookUrl' | 'webhookMethod' | 'authType' | 'authValue' | 'customHeaders' | 'fieldMapping'>): Promise<{ success: boolean; error?: string }> {
    if (!integration.webhookUrl) {
      return { success: false, error: "Webhook URL is required" };
    }

    const testPayload = {
      name: "Test Lead",
      email: "test@example.com",
      phone: "+1234567890",
      company: "Test Company",
      message: "This is a test lead from BuildMyChatbot",
      lead_id: "test-" + Date.now(),
      chatbot_id: "test",
      source: "test",
      is_test: true,
    };

    console.log(`[CRM] Testing webhook connection to ${integration.webhookUrl}`);

    try {
      const result = await this.sendRequest(
        integration.webhookUrl,
        integration.webhookMethod,
        testPayload,
        integration as CrmIntegration
      );

      if (result.success) {
        console.log(`[CRM] Webhook test successful`);
      } else {
        console.log(`[CRM] Webhook test failed: ${result.error}`);
      }

      return result;
    } catch (error: any) {
      const errorMsg = error.message || "Unknown error";
      console.error(`[CRM] Webhook test error:`, errorMsg);
      return { success: false, error: errorMsg };
    }
  }
}

export const crmWebhookService = new CrmWebhookService();
