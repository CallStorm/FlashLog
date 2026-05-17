import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface HeaderWebSocketConnectResult {
  socketId: string;
}

export interface HeaderWebSocketMessageEvent {
  socketId: string;
  data: string;
}

export interface HeaderWebSocketCloseEvent {
  socketId: string;
  code: number;
  reason: string;
}

export interface HeaderWebSocketErrorEvent {
  socketId: string;
  message: string;
  code?: number;
}

export interface HeaderWebSocketPlugin {
  connect(options: {
    url: string;
    headers: Record<string, string>;
  }): Promise<HeaderWebSocketConnectResult>;
  send(options: { socketId: string; data: string }): Promise<void>;
  close(options: { socketId: string }): Promise<void>;
  addListener(
    eventName: 'message',
    listenerFunc: (event: HeaderWebSocketMessageEvent) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'close',
    listenerFunc: (event: HeaderWebSocketCloseEvent) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'error',
    listenerFunc: (event: HeaderWebSocketErrorEvent) => void,
  ): Promise<PluginListenerHandle>;
}

export const HeaderWebSocket = registerPlugin<HeaderWebSocketPlugin>(
  'HeaderWebSocket',
);

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
