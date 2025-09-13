import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CsvUpload } from '@/components/csv-upload/CsvUpload'
import { CsvPreview } from '@/components/csv-upload/CsvPreview'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

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
  const navigate = useNavigate()
  const [csvData, setCsvData] = useState<CsvData | null>(null)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [showPreview, setShowPreview] = useState(false)

  const handleDataLoaded = (data: CsvData, mapping: ColumnMapping) => {
    setCsvData(data)
    setColumnMapping(mapping)
    setShowPreview(true)
  }

  const handleConfirm = (data: CsvData, mapping: ColumnMapping) => {
    // Navigate to leads page with data
    navigate('/', {
      state: {
        csvData: data,
        columnMapping: mapping,
      },
    })
  }

  const handleCancel = () => {
    setCsvData(null)
    setColumnMapping({})
    setShowPreview(false)
  }

  const handleDemoImport = () => {
    // Create sample data that matches your CSV format
    const demoData = {
      data: [
        {
          'Send Status': 'Not Sent',
          Department: 'Engineering',
          Seniority: 'Senior',
          Campaign: 'Q4 Outreach',
          Email: 'john.doe@techcorp.com',
          'Email in Lusha': 'Yes',
          'Email in Apollo': 'No',
          'Email Validation (MS Teams)': 'Valid',
          'Full Name': 'John Doe',
          'First Name': 'John',
          'Last Name': 'Doe',
          Company: 'TechCorp Inc',
          'Company Nickname': 'TechCorp',
          'Employee Count': '500',
          Industry: 'Software',
          Title: 'Senior Software Engineer',
          Connection: '2nd',
          Phone: '+1-555-123-4567',
          Tag: 'High Priority',
          City: 'San Francisco',
          State: 'CA',
          Country: 'United States',
          Website: 'https://techcorp.com',
          'LinkedIn URL': 'https://linkedin.com/in/johndoe',
        },
        {
          'Send Status': 'Sent',
          Department: 'Marketing',
          Seniority: 'Mid-level',
          Campaign: 'Product Launch',
          Email: 'sarah.smith@marketinghub.com',
          'Email in Lusha': 'No',
          'Email in Apollo': 'Yes',
          'Email Validation (MS Teams)': 'Valid',
          'Full Name': 'Sarah Smith',
          'First Name': 'Sarah',
          'Last Name': 'Smith',
          Company: 'Marketing Hub',
          'Company Nickname': 'MktHub',
          'Employee Count': '200',
          Industry: 'Marketing Services',
          Title: 'Marketing Manager',
          Connection: '1st',
          Phone: '+1-555-987-6543',
          Tag: 'Warm Lead',
          City: 'New York',
          State: 'NY',
          Country: 'United States',
          Website: 'https://marketinghub.com',
          'LinkedIn URL': 'https://linkedin.com/in/sarahsmith',
        },
        {
          'Send Status': 'Bounced',
          Department: 'Sales',
          Seniority: 'Executive',
          Campaign: 'Enterprise Outreach',
          Email: 'mike.johnson@salesforce-demo.com',
          'Email in Lusha': 'Yes',
          'Email in Apollo': 'Yes',
          'Email Validation (MS Teams)': 'Invalid',
          'Full Name': 'Mike Johnson',
          'First Name': 'Mike',
          'Last Name': 'Johnson',
          Company: 'Enterprise Solutions Ltd',
          'Company Nickname': 'EntSol',
          'Employee Count': '1000+',
          Industry: 'Enterprise Software',
          Title: 'VP of Sales',
          Connection: '3rd+',
          Phone: '+1-555-456-7890',
          Tag: 'Decision Maker',
          City: 'Austin',
          State: 'TX',
          Country: 'United States',
          Website: 'https://enterprisesolutions.com',
          'LinkedIn URL': 'https://linkedin.com/in/mikejohnson',
        },
      ],
      headers: [
        'Send Status',
        'Department',
        'Seniority',
        'Campaign',
        'Email',
        'Email in Lusha',
        'Email in Apollo',
        'Email Validation (MS Teams)',
        'Full Name',
        'First Name',
        'Last Name',
        'Company',
        'Company Nickname',
        'Employee Count',
        'Industry',
        'Title',
        'Connection',
        'Phone',
        'Tag',
        'City',
        'State',
        'Country',
        'Website',
        'LinkedIn URL',
      ],
      rowCount: 3,
      errors: [],
    }

    const demoMapping = {
      'Full Name': 'contact',
      Email: 'email',
      Company: 'company',
      Title: 'title',
      Department: 'department',
      Phone: 'phone',
      City: 'city',
      State: 'state',
      Country: 'country',
      Website: 'website',
      'LinkedIn URL': 'linkedin',
      Industry: 'industry',
      Campaign: 'campaign',
      'Send Status': 'status',
      Tag: 'tags',
    }

    handleDataLoaded(demoData, demoMapping)
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
        <div className="space-y-4">
          <Button
            variant="outline"
            onClick={handleDemoImport}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Try Demo Import
          </Button>
          <CsvUpload onDataLoaded={handleDataLoaded} maxRows={1000} />

          <div className="flex justify-center"></div>
        </div>
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
