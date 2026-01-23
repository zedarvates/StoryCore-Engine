/**
 * APIManager - Gestionnaire d'APIs avec système de fallback
 *
 * Gère les appels aux APIs Electron avec retry logic et fallbacks
 * pour garantir le fonctionnement même en cas de défaillance
 */

export interface APIResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  fallbackUsed?: boolean;
  retryCount?: number;
}

export interface APIAdapter {
  name: string;
  priority: number; // 0 = highest priority
  isAvailable(): Promise<boolean>;
  call<T>(endpoint: string, method: string, data?: any): Promise<APIResult<T>>;
}

/**
 * Gestionnaire d'APIs avec fallbacks automatiques
 */
export class APIManager {
  private static instance: APIManager;
  private adapters: APIAdapter[] = [];

  private constructor() {
    this.initializeAdapters();
  }

  static getInstance(): APIManager {
    if (!APIManager.instance) {
      APIManager.instance = new APIManager();
    }
    return APIManager.instance;
  }

  /**
   * Enregistre un nouvel adaptateur API
   */
  registerAdapter(adapter: APIAdapter): void {
    this.adapters.push(adapter);
    this.adapters.sort((a, b) => a.priority - b.priority); // Trier par priorité
  }

  /**
   * Appelle une API avec système de fallback
   */
  async call<T>(
    endpoint: string,
    method: string = 'GET',
    data?: any,
    options: {
      maxRetries?: number;
      timeout?: number;
      requiredAdapters?: string[];
    } = {}
  ): Promise<APIResult<T>> {
    const { maxRetries = 3, timeout = 10000, requiredAdapters } = options;

    // Filtrer les adaptateurs si nécessaire
    let availableAdapters = this.adapters;
    if (requiredAdapters) {
      availableAdapters = this.adapters.filter(adapter =>
        requiredAdapters.includes(adapter.name)
      );
    }

    // Tester chaque adaptateur par ordre de priorité
    for (const adapter of availableAdapters) {
      try {
        // Vérifier si l'adaptateur est disponible
        const isAvailable = await this.withTimeout(
          adapter.isAvailable(),
          timeout / 2
        );

        if (!isAvailable) {
          console.warn(`[APIManager] Adapter "${adapter.name}" not available, trying next...`);
          continue;
        }

        // Essayer l'appel avec retry
        const result = await this.retryOperation(
          () => this.withTimeout(
            adapter.call<T>(endpoint, method, data),
            timeout
          ),
          maxRetries
        );

        if (result.success) {
          return {
            ...result,
            fallbackUsed: adapter !== availableAdapters[0] // Premier adaptateur = pas de fallback
          };
        }

        console.warn(`[APIManager] Adapter "${adapter.name}" failed:`, result.error);

      } catch (error) {
        console.warn(`[APIManager] Adapter "${adapter.name}" error:`, error);
      }
    }

    // Tous les adaptateurs ont échoué
    return {
      success: false,
      error: 'All API adapters failed',
      fallbackUsed: true
    };
  }

  /**
   * Sauvegarde des données de projet
   */
  async saveProjectData(projectPath: string, data: any): Promise<APIResult<void>> {
    return this.call<void>(
      `project/${projectPath}/data`,
      'POST',
      data,
      { requiredAdapters: ['electron', 'fallback'] }
    );
  }

  /**
   * Charge des données de projet
   */
  async loadProjectData(projectPath: string): Promise<APIResult<any>> {
    return this.call<any>(
      `project/${projectPath}/data`,
      'GET',
      undefined,
      { requiredAdapters: ['electron', 'fallback'] }
    );
  }

  /**
   * Met à jour les métadonnées du projet
   */
  async updateProjectMetadata(projectPath: string, metadata: any): Promise<APIResult<void>> {
    return this.call<void>(
      `project/${projectPath}/metadata`,
      'PATCH',
      metadata,
      { requiredAdapters: ['electron', 'fallback'] }
    );
  }

  /**
   * Sauvegarde un fichier
   */
  async saveFile(filePath: string, content: string | Buffer): Promise<APIResult<void>> {
    return this.call<void>(
      `file/${encodeURIComponent(filePath)}`,
      'PUT',
      content,
      { requiredAdapters: ['electron', 'fallback'] }
    );
  }

  /**
   * Charge un fichier
   */
  async loadFile(filePath: string): Promise<APIResult<string | Buffer>> {
    return this.call<string | Buffer>(
      `file/${encodeURIComponent(filePath)}`,
      'GET',
      undefined,
      { requiredAdapters: ['electron', 'fallback'] }
    );
  }

  /**
   * Crée un dossier
   */
  async createDirectory(dirPath: string): Promise<APIResult<void>> {
    return this.call<void>(
      `directory/${encodeURIComponent(dirPath)}`,
      'POST',
      undefined,
      { requiredAdapters: ['electron', 'fallback'] }
    );
  }

  /**
   * Vérifie si un fichier/dossier existe
   */
  async exists(path: string): Promise<APIResult<boolean>> {
    return this.call<boolean>(
      `exists/${encodeURIComponent(path)}`,
      'HEAD',
      undefined,
      { requiredAdapters: ['electron', 'fallback'] }
    );
  }

  /**
   * Initialise les adaptateurs par défaut
   */
  private initializeAdapters(): void {
    // Adaptateur Electron (priorité la plus haute)
    this.registerAdapter({
      name: 'electron',
      priority: 0,
      isAvailable: async () => {
        return typeof window !== 'undefined' && !!window.electronAPI;
      },
      call: async <T>(endpoint: string, method: string, data?: any): Promise<APIResult<T>> => {
        try {
          const [resource, ...pathParts] = endpoint.split('/');
          const path = pathParts.join('/');

          switch (resource) {
            case 'project':
              if (method === 'POST' && path.endsWith('/data')) {
                // Sauvegarde des données projet
                const projectPath = path.replace('/data', '');
                return await this.callElectronProjectAPI(projectPath, 'saveData', data);
              } else if (method === 'PATCH' && path.endsWith('/metadata')) {
                // Mise à jour des métadonnées
                const projectPath = path.replace('/metadata', '');
                return await this.callElectronProjectAPI(projectPath, 'updateMetadata', data);
              }
              break;

            case 'file':
              if (method === 'PUT') {
                // Sauvegarde de fichier
                return await this.callElectronFileAPI(path, 'writeFile', data);
              } else if (method === 'GET') {
                // Lecture de fichier
                return await this.callElectronFileAPI(path, 'readFile');
              }
              break;

            case 'directory':
              if (method === 'POST') {
                // Création de dossier
                return await this.callElectronFileAPI(path, 'ensureDir');
              }
              break;

            case 'exists':
              if (method === 'HEAD') {
                // Vérification d'existence
                return await this.callElectronFileAPI(path, 'exists');
              }
              break;
          }

          return { success: false, error: `Unsupported endpoint: ${endpoint}` };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Electron API error'
          };
        }
      }
    });

    // Adaptateur HTTP (pour les déploiements web)
    this.registerAdapter({
      name: 'http',
      priority: 1,
      isAvailable: async () => {
        // Disponible si pas d'Electron mais accès réseau
        return typeof window !== 'undefined' && !window.electronAPI && navigator.onLine;
      },
      call: async <T>(endpoint: string, method: string, data?: any): Promise<APIResult<T>> => {
        try {
          const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
          const url = `${baseUrl}/${endpoint}`;

          const response = await fetch(url, {
            method,
            headers: {
              'Content-Type': 'application/json',
            },
            body: data ? JSON.stringify(data) : undefined,
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const result = await response.json();
          return { success: true, data: result };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'HTTP API error'
          };
        }
      }
    });

    // Adaptateur Fallback (localStorage/IndexedDB)
    this.registerAdapter({
      name: 'fallback',
      priority: 2,
      isAvailable: async () => true, // Toujours disponible
      call: async <T>(endpoint: string, method: string, data?: any): Promise<APIResult<T>> => {
        try {
          // Utiliser localStorage ou IndexedDB comme fallback
          const [resource, ...pathParts] = endpoint.split('/');
          const path = pathParts.join('/');

          switch (resource) {
            case 'project':
              if (method === 'POST' && path.endsWith('/data')) {
                // Sauvegarde en localStorage
                const projectPath = path.replace('/data', '');
                const key = `project_${btoa(projectPath)}_data`;
                localStorage.setItem(key, JSON.stringify(data));
                return { success: true };
              } else if (method === 'PATCH' && path.endsWith('/metadata')) {
                // Mise à jour des métadonnées en localStorage
                const projectPath = path.replace('/metadata', '');
                const key = `project_${btoa(projectPath)}_metadata`;
                const existing = JSON.parse(localStorage.getItem(key) || '{}');
                const updated = { ...existing, ...data };
                localStorage.setItem(key, JSON.stringify(updated));
                return { success: true };
              }
              break;

            case 'file':
              if (method === 'PUT') {
                // Sauvegarde en localStorage (pour petits fichiers)
                const key = `file_${btoa(path)}`;
                const content = typeof data === 'string' ? data : JSON.stringify(data);
                if (content.length < 5000000) { // Limite de 5MB
                  localStorage.setItem(key, content);
                  return { success: true };
                } else {
                  // Pour les gros fichiers, proposer un téléchargement
                  this.downloadAsFile(data, path.split('/').pop() || 'file');
                  return { success: true };
                }
              } else if (method === 'GET') {
                // Lecture depuis localStorage
                const key = `file_${btoa(path)}`;
                const content = localStorage.getItem(key);
                return content ? { success: true, data: content as T } : { success: false, error: 'File not found' };
              }
              break;

            case 'directory':
              if (method === 'POST') {
                // Simuler la création de dossier (pas nécessaire en localStorage)
                return { success: true };
              }
              break;

            case 'exists':
              if (method === 'HEAD') {
                // Vérifier l'existence en localStorage
                const key = `file_${btoa(path)}`;
                const exists = localStorage.getItem(key) !== null;
                return { success: true, data: exists };
              }
              break;
          }

          return { success: false, error: `Fallback not supported for: ${endpoint}` };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Fallback API error'
          };
        }
      }
    });
  }

  /**
   * Appel aux APIs Electron pour les projets
   */
  private async callElectronProjectAPI<T>(
    projectPath: string,
    method: string,
    data?: any
  ): Promise<APIResult<T>> {
    if (!window.electronAPI?.project) {
      throw new Error('Electron project API not available');
    }

    const api = window.electronAPI.project;

    switch (method) {
      case 'saveData':
        if (api.saveData) {
          await api.saveData(projectPath, data);
          return { success: true };
        }
        break;

      case 'updateMetadata':
        if (api.updateMetadata) {
          await api.updateMetadata(projectPath, data);
          return { success: true };
        }
        break;
    }

    throw new Error(`Electron project API method "${method}" not available`);
  }

  /**
   * Appel aux APIs Electron pour les fichiers
   */
  private async callElectronFileAPI<T>(
    filePath: string,
    method: string,
    data?: any
  ): Promise<APIResult<T>> {
    if (!window.electronAPI?.fs) {
      throw new Error('Electron file system API not available');
    }

    const fs = window.electronAPI.fs;

    switch (method) {
      case 'writeFile':
        if (fs.writeFile) {
          const encoder = new TextEncoder();
          const buffer = Buffer.from(encoder.encode(
            typeof data === 'string' ? data : JSON.stringify(data)
          ));
          await fs.writeFile(filePath, buffer);
          return { success: true };
        }
        break;

      case 'readFile':
        if (fs.readFile) {
          const buffer = await fs.readFile(filePath);
          const content = new TextDecoder().decode(buffer);
          try {
            // Essayer de parser comme JSON
            return { success: true, data: JSON.parse(content) };
          } catch {
            // Retourner comme string
            return { success: true, data: content as T };
          }
        }
        break;

      case 'ensureDir':
        if (fs.ensureDir) {
          await fs.ensureDir(filePath);
          return { success: true };
        }
        break;

      case 'exists':
        if (fs.exists) {
          const exists = await fs.exists(filePath);
          return { success: true, data: exists };
        }
        break;
    }

    throw new Error(`Electron FS API method "${method}" not available`);
  }

  /**
   * Téléchargement d'un fichier comme fallback
   */
  private downloadAsFile(data: any, filename: string): void {
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  /**
   * Retry logic avec exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.warn(`[APIManager] Operation failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Timeout wrapper
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeoutId));
    });
  }

  /**
   * Obtient les statistiques des APIs
   */
  getStats(): {
    adapters: Array<{ name: string; available: boolean; priority: number }>;
    totalRetries: number;
    fallbackUsage: number;
  } {
    return {
      adapters: this.adapters.map(adapter => ({
        name: adapter.name,
        available: true, // Simplifié
        priority: adapter.priority
      })),
      totalRetries: 0, // À implémenter si nécessaire
      fallbackUsage: 0 // À implémenter si nécessaire
    };
  }
}

// Export de l'instance singleton
export const apiManager = APIManager.getInstance();
