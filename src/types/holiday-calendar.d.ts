declare module 'holiday-calendar' {
  export interface HolidayDateInfo {
    date: string;
    type: 'public_holiday' | 'transfer_workday';
    name?: string;
    name_cn?: string;
  }

  export interface HolidayYearData {
    year: number;
    region: string;
    dates: HolidayDateInfo[];
  }

  export interface HolidayCalendarOptions {
    dataLoader?: (path: string) => Promise<HolidayYearData | { regions: unknown[] }>;
  }

  export default class HolidayCalendar {
    constructor(options?: HolidayCalendarOptions);
    isWorkday(region: string, date: string): Promise<boolean>;
    load(region: string, year: number): Promise<HolidayYearData>;
  }
}

declare module 'holiday-calendar/data/CN/2024.min.json' {
  import type { HolidayYearData } from 'holiday-calendar';
  const data: HolidayYearData;
  export default data;
}

declare module 'holiday-calendar/data/CN/2025.min.json' {
  import type { HolidayYearData } from 'holiday-calendar';
  const data: HolidayYearData;
  export default data;
}

declare module 'holiday-calendar/data/CN/2026.min.json' {
  import type { HolidayYearData } from 'holiday-calendar';
  const data: HolidayYearData;
  export default data;
}
