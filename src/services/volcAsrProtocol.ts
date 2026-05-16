/** 火山大模型流式 ASR 二进制协议 · [文档 1354869](https://www.volcengine.com/docs/6561/1354869?lang=zh) */

const PROTOCOL_VERSION = 0b0001;
const HEADER_SIZE_UNITS = 0b0001;

const MESSAGE_TYPE_FULL_CLIENT_REQUEST = 0b0001;
const MESSAGE_TYPE_AUDIO_ONLY_REQUEST = 0b0010;
const MESSAGE_TYPE_FULL_SERVER_RESPONSE = 0b1001;
const MESSAGE_TYPE_ERROR = 0b1111;

const SERIALIZATION_NONE = 0b0000;
const SERIALIZATION_JSON = 0b0001;

const COMPRESSION_GZIP = 0b0001;

export const VOLC_ASR_NOSTREAM_PATH = '/api/v3/sauc/bigmodel_nostream';

function buildHeader(options: {
  messageType: number;
  messageTypeFlags: number;
  serialization: number;
  compression: number;
}): Uint8Array {
  const header = new Uint8Array(4);
  header[0] = (PROTOCOL_VERSION << 4) | HEADER_SIZE_UNITS;
  header[1] = (options.messageType << 4) | options.messageTypeFlags;
  header[2] = (options.serialization << 4) | options.compression;
  header[3] = 0;
  return header;
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function writeUInt32BE(value: number): Uint8Array {
  const buf = new Uint8Array(4);
  new DataView(buf.buffer).setUint32(0, value, false);
  return buf;
}

async function gzipBytes(input: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream === 'undefined') {
    throw new Error('当前环境不支持 gzip 压缩');
  }
  const stream = new Blob([input]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzipBytes(input: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('当前环境不支持 gzip 解压');
  }
  const stream = new Blob([input]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** 文档支持：pcm / wav / ogg / mp3（不支持 webm） */
export function resolveVolcAudioConfig(mimeType = ''): {
  format: string;
  codec: 'raw' | 'opus';
} {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes('pcm')) return { format: 'pcm', codec: 'raw' };
  if (normalized.includes('wav')) return { format: 'wav', codec: 'raw' };
  if (normalized.includes('ogg')) return { format: 'ogg', codec: 'opus' };
  if (normalized.includes('mp3') || normalized.includes('mpeg')) {
    return { format: 'mp3', codec: 'raw' };
  }
  return { format: 'pcm', codec: 'raw' };
}

export async function buildFullClientRequestFrame(
  payloadObject: Record<string, unknown>,
): Promise<ArrayBuffer> {
  const payloadRaw = new TextEncoder().encode(JSON.stringify(payloadObject));
  const payload = await gzipBytes(payloadRaw);
  const frame = concatBytes(
    buildHeader({
      messageType: MESSAGE_TYPE_FULL_CLIENT_REQUEST,
      messageTypeFlags: 0b0000,
      serialization: SERIALIZATION_JSON,
      compression: COMPRESSION_GZIP,
    }),
    writeUInt32BE(payload.length),
    payload,
  );
  return frame.buffer.slice(frame.byteOffset, frame.byteOffset + frame.byteLength);
}

export async function buildAudioRequestFrame(
  audio: Uint8Array,
  isFinal = false,
): Promise<ArrayBuffer> {
  const payload = await gzipBytes(audio);
  const frame = concatBytes(
    buildHeader({
      messageType: MESSAGE_TYPE_AUDIO_ONLY_REQUEST,
      messageTypeFlags: isFinal ? 0b0010 : 0b0000,
      serialization: SERIALIZATION_NONE,
      compression: COMPRESSION_GZIP,
    }),
    writeUInt32BE(payload.length),
    payload,
  );
  return frame.buffer.slice(frame.byteOffset, frame.byteOffset + frame.byteLength);
}

export type VolcServerPacket =
  | { type: 'response'; sequence: number; data: unknown; isFinal: boolean }
  | { type: 'error'; code: number; message: string }
  | { type: 'unknown' };

export async function parseVolcServerPacket(data: ArrayBuffer): Promise<VolcServerPacket> {
  const view = new DataView(data);
  if (data.byteLength < 4) return { type: 'unknown' };

  const messageType = (view.getUint8(1) >> 4) & 0x0f;
  const messageTypeFlags = view.getUint8(1) & 0x0f;
  const serialization = (view.getUint8(2) >> 4) & 0x0f;
  const compression = view.getUint8(2) & 0x0f;

  if (messageType === MESSAGE_TYPE_FULL_SERVER_RESPONSE) {
    if (data.byteLength < 12) return { type: 'unknown' };

    const sequence = view.getInt32(4, false);
    const payloadSize = view.getUint32(8, false);
    let payload = new Uint8Array(data, 12, payloadSize);

    if (compression === COMPRESSION_GZIP && payload.length > 0) {
      payload = await gunzipBytes(payload);
    }

    let decoded: unknown = new TextDecoder().decode(payload);
    if (serialization === SERIALIZATION_JSON && payload.length > 0) {
      try {
        decoded = JSON.parse(decoded as string);
      } catch {
        /* keep string */
      }
    }

    return {
      type: 'response',
      sequence,
      data: decoded,
      isFinal: messageTypeFlags === 0b0010 || messageTypeFlags === 0b0011,
    };
  }

  if (messageType === MESSAGE_TYPE_ERROR) {
    if (data.byteLength < 12) {
      return { type: 'error', code: 0, message: 'Unknown server error' };
    }
    const code = view.getUint32(4, false);
    const size = view.getUint32(8, false);
    const message = new TextDecoder().decode(new Uint8Array(data, 12, size));
    return { type: 'error', code, message };
  }

  return { type: 'unknown' };
}

export function extractVolcTranscript(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';

  const obj = payload as Record<string, unknown>;
  const result = obj.result as Record<string, unknown> | unknown[] | undefined;

  if (result && typeof result === 'object' && !Array.isArray(result)) {
    if (typeof (result as Record<string, unknown>).text === 'string') {
      return ((result as Record<string, unknown>).text as string).trim();
    }
  }

  if (Array.isArray(result)) {
    return result
      .map((item) => (item as Record<string, unknown>)?.text)
      .filter((t): t is string => typeof t === 'string')
      .join('')
      .trim();
  }

  if (typeof obj.text === 'string') return obj.text.trim();
  return '';
}
