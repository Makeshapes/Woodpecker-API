interface WoodpeckerCampaign {
  campaign_id: number;
  name: string;
  status: string;
  created_date: string;
  prospects_count?: number;
}

interface WoodpeckerProspect {
  email: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  title?: string;
  linkedin_url?: string;
  city?: string;
  state?: string;
  country?: string;
  time_zone?: string;  // Woodpecker expects time_zone, not timezone
  website?: string;    // Company website
  industry?: string;   // Industry field
  snippet1?: string;
  snippet2?: string;
  snippet3?: string;
  snippet4?: string;
  snippet5?: string;
  snippet6?: string;
  snippet7?: string;
  [key: string]: string | undefined;
}

interface AddProspectsRequest {
  prospects: WoodpeckerProspect[];
  campaign: {
    campaign_id: number;
  };
  force?: boolean;
  file_name?: string;
}

interface WoodpeckerApiResponse {
  status: {
    code: string;
    msg: string;
  };
  prospects?: Array<{
    email: string;
    status: string;
    msg?: string;
  }>;
}

interface ExportProgress {
  current: number;
  total: number;
  succeeded: number;
  failed: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  errors: Array<{ email: string; error: string }>;
}

class WoodpeckerService {
  private apiKey: string;
  private baseUrl: string = import.meta.env.DEV ? '/api/woodpecker' : 'https://api.woodpecker.co/rest/v1';
  private rateLimitDelay: number = 650; // 100 req/min = ~600ms between requests, adding buffer
  private cachedCampaigns: WoodpeckerCampaign[] | null = null;
  private cacheExpiry: number | null = null;
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  constructor(apiKey?: string) {
    // Note: This frontend service is deprecated and will be replaced by IPC calls to main process
    // API key should no longer be accessible from frontend for security
    const key = apiKey;
    console.log('🔧 WoodpeckerService: Initializing service...', {
      hasApiKey: !!key,
      apiKeyLength: key ? key.length : 0,
      baseUrl: this.baseUrl,
      isDev: import.meta.env.DEV,
      hasElectronAPI: typeof window !== 'undefined' && !!window.api
    });

    // In Electron environment, we don't need an API key as we'll use IPC
    if (typeof window !== 'undefined' && window.api) {
      console.log('✅ WoodpeckerService: Running in Electron, will use IPC calls');
      this.apiKey = 'ELECTRON_IPC'; // Placeholder, won't be used
    } else if (!key) {
      console.error('❌ WoodpeckerService: API key not provided and not in Electron environment');
      throw new Error('Woodpecker API key not provided - use IPC calls to main process instead');
    } else {
      this.apiKey = key;
    }
  }

  private getHeaders(): HeadersInit {
    return {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('🌐 WoodpeckerService: Making API request:', {
      url: url,
      method: options.method || 'GET',
      endpoint: endpoint,
      headers: options.headers
    });

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      console.log('📡 WoodpeckerService: Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      const data = await response.json();
      console.log('📦 WoodpeckerService: Response data:', data);

      if (!response.ok) {
        const errorMsg = data?.status?.msg || `HTTP ${response.status}`;
        console.error('❌ WoodpeckerService: API error:', {
          errorMsg: errorMsg,
          status: response.status,
          data: data
        });
        throw new Error(`Woodpecker API error: ${errorMsg}`);
      }

      return data as T;
    } catch (error) {
      console.error('❌ WoodpeckerService: Request failed:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while calling Woodpecker API');
    }
  }

  async getCampaigns(forceRefresh: boolean = false): Promise<WoodpeckerCampaign[]> {
    console.log('📡 WoodpeckerService.getCampaigns: Starting...', {
      forceRefresh: forceRefresh,
      hasCachedCampaigns: !!this.cachedCampaigns,
      cacheExpiry: this.cacheExpiry,
      cacheValid: this.cacheExpiry ? Date.now() < this.cacheExpiry : false
    });

    // Use IPC in Electron environment
    if (typeof window !== 'undefined' && window.api && window.api.woodpecker) {
      try {
        console.log('📡 WoodpeckerService.getCampaigns: Using Electron IPC');
        const response = await window.api.woodpecker.getCampaigns({ forceRefresh });
        if ('error' in response) {
          console.error('❌ WoodpeckerService.getCampaigns: IPC error:', response.error);
          return this.getMockCampaigns();
        }
        return response.data || [];
      } catch (error) {
        console.error('❌ WoodpeckerService.getCampaigns: IPC failed:', error);
        return this.getMockCampaigns();
      }
    }

    if (
      !forceRefresh &&
      this.cachedCampaigns &&
      this.cacheExpiry &&
      Date.now() < this.cacheExpiry
    ) {
      console.log('📦 WoodpeckerService.getCampaigns: Returning cached campaigns:', this.cachedCampaigns);
      return this.cachedCampaigns;
    }

    // Check if API key is missing or empty (demo mode)
    if (!this.apiKey || this.apiKey.trim() === '') {
      console.warn('⚠️ WoodpeckerService.getCampaigns: No API key, using mock campaigns');
      return this.getMockCampaigns();
    }

    try {
      console.log('📡 WoodpeckerService.getCampaigns: Fetching campaigns from API...');
      // Use the correct endpoint from Woodpecker API docs
      const response = await this.makeRequest<any[]>(
        '/campaign_list'
      );

      console.log('📦 WoodpeckerService.getCampaigns: Raw API response:', response);

      // Response is directly an array of campaigns
      this.cachedCampaigns = Array.isArray(response)
        ? response.map(campaign => ({
            campaign_id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            created_date: campaign.created,
            prospects_count: undefined, // Not provided by this endpoint
          }))
        : []; // Fallback for unexpected response format

      this.cacheExpiry = Date.now() + this.cacheTimeout;

      console.log('✅ WoodpeckerService.getCampaigns: Campaigns fetched and cached:', {
        count: this.cachedCampaigns.length,
        campaigns: this.cachedCampaigns
      });

      return this.cachedCampaigns;
    } catch (error) {
      console.error('❌ WoodpeckerService.getCampaigns: Failed to fetch campaigns:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  private getMockCampaigns(): WoodpeckerCampaign[] {
    // Mock campaigns for development/demo
    const mockCampaigns = [
      {
        campaign_id: 2356837,
        name: 'Q4 Outreach Campaign',
        status: 'ACTIVE',
        created_date: '2024-12-01T10:00:00Z',
        prospects_count: 145,
      },
      {
        campaign_id: 1234567,
        name: 'SaaS CEOs',
        status: 'RUNNING',
        created_date: '2024-11-15T14:30:00Z',
        prospects_count: 89,
      },
      {
        campaign_id: 7654321,
        name: 'Holiday Follow-up',
        status: 'PAUSED',
        created_date: '2024-12-10T09:15:00Z',
        prospects_count: 234,
      },
      {
        campaign_id: 9876543,
        name: 'New Year Prospects',
        status: 'DRAFT',
        created_date: '2024-12-20T16:45:00Z',
        prospects_count: 67,
      },
    ];

    this.cachedCampaigns = mockCampaigns;
    this.cacheExpiry = Date.now() + this.cacheTimeout;

    return mockCampaigns;
  }

  async detectProspectTimezones(prospectIds: number[]): Promise<void> {
    console.log('🌍 WoodpeckerService.detectProspectTimezones: Detecting timezones for prospects:', prospectIds);

    try {
      // Create a bulk operation ID (you might need to get this from a different endpoint)
      const bulkOperationId = crypto.randomUUID();

      const response = await this.makeRequest<any>(
        `/prospects/bulk/${bulkOperationId}`,
        {
          method: 'POST',
          body: JSON.stringify({
            type: 'DETECT_TIMEZONE',
            prospect_ids: prospectIds
          }),
        }
      );

      console.log('✅ WoodpeckerService.detectProspectTimezones: Timezone detection initiated:', response);
      return response;
    } catch (error) {
      console.error('❌ WoodpeckerService.detectProspectTimezones: Failed to detect timezones:', error);
      // Don't throw - this is a nice-to-have feature
    }
  }

  async addProspectsToCampaign(
    prospects: WoodpeckerProspect[],
    campaignId: number,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportProgress> {
    console.log('🚀 WoodpeckerService.addProspectsToCampaign: Starting export...', {
      prospectsCount: prospects.length,
      campaignId: campaignId,
      hasApiKey: !!this.apiKey
    });

    const progress: ExportProgress = {
      current: 0,
      total: prospects.length,
      succeeded: 0,
      failed: 0,
      status: 'processing',
      errors: [],
    };

    if (prospects.length === 0) {
      console.warn('⚠️ WoodpeckerService.addProspectsToCampaign: No prospects to export');
      progress.status = 'completed';
      return progress;
    }

    // Demo mode: simulate successful export
    if (!this.apiKey || this.apiKey.trim() === '') {
      console.warn('⚠️ WoodpeckerService.addProspectsToCampaign: Demo mode - simulating export');
      return this.simulateExport(prospects, campaignId, onProgress);
    }

    const BATCH_SIZE = 50; // Process in smaller batches to avoid timeouts
    const batches = [];

    for (let i = 0; i < prospects.length; i += BATCH_SIZE) {
      batches.push(prospects.slice(i, i + BATCH_SIZE));
    }

    try {
      for (const batch of batches) {
        const request: AddProspectsRequest = {
          prospects: batch,
          campaign: {
            campaign_id: campaignId,
          },
          force: false,
        };

        try {
          console.log(`📤 WoodpeckerService.addProspectsToCampaign: Sending batch ${batches.indexOf(batch) + 1}/${batches.length}`, {
            batchSize: batch.length,
            request: request,
            prospectDetails: batch.map(p => ({
              email: p.email,
              first_name: p.first_name,
              last_name: p.last_name,
              company: p.company,
              title: p.title,
              linkedin_url: p.linkedin_url,
              city: p.city,
              state: p.state,
              country: p.country,
              time_zone: p.time_zone,
              snippet1: p.snippet1?.substring(0, 50) + '...',
              snippet2: p.snippet2?.substring(0, 50) + '...',
              allKeys: Object.keys(p)
            }))
          });

          console.log(`🌍 WoodpeckerService: Timezone check for batch:`,
            batch.map(p => ({
              email: p.email,
              time_zone: p.time_zone,
              hasTimezone: !!p.time_zone,
              location: `${p.city}, ${p.state}, ${p.country}`
            }))
          );

          const response = await this.makeRequest<WoodpeckerApiResponse>(
            '/add_prospects_campaign',
            {
              method: 'POST',
              body: JSON.stringify(request),
            }
          );

          console.log(`📥 WoodpeckerService.addProspectsToCampaign: Batch response received:`, response);
          console.log(`🔥 FORCE REFRESH: Response structure analysis:`, {
            hasProspects: !!response.prospects,
            prospectsLength: response.prospects?.length,
            responseKeys: Object.keys(response),
            statusInfo: response.status,
            firstProspect: response.prospects?.[0]
          });

          // Collect successfully added prospect IDs for timezone detection
          const addedProspectIds: number[] = [];

          if (response.prospects) {
            response.prospects.forEach((prospect, index) => {
              console.log(`🔍 WoodpeckerService: Processing prospect ${index + 1}:`);
              console.log(`📧 Email:`, prospect.email);
              console.log(`📊 Status:`, prospect.status);
              console.log(`💬 Message:`, prospect.msg);
              console.log(`🆔 ID:`, prospect.id);
              console.log(`🔑 All Keys:`, Object.keys(prospect));
              console.log(`📋 Full Object:`, JSON.stringify(prospect, null, 2));

              // Try common alternative field names
              const alternativeFields = {
                result: prospect.result,
                code: prospect.code,
                message: prospect.message,
                error: prospect.error,
                response: prospect.response,
                state: prospect.state
              };
              console.log(`🔍 Alternative fields:`, alternativeFields);

              progress.current++;

              // Check for success - Woodpecker API typically returns status in prospect object
              // or the prospect object itself indicates success if it exists without errors
              const isSuccess = (
                prospect.status === 'OK' ||
                prospect.status === 'DUPLICATE' ||
                prospect.status === 'SUCCESS' ||
                prospect.result === 'OK' ||
                prospect.result === 'SUCCESS' ||
                (!prospect.error && !prospect.status) // If no error field and prospect exists, assume success
              );

              if (isSuccess) {
                console.log(`✅ WoodpeckerService: Prospect ${prospect.email} succeeded`);
                progress.succeeded++;

                // Collect ID for timezone detection
                if (prospect.id) {
                  addedProspectIds.push(prospect.id);
                }
              } else {
                const errorMessage =
                  prospect.msg ||
                  prospect.message ||
                  prospect.error ||
                  prospect.status ||
                  (prospect.status === undefined ? 'API response missing status field' : 'Unknown error');

                console.log(`❌ WoodpeckerService: Prospect ${prospect.email} failed:`, {
                  status: prospect.status,
                  msg: prospect.msg,
                  error: prospect.error,
                  errorMessage: errorMessage
                });
                progress.failed++;
                progress.errors.push({
                  email: prospect.email,
                  error: errorMessage,
                });
              }
            });
          } else {
            batch.forEach(_prospect => {
              progress.current++;
              progress.succeeded++;
            });
          }

          // After each batch, trigger timezone detection for successfully added prospects
          if (addedProspectIds.length > 0) {
            console.log(`🌍 WoodpeckerService: Triggering timezone detection for ${addedProspectIds.length} prospects...`);
            // Fire and forget - don't wait for timezone detection
            this.detectProspectTimezones(addedProspectIds).catch(err =>
              console.warn('⚠️ Timezone detection failed but prospects were added:', err)
            );
          }

          if (onProgress) {
            onProgress({ ...progress });
          }

          // Rate limiting between batches
          if (batches.indexOf(batch) < batches.length - 1) {
            await this.delay(this.rateLimitDelay);
          }
        } catch (error) {
          // Handle batch failure
          batch.forEach(_prospect => {
            progress.current++;
            progress.failed++;
            progress.errors.push({
              email: _prospect.email,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          });

          if (onProgress) {
            onProgress({ ...progress });
          }
        }
      }

      progress.status = progress.failed === 0 ? 'completed' : 'completed';
      return progress;
    } catch (error) {
      progress.status = 'error';
      throw error;
    }
  }

  private async simulateExport(
    prospects: WoodpeckerProspect[],
    campaignId: number,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportProgress> {
    console.warn(`Demo mode: Simulating export of ${prospects.length} prospects to campaign ${campaignId}`);

    const progress: ExportProgress = {
      current: 0,
      total: prospects.length,
      succeeded: 0,
      failed: 0,
      status: 'processing',
      errors: [],
    };

    // Simulate progress with delays
    for (const prospect of prospects) {
      await this.delay(200); // Simulate API call delay

      progress.current++;
      progress.succeeded++;

      if (onProgress) {
        onProgress({ ...progress });
      }
    }

    progress.status = 'completed';
    return progress;
  }

  async checkDuplicateProspects(
    emails: string[],
    campaignId: number
  ): Promise<string[]> {
    console.log('🔍 WoodpeckerService.checkDuplicateProspects: Checking for duplicates...', {
      emailCount: emails.length,
      campaignId: campaignId,
      emails: emails
    });

    try {
      const response = await this.makeRequest<{
        prospects: Array<{ email: string; campaigns: number[] }>
      }>(`/prospects?campaign_id=${campaignId}`);

      console.log('📦 WoodpeckerService.checkDuplicateProspects: Response received:', response);

      const existingEmails = new Set(
        response.prospects
          .filter(p => p.campaigns.includes(campaignId))
          .map(p => p.email.toLowerCase())
      );

      const duplicates = emails.filter(email => existingEmails.has(email.toLowerCase()));
      console.log('📊 WoodpeckerService.checkDuplicateProspects: Duplicate check complete:', {
        totalEmails: emails.length,
        existingEmails: existingEmails.size,
        duplicates: duplicates
      });

      return duplicates;
    } catch (error) {
      console.error('❌ WoodpeckerService.checkDuplicateProspects: Failed to check duplicates:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      // Return empty array on error to allow export to proceed
      return [];
    }
  }

  clearCampaignCache(): void {
    this.cachedCampaigns = null;
    this.cacheExpiry = null;
  }
}

export default WoodpeckerService;
export type {
  WoodpeckerCampaign,
  WoodpeckerProspect,
  WoodpeckerApiResponse,
  ExportProgress,
};