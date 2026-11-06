/**
 * Harness yang menjalankan kode Apps Script ASLI (apps-script/src/*.js) di Node
 * memakai tiruan in-memory untuk SpreadsheetApp, DriveApp, CacheService, dll.
 *
 * Dipakai untuk:
 *  - unit/integration test logika Apps Script (vitest)
 *  - mode mock lokal (GAS_MOCK=true) supaya website bisa dijalankan tanpa akun Google
 *
 * JANGAN dipakai di produksi.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

type Cell = string;

class FakeRange {
  constructor(
    private sheet: FakeSheet,
    private row: number,
    private col: number,
    private numRows: number,
    private numCols: number,
  ) {}
  getValues(): Cell[][] {
    const out: Cell[][] = [];
    for (let r = 0; r < this.numRows; r++) {
      const line: Cell[] = [];
      for (let c = 0; c < this.numCols; c++) {
        line.push(this.sheet.data[this.row - 1 + r]?.[this.col - 1 + c] ?? '');
      }
      out.push(line);
    }
    return out;
  }
  setValues(values: unknown[][]) {
    if (values.length !== this.numRows || values.some((v) => v.length !== this.numCols)) {
      throw new Error(
        `The number of rows/columns in the data does not match the range (${this.numRows}x${this.numCols})`,
      );
    }
    values.forEach((line, r) => {
      line.forEach((v, c) => {
        const rr = this.row - 1 + r;
        const cc = this.col - 1 + c;
        while (this.sheet.data.length <= rr) this.sheet.data.push([]);
        let s = v === null || v === undefined ? '' : String(v);
        // Sheets: apostrof di depan = paksa teks, tidak ikut tersimpan sebagai nilai.
        if (s.startsWith("'")) s = s.slice(1);
        else if (s.startsWith('=')) throw new Error('Formula tidak diizinkan di harness: ' + s);
        this.sheet.data[rr][cc] = s;
      });
    });
    return this;
  }
  setNumberFormat() {
    return this;
  }
  setFontWeight() {
    return this;
  }
  setBackground() {
    return this;
  }
  setFontColor() {
    return this;
  }
  getSheet() {
    return this.sheet;
  }
}

class FakeSheet {
  data: Cell[][] = [];
  deleted = false;
  constructor(
    private name: string,
    private sheetId = 0,
  ) {}
  /** Seperti Google: sheet yang sudah dihapus melempar error saat dipakai. */
  private alive() {
    if (this.deleted) throw new Error(`Sheet ${this.sheetId} tak ditemukan`);
  }
  getName() {
    this.alive();
    return this.name;
  }
  getLastRow() {
    this.alive();
    for (let i = this.data.length - 1; i >= 0; i--) {
      if ((this.data[i] || []).some((c) => c !== '' && c !== undefined)) return i + 1;
    }
    return 0;
  }
  getLastColumn() {
    this.alive();
    let max = 0;
    this.data.forEach((row) => {
      for (let i = (row || []).length - 1; i >= 0; i--) {
        if (row[i] !== '' && row[i] !== undefined) {
          max = Math.max(max, i + 1);
          break;
        }
      }
    });
    return max;
  }
  getMaxRows() {
    this.alive();
    return Math.max(1000, this.data.length);
  }
  getRange(row: number, col: number, numRows = 1, numCols = 1) {
    this.alive();
    if (row < 1 || col < 1 || numRows < 1 || numCols < 1) throw new Error('Range tidak valid');
    return new FakeRange(this, row, col, numRows, numCols);
  }
  deleteRow(i: number) {
    this.alive();
    this.data.splice(i - 1, 1);
  }
  setFrozenRows() {
    this.alive();
    return this;
  }
}

class FakeSpreadsheet {
  sheets = new Map<string, FakeSheet>();
  getName() {
    return 'Genta Buana (mock)';
  }
  getSheetByName(name: string) {
    return this.sheets.get(name) ?? null;
  }
  private nextSheetId = 0;
  insertSheet(name: string) {
    const s = new FakeSheet(name, this.nextSheetId++);
    this.sheets.set(name, s);
    return s;
  }
  getSheets() {
    return [...this.sheets.values()];
  }
  deleteSheet(s: FakeSheet) {
    this.sheets.delete(s.getName());
    s.deleted = true;
  }
}

export interface FakeFile {
  id: string;
  name: string;
  mimeType: string;
  bytes: Buffer;
  trashed: boolean;
  shared: boolean;
  parentId: string;
}

export interface GasRuntime {
  /** Panggil seperti HTTP POST ke Web App. */
  call(action: string, payload?: unknown, apiKey?: string): {
    success: boolean;
    data: unknown;
    message: string;
    code?: string;
  };
  handleRaw(raw: string): unknown;
  run(fnName: string): unknown;
  files: Map<string, FakeFile>;
  mail: unknown[];
  properties: Map<string, string>;
  spreadsheet: FakeSpreadsheet;
  setLockBusy(busy: boolean): void;
  apiKey: string;
  exportState(): SerializedState;
  importState(state: SerializedState): void;
}

export interface SerializedState {
  sheets: Record<string, string[][]>;
  properties: Record<string, string>;
  files: (Omit<FakeFile, 'bytes'> & { bytes: string })[];
}

function loadSources(dir: string): string {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith('.js')) out.push(`// ---- ${entry.name}\n` + fs.readFileSync(p, 'utf8'));
    }
  };
  walk(dir);
  return out.join('\n');
}

export function createGasRuntime(
  opts: { properties?: Record<string, string>; sourceDir?: string; quiet?: boolean } = {},
): GasRuntime {
  const apiKey = opts.properties?.API_KEY ?? 'test-api-key-0123456789abcdef0123456789';
  const properties = new Map<string, string>(
    Object.entries({
      API_KEY: apiKey,
      SPREADSHEET_ID: 'mock-spreadsheet',
      DRIVE_FOLDER_ID: 'mock-folder-0001',
      ...opts.properties,
    }),
  );
  const spreadsheet = new FakeSpreadsheet();
  // Spreadsheet baru dari Google selalu punya satu sheet kosong bawaan (id 0).
  spreadsheet.insertSheet('Sheet1');
  const cache = new Map<string, { v: string; exp: number }>();
  const files = new Map<string, FakeFile>();
  const mail: unknown[] = [];
  const triggers: { handler: string }[] = [];
  let lockBusy = false;

  const cacheGet = (k: string) => {
    const e = cache.get(k);
    if (!e) return null;
    if (e.exp < Date.now()) {
      cache.delete(k);
      return null;
    }
    return e.v;
  };

  const makeFile = (f: FakeFile) => ({
    getId: () => f.id,
    getName: () => f.name,
    setSharing: () => {
      f.shared = true;
    },
    setTrashed: (t: boolean) => {
      f.trashed = t;
    },
    getParents: () => {
      let done = false;
      return {
        hasNext: () => !done,
        next: () => {
          done = true;
          return { getId: () => f.parentId };
        },
      };
    },
  });

  const noop = () => {};
  const sandbox: Record<string, unknown> = {
    console: opts.quiet ? { ...console, log: noop, warn: noop, info: noop } : console,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k: string) => properties.get(k) ?? null,
        setProperty: (k: string, v: string) => {
          properties.set(k, String(v));
        },
        getProperties: () => Object.fromEntries(properties),
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k: string) => cacheGet(k),
        getAll: (keys: string[]) => {
          const o: Record<string, string> = {};
          keys.forEach((k) => {
            const v = cacheGet(k);
            if (v !== null) o[k] = v;
          });
          return o;
        },
        put: (k: string, v: string, ttl = 600) => {
          if (v.length > 100 * 1024) throw new Error('Argument too large');
          cache.set(k, { v, exp: Date.now() + ttl * 1000 });
        },
        putAll: (o: Record<string, string>, ttl = 600) => {
          Object.entries(o).forEach(([k, v]) => {
            if (v.length > 100 * 1024) throw new Error('Argument too large');
            cache.set(k, { v, exp: Date.now() + ttl * 1000 });
          });
        },
        remove: (k: string) => cache.delete(k),
        removeAll: (ks: string[]) => ks.forEach((k) => cache.delete(k)),
      }),
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => !lockBusy,
        waitLock: () => {
          if (lockBusy) throw new Error('Lock timeout');
        },
        releaseLock: () => {},
        hasLock: () => true,
      }),
    },
    SpreadsheetApp: {
      openById: (id: string) => {
        if (id !== properties.get('SPREADSHEET_ID')) throw new Error('Spreadsheet tidak ditemukan');
        return spreadsheet;
      },
      flush: () => {},
    },
    DriveApp: {
      Access: { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK' },
      Permission: { VIEW: 'VIEW' },
      getFolderById: (id: string) => {
        if (id !== properties.get('DRIVE_FOLDER_ID')) throw new Error('Folder tidak ditemukan');
        return {
          getId: () => id,
          getName: () => 'Upload (mock)',
          createFile: (blob: { bytes: Buffer; mime: string; name: string }) => {
            const f: FakeFile = {
              id: 'mock' + crypto.randomBytes(12).toString('hex'),
              name: blob.name,
              mimeType: blob.mime,
              bytes: blob.bytes,
              trashed: false,
              shared: false,
              parentId: id,
            };
            files.set(f.id, f);
            return makeFile(f);
          },
        };
      },
      getFileById: (id: string) => {
        const f = files.get(id);
        if (!f) throw new Error('File tidak ditemukan');
        return makeFile(f);
      },
    },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      base64Decode: (s: string) => Buffer.from(s, 'base64'),
      newBlob: (bytes: Buffer, mime: string, name: string) => ({ bytes: Buffer.from(bytes), mime, name }),
      formatDate: (d: Date, tz: string, fmt: string) => {
        if (fmt !== 'yyyy-MM-dd') throw new Error('Format tidak didukung di harness: ' + fmt);
        return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d);
      },
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (s: string) => ({ content: s, setMimeType() { return this; } }),
    },
    MailApp: { sendEmail: (m: unknown) => mail.push(m) },
    ScriptApp: {
      getProjectTriggers: () => triggers.map((t) => ({ getHandlerFunction: () => t.handler })),
      newTrigger: (handler: string) => ({
        forSpreadsheet: () => ({
          onEdit: () => ({ create: () => triggers.push({ handler }) }),
        }),
      }),
    },
  };

  const context = vm.createContext(sandbox);
  const dir = opts.sourceDir ?? path.join(process.cwd(), 'apps-script', 'src');
  vm.runInContext(loadSources(dir), context, { filename: 'apps-script.js' });

  const fn = (name: string) => {
    const f = (context as Record<string, unknown>)[name];
    if (typeof f !== 'function') throw new Error('Fungsi Apps Script tidak ada: ' + name);
    return f as (...a: unknown[]) => unknown;
  };

  return {
    apiKey,
    files,
    mail,
    properties,
    spreadsheet,
    setLockBusy: (b) => {
      lockBusy = b;
    },
    exportState: () => ({
      sheets: Object.fromEntries([...spreadsheet.sheets].map(([k, v]) => [k, v.data])),
      properties: Object.fromEntries(properties),
      files: [...files.values()].map((f) => ({ ...f, bytes: f.bytes.toString('base64') })),
    }),
    importState: (state) => {
      spreadsheet.sheets.clear();
      Object.entries(state.sheets).forEach(([name, data]) => {
        const sh = spreadsheet.insertSheet(name);
        sh.data = data;
      });
      properties.clear();
      Object.entries(state.properties).forEach(([k, v]) => properties.set(k, v));
      files.clear();
      state.files.forEach((f) => files.set(f.id, { ...f, bytes: Buffer.from(f.bytes, 'base64') }));
    },
    handleRaw: (raw) => JSON.parse(JSON.stringify(fn('handleRequest')(raw))),
    call(action, payload = {}, key = apiKey) {
      const res = fn('handleRequest')(JSON.stringify({ apiKey: key, action, payload }));
      // round-trip JSON = sama seperti lewat HTTP (dan melepaskan objek dari realm vm)
      return JSON.parse(JSON.stringify(res));
    },
    run: (name) => {
      const r = fn(name)();
      return r === undefined ? undefined : JSON.parse(JSON.stringify(r));
    },
  };
}
