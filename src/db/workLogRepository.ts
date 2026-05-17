import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite';
import type { WorkLogItem } from '@/types/workLog';
import { generateUuid } from '@/utils/uuid';

const WEB_STORAGE_KEY = 'flashlog_work_logs_v1';
const DB_NAME = 'flashlog';
const isNative = Capacitor.isNativePlatform();

let sqliteConn: SQLiteConnection | null = null;
let db: SQLiteDBConnection | null = null;

async function getDb(): Promise<SQLiteDBConnection> {
  if (db) return db;

  sqliteConn = new SQLiteConnection(CapacitorSQLite);
  const isConn = (await sqliteConn.isConnection(DB_NAME, false)).result;
  if (isConn) {
    db = await sqliteConn.retrieveConnection(DB_NAME, false);
  } else {
    db = await sqliteConn.createConnection(
      DB_NAME,
      false,
      'no-encryption',
      1,
      false,
    );
    await db.open();
    await db.execute(
      `CREATE TABLE IF NOT EXISTS work_logs (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL,
        title TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        description TEXT NOT NULL,
        raw_input TEXT NOT NULL,
        supplement_history TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );`,
    );
  }

  const open = await db.isDBOpen();
  if (!open.result) await db.open();

  return db;
}

function rowToItem(row: Record<string, unknown>): WorkLogItem {
  let supplementHistory: string[] | undefined;
  const raw = row.supplement_history as string | null;
  if (raw) {
    try {
      supplementHistory = JSON.parse(raw) as string[];
    } catch {
      supplementHistory = undefined;
    }
  }
  return {
    id: String(row.id),
    date: String(row.date),
    title: String(row.title),
    durationMinutes: Number(row.duration_minutes),
    description: String(row.description),
    rawInput: String(row.raw_input),
    supplementHistory,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

function readWeb(): WorkLogItem[] {
  try {
    const raw = localStorage.getItem(WEB_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WorkLogItem[];
  } catch {
    return [];
  }
}

function writeWeb(items: WorkLogItem[]): void {
  localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(items));
}

export async function initWorkLogDb(): Promise<void> {
  if (isNative) await getDb();
}

export async function listWorkLogs(limitDays = 30): Promise<WorkLogItem[]> {
  if (!isNative) {
    const items = readWeb().sort((a, b) => b.createdAt - a.createdAt);
    if (limitDays <= 0) return items;
    const cutoff = Date.now() - limitDays * 86_400_000;
    return items.filter((i) => i.createdAt >= cutoff);
  }

  const connection = await getDb();
  const result = await connection.query(
    `SELECT * FROM work_logs ORDER BY date DESC, created_at DESC`,
  );
  const rows = (result.values ?? []) as Record<string, unknown>[];
  return rows.map(rowToItem);
}

export async function listByDate(date: string): Promise<WorkLogItem[]> {
  const all = await listWorkLogs(0);
  return all.filter((i) => i.date === date).sort((a, b) => a.createdAt - b.createdAt);
}

export async function getDistinctLoggedDates(): Promise<Set<string>> {
  if (!isNative) {
    return new Set(readWeb().map((i) => i.date));
  }

  const connection = await getDb();
  const result = await connection.query(
    `SELECT DISTINCT date FROM work_logs`,
  );
  const rows = (result.values ?? []) as { date: string }[];
  return new Set(rows.map((r) => String(r.date)));
}

export async function getWorkLog(id: string): Promise<WorkLogItem | null> {
  const all = await listWorkLogs(0);
  return all.find((i) => i.id === id) ?? null;
}

export async function insertWorkLog(
  input: Omit<WorkLogItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
): Promise<WorkLogItem> {
  const now = Date.now();
  const item: WorkLogItem = {
    id: input.id ?? generateUuid(),
    date: input.date,
    title: input.title,
    durationMinutes: input.durationMinutes,
    description: input.description,
    rawInput: input.rawInput,
    supplementHistory: input.supplementHistory,
    createdAt: now,
    updatedAt: now,
  };

  if (!isNative) {
    const items = readWeb();
    items.push(item);
    writeWeb(items);
    return item;
  }

  const connection = await getDb();
  await connection.run(
    `INSERT INTO work_logs (id, date, title, duration_minutes, description, raw_input, supplement_history, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      item.date,
      item.title,
      item.durationMinutes,
      item.description,
      item.rawInput,
      item.supplementHistory ? JSON.stringify(item.supplementHistory) : null,
      item.createdAt,
      item.updatedAt,
    ],
  );
  return item;
}

export async function updateWorkLog(
  id: string,
  patch: Partial<
    Pick<
      WorkLogItem,
      'date' | 'title' | 'durationMinutes' | 'description' | 'supplementHistory'
    >
  >,
): Promise<WorkLogItem | null> {
  const existing = await getWorkLog(id);
  if (!existing) return null;

  const updated: WorkLogItem = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  };

  if (!isNative) {
    const items = readWeb().map((i) => (i.id === id ? updated : i));
    writeWeb(items);
    return updated;
  }

  const connection = await getDb();
  await connection.run(
    `UPDATE work_logs SET date=?, title=?, duration_minutes=?, description=?, supplement_history=?, updated_at=? WHERE id=?`,
    [
      updated.date,
      updated.title,
      updated.durationMinutes,
      updated.description,
      updated.supplementHistory
        ? JSON.stringify(updated.supplementHistory)
        : null,
      updated.updatedAt,
      id,
    ],
  );
  return updated;
}

export async function deleteWorkLog(id: string): Promise<boolean> {
  if (!isNative) {
    const items = readWeb();
    const next = items.filter((i) => i.id !== id);
    if (next.length === items.length) return false;
    writeWeb(next);
    return true;
  }

  const connection = await getDb();
  const result = await connection.run(`DELETE FROM work_logs WHERE id=?`, [id]);
  return (result.changes?.changes ?? 0) > 0;
}

export async function clearAllWorkLogs(): Promise<void> {
  if (!isNative) {
    localStorage.removeItem(WEB_STORAGE_KEY);
    return;
  }
  const connection = await getDb();
  await connection.run(`DELETE FROM work_logs`);
}
