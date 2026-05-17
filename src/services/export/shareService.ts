import { Capacitor } from '@capacitor/core';
import { Clipboard } from '@capacitor/clipboard';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { buildExportFilename } from './formatters';
import type { ExportRange } from './types';

const isNative = Capacitor.isNativePlatform();

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

export async function shareText(text: string, title?: string): Promise<void> {
  if (isNative) {
    const canShare = await Share.canShare();
    if (!canShare.value) {
      await copyText(text);
      return;
    }
    await Share.share({ title, text, dialogTitle: title ?? '分享工时' });
    return;
  }

  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }
  }

  await copyText(text);
}

export async function shareBlob(
  blob: Blob,
  filename: string,
  options?: { title?: string; text?: string; mimeType?: string },
): Promise<'shared' | 'downloaded' | 'copied'> {
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

  if (navigator.share && navigator.canShare?.({ files: [new File([blob], filename, { type: options?.mimeType })] })) {
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

export function shareFileFromPayload(
  blob: Blob,
  range: ExportRange,
  ext: string,
  mimeType: string,
  title: string,
): Promise<'shared' | 'downloaded' | 'copied'> {
  const filename = buildExportFilename(range, ext);
  return shareBlob(blob, filename, { title, mimeType });
}
