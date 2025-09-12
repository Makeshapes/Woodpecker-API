import { useState } from 'react'
import { CsvUpload } from '@/components/csv-upload/CsvUpload'
import { CsvPreview } from '@/components/csv-upload/CsvPreview'

interface CsvData {
  data: Record<string, string>[]
  headers: string[]
  rowCount: number
  errors: string[]
}

interface ColumnMapping {
  [key: string]: string
}

export function Import() {
  const [csvData, setCsvData] = useState<CsvData | null>(null)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [showPreview, setShowPreview] = useState(false)

  const handleDataLoaded = (data: CsvData, mapping: ColumnMapping) => {
    setCsvData(data)
    setColumnMapping(mapping)
    setShowPreview(true)
  }

  const handleConfirm = (data: CsvData, mapping: ColumnMapping) => {
    // TODO: Implement actual data import to backend
    console.log('Importing data:', { data, mapping })
    
    // For now, just show success and reset
    alert(`Successfully imported ${data.data.length} leads!`)
    handleCancel()
  }

  const handleCancel = () => {
    setCsvData(null)
    setColumnMapping({})
    setShowPreview(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import</h1>
        <p className="text-muted-foreground">
          Import your lead data from CSV files with automatic validation
        </p>
      </div>

      {!showPreview ? (
        <CsvUpload onDataLoaded={handleDataLoaded} maxRows={1000} />
      ) : csvData ? (
        <CsvPreview
          csvData={csvData}
          columnMapping={columnMapping}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      ) : null}
    </div>
  )
}