// src/components/signRecognition/SignRecognitionEngine.jsx

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  mediaPipeService,
  modelService,
  preprocessLandmarks,
  PredictionSmoother
} from '../../services/signRecognition';
import { SIGN_RECOGNITION_CONFIG } from '../../utils/signRecognition/constants';

const SignRecognitionEngine = ({ 
  videoTrack, // Track de video de Agora
  sessionId,
  userId,
  onSignDetected, // Callback cuando se detecta una seña
  isEnabled = true 
}) => {
  const [currentSign, setCurrentSign] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    fps: 0,
    detections: 0,
    avgConfidence: 0
  });
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const processingRef = useRef(false);
  const smootherRef = useRef(new PredictionSmoother(3));
  const lastPublishRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(Date.now());

  /**
   * Inicialización de servicios de IA
   */
  useEffect(() => {
    const init = async () => {
      if (!isEnabled) return;

      try {
        console.log('🚀 Initializing Sign Recognition Engine...');
        
        // Cargar modelo TensorFlow
        await modelService.loadModel();
        
        // Inicializar MediaPipe
        await mediaPipeService.initialize(handleHandsResults);
        
        setIsInitialized(true);
        console.log('✅ Sign Recognition Engine initialized');
      } catch (err) {
        console.error('❌ Initialization error:', err);
        setError('Error al inicializar reconocimiento de señas');
      }
    };

    init();

    return () => {
      console.log('🧹 Cleaning up Sign Recognition Engine...');
      mediaPipeService.cleanup();
      modelService.cleanup();
    };
  }, [isEnabled]);

  /**
   * Procesar frames del video de Agora
   */
  useEffect(() => {
    if (!isInitialized || !videoTrack || !isEnabled) return;

    let intervalId;
    
    const processFrames = async () => {
      if (processingRef.current) return;
      
      try {
        processingRef.current = true;

        // Obtener el MediaStream del track de Agora
        const mediaStreamTrack = videoTrack.getMediaStreamTrack();
        const mediaStream = new MediaStream([mediaStreamTrack]);
        
        // Crear elemento video si no existe
        if (!videoRef.current) {
          videoRef.current = document.createElement('video');
          videoRef.current.srcObject = mediaStream;
          videoRef.current.autoplay = true;
          videoRef.current.playsInline = true;
          await videoRef.current.play();
        }

        // Esperar a que el video esté listo
        if (videoRef.current.readyState >= 2) {
          await mediaPipeService.processFrame(videoRef.current);
          
          // Actualizar FPS
          frameCountRef.current++;
          const now = Date.now();
          if (now - lastFpsUpdateRef.current >= 1000) {
            setStats(prev => ({
              ...prev,
              fps: frameCountRef.current
            }));
            frameCountRef.current = 0;
            lastFpsUpdateRef.current = now;
          }
        }
        
      } catch (err) {
        console.error('Frame processing error:', err);
      } finally {
        processingRef.current = false;
      }
    };

    // Procesar frames según configuración
    intervalId = setInterval(
      processFrames, 
      SIGN_RECOGNITION_CONFIG.processing.frameInterval
    );

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
        videoRef.current = null;
      }
    };
  }, [isInitialized, videoTrack, isEnabled]);

  /**
   * Callback cuando MediaPipe detecta manos
   */
  const handleHandsResults = useCallback(async (results) => {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      return;
    }

    try {
      // Tomar primera mano detectada
      const landmarks = results.multiHandLandmarks[0];
      
      // Preprocesar landmarks
      const features = preprocessLandmarks(landmarks);
      
      if (!features) return;

      // Predecir seña
      const prediction = await modelService.predict(features);
      
      if (!prediction) return;

      // Aplicar suavizado
      smootherRef.current.addPrediction(prediction);
      const smoothed = smootherRef.current.getSmoothedPrediction();

      if (!smoothed) return;

      // Verificar confianza mínima
      if (smoothed.confidence >= SIGN_RECOGNITION_CONFIG.model.minConfidence) {
        setCurrentSign(smoothed);

        // Actualizar estadísticas
        setStats(prev => ({
          ...prev,
          detections: prev.detections + 1,
          avgConfidence: (prev.avgConfidence * prev.detections + smoothed.confidence) / (prev.detections + 1)
        }));

        // Publicar detección (throttled)
        const now = Date.now();
        if (now - lastPublishRef.current >= SIGN_RECOGNITION_CONFIG.ably.publishThrottle) {
          lastPublishRef.current = now;
          
          if (onSignDetected) {
            onSignDetected({
              userId,
              sessionId,
              sign: smoothed.label,
              confidence: smoothed.confidence,
              timestamp: now,
              isDummy: prediction.isDummy || false
            });
          }
        }
      }

      // Dibujar skeleton si está habilitado
      if (SIGN_RECOGNITION_CONFIG.ui.showSkeleton && canvasRef.current) {
        drawHandSkeleton(results, canvasRef.current);
      }

    } catch (err) {
      console.error('Error handling hands results:', err);
    }
  }, [userId, sessionId, onSignDetected]);

  /**
   * Dibuja el esqueleto de la mano en canvas
   */
  const drawHandSkeleton = (results, canvas) => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        // Dibujar puntos
        ctx.fillStyle = '#00FF88';
        for (const landmark of landmarks) {
          ctx.beginPath();
          ctx.arc(
            landmark.x * canvas.width,
            landmark.y * canvas.height,
            5, 0, 2 * Math.PI
          );
          ctx.fill();
        }

        // Dibujar conexiones
        ctx.strokeStyle = '#00FF88';
        ctx.lineWidth = 2;
        
        const connections = [
          [0, 1], [1, 2], [2, 3], [3, 4],
          [0, 5], [5, 6], [6, 7], [7, 8],
          [0, 9], [9, 10], [10, 11], [11, 12],
          [0, 13], [13, 14], [14, 15], [15, 16],
          [0, 17], [17, 18], [18, 19], [19, 20],
        ];

        for (const [start, end] of connections) {
          ctx.beginPath();
          ctx.moveTo(
            landmarks[start].x * canvas.width,
            landmarks[start].y * canvas.height
          );
          ctx.lineTo(
            landmarks[end].x * canvas.width,
            landmarks[end].y * canvas.height
          );
          ctx.stroke();
        }
      }
    }
  };

  if (!isEnabled) return null;

  if (error) {
    return (
      <div className="sign-recognition-error">
        ⚠️ {error}
      </div>
    );
  }

  return (
    <div className="sign-recognition-overlay">
      {/* Canvas para skeleton */}
      <canvas 
        ref={canvasRef}
        className="hand-skeleton-canvas"
        width={320}
        height={240}
        style={{ 
          display: SIGN_RECOGNITION_CONFIG.ui.showSkeleton ? 'block' : 'none',
          position: 'absolute',
          top: 10,
          left: 10,
          pointerEvents: 'none',
          border: '2px solid rgba(0, 255, 136, 0.3)',
          borderRadius: '8px',
          zIndex: 100
        }}
      />

      {/* Display de seña detectada */}
      {currentSign && (
        <div style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'rgba(0, 0, 0, 0.85)',
          borderRadius: '12px',
          padding: '16px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          zIndex: 100
        }}>
          <div style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#00ff88',
            textShadow: '0 0 10px rgba(0, 255, 136, 0.5)'
          }}>
            {currentSign.label}
          </div>
          {SIGN_RECOGNITION_CONFIG.ui.showConfidence && (
            <div style={{
              fontSize: '14px',
              color: '#ffffff',
              opacity: 0.8
            }}>
              {(currentSign.confidence * 100).toFixed(0)}%
              {currentSign.isDummy && ' (Test)'}
            </div>
          )}
        </div>
      )}

      {/* Indicador de estado */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        background: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '20px',
        padding: '8px 16px',
        fontSize: '12px',
        zIndex: 100
      }}>
        {isInitialized ? (
          <span style={{ color: '#00ff88' }}>
            🟢 Reconocimiento activo | {stats.fps} FPS | {stats.detections} detecciones
          </span>
        ) : (
          <span style={{ color: '#ffaa00' }}>
            ⏳ Inicializando...
          </span>
        )}
      </div>
    </div>
  );
};

export default SignRecognitionEngine;