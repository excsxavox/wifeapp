import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import { categoryPalette } from '@/src/theme/colors';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const DEFAULT_CATEGORIES = [
  { name: 'Comida', monthlyLimit: 450, color: categoryPalette[0], sortOrder: 0 },
  { name: 'Banca', monthlyLimit: 500, color: categoryPalette[1], sortOrder: 1 },
  { name: 'Movilidad', monthlyLimit: 200, color: categoryPalette[2], sortOrder: 2 },
  { name: 'Entretenimiento', monthlyLimit: 200, color: categoryPalette[3], sortOrder: 3 },
  { name: 'Otros', monthlyLimit: 150, color: categoryPalette[4], sortOrder: 4 },
];

async function columnExists(
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string
): Promise<boolean> {
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return rows.some((row) => row.name === column);
}

async function migrateWatchedApps(db: SQLite.SQLiteDatabase) {
  if (!(await columnExists(db, 'watched_apps', 'category_id'))) {
    await db.execAsync(
      'ALTER TABLE watched_apps ADD COLUMN category_id INTEGER REFERENCES categories(id)'
    );
  }
  if (!(await columnExists(db, 'watched_apps', 'kind'))) {
    await db.execAsync('ALTER TABLE watched_apps ADD COLUMN kind TEXT');
  }
}

async function renameLegacyCategories(db: SQLite.SQLiteDatabase) {
  const renames: Array<[string, string]> = [
    ['Gastos mensuales', 'Banca'],
    ['Transporte', 'Movilidad'],
    ['Ocio', 'Entretenimiento'],
  ];
  for (const [from, to] of renames) {
    const existing = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM categories WHERE name = ?',
      from
    );
    const target = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM categories WHERE name = ?',
      to
    );
    if (existing && !target) {
      await db.runAsync('UPDATE categories SET name = ? WHERE id = ?', to, existing.id);
    }
  }
}

export async function getDatabase() {
  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        const db = await SQLite.openDatabaseAsync('wifeapp.db');

        if (Platform.OS !== 'web') {
          try {
            await db.execAsync('PRAGMA journal_mode = WAL;');
          } catch {
            // ignore
          }
        }

        await db.execAsync(`
          PRAGMA foreign_keys = ON;

          CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            monthly_limit REAL NOT NULL DEFAULT 0,
            color TEXT NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0
          );

          CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            reason TEXT NOT NULL,
            created_at TEXT NOT NULL,
            source TEXT NOT NULL CHECK(source IN ('manual', 'gate', 'emergency')),
            app_package TEXT,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS watched_apps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL,
            android_package TEXT NOT NULL UNIQUE,
            enabled INTEGER NOT NULL DEFAULT 1
          );

          CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS savings_goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            target_amount REAL NOT NULL DEFAULT 0,
            saved_amount REAL NOT NULL DEFAULT 0,
            color TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
        `);

        await migrateWatchedApps(db);
        await renameLegacyCategories(db);

        const categoryCount = await db.getFirstAsync<{ count: number }>(
          'SELECT COUNT(*) as count FROM categories'
        );
        if (!categoryCount || categoryCount.count === 0) {
          for (const category of DEFAULT_CATEGORIES) {
            await db.runAsync(
              `INSERT INTO categories (name, monthly_limit, color, sort_order)
               VALUES (?, ?, ?, ?)`,
              category.name,
              category.monthlyLimit,
              category.color,
              category.sortOrder
            );
          }
        } else {
          // Ensure new category names exist for fresh classification UX.
          for (const category of DEFAULT_CATEGORIES) {
            const exists = await db.getFirstAsync<{ id: number }>(
              'SELECT id FROM categories WHERE name = ?',
              category.name
            );
            if (!exists) {
              await db.runAsync(
                `INSERT INTO categories (name, monthly_limit, color, sort_order)
                 VALUES (?, ?, ?, ?)`,
                category.name,
                category.monthlyLimit,
                category.color,
                category.sortOrder
              );
            }
          }
        }

        const resetDay = await db.getFirstAsync<{ value: string }>(
          `SELECT value FROM settings WHERE key = 'monthlyResetDay'`
        );
        if (!resetDay) {
          await db.runAsync(
            `INSERT INTO settings (key, value) VALUES ('monthlyResetDay', '1')`
          );
        }

        const currency = await db.getFirstAsync<{ value: string }>(
          `SELECT value FROM settings WHERE key = 'currency'`
        );
        if (!currency) {
          await db.runAsync(
            `INSERT INTO settings (key, value) VALUES ('currency', 'USD')`
          );
        }

        const setup = await db.getFirstAsync<{ value: string }>(
          `SELECT value FROM settings WHERE key = 'setupComplete'`
        );
        if (!setup) {
          await db.runAsync(
            `INSERT INTO settings (key, value) VALUES ('setupComplete', '0')`
          );
        }

        const companion = await db.getFirstAsync<{ value: string }>(
          `SELECT value FROM settings WHERE key = 'companionRole'`
        );
        if (!companion) {
          await db.runAsync(
            `INSERT INTO settings (key, value) VALUES ('companionRole', 'esposa')`
          );
        }

        return db;
      } catch (error) {
        dbPromise = null;
        throw error;
      }
    })();
  }

  return dbPromise;
}
