

// Configuración global del sistema de reconocimiento de señas
export const SIGN_RECOGNITION_CONFIG = {
  // MediaPipe
  mediaPipe: {
    maxNumHands: 2,
    modelComplexity: 1, // 0=lite, 1=full
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7,
  },

  // Procesamiento
  processing: {
    targetFPS: parseInt(import.meta.env.VITE_TARGET_FPS) || 10,
    frameInterval: 100, // ms entre frames
    enableSmoothing: true,
    smoothingWindow: 3,
  },

  // Modelo
  model: {
    path: import.meta.env.VITE_SIGN_MODEL_PATH || '/models/sign-model/model.json',
    minConfidence: parseFloat(import.meta.env.VITE_MIN_CONFIDENCE) || 0.75,
    numClasses: 26, // A-Z para empezar
    useDummyModel: true, // Cambiar a false cuando tengas modelo real
  },

  // UI
  ui: {
    showSkeleton: true,
    showConfidence: true,
    displayDuration: 2000, // ms
  },

  // Ably
  ably: {
    channelPrefix: 'sign-recognition',
    publishThrottle: 500, // ms
  },

  // Feature flag
  enabled: import.meta.env.VITE_SIGN_RECOGNITION_ENABLED === 'true',
};

// Labels de señas ASL (alfabeto)
export const SIGN_LABELS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
  'U', 'V', 'W', 'X', 'Y', 'Z'
];

// Conexiones de la mano para dibujar skeleton
export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],         // Pulgar
  [0, 5], [5, 6], [6, 7], [7, 8],         // Índice
  [0, 9], [9, 10], [10, 11], [11, 12],    // Medio
  [0, 13], [13, 14], [14, 15], [15, 16],  // Anular
  [0, 17], [17, 18], [18, 19], [19, 20],  // Meñique
];