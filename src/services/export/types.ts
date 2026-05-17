import type { WorkLogItem } from '@/types/workLog';

export type ExportFormat = 'text' | 'image' | 'xlsx' | 'docx';

export interface ExportRange {
  start: string;
  end: string;
}

export interface ExportPayload {
  logs: WorkLogItem[];
  range: ExportRange;
}

export const MAX_IMAGE_EXPORT_DAYS = 31;
