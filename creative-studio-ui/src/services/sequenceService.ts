/**
 * Sequence Service
 * Handles sequence operations with automatic fallback between Electron and Web API
 */

export interface SequenceData {
  id: string;
  name: string;
  order: number;
  duration: number;
  shots_count: number;
  resume: string;
  shot_ids: string[];
  created_at?: string;
  updated_at?: string;
}

export interface SequenceListResponse {
  sequences: SequenceData[];
  total: number;
}

class SequenceService {
  private baseUrl: string;

  constructor() {
    // Use environment variable or default to localhost
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  }

  /**
   * Check if Electron API is available
   */
  private isElectronAvailable(): boolean {
    return !!(window as any).electronAPI?.fs?.readdir;
  }

  /**
   * Load sequences from files using Electron API
   */
  private async loadSequencesElectron(sequencesDir: string): Promise<SequenceData[]> {
    const electronAPI = (window as any).electronAPI;
    
    if (!electronAPI?.fs?.readdir) {
      throw new Error('Electron file system API not available');
    }

    const files = await electronAPI.fs.readdir(sequencesDir);
    const sequenceFiles = files.filter((file: string) => 
      file.startsWith('sequence_') && file.endsWith('.json')
    );

    const loadedSequences: SequenceData[] = [];

    for (const fileName of sequenceFiles) {
      try {
        const filePath = `${sequencesDir}/${fileName}`;

        if (!electronAPI?.fs?.readFile) {
          console.warn('[SequenceService] readFile API not available, skipping file:', fileName);
          continue;
        }

        const buffer = await electronAPI.fs.readFile(filePath);
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(buffer);
        const sequenceData = JSON.parse(jsonString);

        // Ensure shot_ids is an array
        if (!sequenceData.shot_ids || !Array.isArray(sequenceData.shot_ids)) {
          sequenceData.shot_ids = [];
        }

        loadedSequences.push(sequenceData);
      } catch (fileError) {
        console.error(`Failed to load sequence file ${fileName}:`, fileError);
      }
    }

    // Sort by order
    loadedSequences.sort((a, b) => a.order - b.order);

    return loadedSequences;
  }

  /**
   * Load sequences from web API
   */
  private async loadSequencesWeb(projectPath: string): Promise<SequenceData[]> {
    try {
      // Encode project path for URL
      const encodedPath = encodeURIComponent(projectPath);
      const response = await fetch(`${this.baseUrl}/api/sequences/${encodedPath}/list`, {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`Failed to load sequences: ${response.statusText}`);
      }

      const data: SequenceListResponse = await response.json();
      return data.sequences;
    } catch (error) {
      // If the backend API is not available, return empty array instead of throwing
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn('[SequenceService] Backend API not available, returning empty sequences list');
        return [];
      }
      throw error;
    }
  }

  /**
   * Load all sequences for a project
   * Automatically uses Electron API if available, otherwise falls back to web API
   */
  async loadSequences(projectPath: string): Promise<SequenceData[]> {
    try {
      if (this.isElectronAvailable()) {
        console.log('[SequenceService] Using Electron API');
        const sequencesDir = `${projectPath}/sequences`;
        return await this.loadSequencesElectron(sequencesDir);
      } else {
        console.log('[SequenceService] Using Web API (backend server required)');
        return await this.loadSequencesWeb(projectPath);
      }
    } catch (error) {
      console.error('[SequenceService] Failed to load sequences:', error);
      // Return empty array instead of throwing to allow the app to continue
      return [];
    }
  }

  /**
   * Get a specific sequence by ID
   */
  async getSequence(projectPath: string, sequenceId: string): Promise<SequenceData | null> {
    try {
      if (this.isElectronAvailable()) {
        const sequences = await this.loadSequences(projectPath);
        return sequences.find(s => s.id === sequenceId) || null;
      } else {
        const encodedPath = encodeURIComponent(projectPath);
        const response = await fetch(`${this.baseUrl}/api/sequences/${encodedPath}/${sequenceId}`);

        if (!response.ok) {
          if (response.status === 404) {
            return null;
          }
          throw new Error(`Failed to get sequence: ${response.statusText}`);
        }

        return await response.json();
      }
    } catch (error) {
      console.error('[SequenceService] Failed to get sequence:', error);
      throw error;
    }
  }

  /**
   * Update a sequence
   */
  async updateSequence(
    projectPath: string,
    sequenceId: string,
    sequenceData: SequenceData
  ): Promise<SequenceData> {
    try {
      if (this.isElectronAvailable()) {
        // Use Electron API
        const electronAPI = (window as any).electronAPI;
        const sequencesDir = `${projectPath}/sequences`;
        
        // Ensure directory exists
        if (electronAPI?.fs?.mkdir) {
          await electronAPI.fs.mkdir(sequencesDir, { recursive: true });
        }

        // Update timestamp
        sequenceData.updated_at = new Date().toISOString();

        // Save to file
        const fileName = `sequence_${sequenceId.padStart(3, '0')}.json`;
        const filePath = `${sequencesDir}/${fileName}`;
        const jsonString = JSON.stringify(sequenceData, null, 2);

        if (electronAPI?.fs?.writeFile) {
          const encoder = new TextEncoder();
          const dataBuffer = Buffer.from(encoder.encode(jsonString));
          await electronAPI.fs.writeFile(filePath, dataBuffer);
        }

        return sequenceData;
      } else {
        // Use Web API
        const encodedPath = encodeURIComponent(projectPath);
        const response = await fetch(
          `${this.baseUrl}/api/sequences/${encodedPath}/${sequenceId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(sequenceData),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to update sequence: ${response.statusText}`);
        }

        return await response.json();
      }
    } catch (error) {
      console.error('[SequenceService] Failed to update sequence:', error);
      throw error;
    }
  }

  /**
   * Create a new sequence
   */
  async createSequence(projectPath: string, sequenceData: SequenceData): Promise<SequenceData> {
    try {
      if (this.isElectronAvailable()) {
        // Use Electron API
        const electronAPI = (window as any).electronAPI;
        const sequencesDir = `${projectPath}/sequences`;
        
        // Ensure directory exists
        if (electronAPI?.fs?.mkdir) {
          await electronAPI.fs.mkdir(sequencesDir, { recursive: true });
        }

        // Set timestamps
        const now = new Date().toISOString();
        sequenceData.created_at = now;
        sequenceData.updated_at = now;

        // Save to file
        const fileName = `sequence_${sequenceData.id.padStart(3, '0')}.json`;
        const filePath = `${sequencesDir}/${fileName}`;
        const jsonString = JSON.stringify(sequenceData, null, 2);

        if (electronAPI?.fs?.writeFile) {
          const encoder = new TextEncoder();
          const dataBuffer = Buffer.from(encoder.encode(jsonString));
          await electronAPI.fs.writeFile(filePath, dataBuffer);
        }

        return sequenceData;
      } else {
        // Use Web API
        const encodedPath = encodeURIComponent(projectPath);
        const response = await fetch(`${this.baseUrl}/api/sequences/${encodedPath}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sequenceData),
        });

        if (!response.ok) {
          throw new Error(`Failed to create sequence: ${response.statusText}`);
        }

        return await response.json();
      }
    } catch (error) {
      console.error('[SequenceService] Failed to create sequence:', error);
      throw error;
    }
  }

  /**
   * Delete a sequence
   */
  async deleteSequence(projectPath: string, sequenceId: string): Promise<void> {
    try {
      if (this.isElectronAvailable()) {
        // Use Electron API
        const electronAPI = (window as any).electronAPI;
        const sequencesDir = `${projectPath}/sequences`;

        // Find and delete the sequence file
        const files = await electronAPI.fs.readdir(sequencesDir);
        
        for (const fileName of files) {
          if (fileName.startsWith('sequence_') && fileName.endsWith('.json')) {
            const filePath = `${sequencesDir}/${fileName}`;
            const buffer = await electronAPI.fs.readFile(filePath);
            const decoder = new TextDecoder();
            const jsonString = decoder.decode(buffer);
            const sequenceData = JSON.parse(jsonString);

            if (sequenceData.id === sequenceId) {
              if ((electronAPI.fs as any)?.unlink) {
                await (electronAPI.fs as any).unlink(filePath);
              }
              return;
            }
          }
        }

        throw new Error(`Sequence ${sequenceId} not found`);
      } else {
        // Use Web API
        const encodedPath = encodeURIComponent(projectPath);
        const response = await fetch(
          `${this.baseUrl}/api/sequences/${encodedPath}/${sequenceId}`,
          {
            method: 'DELETE',
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to delete sequence: ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error('[SequenceService] Failed to delete sequence:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const sequenceService = new SequenceService();
