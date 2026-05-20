import { Capacitor } from '@capacitor/core';
import { Clipboard } from '@capacitor/clipboard';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import {
  TargetedShare,
  type TargetedShareChannel,
} from '@/plugins/targetedShare';
import { buildExportFilename } from './formatters';
import type { ExportRange } from './types';

const isNative = Capacitor.isNativePlatform();

export type ShareChannel = TargetedShareChannel;

export type ShareResult = 'shared' | 'downloaded' | 'copied';

export type SharePayload =
  | { kind: 'text'; text: string }
  | {
      kind: 'file';
      blob: Blob;
      range: ExportRange;
      ext: string;
      mimeType: string;
    };

const CHANNEL_LABELS: Record<ShareChannel, string> = {
  wechat: '微信',
  qq: 'QQ',
  wework: '企业微信',
  more: '更多',
};

export function getShareChannelLabel(channel: ShareChannel): string {
  return CHANNEL_LABELS[channel];
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1]! : dataUrl;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function triggerWebDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function writeCacheFile(blob: Blob, filename: string): Promise<string> {
  const base64 = await blobToBase64(blob);
  const path = `export/${filename}`;
  await Filesystem.writeFile({
    path,
    data: base64,
    directory: Directory.Cache,
    recursive: true,
  });
  const { uri } = await Filesystem.getUri({
    directory: Directory.Cache,
    path,
  });
  return uri;
}

export async function copyText(text: string): Promise<void> {
  if (isNative) {
    await Clipboard.write({ string: text });
    return;
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  throw new Error('当前环境不支持复制到剪贴板');
}

async function shareTextSystem(text: string, title?: string): Promise<ShareResult> {
  if (isNative) {
    const canShare = await Share.canShare();
    if (!canShare.value) {
      await copyText(text);
      return 'copied';
    }
    await Share.share({ title, text, dialogTitle: title ?? '分享工时' });
    return 'shared';
  }

  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (err) {
      if ((err as Error).name === 'AbortError') return 'shared';
    }
  }

  await copyText(text);
  return 'copied';
}

async function shareBlobSystem(
  blob: Blob,
  filename: string,
  options?: { title?: string; text?: string; mimeType?: string },
): Promise<ShareResult> {
  if (isNative) {
    const uri = await writeCacheFile(blob, filename);
    const canShare = await Share.canShare();
    if (!canShare.value) {
      throw new Error('当前设备不支持系统分享');
    }
    await Share.share({
      title: options?.title ?? '分享工时',
      text: options?.text,
      url: uri,
      files: [uri],
      dialogTitle: options?.title ?? '分享工时',
    });
    return 'shared';
  }

  if (
    navigator.share &&
    navigator.canShare?.({
      files: [new File([blob], filename, { type: options?.mimeType })],
    })
  ) {
    try {
      const file = new File([blob], filename, { type: options?.mimeType });
      await navigator.share({
        title: options?.title,
        text: options?.text,
        files: [file],
      });
      return 'shared';
    } catch (err) {
      if ((err as Error).name === 'AbortError') return 'shared';
    }
  }

  triggerWebDownload(blob, filename);
  return 'downloaded';
}

async function shareTextTargeted(
  text: string,
  channel: ShareChannel,
  title?: string,
): Promise<ShareResult> {
  if (channel === 'more') {
    return shareTextSystem(text, title);
  }

  if (isNative && Capacitor.isPluginAvailable('TargetedShare')) {
    await TargetedShare.shareText({ text, title, channel });
    return 'shared';
  }

  if (!isNative) {
    await copyText(text);
    return 'copied';
  }

  return shareTextSystem(text, title);
}

async function shareBlobTargeted(
  blob: Blob,
  filename: string,
  channel: ShareChannel,
  options?: { title?: string; mimeType?: string },
): Promise<ShareResult> {
  if (channel === 'more') {
    return shareBlobSystem(blob, filename, options);
  }

  if (isNative && Capacitor.isPluginAvailable('TargetedShare')) {
    const uri = await writeCacheFile(blob, filename);
    await TargetedShare.shareFile({
      uri,
      mimeType: options?.mimeType ?? 'application/octet-stream',
      title: options?.title,
      channel,
    });
    return 'shared';
  }

  if (!isNative) {
    triggerWebDownload(blob, filename);
    return 'downloaded';
  }

  if (navigator.share && navigator.canShare?.({ files: [new File([blob], filename, { type: options?.mimeType })] })) {
    try {
      const file = new File([blob], filename, { type: options?.mimeType });
      await navigator.share({
        title: options?.title,
        files: [file],
      });
      return 'shared';
    } catch (err) {
      if ((err as Error).name === 'AbortError') return 'shared';
    }
  }

  triggerWebDownload(blob, filename);
  return 'downloaded';
}

export async function shareViaChannel(
  channel: ShareChannel,
  payload: SharePayload,
  title = 'FlashLog 工时',
): Promise<ShareResult> {
  if (payload.kind === 'text') {
    return shareTextTargeted(payload.text, channel, title);
  }

  const filename = buildExportFilename(payload.range, payload.ext);
  return shareBlobTargeted(payload.blob, filename, channel, {
    title,
    mimeType: payload.mimeType,
  });
}

export async function shareText(text: string, title?: string): Promise<void> {
  await shareTextSystem(text, title);
}

export async function shareBlob(
  blob: Blob,
  filename: string,
  options?: { title?: string; text?: string; mimeType?: string },
): Promise<ShareResult> {
  return shareBlobSystem(blob, filename, options);
}

export function shareFileFromPayload(
  blob: Blob,
  range: ExportRange,
  ext: string,
  mimeType: string,
  title: string,
): Promise<ShareResult> {
  const filename = buildExportFilename(range, ext);
  return shareBlob(blob, filename, { title, mimeType });
}

/** Web 下载；Native 调起系统分享/保存 */
export async function downloadImageBlob(
  blob: Blob,
  filename: string,
): Promise<ShareResult> {
  return shareBlobSystem(blob, filename, {
    title: 'FlashLog 分析总结',
    mimeType: 'image/png',
  });
}

export function toastForShareResult(
  channel: ShareChannel,
  result: ShareResult,
  format: 'text' | 'file',
): string {
  const label = getShareChannelLabel(channel);

  if (result === 'shared') {
    return channel === 'more' ? '已打开分享' : `已打开${label}`;
  }
  if (result === 'copied') {
    return `已复制，请打开${label}粘贴发送`;
  }
  if (format === 'file') {
    return `已下载，请打开${label}或文件管理器发送`;
  }
  return `已复制，请打开${label}粘贴发送`;
}
