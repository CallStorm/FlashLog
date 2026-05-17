import { useCallback, useEffect, useRef, useState } from 'react';
import { FileSpreadsheet, FileText, Image as ImageIcon, Type, X } from 'lucide-react';
import { SharePreviewImage } from '@/components/SharePreviewImage';
import { listByDateRange } from '@/db/workLogRepository';
import { buildWorklogPlainText, previewPlainText } from '@/services/export/formatters';
import { buildWorklogDocx } from '@/services/export/generators/docx';
import { buildWorklogImageFromElement } from '@/services/export/generators/image';
import { buildWorklogXlsx } from '@/services/export/generators/xlsx';
import { copyText, shareFileFromPayload, shareText } from '@/services/export/shareService';
import type { ExportFormat, ExportRange } from '@/services/export/types';
import { MAX_IMAGE_EXPORT_DAYS } from '@/services/export/types';
import type { WorkLogItem } from '@/types/workLog';
import { daysBetweenInclusive, getTodayLocal } from '@/utils/date';

const FORMAT_OPTIONS: { id: ExportFormat; label: string; icon: typeof Type }[] = [
  { id: 'text', label: '文本', icon: Type },
  { id: 'image', label: '图片', icon: ImageIcon },
  { id: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
  { id: 'docx', label: 'Word', icon: FileText },
];

export type ShareWorklogSheetProps = {
  open: boolean;
  initialRange: ExportRange;
  onClose: () => void;
  onToast: (message: string) => void;
};

export function ShareWorklogSheet({
  open,
  initialRange,
  onClose,
  onToast,
}: ShareWorklogSheetProps) {
  const [start, setStart] = useState(initialRange.start);
  const [end, setEnd] = useState(initialRange.end);
  const [format, setFormat] = useState<ExportFormat>('text');
  const [logs, setLogs] = useState<WorkLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  const range: ExportRange = { start, end };
  const today = getTodayLocal();
  const rangeValid = start <= end && start <= today && end <= today;
  const dayCount = rangeValid ? daysBetweenInclusive(start, end) : 0;
  const hasLogs = logs.length > 0;

  const plainText = hasLogs ? buildWorklogPlainText(logs, range) : '';
  const textPreview = plainText ? previewPlainText(plainText) : '';

  useEffect(() => {
    if (!open) return;
    setStart(initialRange.start);
    setEnd(initialRange.end);
    setFormat('text');
    setImagePreviewUrl(null);
  }, [open, initialRange.start, initialRange.end]);

  const loadLogs = useCallback(async () => {
    if (!open || !rangeValid || start > end) {
      setLogs([]);
      return;
    }
    setLoading(true);
    try {
      const items = await listByDateRange(start, end);
      setLogs(items);
    } finally {
      setLoading(false);
    }
  }, [open, start, end, rangeValid]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void loadLogs();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [open, loadLogs]);

  useEffect(() => {
    if (!open || format !== 'image' || !hasLogs) {
      setImagePreviewUrl(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const el = captureRef.current;
        if (!el) return;
        try {
          const blob = await buildWorklogImageFromElement(el);
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          setImagePreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        } catch {
          if (!cancelled) setImagePreviewUrl(null);
        }
      })();
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, format, hasLogs, logs, start, end]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  if (!open) return null;

  const ensureReady = (): boolean => {
    if (!rangeValid) {
      onToast('请选择有效的日期范围');
      return false;
    }
    if (start > end) {
      onToast('开始日期不能晚于结束日期');
      return false;
    }
    if (!hasLogs) {
      onToast('该时段暂无工时记录');
      return false;
    }
    if (format === 'image' && dayCount > MAX_IMAGE_EXPORT_DAYS) {
      onToast(`图片导出最多支持 ${MAX_IMAGE_EXPORT_DAYS} 天，请缩小范围`);
      return false;
    }
    return true;
  };

  const handleCopy = async () => {
    if (!ensureReady() || format !== 'text') return;
    setBusy(true);
    try {
      await copyText(plainText);
      onToast('已复制到剪贴板');
      onClose();
    } catch {
      onToast('复制失败，请重试');
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    if (!ensureReady()) return;
    setBusy(true);
    try {
      if (format === 'text') {
        await shareText(plainText, 'FlashLog 工时');
        onToast('已打开分享');
        onClose();
        return;
      }

      if (format === 'image') {
        const el = captureRef.current;
        if (!el) throw new Error('预览未就绪');
        const blob = await buildWorklogImageFromElement(el);
        const result = await shareFileFromPayload(
          blob,
          range,
          'png',
          'image/png',
          'FlashLog 工时',
        );
        onToast(result === 'downloaded' ? '已下载图片，可从文件管理器分享' : '已打开分享');
        onClose();
        return;
      }

      if (format === 'xlsx') {
        const blob = buildWorklogXlsx(logs, range);
        const result = await shareFileFromPayload(
          blob,
          range,
          'xlsx',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'FlashLog 工时',
        );
        onToast(
          result === 'downloaded'
            ? '已下载 Excel，可从文件管理器分享到微信等'
            : '已打开分享',
        );
        onClose();
        return;
      }

      const blob = await buildWorklogDocx(logs, range);
      const result = await shareFileFromPayload(
        blob,
        range,
        'docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'FlashLog 工时',
      );
      onToast(
        result === 'downloaded'
          ? '已下载 Word，可从文件管理器分享到微信等'
          : '已打开分享',
      );
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '分享失败，请重试';
      onToast(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="share-sheet-root" role="dialog" aria-modal="true" aria-label="分享工时">
      <button
        type="button"
        className="share-sheet-backdrop"
        aria-label="关闭"
        onClick={onClose}
      />
      <div className="share-sheet-panel">
        <div className="share-sheet-header">
          <h2 className="text-lg font-semibold text-primary">分享工时</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-[var(--color-icon-hover)]"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="share-sheet-body">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-muted">
              开始日期
              <input
                type="date"
                value={start}
                max={end < today ? end : today}
                onChange={(e) => setStart(e.target.value)}
                className="input-field mt-1 w-full"
              />
            </label>
            <label className="block text-xs text-muted">
              结束日期
              <input
                type="date"
                value={end}
                min={start}
                max={today}
                onChange={(e) => setEnd(e.target.value)}
                className="input-field mt-1 w-full"
              />
            </label>
          </div>

          <p className="text-xs text-muted">
            {loading
              ? '加载中…'
              : hasLogs
                ? `共 ${logs.length} 条记录`
                : '该时段暂无工时记录'}
          </p>

          <div className="share-format-grid" role="group" aria-label="导出格式">
            {FORMAT_OPTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setFormat(id)}
                className={`share-format-item ${format === id ? 'share-format-item-active' : ''}`}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {format === 'text' && hasLogs && (
            <pre className="share-preview-text">{textPreview}</pre>
          )}

          {format === 'image' && hasLogs && dayCount <= MAX_IMAGE_EXPORT_DAYS && (
            <div className="share-preview-image-wrap">
              {imagePreviewUrl ? (
                <img src={imagePreviewUrl} alt="工时预览" className="share-preview-image" />
              ) : (
                <p className="py-6 text-center text-sm text-muted">生成预览中…</p>
              )}
            </div>
          )}

          {format === 'image' && dayCount > MAX_IMAGE_EXPORT_DAYS && (
            <p className="text-sm text-[#ea4335]">
              图片导出最多 {MAX_IMAGE_EXPORT_DAYS} 天，请缩小日期范围
            </p>
          )}

          {(format === 'xlsx' || format === 'docx') && hasLogs && (
            <p className="text-sm text-secondary">
              将生成 {format === 'xlsx' ? 'Excel (.xlsx)' : 'Word (.docx)'} 文件，通过系统分享发送到微信、QQ、企业微信等。
            </p>
          )}

          <p className="text-xs text-muted">
            微信分享文件时，建议选择「文件」会话；图片与短文本兼容性最好。
          </p>
        </div>

        <div className="share-sheet-actions">
          {format === 'text' && (
            <button
              type="button"
              className="btn-secondary flex-1"
              disabled={busy || loading || !hasLogs}
              onClick={() => void handleCopy()}
            >
              {busy ? '处理中…' : '复制'}
            </button>
          )}
          <button
            type="button"
            className="btn-primary flex-1"
            disabled={busy || loading || !hasLogs}
            onClick={() => void handleShare()}
          >
            {busy ? '生成中…' : '分享'}
          </button>
        </div>

        {hasLogs && (
          <div
            ref={captureRef}
            className="pointer-events-none fixed left-[-9999px] top-0"
            aria-hidden
          >
            <SharePreviewImage logs={logs} range={range} />
          </div>
        )}
      </div>
    </div>
  );
}
