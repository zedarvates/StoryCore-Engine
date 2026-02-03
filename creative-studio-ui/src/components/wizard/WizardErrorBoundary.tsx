/**
 * Wizard Error Boundary Component
 * 
 * Catches errors in wizard components and provides recovery UI
 * Automatically exports wizard data on critical errors
 */

import { Component, ReactNode } from 'react';
import { AlertCircle, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { emergencyExportWizardState, type WizardType } from '@/utils/wizardStorage';

interface Props {
  children: ReactNode;
  wizardType: WizardType;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  dataExported: boolean;
}

export class WizardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      dataExported: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Wizard error caught by boundary:', error, errorInfo);
    
    // Emergency export wizard data
    try {
      emergencyExportWizardState(this.props.wizardType, error);
      this.setState({ dataExported: true });
    } catch (exportError) {
      console.error('Failed to export wizard data:', exportError);
    }
    
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      dataExported: false,
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleExportAgain = () => {
    try {
      emergencyExportWizardState(this.props.wizardType, this.state.error || undefined);
      this.setState({ dataExported: true });
    } catch (error) {
      console.error('Failed to export wizard data:', error);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 min-h-[400px]" role="alert">
          <AlertCircle className="h-16 w-16 text-red-500 mb-4" aria-hidden="true" />
          
          <h2 className="text-2xl font-bold mb-2 text-gray-900">Wizard Error</h2>
          
          <p className="text-gray-600 mb-4 text-center max-w-md">
            An unexpected error occurred in the wizard. 
            {this.state.dataExported && ' Your data has been automatically exported.'}
          </p>

          {this.state.error && (
            <div className="mb-4 p-4 bg-gray-100 rounded-md max-w-2xl w-full border border-gray-200">
              <p className="text-sm font-medium text-red-700">
                {this.state.error.message}
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                    Stack trace
                  </summary>
                  <pre className="text-xs mt-2 overflow-auto max-h-40 bg-gray-50 p-2 rounded">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}

          <div className="flex gap-2 flex-wrap justify-center">
            <Button onClick={this.handleReset} variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            
            <Button onClick={this.handleReload} variant="outline">
              Reload Page
            </Button>
            
            {!this.state.dataExported && (
              <Button onClick={this.handleExportAgain} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export Data
              </Button>
            )}
          </div>

          {this.state.dataExported && (
            <p className="text-xs text-gray-500 mt-4">
              Your wizard data has been saved to your downloads folder.
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
