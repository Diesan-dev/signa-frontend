// src/services/signRecognition/ablySignService.js

import { Realtime } from 'ably';

class AblySignService {
  constructor() {
    this.client = null;
    this.channel = null;
    this.isConnected = false;
  }

  /**
   * Inicializa conexión con Ably
   * @param {string} ablyKey - API key de Ably
   * @param {string} sessionId - ID de la sesión
   */
  async connect(ablyKey, sessionId) {
    if (this.isConnected) {
      console.log('⚠️ Already connected to Ably');
      return this.channel;
    }

    try {
      console.log('📡 Connecting to Ably for sign recognition...');

      this.client = new Realtime({
        key: ablyKey,
      });

      // ⭐ USAR EL MISMO CANAL QUE EL CHAT (sin prefijo sign-recognition)
      // Esto evita el error 40160 de permisos
      const channelName = sessionId;
      this.channel = this.client.channels.get(channelName);

      await this.channel.attach();
      this.isConnected = true;

      console.log(`✅ Connected to Ably channel for signs: ${channelName}`);
      
      return this.channel;
    } catch (error) {
      console.error('❌ Ably connection error:', error);
      throw error;
    }
  }

  /**
   * Publica una seña detectada
   * @param {Object} signData - Datos de la seña
   */
  async publishSign(signData) {
    if (!this.isConnected || !this.channel) {
      console.warn('⚠️ Ably not connected, cannot publish sign');
      return;
    }

    try {
      // ⭐ CAMBIAR nombre del evento a 'sign-message' para diferenciarlo del chat
      await this.channel.publish('sign-message', {
        ...signData,
        timestamp: Date.now()
      });

      console.log('📤 Sign published:', signData.sign);
    } catch (error) {
      console.error('Error publishing sign:', error);
    }
  }

  /**
   * Obtiene el canal actual
   */
  getChannel() {
    return this.channel;
  }

  /**
   * Verifica si está conectado
   */
  isChannelConnected() {
    return this.isConnected && this.channel !== null;
  }

  /**
   * Desconectar
   */
  disconnect() {
    if (this.channel) {
      this.channel.detach();
      this.channel = null;
    }

    if (this.client) {
      this.client.close();
      this.client = null;
    }

    this.isConnected = false;
    console.log('🔌 Ably disconnected');
  }
}

// Exportar instancia singleton
export default new AblySignService();