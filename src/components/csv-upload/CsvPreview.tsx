import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'

interface CsvData {
  data: Record<string, string>[]
  headers: string[]
  rowCount: number
  errors: string[]
}

interface ColumnMapping {
  [key: string]: string
}

interface CsvPreviewProps {
  csvData: CsvData
  columnMapping: ColumnMapping
  onConfirm?: (data: CsvData, mapping: ColumnMapping) => void
  onCancel?: () => void
}

const ROWS_PER_PAGE = 10

export function CsvPreview({ csvData, columnMapping, onConfirm, onCancel }: CsvPreviewProps) {
  const [currentPage, setCurrentPage] = useState(0)
  
  const { data, headers, rowCount, errors } = csvData
  const totalPages = Math.ceil(data.length / ROWS_PER_PAGE)
  const startRow = currentPage * ROWS_PER_PAGE
  const endRow = Math.min(startRow + ROWS_PER_PAGE, data.length)
  const visibleRows = data.slice(startRow, endRow)
  
  const mappedHeaders = useMemo(() => {
    return headers.map(header => ({
      original: header,
      mapped: columnMapping[header] || 'unmapped',
      isMapped: !!columnMapping[header]
    }))
  }, [headers, columnMapping])
  
  const requiredFields = ['email', 'company', 'contact']
  const mappedRequiredFields = requiredFields.filter(field => 
    Object.values(columnMapping).includes(field)
  )
  
  const hasAllRequiredFields = requiredFields.every(field => 
    Object.values(columnMapping).includes(field)
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Data Preview</span>
          <div className="flex items-center gap-2">
            {hasAllRequiredFields ? (
              <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Ready to Import
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertCircle className="w-3 h-3 mr-1" />
                Missing Required Fields
              </Badge>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          Preview of {data.length.toLocaleString()} rows from your CSV file
          {rowCount > data.length && ` (showing first ${data.length.toLocaleString()} of ${rowCount.toLocaleString()})`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Column Mapping Summary */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Column Mapping</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
            {mappedHeaders.map(({ original, mapped, isMapped }) => (
              <div key={original} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <span className="font-mono truncate max-w-20" title={original}>
                  {original}
                </span>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <span className={`font-medium ${isMapped ? 'text-primary' : 'text-muted-foreground'}`}>
                  {mapped}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Required Fields Status */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Required Fields</h4>
          <div className="flex flex-wrap gap-2">
            {requiredFields.map(field => {
              const isMapped = mappedRequiredFields.includes(field)
              return (
                <Badge
                  key={field}
                  variant={isMapped ? "default" : "destructive"}
                  className={isMapped ? "bg-green-100 text-green-800 border-green-200" : ""}
                >
                  {isMapped ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                  {field}
                </Badge>
              )
            })}
          </div>
        </div>

        {/* Data Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Data Sample</h4>
            <div className="text-xs text-muted-foreground">
              Rows {startRow + 1}-{endRow} of {data.length.toLocaleString()}
            </div>
          </div>
          
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-2 py-2 text-left font-medium w-12">#</th>
                  {headers.slice(0, 6).map(header => (
                    <th key={header} className="px-2 py-2 text-left font-medium min-w-24">
                      <div className="space-y-1">
                        <div className="font-mono text-xs truncate" title={header}>
                          {header}
                        </div>
                        {columnMapping[header] && (
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            {columnMapping[header]}
                          </Badge>
                        )}
                      </div>
                    </th>
                  ))}
                  {headers.length > 6 && (
                    <th className="px-2 py-2 text-left font-medium">
                      +{headers.length - 6} more...
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, index) => (
                  <tr key={startRow + index} className="border-t">
                    <td className="px-2 py-2 text-muted-foreground">
                      {startRow + index + 1}
                    </td>
                    {headers.slice(0, 6).map(header => (
                      <td key={header} className="px-2 py-2">
                        <div className="truncate max-w-32" title={row[header] || ''}>
                          {row[header] || '-'}
                        </div>
                      </td>
                    ))}
                    {headers.length > 6 && (
                      <td className="px-2 py-2 text-muted-foreground">...</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              
              <span className="text-xs text-muted-foreground">
                Page {currentPage + 1} of {totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage === totalPages - 1}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-destructive">Issues to Review</h4>
            <div className="bg-destructive/5 border border-destructive/20 rounded p-3 max-h-32 overflow-y-auto">
              <div className="text-xs space-y-1">
                {errors.slice(0, 5).map((error, index) => (
                  <p key={index} className="text-destructive">• {error}</p>
                ))}
                {errors.length > 5 && (
                  <p className="text-muted-foreground">...and {errors.length - 5} more issues</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <div className="space-x-2">
            <Button
              onClick={() => onConfirm?.(csvData, columnMapping)}
              disabled={!hasAllRequiredFields || errors.filter(e => !e.includes('Line')).length > 0}
            >
              {hasAllRequiredFields ? 'Import Data' : 'Fix Required Fields First'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}