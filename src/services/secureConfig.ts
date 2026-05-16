import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

const LLM_KEY = 'flashlog_llm_api_key';
const ASR_KEY = 'flashlog_asr_api_key';

const isNative = Capacitor.isNativePlatform();

async function secureGet(key: string): Promise<string | null> {
  if (!isNative) {
    const { value } = await Preferences.get({ key });
    return value;
  }
  try {
    const { value } = await SecureStoragePlugin.get({ key });
    return value ?? null;
  } catch {
    return null;
  }
}

async function secureSet(key: string, value: string): Promise<void> {
  if (!isNative) {
    await Preferences.set({ key, value });
    return;
  }
  await SecureStoragePlugin.set({ key, value });
}

async function secureRemove(key: string): Promise<void> {
  if (!isNative) {
    await Preferences.remove({ key });
    return;
  }
  try {
    await SecureStoragePlugin.remove({ key });
  } catch {
    /* key may not exist */
  }
}

export async function getLlmApiKey(): Promise<string> {
  return (await secureGet(LLM_KEY)) ?? '';
}

export async function setLlmApiKey(value: string): Promise<void> {
  if (value) await secureSet(LLM_KEY, value);
  else await secureRemove(LLM_KEY);
}

export async function getAsrApiKey(): Promise<string> {
  return (await secureGet(ASR_KEY)) ?? '';
}

export async function setAsrApiKey(value: string): Promise<void> {
  if (value) await secureSet(ASR_KEY, value);
  else await secureRemove(ASR_KEY);
}

export function maskSecret(value: string, visible = 4): string {
  if (!value) return '';
  if (value.length <= visible) return '••••';
  return '•'.repeat(Math.min(12, value.length - visible)) + value.slice(-visible);
}
