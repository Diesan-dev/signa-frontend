// src/services/signRecognition/preprocessor.js

/**
 * Normaliza landmarks de MediaPipe para el modelo
 * @param {Array} landmarks - Array de 21 landmarks con {x, y, z}
 * @returns {Array|null} Array de 63 números o null si inválido
 */
export const preprocessLandmarks = (landmarks) => {
  if (!landmarks || landmarks.length === 0) {
    return null;
  }

  try {
    // Extraer coordenadas x, y, z de los 21 landmarks
    const coords = [];
    
    // Calcular centro (muñeca = landmark 0)
    const wrist = landmarks[0];
    
    // Normalizar cada landmark respecto a la muñeca
    for (let i = 0; i < landmarks.length; i++) {
      const landmark = landmarks[i];
      
      // Coordenadas relativas a la muñeca
      const x = landmark.x - wrist.x;
      const y = landmark.y - wrist.y;
      const z = landmark.z - wrist.z;
      
      coords.push(x, y, z);
    }

    return coords; // Array de 63 elementos (21 × 3)
  } catch (error) {
    console.error('Error preprocessing landmarks:', error);
    return null;
  }
};

/**
 * Clase para suavizar predicciones (evitar flickering)
 */
export class PredictionSmoother {
  constructor(windowSize = 3) {
    this.windowSize = windowSize;
    this.history = [];
  }

  /**
   * Agrega una predicción al historial
   * @param {Object} prediction - Predicción con {label, confidence}
   */
  addPrediction(prediction) {
    this.history.push(prediction);
    
    if (this.history.length > this.windowSize) {
      this.history.shift();
    }
  }

  /**
   * Obtiene la predicción suavizada
   * @returns {Object|null} Predicción suavizada o null
   */
  getSmoothedPrediction() {
    if (this.history.length === 0) return null;

    // Contar ocurrencias de cada label
    const counts = {};
    this.history.forEach(pred => {
      counts[pred.label] = (counts[pred.label] || 0) + 1;
    });

    // Retornar el más frecuente
    const mostFrequent = Object.keys(counts).reduce((a, b) => 
      counts[a] > counts[b] ? a : b
    );

    // Calcular confianza promedio
    const relevantPreds = this.history.filter(p => p.label === mostFrequent);
    const avgConfidence = relevantPreds.reduce((sum, p) => sum + p.confidence, 0) / relevantPreds.length;

    return {
      label: mostFrequent,
      confidence: avgConfidence,
      count: counts[mostFrequent],
      isSmoothed: true
    };
  }

  /**
   * Limpia el historial
   */
  clear() {
    this.history = [];
  }

  /**
   * Obtiene el tamaño actual del historial
   */
  getHistorySize() {
    return this.history.length;
  }
}