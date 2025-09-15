import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  XCircle,
  Loader2,
  Upload,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import CampaignSelector from './CampaignSelector';
import WoodpeckerService from '@/services/woodpeckerService';
import {
  formatMultipleProspects,
  validateWoodpeckerProspect,
} from '@/utils/woodpeckerFormatter';
import type { LeadData } from '@/types/lead';
import type { WoodpeckerCampaign, ExportProgress } from '@/services/woodpeckerService';

interface ExportToWoodpeckerProps {
  leads: LeadData[];
  getGeneratedContent: (leadId: string) => any;
  trigger?: React.ReactNode;
  onExportComplete?: (success: boolean, results?: ExportProgress) => void;
}

interface ExportState {
  status: 'idle' | 'confirming' | 'exporting' | 'completed' | 'error';
  selectedCampaign: WoodpeckerCampaign | null;
  progress: ExportProgress | null;
  error: string | null;
  duplicateProspects: string[];
  validationErrors: Array<{ email: string; errors: string[] }>;
}

export function ExportToWoodpecker({
  leads,
  getGeneratedContent,
  trigger,
  onExportComplete,
}: ExportToWoodpeckerProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ExportState>({
    status: 'idle',
    selectedCampaign: null,
    progress: null,
    error: null,
    duplicateProspects: [],
    validationErrors: [],
  });
  const [woodpeckerService] = useState(() => new WoodpeckerService());

  const handleCampaignSelect = useCallback(async (_campaignId: string, campaign: WoodpeckerCampaign | null) => {
    console.log('🎯 ExportToWoodpecker: Campaign selected:', {
      campaignId: _campaignId,
      campaign: campaign
    });

    if (!campaign) {
      console.warn('⚠️ ExportToWoodpecker: No campaign provided');
      return;
    }

    setState(prev => ({
      ...prev,
      selectedCampaign: campaign,
      status: 'confirming',
      duplicateProspects: [],
      validationErrors: [],
    }));

    // Check for duplicates and validate prospects
    try {
      console.log('📋 ExportToWoodpecker: Formatting prospects for validation...');
      const prospects = formatMultipleProspects(leads, getGeneratedContent);
      console.log('✅ ExportToWoodpecker: Formatted prospects:', {
        count: prospects.length,
        prospects: prospects
      });

      const emails = prospects.map(p => p.email);
      console.log('📧 ExportToWoodpecker: Extracted emails:', emails);

      // Check duplicates
      console.log('🔍 ExportToWoodpecker: Checking for duplicate prospects in campaign', campaign.campaign_id);
      const duplicates = await woodpeckerService.checkDuplicateProspects(
        emails,
        campaign.campaign_id
      );
      console.log('📊 ExportToWoodpecker: Duplicate check results:', {
        duplicatesFound: duplicates.length,
        duplicates: duplicates
      });

      // Validate prospects
      console.log('✔️ ExportToWoodpecker: Validating prospect data...');
      const validationResults = prospects.map(prospect => {
        const validation = validateWoodpeckerProspect(prospect);
        return {
          email: prospect.email,
          errors: validation.errors,
        };
      });

      const validationErrors = validationResults.filter(r => r.errors.length > 0);
      console.log('📝 ExportToWoodpecker: Validation results:', {
        totalProspects: prospects.length,
        validProspects: prospects.length - validationErrors.length,
        invalidProspects: validationErrors.length,
        errors: validationErrors
      });

      setState(prev => ({
        ...prev,
        duplicateProspects: duplicates,
        validationErrors,
      }));
    } catch (error) {
      console.error('❌ ExportToWoodpecker: Error checking duplicates/validation:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      setState(prev => ({
        ...prev,
        error: 'Failed to validate prospects. Please try again.',
      }));
    }
  }, [leads, getGeneratedContent, woodpeckerService]);

  const handleExport = useCallback(async () => {
    console.log('🚀 ExportToWoodpecker: Starting export process...');
    console.log('📌 ExportToWoodpecker: Selected campaign:', state.selectedCampaign);

    if (!state.selectedCampaign) {
      console.error('❌ ExportToWoodpecker: No campaign selected, aborting export');
      return;
    }

    setState(prev => ({ ...prev, status: 'exporting', error: null }));

    try {
      console.log('📋 ExportToWoodpecker: Formatting prospects for export...');
      const prospects = formatMultipleProspects(leads, getGeneratedContent);
      console.log('✅ ExportToWoodpecker: Formatted prospects:', {
        totalCount: prospects.length,
        prospects: prospects
      });

      // Filter out invalid prospects
      console.log('🔍 ExportToWoodpecker: Filtering valid prospects...');
      const validProspects = prospects.filter(prospect => {
        const validation = validateWoodpeckerProspect(prospect);
        if (!validation.isValid) {
          console.warn('⚠️ ExportToWoodpecker: Invalid prospect:', {
            email: prospect.email,
            errors: validation.errors
          });
        }
        return validation.isValid;
      });

      console.log('📊 ExportToWoodpecker: Valid prospects after filtering:', {
        validCount: validProspects.length,
        invalidCount: prospects.length - validProspects.length,
        validProspects: validProspects
      });

      if (validProspects.length === 0) {
        console.error('❌ ExportToWoodpecker: No valid prospects to export');
        throw new Error('No valid prospects to export');
      }

      console.log(`📡 ExportToWoodpecker: Calling API to add ${validProspects.length} prospects to campaign ${state.selectedCampaign.campaign_id}`);
      const progress = await woodpeckerService.addProspectsToCampaign(
        validProspects,
        state.selectedCampaign.campaign_id,
        (currentProgress) => {
          console.log('📈 ExportToWoodpecker: Progress update:', currentProgress);
          setState(prev => ({
            ...prev,
            progress: currentProgress,
          }));
        }
      );

      console.log('✅ ExportToWoodpecker: Export completed successfully:', progress);
      setState(prev => ({
        ...prev,
        status: 'completed',
        progress,
      }));

      toast.success(
        `Export completed! ${progress.succeeded} prospects added to campaign.`,
        {
          description: progress.failed > 0 ? `${progress.failed} failed to export` : undefined,
        }
      );

      onExportComplete?.(true, progress);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ ExportToWoodpecker: Export failed:', {
        error: error,
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      setState(prev => ({
        ...prev,
        status: 'error',
        error: errorMessage,
      }));

      toast.error('Export failed', {
        description: errorMessage,
      });

      onExportComplete?.(false);
    }
  }, [state.selectedCampaign, leads, getGeneratedContent, woodpeckerService, onExportComplete]);

  const handleClose = () => {
    setOpen(false);
    setState({
      status: 'idle',
      selectedCampaign: null,
      progress: null,
      error: null,
      duplicateProspects: [],
      validationErrors: [],
    });
  };

  const handleRetry = () => {
    setState(prev => ({
      ...prev,
      status: 'confirming',
      error: null,
    }));
  };

  const renderConfirmationContent = () => {
    if (!state.selectedCampaign) return null;

    const hasIssues = state.duplicateProspects.length > 0 || state.validationErrors.length > 0;

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-medium">Export Summary</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Campaign: {state.selectedCampaign.name}</div>
            <div>Total Prospects: {leads.length}</div>
            <div>Valid Prospects: {leads.length - state.validationErrors.length}</div>
            <div>Duplicates Found: {state.duplicateProspects.length}</div>
          </div>
        </div>

        {hasIssues && (
          <>
            <Separator />

            {state.duplicateProspects.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <h5 className="font-medium text-amber-900">Duplicate Prospects</h5>
                </div>
                <p className="text-sm text-gray-600">
                  These prospects already exist in the campaign:
                </p>
                <div className="max-h-24 overflow-y-auto">
                  {state.duplicateProspects.map((email) => (
                    <Badge key={email} variant="secondary" className="mr-1 mb-1">
                      {email}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {state.validationErrors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <h5 className="font-medium text-red-900">Validation Errors</h5>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {state.validationErrors.map((error) => (
                    <div key={error.email} className="text-sm">
                      <div className="font-medium">{error.email}</div>
                      <div className="text-gray-600 ml-2">
                        {error.errors.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="text-sm text-gray-600">
          {hasIssues ? (
            'Only valid prospects will be exported. Duplicates will be skipped.'
          ) : (
            'All prospects are valid and ready for export.'
          )}
        </div>
      </div>
    );
  };

  const renderProgressContent = () => {
    if (!state.progress) return null;

    const progressPercentage = state.progress.total > 0
      ? (state.progress.current / state.progress.total) * 100
      : 0;

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Export Progress</span>
            <span className="text-sm text-gray-600">
              {state.progress.current} / {state.progress.total}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-green-600">
              {state.progress.succeeded}
            </div>
            <div className="text-xs text-gray-600">Succeeded</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-red-600">
              {state.progress.failed}
            </div>
            <div className="text-xs text-gray-600">Failed</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-blue-600">
              {state.progress.total - state.progress.current}
            </div>
            <div className="text-xs text-gray-600">Remaining</div>
          </div>
        </div>

        {state.progress.errors.length > 0 && (
          <div className="space-y-2">
            <h5 className="font-medium text-red-900">Export Errors</h5>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {state.progress.errors.map((error, index) => (
                <div key={index} className="text-sm">
                  <span className="font-medium">{error.email}:</span>{' '}
                  <span className="text-gray-600">{error.error}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCompletedContent = () => {
    if (!state.progress) return null;

    return (
      <div className="space-y-4 text-center">
        <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
        <div>
          <h4 className="font-medium text-lg">Export Completed!</h4>
          <p className="text-gray-600">
            {state.progress.succeeded} prospects successfully added to the campaign
          </p>
          {state.progress.failed > 0 && (
            <p className="text-red-600 mt-1">
              {state.progress.failed} prospects failed to export
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderErrorContent = () => (
    <div className="space-y-4 text-center">
      <XCircle className="h-12 w-12 text-red-600 mx-auto" />
      <div>
        <h4 className="font-medium text-lg">Export Failed</h4>
        <p className="text-gray-600">{state.error}</p>
      </div>
      <Button onClick={handleRetry} variant="outline">
        <RefreshCw className="h-4 w-4 mr-2" />
        Try Again
      </Button>
    </div>
  );

  const getDialogTitle = () => {
    switch (state.status) {
      case 'idle':
        return 'Export to Woodpecker';
      case 'confirming':
        return 'Confirm Export';
      case 'exporting':
        return 'Exporting to Woodpecker';
      case 'completed':
        return 'Export Complete';
      case 'error':
        return 'Export Error';
      default:
        return 'Export to Woodpecker';
    }
  };

  const canProceed = state.selectedCampaign &&
    (leads.length - state.validationErrors.length) > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Export to Woodpecker
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>
            {state.status === 'idle' && 'Select a Woodpecker campaign to export your prospects.'}
            {state.status === 'confirming' && 'Review the export details before proceeding.'}
            {state.status === 'exporting' && 'Please wait while we export your prospects...'}
            {state.status === 'completed' && 'Your prospects have been exported successfully.'}
            {state.status === 'error' && 'An error occurred during export.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {state.status === 'idle' && (
            <CampaignSelector
              onValueChange={handleCampaignSelect}
              placeholder="Select a campaign"
            />
          )}

          {state.status === 'confirming' && renderConfirmationContent()}
          {state.status === 'exporting' && renderProgressContent()}
          {state.status === 'completed' && renderCompletedContent()}
          {state.status === 'error' && renderErrorContent()}
        </div>

        <DialogFooter>
          {state.status === 'idle' && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}

          {state.status === 'confirming' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={!canProceed}
                className="min-w-24"
              >
                <Upload className="h-4 w-4 mr-2" />
                Export {canProceed ? `(${leads.length - state.validationErrors.length})` : ''}
              </Button>
            </>
          )}

          {state.status === 'exporting' && (
            <Button variant="outline" onClick={handleClose} disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </Button>
          )}

          {(state.status === 'completed' || state.status === 'error') && (
            <Button onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ExportToWoodpecker;