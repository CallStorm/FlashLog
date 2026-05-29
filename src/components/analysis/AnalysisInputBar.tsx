import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Keyboard, Loader2, Mic, Send } from 'lucide-react';
import { VoiceRecordingOverlay } from '@/components/VoiceRecordingOverlay';
import {
  AsrServiceError,
  MAX_RECORD_MS,
  RecordingSession,
  transcribeAudio,
} from '@/services/asrService';
import type { AppSettings } from '@/types/settings';

const CANCEL_SLIDE_PX = 72;

type InputMode = 'voice' | 'text';

interface AnalysisInputBarProps {
  disabled?: boolean;
  asrConfigured: boolean;
  asrSettings: AppSettings['asr'];
  onSend: (text: string) => void;
  onToast: (message: string, variant?: 'info' | 'error' | 'success') => void;
}

export function AnalysisInputBar({
  disabled,
  asrConfigured,
  asrSettings,
  onSend,
  onToast,
}: AnalysisInputBarProps) {
  const [inputMode, setInputMode] = useState<InputMode>('voice');
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [cancelIntent, setCancelIntent] = useState(false);

  const recordingRef = useRef<RecordingSession | null>(null);
  const micHeldRef = useRef(false);
  const pointerStartYRef = useRef(0);

  const busy = disabled || recording || transcribing;

  const handleMicDown = async () => {
    if (!asrConfigured) {
      onToast('请先在设置中配置 ASR', 'error');
      return;
    }
    if (busy) return;

    try {
      const session = new RecordingSession();
      recordingRef.current = session;
      await session.start();
      if (!micHeldRef.current) {
        session.cancel();
        recordingRef.current = null;
        return;
      }
      setRecording(true);
    } catch (err) {
      recordingRef.current = null;
      onToast(
        err instanceof AsrServiceError ? err.message : '无法开始录音',
        'error',
      );
    }
  };

  const handleMicCancel = () => {
    const session = recordingRef.current;
    if (!session) return;
    session.cancel();
    recordingRef.current = null;
    setRecording(false);
    onToast('已取消', 'info');
  };

  const handleMicUp = async () => {
    const session = recordingRef.current;
    if (!session) return;

    setRecording(false);
    setTranscribing(true);
    try {
      const blob = await session.stop();
      recordingRef.current = null;
      const transcribed = await transcribeAudio(asrSettings, blob);
      if (transcribed.trim()) {
        onSend(transcribed.trim());
      }
    } catch (err) {
      recordingRef.current = null;
      onToast(
        err instanceof AsrServiceError ? err.message : '转写失败',
        'error',
      );
    } finally {
      setTranscribing(false);
    }
  };

  const handleMicPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (transcribing || disabled) return;
    e.preventDefault();
    micHeldRef.current = true;
    setCancelIntent(false);
    pointerStartYRef.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
    void handleMicDown();
  };

  const handleMicPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!recordingRef.current) return;
    setCancelIntent(pointerStartYRef.current - e.clientY > CANCEL_SLIDE_PX);
  };

  const endMicGesture = (e: ReactPointerEvent<HTMLButtonElement>) => {
    micHeldRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const shouldCancel =
      pointerStartYRef.current - e.clientY > CANCEL_SLIDE_PX;
    setCancelIntent(false);
    if (!recordingRef.current) return;
    if (shouldCancel) handleMicCancel();
    else void handleMicUp();
  };

  const handleSendText = () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setText('');
    onSend(trimmed);
  };

  return (
    <div className="analysis-input-bar">
      {recording && (
        <VoiceRecordingOverlay
          active
          cancelIntent={cancelIntent}
          getBandLevels={(n) => recordingRef.current?.getAudioBandLevels(n) ?? []}
        />
      )}

      {inputMode === 'voice' ? (
        <div className="analysis-input-voice-row">
          <button
            type="button"
            className="analysis-mode-toggle"
            disabled={busy}
            aria-label="切换到键盘输入"
            onClick={() => setInputMode('text')}
          >
            <Keyboard className="h-5 w-5" />
          </button>
          <button
            type="button"
            className={`btn-ghost-action btn-hold-talk analysis-hold-talk flex-1 touch-none ${
              recording ? 'btn-ghost-recording' : ''
            }`}
            disabled={busy && !recording}
            onPointerDown={handleMicPointerDown}
            onPointerMove={handleMicPointerMove}
            onPointerUp={endMicGesture}
            onPointerCancel={endMicGesture}
          >
            {recording || transcribing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
            {recording ? '录音中…' : transcribing ? '转写中…' : '按住 说话'}
          </button>
        </div>
      ) : (
        <div className="analysis-input-text-row">
          <button
            type="button"
            className="analysis-mode-toggle"
            disabled={busy}
            aria-label="切换到语音输入"
            onClick={() => setInputMode('voice')}
          >
            <Mic className="h-5 w-5" />
          </button>
          <textarea
            className="analysis-input"
            rows={1}
            placeholder="输入问题，需包含时间范围…"
            value={text}
            disabled={busy}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendText();
              }
            }}
          />
          <button
            type="button"
            className="btn-primary analysis-send"
            disabled={busy || !text.trim()}
            onClick={handleSendText}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      )}

      {recording &&
        (recordingRef.current?.isNearLimit() ||
          (recordingRef.current?.getElapsedMs() ?? 0) > MAX_RECORD_MS - 30_000) && (
          <p className="analysis-recording-hint">即将达到 3 分钟录音上限</p>
        )}
    </div>
  );
}
