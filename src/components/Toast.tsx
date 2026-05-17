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

  const variantClass =
    variant === 'error'
      ? 'toast-error'
      : variant === 'success'
        ? 'toast-success'
        : 'toast-info';

  return (
    <div className={`toast-root ${variantClass}`} role="status">
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
