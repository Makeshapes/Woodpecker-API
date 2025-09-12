import { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  onDataLoaded?: (data: CsvData, mapping: ColumnMapping) => void
  maxRows?: number
}

const STANDARD_FIELDS = {
  company: ['company', 'company name', 'account', 'organization', 'company_name'],
  contact: ['contact name', 'full name', 'name', 'contact_name', 'full_name'],
  email: ['email', 'email address', 'work email', 'email_address', 'work_email'],
  title: ['title', 'job title', 'position', 'role', 'job_title']
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
    
    headers.forEach(header => {
      const normalizedHeader = header.toLowerCase().trim()
      
      for (const [standardField, variations] of Object.entries(STANDARD_FIELDS)) {
        if (variations.includes(normalizedHeader)) {
          mapping[header] = standardField
          break
        }
      }
    })
    
    return mapping
  }

  const validateData = (data: Record<string, string>[], mapping: ColumnMapping): string[] => {
    const errors: string[] = []
    const requiredFields = ['email', 'company', 'contact']
    
    // Check if required fields are mapped
    const mappedFields = Object.values(mapping)
    requiredFields.forEach(field => {
      if (!mappedFields.includes(field)) {
        errors.push(`Required field "${field}" not found in CSV headers`)
      }
    })
    
    // Validate data rows
    data.forEach((row, index) => {
      // Email validation
      if (mapping.email && row[Object.keys(mapping).find(k => mapping[k] === 'email') || '']) {
        const email = row[Object.keys(mapping).find(k => mapping[k] === 'email') || '']
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push(`Invalid email format in row ${index + 1}: ${email}`)
        }
      }
      
      // Required field validation
      requiredFields.forEach(field => {
        const originalHeader = Object.keys(mapping).find(k => mapping[k] === field)
        if (originalHeader && !row[originalHeader]?.trim()) {
          errors.push(`Missing required field "${field}" in row ${index + 1}`)
        }
      })
    })
    
    return errors
  }

  const processFile = useCallback(async (file: File) => {
    setIsUploading(true)
    setUploadProgress(0)
    setErrors([])
    setFileName(file.name)
    
    // Simulate progress for user feedback
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90))
    }, 100)
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        clearInterval(progressInterval)
        setUploadProgress(100)
        
        const data = results.data as Record<string, string>[]
        const headers = results.meta.fields || []
        const parseErrors = results.errors.map(error => `Line ${error.row}: ${error.message}`)
        
        if (data.length > maxRows) {
          parseErrors.push(`File contains ${data.length} rows, but maximum allowed is ${maxRows}`)
        }
        
        const mapping = detectColumnMapping(headers)
        const validationErrors = validateData(data.slice(0, maxRows), mapping)
        const allErrors = [...parseErrors, ...validationErrors]
        
        const csvData: CsvData = {
          data: data.slice(0, maxRows),
          headers,
          rowCount: data.length,
          errors: allErrors
        }
        
        setCsvData(csvData)
        setErrors(allErrors)
        
        if (onDataLoaded) {
          onDataLoaded(csvData, mapping)
        }
        
        setIsUploading(false)
      },
      error: (error) => {
        clearInterval(progressInterval)
        setErrors([`Failed to parse CSV: ${error.message}`])
        setIsUploading(false)
      }
    })
  }, [maxRows, onDataLoaded])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    const csvFile = files.find(file => file.type === 'text/csv' || file.name.endsWith('.csv'))
    
    if (csvFile) {
      processFile(csvFile)
    } else {
      setErrors(['Please select a valid CSV file'])
    }
  }, [processFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }, [processFile])

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
          Upload your lead data in CSV format. Supports up to {maxRows.toLocaleString()} leads.
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
                  <p className="text-sm font-medium">Processing {fileName}...</p>
                  <div className="mt-2 w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{uploadProgress}%</p>
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
                <p key={index} className="text-destructive">• {error}</p>
              ))}
              {errors.length > 10 && (
                <p className="text-muted-foreground">...and {errors.length - 10} more issues</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}