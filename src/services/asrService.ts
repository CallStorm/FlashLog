import type { AsrSettings } from '@/types/settings';
import { AsrServiceError } from '@/services/asrErrors';
import { transcribeViaWebSocket } from '@/services/asrWs';
import {
  encodeBlobAsPcm16kMono,
  needsPcmConversion,
} from '@/utils/audioPcm';
import {
  createAudioLevelMeter,
  type AudioLevelMeter,
} from '@/utils/audioLevel';
import {
  ensureMicrophonePermission,
  micPermissionMessage,
} from '@/utils/microphonePermission';

export { AsrServiceError } from '@/services/asrErrors';

const MAX_RECORD_MS = 3 * 60 * 1000;

export class RecordingSession {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private levelMeter: AudioLevelMeter | null = null;
  private startedAt = 0;
  private stopResolve: ((blob: Blob) => void) | null = null;
  private stopReject: ((err: Error) => void) | null = null;
  private cancelled = false;

  async start(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new AsrServiceError('当前环境不支持录音', 'UNSUPPORTED');
    }

    const micPerm = await ensureMicrophonePermission();
    if (!micPerm.ok) {
      throw new AsrServiceError(micPermissionMessage(micPerm), 'PERMISSION');
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        const retry = await ensureMicrophonePermission();
        if (!retry.ok) {
          throw new AsrServiceError(micPermissionMessage(retry), 'PERMISSION');
        }
        try {
          this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
          throw new AsrServiceError(micPermissionMessage(retry), 'PERMISSION');
        }
      } else if (name === 'NotFoundError') {
        throw new AsrServiceError('未检测到麦克风设备', 'UNSUPPORTED');
      } else {
        throw new AsrServiceError(
          '无法访问麦克风，请检查系统权限后重试',
          'PERMISSION',
        );
      }
    }

    if (!this.stream) {
      throw new AsrServiceError('无法访问麦克风', 'PERMISSION');
    }

    this.levelMeter = await createAudioLevelMeter(this.stream);

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

    this.mediaRecorder = mimeType
      ? new MediaRecorder(this.stream, { mimeType })
      : new MediaRecorder(this.stream);
    this.chunks = [];
    this.cancelled = false;
    this.startedAt = Date.now();

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.mediaRecorder.onerror = () => {
      this.stopReject?.(new AsrServiceError('录音失败', 'RECORD'));
    };

    this.mediaRecorder.onstop = () => {
      const wasCancelled = this.cancelled;
      const blob = new Blob(this.chunks, {
        type: this.mediaRecorder?.mimeType ?? 'audio/webm',
      });
      this.cleanupStream();
      if (!wasCancelled) {
        this.stopResolve?.(blob);
      }
    };

    this.mediaRecorder.start(200);
  }

  stop(): Promise<Blob> {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      return Promise.reject(new AsrServiceError('未在录音', 'NOT_RECORDING'));
    }

    const elapsed = Date.now() - this.startedAt;
    if (elapsed > MAX_RECORD_MS) {
      this.mediaRecorder.stop();
      return Promise.reject(
        new AsrServiceError('录音超过 3 分钟上限', 'TOO_LONG'),
      );
    }

    return new Promise((resolve, reject) => {
      this.stopResolve = resolve;
      this.stopReject = reject;
      this.mediaRecorder?.stop();
    });
  }

  getElapsedMs(): number {
    return this.startedAt ? Date.now() - this.startedAt : 0;
  }

  isNearLimit(): boolean {
    return this.getElapsedMs() >= MAX_RECORD_MS - 10_000;
  }

  getAudioLevel(): number {
    return this.levelMeter?.getLevel() ?? 0;
  }

  getAudioBandLevels(count: number): number[] {
    return this.levelMeter?.getBandLevels(count) ?? [];
  }

  cancel(): void {
    this.cancelled = true;
    this.stopResolve = null;
    this.stopReject = null;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    } else {
      this.cleanupStream();
    }
  }

  private cleanupStream(): void {
    this.levelMeter?.dispose();
    this.levelMeter = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}

/**
 * 火山大模型语音识别 · [文档 1354869](https://www.volcengine.com/docs/6561/1354869?lang=zh)
 * WebSocket bigmodel_nostream（新版控制台 X-Api-Key 鉴权）
 */
export async function transcribeAudio(
  settings: AsrSettings,
  blob: Blob,
): Promise<string> {
  if (!navigator.onLine) {
    throw new AsrServiceError('无网络连接', 'OFFLINE');
  }

  try {
    let buffer: ArrayBuffer;
    let mimeType = blob.type;

    if (needsPcmConversion(blob.type)) {
      buffer = await encodeBlobAsPcm16kMono(blob);
      mimeType = 'audio/pcm';
    } else {
      buffer = await blob.arrayBuffer();
    }

    return transcribeViaWebSocket(settings, buffer, mimeType);
  } catch (err) {
    if (err instanceof AsrServiceError) throw err;
    const message =
      err instanceof Error ? err.message : '音频处理失败';
    throw new AsrServiceError(message, 'AUDIO');
  }
}

export { MAX_RECORD_MS };
