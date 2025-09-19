import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Check, X, Loader2, Eye, EyeOff, Save, Download, Upload, Database, AlertTriangle } from 'lucide-react'

export function Settings() {
  const [claudeApiKey, setClaudeApiKey] = useState('')
  const [woodpeckerApiKey, setWoodpeckerApiKey] = useState('')
  const [showClaudeKey, setShowClaudeKey] = useState(false)
  const [showWoodpeckerKey, setShowWoodpeckerKey] = useState(false)
  const [claudeKeyValid, setClaudeKeyValid] = useState<boolean | null>(null)
  const [woodpeckerKeyValid, setWoodpeckerKeyValid] = useState<boolean | null>(null)
  const [isValidatingClaude, setIsValidatingClaude] = useState(false)
  const [isValidatingWoodpecker, setIsValidatingWoodpecker] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [existingKeys, setExistingKeys] = useState<{
    claude: boolean
    woodpecker: boolean
    claudeKeyMasked: string | null
    woodpeckerKeyMasked: string | null
  }>({ claude: false, woodpecker: false, claudeKeyMasked: null, woodpeckerKeyMasked: null })
  const [databaseInfo, setDatabaseInfo] = useState<any>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    loadExistingKeys()
    loadDatabaseInfo()
  }, [])

  const loadExistingKeys = async () => {
    try {
      const status = await window.api.settings.getApiKeysStatus()
      setExistingKeys(status)
    } catch (error) {
      console.error('Failed to load API keys status:', error)
    }
  }

  const loadDatabaseInfo = async () => {
    try {
      const info = await window.api.settings.getDatabaseInfo()
      setDatabaseInfo(info)
    } catch (error) {
      console.error('Failed to load database info:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const exportDatabase = async () => {
    setIsExporting(true)
    try {
      const result = await window.api.settings.exportDatabase()
      if (result.canceled) {
        toast.info('Export canceled')
      } else if (result.success) {
        toast.success(`Database exported successfully (${formatFileSize(result.size || 0)})`)
        await loadDatabaseInfo()
      }
    } catch (error: any) {
      toast.error(`Export failed: ${error.message}`)
    } finally {
      setIsExporting(false)
    }
  }

  const importDatabase = async () => {
    setIsImporting(true)
    try {
      const result = await window.api.settings.importDatabase()
      if (result.canceled) {
        toast.info('Import canceled')
      } else if (result.success) {
        toast.success(`Database imported successfully (${formatFileSize(result.size || 0)}). Please restart the app for changes to take effect.`)
        await loadDatabaseInfo()
      }
    } catch (error: any) {
      toast.error(`Import failed: ${error.message}`)
    } finally {
      setIsImporting(false)
    }
  }

  const validateClaudeKey = async () => {
    if (!claudeApiKey) {
      toast.error('Please enter a Claude API key')
      return
    }

    setIsValidatingClaude(true)
    try {
      const result = await window.api.settings.validateClaudeKey(claudeApiKey)
      setClaudeKeyValid(result.valid)
      if (result.valid) {
        toast.success('Claude API key is valid')
      } else {
        toast.error(result.error || 'Invalid Claude API key')
      }
    } catch (error) {
      setClaudeKeyValid(false)
      toast.error('Failed to validate Claude API key')
    } finally {
      setIsValidatingClaude(false)
    }
  }

  const validateWoodpeckerKey = async () => {
    if (!woodpeckerApiKey) {
      toast.error('Please enter a Woodpecker API key')
      return
    }

    setIsValidatingWoodpecker(true)
    try {
      const result = await window.api.settings.validateWoodpeckerKey(woodpeckerApiKey)
      setWoodpeckerKeyValid(result.valid)
      if (result.valid) {
        toast.success('Woodpecker API key is valid')
      } else {
        toast.error(result.error || 'Invalid Woodpecker API key')
      }
    } catch (error) {
      setWoodpeckerKeyValid(false)
      toast.error('Failed to validate Woodpecker API key')
    } finally {
      setIsValidatingWoodpecker(false)
    }
  }

  const saveApiKeys = async () => {
    setIsSaving(true)
    try {
      const keys: any = {}

      // Only update keys that have been entered
      if (claudeApiKey) {
        keys.claudeApiKey = claudeApiKey
      }
      if (woodpeckerApiKey) {
        keys.woodpeckerApiKey = woodpeckerApiKey
      }

      if (Object.keys(keys).length === 0) {
        toast.warning('No API keys to save')
        return
      }

      await window.api.settings.updateApiKeys(keys)
      toast.success('API keys saved successfully')

      // Clear the input fields for security
      setClaudeApiKey('')
      setWoodpeckerApiKey('')
      setClaudeKeyValid(null)
      setWoodpeckerKeyValid(null)

      // Reload existing keys status
      await loadExistingKeys()
    } catch (error) {
      toast.error('Failed to save API keys')
      console.error('Failed to save API keys:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">Configure your API keys and application preferences</p>
      </div>

      <div className="space-y-6">
        {/* Claude API Key */}
        <Card>
          <CardHeader>
            <CardTitle>Claude API Configuration</CardTitle>
            <CardDescription>
              Configure your Anthropic Claude API key for AI-powered content generation.
              Get your API key from{' '}
              <a
                href="https://console.anthropic.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                console.anthropic.com
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {existingKeys.claude && (
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                Current key: {existingKeys.claudeKeyMasked} ✓
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="claude-api-key">Claude API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="claude-api-key"
                    type={showClaudeKey ? 'text' : 'password'}
                    value={claudeApiKey}
                    onChange={(e) => {
                      setClaudeApiKey(e.target.value)
                      setClaudeKeyValid(null)
                    }}
                    placeholder={existingKeys.claude ? 'Enter new key to replace existing' : 'sk-ant-api...'}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowClaudeKey(!showClaudeKey)}
                  >
                    {showClaudeKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  onClick={validateClaudeKey}
                  disabled={!claudeApiKey || isValidatingClaude}
                  variant="outline"
                >
                  {isValidatingClaude ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : claudeKeyValid === true ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : claudeKeyValid === false ? (
                    <X className="h-4 w-4 text-red-600" />
                  ) : (
                    'Validate'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Woodpecker API Key */}
        <Card>
          <CardHeader>
            <CardTitle>Woodpecker API Configuration</CardTitle>
            <CardDescription>
              Configure your Woodpecker API key for campaign management.
              Get your API key from Woodpecker {'>'} Marketplace {'>'} Integrations {'>'} API keys
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {existingKeys.woodpecker && (
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                Current key: {existingKeys.woodpeckerKeyMasked} ✓
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="woodpecker-api-key">Woodpecker API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="woodpecker-api-key"
                    type={showWoodpeckerKey ? 'text' : 'password'}
                    value={woodpeckerApiKey}
                    onChange={(e) => {
                      setWoodpeckerApiKey(e.target.value)
                      setWoodpeckerKeyValid(null)
                    }}
                    placeholder={existingKeys.woodpecker ? 'Enter new key to replace existing' : 'Your API key...'}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowWoodpeckerKey(!showWoodpeckerKey)}
                  >
                    {showWoodpeckerKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  onClick={validateWoodpeckerKey}
                  disabled={!woodpeckerApiKey || isValidatingWoodpecker}
                  variant="outline"
                >
                  {isValidatingWoodpecker ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : woodpeckerKeyValid === true ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : woodpeckerKeyValid === false ? (
                    <X className="h-4 w-4 text-red-600" />
                  ) : (
                    'Validate'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={saveApiKeys}
            disabled={isSaving || (!claudeApiKey && !woodpeckerApiKey)}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save API Keys
              </>
            )}
          </Button>
        </div>

        {/* Database Management */}
        <Card>
          <CardHeader>
            <CardTitle>Database Management</CardTitle>
            <CardDescription>
              Export your database for backup or transfer it to another machine
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {databaseInfo && databaseInfo.exists && (
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span className="font-medium">Database Information</span>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Size: {formatFileSize(databaseInfo.size || 0)}</p>
                  {databaseInfo.records && (
                    <>
                      <p>Leads: {databaseInfo.records.leads.toLocaleString()}</p>
                      <p>Imports: {databaseInfo.records.imports.toLocaleString()}</p>
                      <p>Generated Content: {databaseInfo.records.content.toLocaleString()}</p>
                    </>
                  )}
                  {databaseInfo.modified && (
                    <p>Last Modified: {new Date(databaseInfo.modified).toLocaleString()}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={exportDatabase}
                disabled={isExporting || !databaseInfo?.exists}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export Database
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={importDatabase}
                disabled={isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Database
                  </>
                )}
              </Button>
            </div>

            <div className="text-sm text-muted-foreground bg-amber-50 dark:bg-amber-950/30 p-3 rounded flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-300">Important:</p>
                <ul className="mt-1 space-y-1">
                  <li>• Always export your database before importing a new one</li>
                  <li>• Importing will replace all current data</li>
                  <li>• A backup is automatically created when importing</li>
                  <li>• Restart the app after importing for changes to take effect</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Important Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• API keys are stored securely in your local application data directory</p>
            <p>• Keys are encrypted and never sent to any external servers</p>
            <p>• You can update your API keys at any time by entering new values above</p>
            <p>• Validate your keys before saving to ensure they work correctly</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}