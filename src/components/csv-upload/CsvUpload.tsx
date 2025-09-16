import { useState, useCallback, useRef } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FileText, AlertCircle, CheckCircle2, X } from 'lucide-react'
import Papa from 'papaparse'

interface CsvData {
  data: Record<string, string>[]
  headers: string[]
  rowCount: number
  errors: string[]
}

interface ColumnMapping {
  [key: string]: string // original header -> mapped field
}

interface CsvUploadProps {
  onDataLoaded?: (data: CsvData, mapping: ColumnMapping, filename: string) => void
  maxRows?: number
}

interface PapaParseResult {
  data: Record<string, string>[]
  meta: {
    fields?: string[]
  }
  errors: PapaParseError[]
}

interface PapaParseError {
  type: string
  code: string
  message: string
  row?: number
}

const STANDARD_FIELDS = {
  company: [
    'company',
    'company name',
    'account',
    'organization',
    'company_name',
    'company nickname',
  ],
  contact: [
    'contact name',
    'full name',
    'name',
    'contact_name',
    'full_name',
    'first name',
    'last name',
  ],
  email: [
    'email',
    'email address',
    'work email',
    'email_address',
    'work_email',
    'email in lusha',
    'email in apollo',
  ],
  title: ['title', 'job title', 'position', 'role', 'job_title', 'seniority'],
  department: ['department', 'dept', 'division'],
  phone: ['phone', 'phone number', 'telephone', 'mobile'],
  city: ['city', 'location', 'locale'],
  state: ['state', 'province', 'region'],
  country: ['country', 'nation'],
  website: ['website', 'url', 'domain', 'web'],
  linkedin: ['linkedin', 'linkedin url', 'linkedin profile', 'social'],
  industry: ['industry', 'sector', 'vertical'],
  campaign: ['campaign', 'source', 'lead source'],
  status: ['status', 'send status', 'lead status'],
  tags: ['tag', 'tags', 'labels', 'categories'],
}

export function CsvUpload({ onDataLoaded, maxRows = 1000 }: CsvUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [csvData, setCsvData] = useState<CsvData | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [fileName, setFileName] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const detectColumnMapping = (headers: string[]): ColumnMapping => {
    const mapping: ColumnMapping = {}
    const duplicateColumns: string[] = []
    const columnCounts: Record<string, number> = {}

    console.log('Detecting columns from headers:', headers)

    // Check for duplicate column names
    headers.forEach((header) => {
      const cleanHeader = header.trim()
      columnCounts[cleanHeader] = (columnCounts[cleanHeader] || 0) + 1
      if (columnCounts[cleanHeader] > 1) {
        duplicateColumns.push(cleanHeader)
      }
    })

    headers.forEach((header, index) => {
      const cleanHeader = header.trim()
      const normalizedHeader = cleanHeader.toLowerCase()

      // Handle duplicate columns by adding index
      const finalHeader =
        columnCounts[cleanHeader] > 1 ? `${cleanHeader}_${index}` : cleanHeader

      console.log(
        `Checking header: "${cleanHeader}" -> normalized: "${normalizedHeader}"`
      )

      for (const [standardField, variations] of Object.entries(
        STANDARD_FIELDS
      )) {
        if (variations.includes(normalizedHeader)) {
          // Only map the first occurrence of duplicates to standard fields
          if (!Object.values(mapping).includes(standardField)) {
            mapping[finalHeader] = standardField
            console.log(`Mapped "${finalHeader}" -> "${standardField}"`)
          }
          break
        }
      }
    })

    console.log('Final mapping:', mapping)
    return mapping
  }

  const validateData = (
    data: Record<string, string>[],
    mapping: ColumnMapping
  ): string[] => {
    const errors: string[] = []
    const requiredFields = ['email', 'company', 'contact']

    // Check if required fields are mapped
    const mappedFields = Object.values(mapping)
    requiredFields.forEach((field) => {
      if (!mappedFields.includes(field)) {
        errors.push(`Required field "${field}" not found in CSV headers`)
      }
    })

    // Validate data rows
    data.forEach((row, index) => {
      // Email validation
      if (
        mapping.email &&
        row[Object.keys(mapping).find((k) => mapping[k] === 'email') || '']
      ) {
        const email =
          row[Object.keys(mapping).find((k) => mapping[k] === 'email') || '']
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push(`Invalid email format in row ${index + 1}: ${email}`)
        }
      }

      // Required field validation
      requiredFields.forEach((field) => {
        const originalHeader = Object.keys(mapping).find(
          (k) => mapping[k] === field
        )
        if (originalHeader && !row[originalHeader]?.trim()) {
          errors.push(`Missing required field "${field}" in row ${index + 1}`)
        }
      })
    })

    return errors
  }

  const processResults = useCallback(
    (
      data: Record<string, string>[],
      headers: string[],
      parseErrors: (string | PapaParseError)[]
    ) => {
      setUploadProgress(95)

      // Filter and format parse errors
      let formattedParseErrors: string[] = parseErrors
        .filter(
          (error): error is PapaParseError =>
            typeof error === 'object' &&
            (error.type === 'Quotes' || error.type === 'FieldMismatch')
        )
        .map((error) => `Line ${error.row || 'unknown'}: ${error.message}`)

      // Check for duplicate columns
      const columnCounts: Record<string, number> = {}
      const duplicates: string[] = []
      headers.forEach((header) => {
        const cleanHeader = header.trim()
        columnCounts[cleanHeader] = (columnCounts[cleanHeader] || 0) + 1
        if (columnCounts[cleanHeader] === 2) {
          duplicates.push(cleanHeader)
        }
      })

      if (duplicates.length > 0) {
        formattedParseErrors.unshift(
          `Duplicate columns detected: ${duplicates.join(', ')}. These will be renamed with index suffixes.`
        )
      }

      // Check for empty headers
      const emptyHeaders = headers.filter(
        (header) => !header || header.trim() === ''
      )
      if (emptyHeaders.length > 0) {
        formattedParseErrors.unshift(
          `${emptyHeaders.length} empty column header(s) detected. These columns may not import correctly.`
        )
      }

      // Limit parse errors to avoid overwhelming UI
      if (formattedParseErrors.length > 10) {
        const hiddenCount = formattedParseErrors.length - 10
        formattedParseErrors = formattedParseErrors.slice(0, 10)
        formattedParseErrors.push(`...and ${hiddenCount} more parsing issues`)
      }

      if (data.length > maxRows) {
        formattedParseErrors.push(
          `File contains ${data.length.toLocaleString()} rows, but maximum allowed is ${maxRows.toLocaleString()}`
        )
      }

      // Process headers to handle duplicates
      const processedHeaders = headers.map((header, index) => {
        const cleanHeader = header.trim()
        if (columnCounts[cleanHeader] > 1) {
          return `${cleanHeader}_${index}`
        }
        return cleanHeader
      })

      // Update data with processed headers
      const processedData = data.map((row) => {
        const newRow: Record<string, string> = {}
        headers.forEach((originalHeader, index) => {
          const processedHeader = processedHeaders[index]
          newRow[processedHeader] = row[originalHeader] || ''
        })
        return newRow
      })

      const mapping = detectColumnMapping(processedHeaders)

      // Only validate first batch for performance
      const validationSample = processedData.slice(0, Math.min(100, maxRows))
      const validationErrors = validateData(validationSample, mapping)

      // Estimate total validation errors
      const estimatedValidationErrors = [...validationErrors]
      if (data.length > 100 && validationErrors.length > 0) {
        const errorRate = validationErrors.length / validationSample.length
        const estimatedTotal = Math.round(
          errorRate * Math.min(data.length, maxRows)
        )
        if (estimatedTotal > validationErrors.length) {
          estimatedValidationErrors.push(
            `Estimated ${estimatedTotal - validationErrors.length} additional validation issues in remaining rows`
          )
        }
      }

      const allErrors = [...formattedParseErrors, ...estimatedValidationErrors]

      const csvData: CsvData = {
        data: processedData.slice(0, maxRows),
        headers: processedHeaders,
        rowCount: data.length,
        errors: allErrors,
      }

      setCsvData(csvData)
      setErrors(allErrors)
      setUploadProgress(100)

      if (onDataLoaded) {
        onDataLoaded(csvData, mapping, fileName)
      }

      setTimeout(() => setIsUploading(false), 300) // Small delay to show 100%
    },
    [maxRows, onDataLoaded]
  )

  const processFile = useCallback(
    (file: File) => {
      if (!file || file.size === 0) {
        setErrors(['Please select a valid CSV file'])
        return
      }

      console.log(
        'Processing file:',
        file.name,
        'Size:',
        file.size,
        'Type:',
        file.type
      )

      setIsUploading(true)
      setUploadProgress(0)
      setFileName(file.name)
      setErrors([])

      // Progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev < 90) return prev + 10
          return prev
        })
      }, 100)

      try {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header: string) => header.trim(),
          transform: (value: string) => value?.trim() || '',
          encoding: 'UTF-8',
          dynamicTyping: false,
          complete: (results: PapaParseResult) => {
            clearInterval(progressInterval)
            console.log('Papa Parse Results:', {
              data: results.data?.length || 0,
              headers: results.meta?.fields || [],
              errors: results.errors?.length || 0,
            })

            if (!results.data || results.data.length === 0) {
              setErrors([
                'No data found in CSV file. Please check the file format and ensure it contains data rows.',
              ])
              setIsUploading(false)
              return
            }

            if (!results.meta?.fields || results.meta.fields.length === 0) {
              setErrors([
                'No column headers found in CSV file. Please ensure the first row contains column headers.',
              ])
              setIsUploading(false)
              return
            }

            processResults(
              results.data,
              results.meta.fields,
              results.errors || []
            )
          },
          error: (error: Error) => {
            clearInterval(progressInterval)
            console.error('Papa Parse Error:', error)
            setErrors([
              `Failed to parse CSV: ${error.message}. Please check file format and encoding.`,
            ])
            setIsUploading(false)
          },
        })
      } catch (error) {
        clearInterval(progressInterval)
        console.error('Unexpected error:', error)
        setErrors([
          `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ])
        setIsUploading(false)
      }
    },
    [processResults]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      const files = Array.from(e.dataTransfer.files)
      const csvFile = files.find(
        (file) => file.type === 'text/csv' || file.name.endsWith('.csv')
      )

      if (csvFile) {
        processFile(csvFile)
      } else {
        setErrors(['Please select a valid CSV file'])
      }
    },
    [processFile]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        processFile(file)
      }
    },
    [processFile]
  )

  const handleReset = () => {
    setCsvData(null)
    setErrors([])
    setFileName('')
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>CSV Import</CardTitle>
        <CardDescription>
          Upload your lead data in CSV format. Supports up to{' '}
          {maxRows.toLocaleString()} leads.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!csvData ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? 'border-primary bg-primary/5'
                : errors.length > 0
                  ? 'border-destructive bg-destructive/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isUploading ? (
              <div className="space-y-4">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground animate-pulse" />
                <div>
                  <p className="text-sm font-medium">
                    Processing {fileName}...
                  </p>
                  <div className="mt-2 w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {uploadProgress}%
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    Drag and drop your CSV file here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    CSV files up to {maxRows.toLocaleString()} rows
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="mx-auto"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Select File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {errors.length === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                <div>
                  <p className="text-sm font-medium">{fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {csvData.rowCount.toLocaleString()} rows loaded
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
          </div>
        )}

        {errors.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertCircle className="h-4 w-4" />
              Issues Found
            </div>
            <div className="text-xs space-y-1 bg-destructive/5 border border-destructive/20 rounded p-3 max-h-32 overflow-y-auto">
              {errors.slice(0, 10).map((error, index) => (
                <p key={index} className="text-destructive">
                  • {error}
                </p>
              ))}
              {errors.length > 10 && (
                <p className="text-muted-foreground">
                  ...and {errors.length - 10} more issues
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
