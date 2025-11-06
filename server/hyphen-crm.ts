import type { Lead } from "@shared/schema";

interface HyphenConfig {
  endpoint: string;
  builderId: string;
  username: string;
  apiKey: string;
  communityId?: string;
  sourceId?: string;
  gradeId?: string;
  influenceId?: string;
  contactMethodId?: string;
  reference?: string;
}

interface HyphenTokenResponse {
  token?: string;
  error?: string;
}

interface HyphenCustomerPayload {
  home_builder_id: string;
  name: string;
  email?: string;
  phone?: string;
  community_id?: string;
  source_id?: string;
  grade_id?: string;
  influence_id?: string;
  contact_method_id?: string;
  reference?: string;
  [key: string]: any;
}

// In-memory token cache with expiry tracking
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

/**
 * Hyphen CRM Integration Service
 * 
 * Provides native integration with Hyphen CRM API:
 * - Token acquisition and refresh (1-hour tokens)
 * - Lead submission to Create Customer endpoint
 * - Automatic retry on token expiry
 */
export class HyphenCRMService {
  private config: HyphenConfig;
  private cacheKey: string;

  constructor(config: HyphenConfig) {
    this.config = config;
    // Create unique cache key for this builder's tokens
    this.cacheKey = `${config.endpoint}:${config.builderId}`;
  }

  /**
   * Get a valid bearer token (from cache or fetch new)
   */
  private async getToken(): Promise<string> {
    // Check cache first
    const cached = tokenCache.get(this.cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      console.log('[Hyphen] Using cached token');
      return cached.token;
    }

    console.log('[Hyphen] Fetching new token...');
    
    // Fetch new token
    const response = await fetch(`${this.config.endpoint}/api/auth/external/token/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: this.config.username,
        key: this.config.apiKey,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get Hyphen token: ${response.status} ${errorText}`);
    }

    const data: HyphenTokenResponse = await response.json();
    
    if (!data.token) {
      throw new Error('No token returned from Hyphen API');
    }

    // Cache token for 55 minutes (5min buffer before 1hr expiry)
    const expiresAt = Date.now() + (55 * 60 * 1000);
    tokenCache.set(this.cacheKey, { token: data.token, expiresAt });
    
    console.log('[Hyphen] Token acquired and cached');
    return data.token;
  }

  /**
   * Submit a lead to Hyphen CRM
   */
  async submitLead(lead: Lead): Promise<{ success: boolean; error?: string; response?: any }> {
    try {
      const token = await this.getToken();
      
      // Build customer payload according to Hyphen API spec
      const payload: HyphenCustomerPayload = {
        home_builder_id: this.config.builderId,
        name: lead.name || 'Unknown',
        email: lead.email ?? undefined,
        phone: lead.phone ?? undefined,
      };

      // Add optional Hyphen-specific fields if configured
      if (this.config.communityId) payload.community_id = this.config.communityId;
      if (this.config.sourceId) payload.source_id = this.config.sourceId;
      if (this.config.gradeId) payload.grade_id = this.config.gradeId;
      if (this.config.influenceId) payload.influence_id = this.config.influenceId;
      if (this.config.contactMethodId) payload.contact_method_id = this.config.contactMethodId;
      if (this.config.reference) payload.reference = this.config.reference;

      // Add message as notes or custom field
      if (lead.message) {
        payload.notes = lead.message;
      }

      // Add company if present
      if (lead.company) {
        payload.company_name = lead.company;
      }

      console.log('[Hyphen] Submitting lead to Create Customer v2 endpoint');
      
      // Call Create Customer v2 endpoint (preferred over v1)
      const response = await fetch(`${this.config.endpoint}/api/auth/external/customer/create/v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Check if token expired (401) and retry once with fresh token
        if (response.status === 401) {
          console.log('[Hyphen] Token expired, clearing cache and retrying...');
          tokenCache.delete(this.cacheKey);
          
          // Retry once with fresh token
          const newToken = await this.getToken();
          const retryResponse = await fetch(`${this.config.endpoint}/api/auth/external/customer/create/v2`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${newToken}`,
            },
            body: JSON.stringify(payload),
          });

          const retryData = await retryResponse.json();
          
          if (!retryResponse.ok) {
            return {
              success: false,
              error: `Hyphen API error (retry): ${retryResponse.status} ${JSON.stringify(retryData)}`,
            };
          }

          return {
            success: true,
            response: retryData,
          };
        }

        return {
          success: false,
          error: `Hyphen API error: ${response.status} ${JSON.stringify(responseData)}`,
        };
      }

      console.log('[Hyphen] Lead submitted successfully');
      
      return {
        success: true,
        response: responseData,
      };

    } catch (error) {
      console.error('[Hyphen] Error submitting lead:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test the connection to Hyphen CRM
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.getToken();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
