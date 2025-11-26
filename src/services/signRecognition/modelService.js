// src/services/signRecognition/modelService.js

import * as tf from '@tensorflow/tfjs';
import { SIGN_RECOGNITION_CONFIG, SIGN_LABELS } from '../../utils/signRecognition/constants';

class ModelService {
  constructor() {
    this.model = null;
    this.isLoaded = false;
    this.useDummyModel = SIGN_RECOGNITION_CONFIG.model.useDummyModel;
  }

  /**
   * Carga el modelo TensorFlow.js
   */
  async loadModel() {
    if (this.isLoaded) {
      console.log('⚠️ Model already loaded');
      return;
    }

    try {
      if (this.useDummyModel) {
        console.log('⚠️ Running in DUMMY mode - Random predictions for testing');
        this.isLoaded = true;
        return;
      }

      console.log('📦 Loading TensorFlow.js model...');
      
      this.model = await tf.loadLayersModel(SIGN_RECOGNITION_CONFIG.model.path);
      this.isLoaded = true;
      
      console.log('✅ Model loaded successfully');
      
      // Warm-up: hacer una predicción dummy
      const dummyInput = tf.zeros([1, 63]); // 21 landmarks × 3 coords
      const warmup = this.model.predict(dummyInput);
      warmup.dispose();
      dummyInput.dispose();
      
      console.log('✅ Model warmed up');
    } catch (error) {
      console.error('❌ Error loading model:', error);
      console.log('⚠️ Falling back to dummy mode');
      this.useDummyModel = true;
      this.isLoaded = true;
    }
  }

  /**
   * Predice la seña desde landmarks
   * @param {Array} landmarks - Array de 63 números (21 landmarks × 3 coords)
   * @returns {Object} Predicción con label, confidence, index
   */
  async predict(landmarks) {
    if (!this.isLoaded) {
      throw new Error('Model not loaded');
    }

    try {
      // Modo dummy para testing
      if (this.useDummyModel) {
        return this._dummyPredict();
      }

      // Predicción real con modelo
      const inputTensor = tf.tensor2d([landmarks], [1, 63]);
      const prediction = this.model.predict(inputTensor);
      const probabilities = await prediction.array();
      
      // Limpiar tensores
      inputTensor.dispose();
      prediction.dispose();

      // Obtener top predicción
      const topIndex = probabilities[0].indexOf(Math.max(...probabilities[0]));
      const confidence = probabilities[0][topIndex];

      return {
        label: SIGN_LABELS[topIndex],
        confidence: confidence,
        index: topIndex,
        allProbabilities: probabilities[0]
      };
    } catch (error) {
      console.error('Error during prediction:', error);
      return null;
    }
  }

  /**
   * Predicción dummy para testing sin modelo real
   * @private
   */
  _dummyPredict() {
    const randomIndex = Math.floor(Math.random() * SIGN_LABELS.length);
    const randomConfidence = 0.75 + Math.random() * 0.20; // 75-95%

    return {
      label: SIGN_LABELS[randomIndex],
      confidence: randomConfidence,
      index: randomIndex,
      isDummy: true
    };
  }

  /**
   * Limpia recursos
   */
  cleanup() {
    if (this.model) {
      this.model.dispose();
      this.model = null;
      this.isLoaded = false;
      console.log('🧹 Model cleaned up');
    }
  }

  /**
   * Verifica si está listo
   */
  isReady() {
    return this.isLoaded;
  }
}

// Exportar instancia singleton
export default new ModelService();