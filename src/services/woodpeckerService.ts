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
  private baseUrl: string = 'https://api.woodpecker.co/rest/v1';
  private rateLimitDelay: number = 650; // 100 req/min = ~600ms between requests, adding buffer
  private cachedCampaigns: WoodpeckerCampaign[] | null = null;
  private cacheExpiry: number | null = null;
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  constructor(apiKey?: string) {
    const key = apiKey || import.meta.env.VITE_WOODPECKER_API_KEY;
    if (!key) {
      throw new Error('VITE_WOODPECKER_API_KEY environment variable is not set');
    }
    this.apiKey = key;
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

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.status?.msg || `HTTP ${response.status}`;
        throw new Error(`Woodpecker API error: ${errorMsg}`);
      }

      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while calling Woodpecker API');
    }
  }

  async getCampaigns(forceRefresh: boolean = false): Promise<WoodpeckerCampaign[]> {
    if (
      !forceRefresh &&
      this.cachedCampaigns &&
      this.cacheExpiry &&
      Date.now() < this.cacheExpiry
    ) {
      return this.cachedCampaigns;
    }

    try {
      const response = await this.makeRequest<{ campaigns: WoodpeckerCampaign[] }>(
        '/campaigns'
      );

      this.cachedCampaigns = response.campaigns || [];
      this.cacheExpiry = Date.now() + this.cacheTimeout;

      return this.cachedCampaigns;
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      throw error;
    }
  }

  async addProspectsToCampaign(
    prospects: WoodpeckerProspect[],
    campaignId: number,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportProgress> {
    const progress: ExportProgress = {
      current: 0,
      total: prospects.length,
      succeeded: 0,
      failed: 0,
      status: 'processing',
      errors: [],
    };

    if (prospects.length === 0) {
      progress.status = 'completed';
      return progress;
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
          const response = await this.makeRequest<WoodpeckerApiResponse>(
            '/add_prospects_campaign',
            {
              method: 'POST',
              body: JSON.stringify(request),
            }
          );

          if (response.prospects) {
            response.prospects.forEach(prospect => {
              progress.current++;
              if (prospect.status === 'OK' || prospect.status === 'DUPLICATE') {
                progress.succeeded++;
              } else {
                progress.failed++;
                progress.errors.push({
                  email: prospect.email,
                  error: prospect.msg || prospect.status,
                });
              }
            });
          } else {
            batch.forEach(_prospect => {
              progress.current++;
              progress.succeeded++;
            });
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

  async checkDuplicateProspects(
    emails: string[],
    campaignId: number
  ): Promise<string[]> {
    try {
      const response = await this.makeRequest<{
        prospects: Array<{ email: string; campaigns: number[] }>
      }>(`/prospects?campaign_id=${campaignId}`);

      const existingEmails = new Set(
        response.prospects
          .filter(p => p.campaigns.includes(campaignId))
          .map(p => p.email.toLowerCase())
      );

      return emails.filter(email => existingEmails.has(email.toLowerCase()));
    } catch (error) {
      console.error('Failed to check duplicates:', error);
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