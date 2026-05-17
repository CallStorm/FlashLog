import { useEffect, useRef, useState } from 'react';

const BAR_COUNT = 24;
const MIN_BAR_PX = 4;
const MAX_BAR_PX = 28;

type Props = {
  active: boolean;
  cancelIntent: boolean;
  getBandLevels: (n: number) => number[];
};

export function VoiceRecordingOverlay({
  active,
  cancelIntent,
  getBandLevels,
}: Props) {
  const [bands, setBands] = useState<number[]>(() =>
    Array.from({ length: BAR_COUNT }, () => 0),
  );
  const rafRef = useRef(0);
  const getBandLevelsRef = useRef(getBandLevels);
  getBandLevelsRef.current = getBandLevels;

  useEffect(() => {
    if (!active) {
      setBands(Array.from({ length: BAR_COUNT }, () => 0));
      return;
    }

    const loop = () => {
      const next = getBandLevelsRef.current(BAR_COUNT);
      if (next.length === BAR_COUNT) {
        setBands(next);
      } else if (next.length > 0) {
        setBands(
          Array.from({ length: BAR_COUNT }, (_, i) => next[i % next.length] ?? 0),
        );
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  if (!active) return null;

  return (
    <div className="recording-hold-overlay" aria-hidden>
      <div className="recording-hold-panel">
        <p
          className={`recording-hold-hint ${
            cancelIntent ? 'recording-hold-hint--cancel' : ''
          }`}
        >
          {cancelIntent ? '松开 取消' : '松手发送，上滑取消'}
        </p>
        <div className="recording-waveform">
          {bands.map((level, i) => (
            <span
              key={i}
              className="recording-wave-bar"
              style={{
                height: `${MIN_BAR_PX + level * (MAX_BAR_PX - MIN_BAR_PX)}px`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
