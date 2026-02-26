/**
 * DemandVectorService
 * ===================
 * Service de Recherche et Développement pour l'optimisation des commandes vocales.
 * 
 * Concept : Convertir les intentions (prompts) en "Vecteurs de Demande" (embeddings)
 * pour une reconnaissance sémantique ultra-rapide sans calcul LLM lourd.
 */

import { ollamaClient } from './llm/OllamaClient';
import { AddonId, VerbCategory } from './AddonVoiceCommandRouter';
import { logger } from '@/utils/logger';

export interface DemandVector {
  intentId: string;
  embedding: number[];
  metadata: {
    addon: AddonId;
    verb: VerbCategory;
    action: string;
    proceduralResponse: string[]; // Réponses immédiates
  };
}

export interface VectorMatch {
  vector: DemandVector;
  similarity: number;
}

export class DemandVectorService {
  private static instance: DemandVectorService;
  private library: DemandVector[] = [];
  private embeddingModel = 'mxbai-embed-large'; // Modèle local standard pour embeddings

  private constructor() {
    this.initializeLibrary();
  }

  static getInstance(): DemandVectorService {
    if (!DemandVectorService.instance) {
      DemandVectorService.instance = new DemandVectorService();
    }
    return DemandVectorService.instance;
  }

  /**
   * Initialise une bibliothèque de "Demandes Types" (R&D)
   * Dans une version finale, ces vecteurs seraient pré-calculés et chargés en JSON.
   */
  private initializeLibrary() {
    // Note: Les embeddings ici seraient normalement chargés depuis un cache.
    // Pour cet exemple R&D, nous définissons les intentions cibles.
    const intents: Omit<DemandVector, 'embedding'>[] = [
      {
        intentId: 'draw-character',
        metadata: {
          addon: 'grok-imagine',
          verb: 'generate',
          action: 'generate_image',
          proceduralResponse: [
            "Je m'y attèle tout de suite.",
            "Très bien, je commence le dessin.",
            "C'est parti pour la création visuelle."
          ]
        }
      },
      {
        intentId: 'create-comic',
        metadata: {
          addon: 'comic-generator',
          verb: 'generate',
          action: 'generate_comic',
          proceduralResponse: [
            "Je prépare les planches de votre BD.",
            "Lancement du générateur de cases.",
            "Je vais structurer cette page pour vous."
          ]
        }
      },
      {
        intentId: 'save-project',
        metadata: {
          addon: 'system',
          verb: 'save',
          action: 'save_project',
          proceduralResponse: [
            "Mémorisation en cours...",
            "Je sauvegarde votre travail.",
            "Projet mis en sécurité."
          ]
        }
      },
      {
        intentId: 'research-web',
        metadata: {
          addon: 'system',
          verb: 'navigate',
          action: 'web_search',
          proceduralResponse: [
            "Je vais faire une recherche sur Internet.",
            "Je consulte les sources en ligne.",
            "Lancement de la recherche web."
          ]
        }
      }
    ];

    // Dans une version R&D réelle, on chargerait ici des vecteurs pré-calculés.
    // Pour l'exemple, nous initialisons avec des vecteurs nuls (qui devront être mis à jour).
    this.library = intents.map(i => ({
      ...i,
      embedding: new Array(1024).fill(0) // Mock d'embedding pour ne pas avoir d'erreur de null
    }));
  }

  /**
   * Calcule la similitude cosinus entre deux vecteurs
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let mA = 0;
    let mB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      mA += a[i] * a[i];
      mB += b[i] * b[i];
    }
    mA = Math.sqrt(mA);
    mB = Math.sqrt(mB);
    return dotProduct / (mA * mB);
  }

  /**
   * Analyse un transcript pour trouver le meilleur "Vecteur de Demande"
   */
  async findBestMatch(transcript: string): Promise<VectorMatch | null> {
    try {
      // 1. Obtenir l'embedding du prompt utilisateur via Ollama (ou API distante)
      // Note: On peut aussi utiliser un modèle local type Transformers.js pour 0 coût API
      const userEmbedding = await ollamaClient.embeddings(this.embeddingModel, transcript);

      let bestMatch: VectorMatch | null = null;
      let maxSim = -Infinity;

      for (const vector of this.library) {
        if (!vector.embedding) continue;
        const sim = this.cosineSimilarity(userEmbedding, vector.embedding);
        if (sim > maxSim) {
          maxSim = sim;
          bestMatch = { vector, similarity: sim };
        }
      }

      // Seuil de confiance (R&D : ajustable)
      if (maxSim > 0.85) {
        return bestMatch;
      }

      return null;
    } catch (error) {
      logger.error('[DemandVectorService] Erreur lors du calcul de match:', error);
      return null;
    }
  }

  /**
   * Sélectionne une réponse procédurale aléatoire pour un intent
   */
  getRandomProceduralResponse(vector: DemandVector): string {
    const responses = vector.metadata.proceduralResponse;
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

export const demandVectorService = DemandVectorService.getInstance();
