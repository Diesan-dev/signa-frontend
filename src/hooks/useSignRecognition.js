// src/hooks/useSignRecognition.js

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook personalizado para manejar el reconocimiento de señas
 * Maneja tanto detecciones locales como de otros participantes vía Ably
 */
export const useSignRecognition = ({
  sessionId,
  userId,
  ablyChannel = null
}) => {
  const [localSign, setLocalSign] = useState(null);
  const [participantSigns, setParticipantSigns] = useState({});
  const [signHistory, setSignHistory] = useState([]);
  const [stats, setStats] = useState({
    totalDetections: 0,
    uniqueSigns: 0,
    avgConfidence: 0
  });

  /**
   * Callback cuando se detecta una seña localmente
   */
  const handleLocalSignDetected = useCallback((signData) => {
    setLocalSign(signData);

    // Agregar al historial
    setSignHistory(prev => [...prev, signData].slice(-50)); // Últimas 50

    // Actualizar estadísticas
    setStats(prev => {
      const newTotal = prev.totalDetections + 1;
      const newAvg = (prev.avgConfidence * prev.totalDetections + signData.confidence) / newTotal;

      return {
        totalDetections: newTotal,
        uniqueSigns: new Set([...signHistory.map(s => s.sign), signData.sign]).size,
        avgConfidence: newAvg
      };
    });

    // Publicar en Ably si está disponible
    if (ablyChannel) {
      ablyChannel.publish('sign-detected', signData);
    }

    // Limpiar después de 2 segundos
    setTimeout(() => {
      setLocalSign(null);
    }, 2000);
  }, [ablyChannel, signHistory]);

  /**
 * Suscribirse a señas de otros participantes
 */
  useEffect(() => {
    if (!ablyChannel) return;

    const handleRemoteSign = (message) => {
      const signData = message.data;

      // No procesar las propias señas
      if (signData.userId === userId) return;

      // Actualizar señas de participantes
      setParticipantSigns(prev => ({
        ...prev,
        [signData.userId]: signData
      }));

      // Limpiar después de 3 segundos
      setTimeout(() => {
        setParticipantSigns(prev => {
          const updated = { ...prev };
          delete updated[signData.userId];
          return updated;
        });
      }, 3000);
    };

    // ⭐ CAMBIO AQUÍ: 'sign-detected' → 'sign-message'
    ablyChannel.subscribe('sign-message', handleRemoteSign);

    return () => {
      ablyChannel.unsubscribe('sign-message', handleRemoteSign);
    };
  }, [ablyChannel, userId]);
  /**
   * Limpiar historial
   */
  const clearHistory = useCallback(() => {
    setSignHistory([]);
    setStats({
      totalDetections: 0,
      uniqueSigns: 0,
      avgConfidence: 0
    });
  }, []);

  return {
    localSign,
    participantSigns,
    signHistory,
    stats,
    handleLocalSignDetected,
    clearHistory
  };
};