/**
 * Electron Print System
 * 
 * Requirements: 159
 * Level: 🟡 HAUTE
 * 
 * Printing functionality for Electron application
 */

import { BrowserWindow, webContents, PrintOptions, PrinterInfo } from 'electron';

export interface PrintSettings {
  silent?: boolean;
  printBackground?: boolean;
  color?: boolean;
  margins?: {
    marginType?: 'default' | 'none' | 'printableArea' | 'custom';
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  pageSize?: string | {
    width: number;
    height: number;
  };
  landscape?: boolean;
  copies?: number;
  collate?: boolean;
  duplex?: boolean;
  dpi?: {
    horizontal: number;
    vertical: number;
  };
  scaleFactor?: number;
  pageRanges?: string[];
  header?: string;
  footer?: string;
}

export interface PrintPreviewOptions {
  width?: number;
  height?: number;
  showDevTools?: boolean;
}

export interface PrintJob {
  id: string;
  name: string;
  status: 'pending' | 'printing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  settings: PrintSettings;
  createdAt: Date;
  completedAt?: Date;
}

export class ElectronPrint {
  private mainWindow: BrowserWindow;
  private printJobs: Map<string, PrintJob> = new Map();
  private defaultSettings: PrintSettings;

  constructor(mainWindow: BrowserWindow, defaultSettings: PrintSettings = {}) {
    this.mainWindow = mainWindow;
    this.defaultSettings = {
      silent: false,
      printBackground: true,
      color: true,
      margins: { marginType: 'default' },
      landscape: false,
      copies: 1,
      collate: true,
      duplex: false,
      ...defaultSettings,
    };
  }

  /**
   * Print current window
   */
  public async printCurrentWindow(options?: PrintSettings): Promise<boolean> {
    return this.printWindow(this.mainWindow, options);
  }

  /**
   * Print specific window
   */
  public async printWindow(window: BrowserWindow, options?: PrintSettings): Promise<boolean> {
    const settings = { ...this.defaultSettings, ...options };
    
    try {
      const jobId = this.createPrintJob('Window Print', settings);
      
      await window.webContents.print(settings, (success, failureReason) => {
        this.updatePrintJobStatus(jobId, success ? 'completed' : 'failed');
        
        if (!success) {
          console.error('Print failed:', failureReason);
        }
      });

      return true;
    } catch (error) {
      console.error('Print error:', error);
      return false;
    }
  }

  /**
   * Print HTML content
   */
  public async printHTML(html: string, options?: PrintSettings): Promise<boolean> {
    const printWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    try {
      await printWindow.loadURL(`data:text/html,${encodeURIComponent(html)}`);
      
      const settings = { ...this.defaultSettings, ...options };
      const jobId = this.createPrintJob('HTML Print', settings);

      return new Promise((resolve) => {
        printWindow.webContents.print(settings, (success, failureReason) => {
          this.updatePrintJobStatus(jobId, success ? 'completed' : 'failed');
          
          if (!success) {
            console.error('HTML print failed:', failureReason);
          }
          
          printWindow.close();
          resolve(success);
        });
      });
    } catch (error) {
      console.error('HTML print error:', error);
      printWindow.close();
      return false;
    }
  }

  /**
   * Print PDF
   */
  public async printPDF(pdfPath: string, options?: PrintSettings): Promise<boolean> {
    const printWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    try {
      await printWindow.loadFile(pdfPath);
      
      const settings = { ...this.defaultSettings, ...options };
      const jobId = this.createPrintJob('PDF Print', settings);

      return new Promise((resolve) => {
        printWindow.webContents.print(settings, (success, failureReason) => {
          this.updatePrintJobStatus(jobId, success ? 'completed' : 'failed');
          
          if (!success) {
            console.error('PDF print failed:', failureReason);
          }
          
          printWindow.close();
          resolve(success);
        });
      });
    } catch (error) {
      console.error('PDF print error:', error);
      printWindow.close();
      return false;
    }
  }

  /**
   * Show print preview
   */
  public async showPrintPreview(options?: PrintPreviewOptions): Promise<void> {
    const previewWindow = new BrowserWindow({
      width: options?.width || 1000,
      height: options?.height || 800,
      title: 'Print Preview',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    try {
      // Create a simple preview page
      const previewHTML = this.generatePreviewHTML();
      await previewWindow.loadURL(`data:text/html,${encodeURIComponent(previewHTML)}`);
      
      if (options?.showDevTools) {
        previewWindow.webContents.openDevTools();
      }

      // Add print button to preview
      previewWindow.webContents.executeJavaScript(`
        document.getElementById('print-button').addEventListener('click', () => {
          window.print();
        });
      `);
    } catch (error) {
      console.error('Preview error:', error);
      previewWindow.close();
    }
  }

  /**
   * Get available printers
   */
  public async getPrinters(): Promise<PrinterInfo[]> {
    return this.mainWindow.webContents.getPrinters();
  }

  /**
   * Get default printer
   */
  public async getDefaultPrinter(): Promise<PrinterInfo | null> {
    const printers = await this.getPrinters();
    return printers.find(p => p.isDefault) || printers[0] || null;
  }

  /**
   * Get print job status
   */
  public getPrintJobStatus(jobId: string): PrintJob | undefined {
    return this.printJobs.get(jobId);
  }

  /**
   * Get all print jobs
   */
  public getAllPrintJobs(): PrintJob[] {
    return Array.from(this.printJobs.values());
  }

  /**
   * Cancel print job
   */
  public cancelPrintJob(jobId: string): boolean {
    const job = this.printJobs.get(jobId);
    if (job && job.status === 'pending') {
      job.status = 'cancelled';
      job.completedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Update default print settings
   */
  public updateDefaultSettings(settings: Partial<PrintSettings>): void {
    this.defaultSettings = { ...this.defaultSettings, ...settings };
  }

  /**
   * Generate print preview HTML
   */
  private generatePreviewHTML(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Preview</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .preview-container { border: 1px solid #ccc; padding: 20px; margin: 20px 0; }
          .controls { margin: 20px 0; }
          button { padding: 10px 20px; margin: 5px; cursor: pointer; }
          .page { border: 1px solid #ddd; margin: 10px 0; padding: 20px; }
        </style>
      </head>
      <body>
        <h1>Print Preview</h1>
        <div class="controls">
          <button id="print-button">Print</button>
          <button onclick="window.close()">Close</button>
        </div>
        <div class="preview-container">
          <div class="page">
            <h2>Page 1</h2>
            <p>This is a preview of the document to be printed.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Create print job
   */
  private createPrintJob(name: string, settings: PrintSettings): string {
    const jobId = `print-job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const job: PrintJob = {
      id: jobId,
      name,
      status: 'pending',
      progress: 0,
      settings,
      createdAt: new Date(),
    };

    this.printJobs.set(jobId, job);
    return jobId;
  }

  /**
   * Update print job status
   */
  private updatePrintJobStatus(jobId: string, status: PrintJob['status']): void {
    const job = this.printJobs.get(jobId);
    if (job) {
      job.status = status;
      job.completedAt = new Date();
    }
  }

  /**
   * Print with progress
   */
  public async printWithProgress(
    content: string,
    onProgress?: (progress: number) => void
  ): Promise<boolean> {
    const tempWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    try {
      // Simulate progress
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 10;
        if (onProgress) {
          onProgress(progress);
        }
      }, 200);

      await tempWindow.loadURL(`data:text/html,${encodeURIComponent(content)}`);
      
      clearInterval(progressInterval);
      if (onProgress) {
        onProgress(100);
      }

      const jobId = this.createPrintJob('Content Print', this.defaultSettings);
      
      return new Promise((resolve) => {
        tempWindow.webContents.print(this.defaultSettings, (success) => {
          this.updatePrintJobStatus(jobId, success ? 'completed' : 'failed');
          tempWindow.close();
          resolve(success);
        });
      });
    } catch (error) {
      console.error('Print with progress error:', error);
      tempWindow.close();
      return false;
    }
  }
}

/**
 * Create print system instance
 */
export function createPrintSystem(mainWindow: BrowserWindow, settings?: PrintSettings): ElectronPrint {
  return new ElectronPrint(mainWindow, settings);
}

/**
 * Quick print utility
 */
export async function quickPrint(window: BrowserWindow, options?: PrintSettings): Promise<boolean> {
  const printSystem = new ElectronPrint(window, options);
  return printSystem.printCurrentWindow(options);
}
