import { useState, useMemo, memo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Search, ChevronUp, ChevronDown, Trash2, Sparkles } from 'lucide-react'
import type { LeadData, ColumnMapping, LeadStatus } from '@/types/lead'

interface LeadListProps {
  leads: LeadData[]
  columnMapping: ColumnMapping
  onLeadSelect?: (leadIds: string[]) => void
  onLeadDetail?: (lead: LeadData) => void
  onStatusUpdate?: (leadId: string, status: LeadData['status']) => void
  onDeleteLead?: (leadId: string) => void
}

type SortField = string
type SortDirection = 'asc' | 'desc'

const LeadList = memo(function LeadList({
  leads,
  columnMapping,
  onLeadSelect,
  onLeadDetail,
  onStatusUpdate: _onStatusUpdate,
  onDeleteLead,
}: LeadListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all')
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>('')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Filter and search leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Status filter
      if (statusFilter !== 'all' && lead.status !== statusFilter) {
        return false
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const searchableFields = ['company', 'contact', 'title']

        return searchableFields.some((field) => {
          const originalHeader = Object.keys(columnMapping).find(
            (key) => columnMapping[key] === field
          )
          const value = originalHeader ? lead[originalHeader] : ''
          return String(value || '')
            .toLowerCase()
            .includes(searchLower)
        })
      }

      return true
    })
  }, [leads, searchTerm, statusFilter, columnMapping])

  // Sort leads
  const sortedLeads = useMemo(() => {
    if (!sortField) return filteredLeads

    return [...filteredLeads].sort((a, b) => {
      const aValue = String(a[sortField] || '')
      const bValue = String(b[sortField] || '')

      const comparison = aValue.localeCompare(bValue)
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredLeads, sortField, sortDirection])

  // Handle sort
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Handle lead selection
  const handleLeadToggle = (leadId: string) => {
    const newSelected = new Set(selectedLeads)
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId)
    } else {
      newSelected.add(leadId)
    }
    setSelectedLeads(newSelected)
    onLeadSelect?.(Array.from(newSelected))
  }

  // Handle select all
  const handleSelectAll = () => {
    if (selectedLeads.size === sortedLeads.length) {
      setSelectedLeads(new Set())
      onLeadSelect?.([])
    } else {
      const allIds = new Set(sortedLeads.map((lead) => lead.id))
      setSelectedLeads(allIds)
      onLeadSelect?.(Array.from(allIds))
    }
  }

  // Get status badge color
  const getStatusColor = (status: LeadStatus): string => {
    switch (status) {
      case 'imported':
        return 'bg-blue-100 text-blue-800'
      case 'drafted':
        return 'bg-yellow-100 text-yellow-800'
      case 'exported':
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Get key columns to display
  const displayColumns = useMemo(() => {
    // Use the actual field names that exist in the lead data
    const standardFields = [
      { key: 'company', label: 'Company' },
      { key: 'Full Name', label: 'Contact' }, // Check additional fields first
      { key: 'title', label: 'Title' },
    ]

    // Filter to only show columns that actually have data
    return standardFields.filter((field) => {
      return leads.some(
        (lead) =>
          lead[field.key] ||
          (field.key === 'Full Name' && lead['Full Name']) ||
          (field.key === 'company' && lead.company) ||
          (field.key === 'title' && lead.title)
      )
    })
  }, [leads])

  const statusCounts = useMemo(() => {
    return leads.reduce(
      (acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1
        return acc
      },
      {} as Record<LeadStatus, number>
    )
  }, [leads])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Lead List</span>
          <div className="flex gap-2">
            <Badge variant="outline">{leads.length} Total</Badge>
            <Badge variant="secondary">{selectedLeads.size} Selected</Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Manage and select leads for content generation
        </CardDescription>

        {/* Status indicators */}
        <div className="flex gap-2 flex-wrap">
          {Object.entries(statusCounts).map(([status, count]) => (
            <Badge
              key={status}
              className={getStatusColor(status as LeadStatus)}
            >
              {status}: {count}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search and filters */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by company, contact, or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as LeadStatus | 'all')
            }
            className="px-3 py-2 border border-input rounded-md"
          >
            <option value="all">All Status</option>
            <option value="imported">Imported</option>
            <option value="drafted">Drafted</option>
            <option value="approved">Approved</option>
            <option value="exported">Exported</option>
            <option value="deleted">Deleted</option>
          </select>
        </div>

        {/* Data table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={
                      selectedLeads.size === sortedLeads.length &&
                      sortedLeads.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                {displayColumns.map(({ key, label }) => (
                  <TableHead key={key}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort(key)}
                      className="h-8 p-2 font-medium"
                    >
                      {label}
                      {sortField === key &&
                        (sortDirection === 'asc' ? (
                          <ChevronUp className="ml-1 h-3 w-3" />
                        ) : (
                          <ChevronDown className="ml-1 h-3 w-3" />
                        ))}
                    </Button>
                  </TableHead>
                ))}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLeads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className={selectedLeads.has(lead.id) ? 'bg-muted/50' : ''}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedLeads.has(lead.id)}
                      onCheckedChange={() => handleLeadToggle(lead.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(lead.status)}>
                      {lead.status}
                    </Badge>
                  </TableCell>
                  {displayColumns.map(({ key }) => (
                    <TableCell key={key}>
                      <div
                        className="max-w-[200px] truncate"
                        title={String(lead[key] || '')}
                      >
                        {String(lead[key] || '') || '-'}
                      </div>
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onLeadDetail?.(lead)}
                      >
                        View
                      </Button>
                      {lead.status === 'imported' && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => onLeadDetail?.(lead)}
                        >
                          Generate
                          <Sparkles className="h-4 w-4" />
                        </Button>
                      )}
                      {lead.status === 'exported' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onDeleteLead?.(lead.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {sortedLeads.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No leads found matching your criteria
          </div>
        )}
      </CardContent>
    </Card>
  )
})

export { LeadList }
