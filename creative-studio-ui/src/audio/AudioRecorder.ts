import { AudioFileManager } from './AudioFileManager';

/**
 * AudioRecorder - Classe pour l'enregistrement audio
 * 
 * Fonctionnalités :
 * - Enregistrement audio via l'API Web Audio
 * - Gestion des flux audio en temps réel
 * - Sauvegarde des enregistrements
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext;
  private mediaStream: MediaStream | null = null;
  private audioFileManager: AudioFileManager;
  private isRecording: boolean = false;

  constructor(audioFileManager: AudioFileManager) {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.audioFileManager = audioFileManager;
  }

  /**
   * Démarrer l'enregistrement audio
   */
  async startRecording(): Promise<void> {
    try {
      // Demander l'accès au microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaStream = stream;
      
      // Créer un MediaRecorder
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      
      // Événement pour collecter les données audio
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Démarrer l'enregistrement
      this.mediaRecorder.start();
      this.isRecording = true;
      
      console.log('Enregistrement audio démarré');
    } catch (error) {
      console.error('Erreur lors du démarrage de l\'enregistrement:', error);
      throw error;
    }
  }

  /**
   * Arrêter l'enregistrement audio
   */
  async stopRecording(): Promise<string> {
    if (!this.mediaRecorder || !this.isRecording) {
      throw new Error('Aucun enregistrement en cours');
    }

    return new Promise((resolve, reject) => {
      this.mediaRecorder!.onstop = async () => {
        try {
          // Créer un blob audio à partir des chunks
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
          
          // Sauvegarder le fichier audio
          const filePath = await this.audioFileManager.saveAudioFile(audioBlob, 'recording.wav');
          
          // Nettoyer
          this.cleanup();
          
          console.log('Enregistrement audio terminé et sauvegardé:', filePath);
          resolve(filePath);
        } catch (error) {
          console.error('Erreur lors de l\'arrêt de l\'enregistrement:', error);
          reject(error);
        }
      };

      // Arrêter l'enregistrement
      this.mediaRecorder.stop();
      this.isRecording = false;
    });
  }

  /**
   * Nettoyer les ressources
   */
  private cleanup(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  /**
   * Vérifier si un enregistrement est en cours
   */
  isRecordingActive(): boolean {
    return this.isRecording;
  }

  /**
   * Libérer les ressources
   */
  async close(): Promise<void> {
    if (this.isRecording) {
      await this.stopRecording();
    }
    this.cleanup();
    await this.audioContext.close();
  }
}