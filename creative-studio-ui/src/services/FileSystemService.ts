/**
 * FileSystemService - Service de gestion du système de fichiers pour StoryCore
 *
 * Fournit des méthodes pour lire et écrire des fichiers de configuration
 * avec gestion des erreurs et synchronisation avec localStorage
 * 
 * Compatible avec les environnements browser et Node.js
 */

import { AddonConfig } from './AddonManager';

// Type guard pour vérifier si on est dans un environnement Node.js
const isNodeEnvironment = typeof window === 'undefined' && typeof process !== 'undefined';

// Lazy loading des modules Node.js pour éviter les erreurs dans le browser
let fs: unknown = null;
let path: unknown = null;

if (isNodeEnvironment) {
  try {
    const nodeFs = require('fs');
    const nodePath = require('path');
    fs = nodeFs.promises;
    path = nodePath;
  } catch (error) {
    console.warn('[FileSystemService] Impossible de charger les modules Node.js:', error);
  }
}

export class FileSystemService {
    private static instance: FileSystemService;
    private useFileSystem: boolean;
    
    private constructor() {
        this.useFileSystem = isNodeEnvironment && fs !== null;
    }
    
    /**
     * Obtient l'instance singleton du service
     */
    static getInstance(): FileSystemService {
        if (!FileSystemService.instance) {
            FileSystemService.instance = new FileSystemService();
        }
        return FileSystemService.instance;
    }
    
    /**
     * Vérifie si le système de fichiers est disponible
     */
    private isFileSystemAvailable(): boolean {
        return this.useFileSystem;
    }
    
    /**
     * Lit le fichier de configuration des add-ons
     * @param filePath Chemin du fichier de configuration
     * @returns Configuration des add-ons
     * @throws Error Si le fichier existe mais est invalide
     */
    async readConfigFile(filePath: string): Promise<AddonConfig> {
        // Utiliser localStorage en premier dans le browser
        if (!this.isFileSystemAvailable()) {
            return this.readFromLocalStorage();
        }
        
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            const parsed = JSON.parse(data);
            
            // Validation du format
            if (!parsed.addons || typeof parsed.addons !== 'object') {
                throw new Error('Format de configuration invalide: la propriété "addons" est manquante ou invalide');
            }
            
            return parsed.addons;
        } catch (error: unknown) {
            // Gestion des erreurs spécifiques
            if (error.code === 'ENOENT') {
                // Fichier non trouvé - essayer localStorage
                console.warn(`[FileSystemService] Fichier non trouvé: ${filePath}, fallback sur localStorage`);
                return this.readFromLocalStorage();
            }
            
            if (error instanceof SyntaxError) {
                throw new Error(`Format JSON invalide dans ${filePath}: ${error.message}`);
            }
            
            // Gestion des erreurs de permissions
            if (error.code === 'EACCES' || error.code === 'EPERM') {
                throw new Error(`Permission refusée pour lire le fichier ${filePath}`);
            }
            
            // En cas d'erreur, essayer localStorage
            console.warn(`[FileSystemService] Erreur lors de la lecture du fichier, fallback sur localStorage:`, error);
            return this.readFromLocalStorage();
        }
    }
    
    /**
     * Lit la configuration depuis localStorage
     */
    private readFromLocalStorage(): Promise<AddonConfig> {
        try {
            const data = localStorage.getItem('storycore_addon_config');
            if (data) {
                return Promise.resolve(JSON.parse(data));
            }
        } catch (error) {
            console.warn('[FileSystemService] Erreur lors de la lecture depuis localStorage:', error);
        }
        return Promise.resolve({});
    }
    
    /**
     * Écrit la configuration des add-ons dans un fichier
     * @param filePath Chemin du fichier de configuration
     * @param config Configuration des add-ons à sauvegarder
     * @throws Error Si l'écriture du fichier échoue
     */
    async writeConfigFile(filePath: string, config: AddonConfig): Promise<void> {
        // Synchroniser avec localStorage dans tous les cas
        await this.syncWithLocalStorage(config);
        
        // Si pas de système de fichiers disponible, arrêter ici
        if (!this.isFileSystemAvailable()) {
            console.log('[FileSystemService] Configuration sauvegardée dans localStorage uniquement (browser)');
            return;
        }
        
        try {
            // S'assurer que le répertoire existe
            await this.ensureDirectoryExists(path.dirname(filePath));
            
            // Créer la structure complète avec métadonnées
            const fullConfig = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                addons: config
            };
            
            // Écrire le fichier avec un formatage JSON lisible
            await fs.writeFile(filePath, JSON.stringify(fullConfig, null, 2), 'utf-8');
            
            console.log(`[FileSystemService] Configuration sauvegardée dans ${filePath}`);
        } catch (error: unknown) {
            // Gestion des erreurs de permissions
            if (error.code === 'EACCES' || error.code === 'EPERM') {
                throw new Error(`Permission refusée pour écrire le fichier ${filePath}`);
            }
            
            // Gestion des erreurs d'espace disque
            if (error.code === 'ENOSPC') {
                throw new Error(`Espace disque insuffisant pour écrire le fichier ${filePath}`);
            }
            
            console.error(`[FileSystemService] Échec de l'écriture du fichier ${filePath}:`, error);
            // Ne pas throw car la sync avec localStorage a réussi
        }
    }
    
    /**
     * S'assure que le répertoire existe, le crée si nécessaire
     * @param dirPath Chemin du répertoire
     */
    async ensureDirectoryExists(dirPath: string): Promise<void> {
        if (!this.isFileSystemAvailable()) {
            return;
        }
        
        try {
            // Vérifier si le répertoire existe
            await fs.access(dirPath);
        } catch {
            // Répertoire n'existe pas, le créer récursivement
            try {
                await fs.mkdir(dirPath, { recursive: true });
                console.log(`[FileSystemService] Répertoire créé: ${dirPath}`);
            } catch (error: unknown) {
                // Gestion des erreurs de permissions
                if (error.code === 'EACCES' || error.code === 'EPERM') {
                    throw new Error(`Permission refusée pour créer le répertoire ${dirPath}`);
                }
                
                console.error(`[FileSystemService] Échec de la création du répertoire ${dirPath}:`, error);
                throw new Error(`Échec de la création du répertoire: ${error.message}`);
            }
        }
    }
    
    /**
     * Synchronise la configuration avec localStorage
     * @param config Configuration à synchroniser
     * @throws Error Si la synchronisation avec localStorage échoue
     */
    async syncWithLocalStorage(config: AddonConfig): Promise<void> {
        try {
            // Sauvegarder dans localStorage
            localStorage.setItem('storycore_addon_config', JSON.stringify(config));
            console.log('[FileSystemService] Configuration synchronisée avec localStorage');
        } catch (error: unknown) {
            // Gestion des erreurs de quota dépassé
            if (error.name === 'QuotaExceededError') {
                throw new Error('Quota de stockage local dépassé');
            }
            
            console.error('[FileSystemService] Échec de la synchronisation avec localStorage:', error);
            throw new Error(`Échec de la synchronisation avec localStorage: ${error.message}`);
        }
    }
    
    /**
     * Vérifie si un fichier existe
     * @param filePath Chemin du fichier
     * @returns true si le fichier existe, false sinon
     */
    async fileExists(filePath: string): Promise<boolean> {
        if (!this.isFileSystemAvailable()) {
            return false;
        }
        
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * Supprime un fichier de configuration
     * @param filePath Chemin du fichier à supprimer
     * @throws Error Si la suppression échoue
     */
    async deleteConfigFile(filePath: string): Promise<void> {
        if (!this.isFileSystemAvailable()) {
            return;
        }
        
        try {
            await fs.unlink(filePath);
            console.log(`[FileSystemService] Fichier supprimé: ${filePath}`);
        } catch (error: unknown) {
            // Gestion des erreurs spécifiques
            if (error.code === 'ENOENT') {
                // Fichier non trouvé - pas une erreur critique
                console.warn(`[FileSystemService] Fichier non trouvé pour suppression: ${filePath}`);
                return;
            }
            
            // Gestion des erreurs de permissions
            if (error.code === 'EACCES' || error.code === 'EPERM') {
                throw new Error(`Permission refusée pour supprimer le fichier ${filePath}`);
            }
            
            console.error(`[FileSystemService] Échec de la suppression du fichier ${filePath}:`, error);
            throw new Error(`Échec de la suppression du fichier: ${error.message}`);
        }
    }
}

// Export de l'instance singleton
export const fileSystemService = FileSystemService.getInstance();



