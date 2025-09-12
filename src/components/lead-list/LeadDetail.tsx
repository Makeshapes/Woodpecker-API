import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ContentGeneration } from '@/components/content-generation/ContentGeneration'
import type { LeadData, ColumnMapping, LeadStatus } from '@/types/lead'
import { Trash2 } from 'lucide-react'

interface LeadDetailProps {
  lead: LeadData
  columnMapping: ColumnMapping
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusUpdate?: (leadId: string, status: LeadStatus) => void
  onDeleteLead?: (leadId: string) => void
}

export function LeadDetail({
  lead,
  columnMapping,
  open,
  onOpenChange,
  onStatusUpdate,
  onDeleteLead,
}: LeadDetailProps) {
  // Group fields by type
  const standardFields = [
    'company',
    'contact',
    'email',
    'title',
    'department',
    'phone',
    'city',
    'state',
    'country',
  ]
  const standardData: Record<string, string> = {}
  const customData: Record<string, string> = {}

  // Separate standard and custom fields
  Object.entries(lead).forEach(([key, value]) => {
    if (['id', 'status', 'selected'].includes(key)) return

    const mappedField = columnMapping[key]
    if (mappedField && standardFields.includes(mappedField)) {
      standardData[mappedField] = String(value)
    } else {
      customData[key] = String(value)
    }
  })

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'imported':
        return 'bg-blue-100 text-blue-800'
      case 'drafted':
        return 'bg-yellow-100 text-yellow-800'
      case 'exported':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="min-w-6xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-xl">
                {standardData.contact || standardData.company || 'Lead Details'}
              </SheetTitle>
              <SheetDescription>
                Complete information for this lead
              </SheetDescription>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getStatusColor(lead.status)}>
                  {lead.status}
                </Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 px-8">
          {/* Standard Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
              <CardDescription>Standard lead data fields</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(standardData).map(([field, value]) => (
                  <div key={field} className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground capitalize">
                      {field.replace('_', ' ')}
                    </label>
                    <div className="text-sm border rounded p-2 bg-muted/50">
                      {value || '-'}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Content Generation */}
          <ContentGeneration lead={lead} onStatusUpdate={onStatusUpdate} />

          {/* Custom Fields */}
          {Object.keys(customData).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Additional Information
                </CardTitle>
                <CardDescription>
                  Custom fields from your CSV import
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(customData).map(([field, value]) => (
                    <div key={field} className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">
                        {field}
                      </label>
                      <div className="text-sm border rounded p-2 bg-muted/50 max-h-24 overflow-y-auto">
                        {value || '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <SheetFooter className="border-t pt-4">
          <div className="flex gap-2 justify-end w-full">
            {lead.status === 'drafted' && (
              <Button onClick={() => onStatusUpdate?.(lead.id, 'exported')}>
                Export Lead
              </Button>
            )}
            {lead.status === 'exported' && (
              <>
                <Button variant="outline" disabled>
                  Exported ✓
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    onDeleteLead?.(lead.id)
                    onOpenChange(false)
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove from List
                </Button>
              </>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
