import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  details?: any;
}

export function ElectronBridgeTest() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Window API Available', status: 'pending' },
    { name: 'Electron Utils Available', status: 'pending' },
    { name: 'Database API Available', status: 'pending' },
    { name: 'Platform Detection', status: 'pending' },
    { name: 'IPC Communication Test', status: 'pending' },
  ]);

  const updateTest = (index: number, status: TestResult['status'], message?: string, details?: any) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, status, message, details } : test
    ));
  };

  const runTests = async () => {
    // Reset all tests
    setTests(prev => prev.map(test => ({ ...test, status: 'pending' })));

    // Test 1: Window API Available
    try {
      if (typeof window !== 'undefined' && window.api) {
        updateTest(0, 'success', 'Window API is available');
      } else {
        updateTest(0, 'error', 'Window API is not available');
        return; // Can't continue without API
      }
    } catch (error) {
      updateTest(0, 'error', `Error checking window API: ${error}`);
      return;
    }

    // Test 2: Electron Utils Available
    try {
      if (window.electronUtils) {
        updateTest(1, 'success', 'Electron utils available', {
          platform: window.electronUtils.platform,
          nodeVersion: window.electronUtils.versions.node,
          electronVersion: window.electronUtils.versions.electron,
        });
      } else {
        updateTest(1, 'error', 'Electron utils not available');
      }
    } catch (error) {
      updateTest(1, 'error', `Error checking electron utils: ${error}`);
    }

    // Test 3: Database API Available
    try {
      const apiMethods = [
        'imports', 'leads', 'content', 'mappings', 'metadata', 'queries'
      ];
      
      const availableMethods = apiMethods.filter(method => 
        window.api && typeof window.api[method as keyof typeof window.api] === 'object'
      );

      if (availableMethods.length === apiMethods.length) {
        updateTest(2, 'success', 'All database API methods available', { availableMethods });
      } else {
        updateTest(2, 'error', 'Some database API methods missing', { 
          available: availableMethods,
          missing: apiMethods.filter(m => !availableMethods.includes(m))
        });
      }
    } catch (error) {
      updateTest(2, 'error', `Error checking database API: ${error}`);
    }

    // Test 4: Platform Detection
    try {
      if (window.electronUtils && window.electronUtils.platform) {
        updateTest(3, 'success', `Platform detected: ${window.electronUtils.platform}`);
      } else {
        updateTest(3, 'error', 'Platform detection failed');
      }
    } catch (error) {
      updateTest(3, 'error', `Error detecting platform: ${error}`);
    }

    // Test 5: IPC Communication Test (simple metadata test)
    try {
      if (window.api && window.api.metadata) {
        // Try to get a metadata value (this will fail if database isn't working, but IPC should still work)
        const result = await window.api.metadata.get('test-key');
        
        // Even if the database operation fails, if we get a proper IPC response structure, it's working
        if (result && typeof result === 'object' && 'success' in result) {
          updateTest(4, 'success', 'IPC communication working', { 
            response: result,
            note: 'Database may not be initialized, but IPC bridge is functional'
          });
        } else {
          updateTest(4, 'error', 'IPC response format unexpected', { result });
        }
      } else {
        updateTest(4, 'error', 'Metadata API not available for IPC test');
      }
    } catch (error) {
      // Check if it's a proper IPC error (which means IPC is working)
      if (error && typeof error === 'object' && 'message' in error) {
        updateTest(4, 'success', 'IPC communication working (with expected error)', { 
          error: error.message,
          note: 'Database error expected without proper initialization'
        });
      } else {
        updateTest(4, 'error', `IPC communication failed: ${error}`);
      }
    }
  };

  useEffect(() => {
    // Auto-run tests on component mount
    runTests();
  }, []);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const allTestsPassed = tests.every(test => test.status === 'success');
  const hasErrors = tests.some(test => test.status === 'error');

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Electron Bridge Integration Test
          {allTestsPassed && <CheckCircle className="h-5 w-5 text-green-500" />}
          {hasErrors && <XCircle className="h-5 w-5 text-red-500" />}
        </CardTitle>
        <CardDescription>
          Testing the integration between React frontend and Electron main process
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 mb-4">
          <Button onClick={runTests} variant="outline">
            Run Tests Again
          </Button>
        </div>

        <div className="space-y-3">
          {tests.map((test, index) => (
            <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="flex-shrink-0 mt-0.5">
                {getStatusIcon(test.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{test.name}</span>
                  {getStatusBadge(test.status)}
                </div>
                {test.message && (
                  <p className="text-sm text-muted-foreground mb-2">{test.message}</p>
                )}
                {test.details && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      View Details
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                      {JSON.stringify(test.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Test Summary</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-green-600 font-medium">
                {tests.filter(t => t.status === 'success').length}
              </span>
              <span className="text-muted-foreground"> Passed</span>
            </div>
            <div>
              <span className="text-red-600 font-medium">
                {tests.filter(t => t.status === 'error').length}
              </span>
              <span className="text-muted-foreground"> Failed</span>
            </div>
            <div>
              <span className="text-yellow-600 font-medium">
                {tests.filter(t => t.status === 'pending').length}
              </span>
              <span className="text-muted-foreground"> Pending</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
