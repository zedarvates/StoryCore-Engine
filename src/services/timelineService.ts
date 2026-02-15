// Define Event and Sequence interfaces locally to avoid circular dependency
interface Event {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  description?: string;
  mediaUrl?: string;
}

interface Sequence {
  id: string;
  title: string;
  events: Event[];
}

import ApiService from './apiService';

class TimelineService {
  private apiService: ApiService;
  private sequences: Sequence[] = [];

  constructor() {
    this.apiService = new ApiService('https://api.example.com');
  }

  async fetchSequences(): Promise<Sequence[]> {
    try {
      const data = await this.apiService.fetchData('sequences');
      return data as Sequence[];
    } catch (error) {
      console.error('Erreur lors de la récupération des séquences:', error);
      return [];
    }
  }

  async saveSequences(sequences: Sequence[]): Promise<void> {
    try {
      await this.apiService.postData('sequences', sequences);
      this.sequences = sequences;
      console.log('Séquences sauvegardées:', sequences);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des séquences:', error);
      throw error;
    }
  }

  validateEvent(event: Event): boolean {
    // Valider qu'un événement est correctement défini
    if (!event.title || event.startTime < 0 || event.endTime <= event.startTime) {
      return false;
    }
    return true;
  }

  checkForConflicts(events: Event[]): boolean {
    // Vérifier les conflits entre les événements
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        if (
          (events[i].startTime < events[j].endTime && events[i].endTime > events[j].startTime)
        ) {
          return true; // Conflit détecté
        }
      }
    }
    return false; // Aucun conflit
  }
}

export default new TimelineService();

