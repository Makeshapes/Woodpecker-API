import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Check, X, Loader2, Eye, EyeOff, Save } from 'lucide-react'

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

  useEffect(() => {
    loadExistingKeys()
  }, [])

  const loadExistingKeys = async () => {
    try {
      const status = await window.api.settings.getApiKeysStatus()
      setExistingKeys(status)
    } catch (error) {
      console.error('Failed to load API keys status:', error)
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