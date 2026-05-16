import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ToastProps {
  message: string;
  variant?: 'info' | 'error' | 'success';
  onClose: () => void;
  durationMs?: number;
}

export function Toast({
  message,
  variant = 'info',
  onClose,
  durationMs = 3200,
}: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, durationMs);
    return () => clearTimeout(t);
  }, [durationMs, onClose, message]);

  const colors =
    variant === 'error'
      ? 'border-red-500/40 bg-red-950/90 text-red-100'
      : variant === 'success'
        ? 'border-emerald-500/40 bg-emerald-950/90 text-emerald-100'
        : 'border-amber-500/40 bg-stone-900/95 text-stone-100';

  return (
    <div
      className={`fixed left-4 right-4 top-[max(1rem,env(safe-area-inset-top))] z-[100] flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur ${colors}`}
      role="status"
    >
      <p className="flex-1 text-sm leading-relaxed">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded-lg p-1 opacity-70 hover:opacity-100"
        aria-label="关闭"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
