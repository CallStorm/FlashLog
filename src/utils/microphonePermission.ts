import { Capacitor } from '@capacitor/core';

export type MicPermissionResult =
  | { ok: true }
  | { ok: false; reason: 'denied' | 'unavailable' | 'blocked' };

interface AndroidPermissionsPlugin {
  RECORD_AUDIO: string;
  checkPermission: (
    permission: string,
    success: (status: { hasPermission: boolean }) => void,
    error?: () => void,
  ) => void;
  requestPermission: (
    permission: string,
    success: (status: { hasPermission: boolean }) => void,
    error?: () => void,
  ) => void;
}

function getAndroidPermissions(): AndroidPermissionsPlugin | null {
  const plugins = (
    window as unknown as {
      cordova?: { plugins?: { permissions?: AndroidPermissionsPlugin } };
    }
  ).cordova?.plugins;
  return plugins?.permissions ?? null;
}

function waitForPermissionsPlugin(timeoutMs = 3000): Promise<AndroidPermissionsPlugin | null> {
  return new Promise((resolve) => {
    const existing = getAndroidPermissions();
    if (existing) {
      resolve(existing);
      return;
    }

    const deadline = Date.now() + timeoutMs;

    const tryResolve = () => {
      const p = getAndroidPermissions();
      if (p) {
        resolve(p);
        return true;
      }
      return false;
    };

    document.addEventListener(
      'deviceready',
      () => {
        if (!tryResolve()) resolve(null);
      },
      { once: true },
    );

    const tick = () => {
      if (tryResolve()) return;
      if (Date.now() >= deadline) {
        resolve(null);
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function checkPermission(
  permissions: AndroidPermissionsPlugin,
  name: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    permissions.checkPermission(
      name,
      (status) => resolve(!!status.hasPermission),
      () => resolve(false),
    );
  });
}

function requestPermission(
  permissions: AndroidPermissionsPlugin,
  name: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    permissions.requestPermission(
      name,
      (status) => resolve(!!status.hasPermission),
      () => resolve(false),
    );
  });
}

/**
 * Android 须在 Activity 层先授予 RECORD_AUDIO，WebView 的 getUserMedia 才会成功。
 * 仅在系统设置里打开、但应用从未弹过授权框时（小米常见），getUserMedia 仍会失败。
 */
export async function ensureMicrophonePermission(): Promise<MicPermissionResult> {
  if (!Capacitor.isNativePlatform()) {
    return { ok: true };
  }

  if (Capacitor.getPlatform() !== 'android') {
    return { ok: true };
  }

  const permissions = await waitForPermissionsPlugin();
  if (!permissions) {
    return { ok: false, reason: 'unavailable' };
  }

  const recordAudio = permissions.RECORD_AUDIO;

  if (await checkPermission(permissions, recordAudio)) {
    return { ok: true };
  }

  if (await requestPermission(permissions, recordAudio)) {
    return { ok: true };
  }

  if (await checkPermission(permissions, recordAudio)) {
    return { ok: true };
  }

  return { ok: false, reason: 'denied' };
}

export function micPermissionMessage(result: MicPermissionResult): string {
  if (result.ok) return '';

  const isXiaomi =
    Capacitor.getPlatform() === 'android' &&
    /xiaomi|redmi|miui|XiaoMi/i.test(navigator.userAgent);

  if (result.reason === 'denied' || result.reason === 'blocked') {
    if (isXiaomi) {
      return (
        '麦克风未授权。请：① 设置 → 应用设置 → 应用管理 → FlashLog → 权限管理 → 录音，选「仅在使用中允许」；' +
        '② 完全划掉 FlashLog 后台后重新打开；③ 回到本页长按麦克风，在弹窗点「允许」。'
      );
    }
    return (
      '麦克风未授权。请完全退出 App 后重新打开，长按麦克风并在弹窗中选择「允许」；' +
      '也可在系统设置 → 应用 → FlashLog → 权限中开启麦克风。'
    );
  }

  return '当前环境无法申请麦克风权限，请更新 App 后重试。';
}
