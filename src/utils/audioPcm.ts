/** 火山 ASR 要求 pcm_s16le · 16kHz · mono · [文档 1354869](https://www.volcengine.com/docs/6561/1354869?lang=zh) */

export const ASR_TARGET_SAMPLE_RATE = 16_000;

function float32ToPcm16LE(samples: Float32Array): Uint8Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    out[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return new Uint8Array(out.buffer);
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  const { length, numberOfChannels } = buffer;
  const mono = new Float32Array(length);
  for (let c = 0; c < numberOfChannels; c++) {
    const channel = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) mono[i] += channel[i];
  }
  const scale = 1 / numberOfChannels;
  for (let i = 0; i < length; i++) mono[i] *= scale;
  return mono;
}

/**
 * 将浏览器录音（webm/opus 等）解码并重采样为 16kHz 单声道 PCM（pcm_s16le）。
 */
export async function encodeBlobAsPcm16kMono(blob: Blob): Promise<ArrayBuffer> {
  if (blob.size === 0) {
    throw new Error('录音为空');
  }

  const encoded = await blob.arrayBuffer();
  const decodeCtx = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(encoded.slice(0));
  } finally {
    await decodeCtx.close();
  }

  const durationSec = decoded.duration;
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    throw new Error('无法解析录音');
  }

  const frameCount = Math.max(
    1,
    Math.ceil(durationSec * ASR_TARGET_SAMPLE_RATE),
  );
  const offline = new OfflineAudioContext(
    1,
    frameCount,
    ASR_TARGET_SAMPLE_RATE,
  );

  const sourceBuffer = offline.createBuffer(
    1,
    decoded.length,
    decoded.sampleRate,
  );
  sourceBuffer.copyToChannel(mixToMono(decoded), 0);

  const source = offline.createBufferSource();
  source.buffer = sourceBuffer;
  source.connect(offline.destination);
  source.start(0);

  const rendered = await offline.startRendering();
  const pcm = float32ToPcm16LE(rendered.getChannelData(0));
  return pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength);
}

/** 是否需在发送前转为 PCM（火山不支持 webm；浏览器录音多为 webm） */
export function needsPcmConversion(mimeType: string): boolean {
  const t = mimeType.toLowerCase();
  if (t.includes('pcm')) return false;
  if (t.includes('mp3') || t.includes('mpeg')) return false;
  if (t.includes('ogg')) return false;
  return true;
}
