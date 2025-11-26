// src/services/signRecognition/mediaPipeService.js

import { Hands } from '@mediapipe/hands';
import { SIGN_RECOGNITION_CONFIG } from '../../utils/signRecognition/constants';

class MediaPipeService {
  constructor() {
    this.hands = null;
    this.isInitialized = false;
  }

  /**
   * Inicializa MediaPipe Hands
   * @param {Function} onResultsCallback - Callback cuando se detectan manos
   */
  async initialize(onResultsCallback) {
    if (this.isInitialized) {
      console.log('⚠️ MediaPipe already initialized');
      return;
    }

    try {
      console.log('📦 Initializing MediaPipe Hands...');

      this.hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      this.hands.setOptions(SIGN_RECOGNITION_CONFIG.mediaPipe);
      this.hands.onResults(onResultsCallback);

      this.isInitialized = true;
      console.log('✅ MediaPipe Hands initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing MediaPipe:', error);
      throw error;
    }
  }

  /**
   * Procesa un frame de video
   * @param {HTMLVideoElement} videoElement - Elemento de video
   */
  async processFrame(videoElement) {
    if (!this.isInitialized || !this.hands) {
      throw new Error('MediaPipe not initialized');
    }

    try {
      await this.hands.send({ image: videoElement });
    } catch (error) {
      console.error('Error processing frame:', error);
      throw error;
    }
  }

  /**
   * Limpia recursos
   */
  cleanup() {
    if (this.hands) {
      this.hands.close();
      this.hands = null;
      this.isInitialized = false;
      console.log('🧹 MediaPipe cleaned up');
    }
  }

  /**
   * Verifica si está inicializado
   */
  isReady() {
    return this.isInitialized && this.hands !== null;
  }
}

// Exportar instancia singleton
export default new MediaPipeService();