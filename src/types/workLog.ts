export interface WorkLogItem {
  id: string;
  date: string;
  title: string;
  /** WorkCategory.id from settings */
  category: string;
  durationMinutes: number;
  description: string;
  rawInput: string;
  supplementHistory?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkLogCardDraft {
  date: string;
  title: string;
  category: string;
  durationMinutes: number;
  description: string;
}
