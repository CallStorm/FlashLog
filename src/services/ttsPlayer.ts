let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;

function cleanupAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

export function stopTts(): void {
  cleanupAudio();
}

export function playBlob(blob: Blob, signal?: AbortSignal): Promise<void> {
  stopTts();

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const url = URL.createObjectURL(blob);
    currentObjectUrl = url;
    const audio = new Audio(url);
    currentAudio = audio;

    const onAbort = () => {
      cleanupAudio();
      reject(new DOMException('Aborted', 'AbortError'));
    };

    const onEnded = () => {
      signal?.removeEventListener('abort', onAbort);
      cleanupAudio();
      resolve();
    };

    const onError = () => {
      signal?.removeEventListener('abort', onAbort);
      cleanupAudio();
      reject(new Error('音频播放失败'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });
    audio.addEventListener('ended', onEnded, { once: true });
    audio.addEventListener('error', onError, { once: true });

    void audio.play().catch((err) => {
      signal?.removeEventListener('abort', onAbort);
      cleanupAudio();
      reject(err);
    });
  });
}
