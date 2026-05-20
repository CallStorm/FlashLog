import { useRef, useState } from 'react';
import { Clipboard, ImageDown, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Clipboard as CapClipboard } from '@capacitor/clipboard';
import { formatAnalysisText } from '@/components/analysis/formatAnalysisText';
import {
  captureElementAsPng,
  waitForCaptureLayout,
} from '@/services/export/generators/image';
import { downloadImageBlob } from '@/services/export/shareService';

function buildSummaryImageFilename(rangeLabel: string): string {
  const compact = rangeLabel.replace(/\s/g, '').replace(/~/g, '-');
  const safe = compact.replace(/[^\d-]/g, '') || 'summary';
  return `FlashLog_分析总结_${safe}.png`;
}

export function AnalysisSummaryActions({
  content,
  rangeLabel,
}: {
  content: string;
  rangeLabel: string;
}) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportToast, setExportToast] = useState<string | null>(null);

  const copy = async () => {
    if (Capacitor.isNativePlatform()) {
      await CapClipboard.write({ string: content });
    } else {
      await navigator.clipboard.writeText(content);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportImage = async () => {
    const el = captureRef.current;
    if (!el || exporting) return;
    setExporting(true);
    setExportToast(null);
    try {
      await waitForCaptureLayout();
      const blob = await captureElementAsPng(el);
      const result = await downloadImageBlob(
        blob,
        buildSummaryImageFilename(rangeLabel),
      );
      setExportToast(
        result === 'downloaded' ? '图片已下载' : '已打开分享',
      );
    } catch {
      setExportToast('导出失败，请重试');
    } finally {
      setExporting(false);
      setTimeout(() => setExportToast(null), 2500);
    }
  };

  return (
    <>
      <div
        className="analysis-summary-capture-host"
        aria-hidden
      >
        <div ref={captureRef} className="analysis-summary-capture-root">
          <header className="analysis-summary-capture-header">
            <h2 className="analysis-summary-capture-title">FlashLog 分析总结</h2>
            <p className="analysis-summary-capture-range">{rangeLabel}</p>
          </header>
          <div className="analysis-summary-capture-body">
            {formatAnalysisText(content)}
          </div>
        </div>
      </div>

      <div className="analysis-summary-actions">
        <button
          type="button"
          className="btn-ghost text-sm"
          onClick={() => void copy()}
        >
          <Clipboard className="mr-1 inline h-4 w-4" />
          {copied ? '已复制' : '复制全文'}
        </button>
        <button
          type="button"
          className="btn-ghost text-sm"
          disabled={exporting}
          onClick={() => void exportImage()}
        >
          {exporting ? (
            <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />
          ) : (
            <ImageDown className="mr-1 inline h-4 w-4" />
          )}
          {exporting ? '导出中…' : '导出图片'}
        </button>
      </div>
      {exportToast && (
        <p className="analysis-summary-export-hint">{exportToast}</p>
      )}
    </>
  );
}
