/**
 * GENTA BUANA — Apps Script (FILE GABUNGAN, dibuat otomatis).
 * JANGAN edit file ini langsung: edit apps-script/src/*.js lalu jalankan `npm run gas:bundle`.
 * Cara pakai: salin SELURUH isi file ini ke file Code.gs di editor Apps Script.
 */
// ===================== Cache.js =====================
/**
 * Cache baca berbasis CacheService dengan:
 * - Versioning: versi tiap tabel disimpan di Script Properties. Setiap penulisan
 *   menaikkan versi, sehingga cache lama otomatis tidak terpakai. Ini menghindari
 *   race "pembaca lama menimpa cache setelah penulis meng-invalidate".
 * - Chunking: CacheService membatasi 100KB per value, jadi data besar dipecah.
 */

function cacheVersion_(table) {
  return PropertiesService.getScriptProperties().getProperty('CACHE_VER_' + table) || '0';
}

function bumpCacheVersion(table) {
  var props = PropertiesService.getScriptProperties();
  var next = String(Number(props.getProperty('CACHE_VER_' + table) || '0') + 1);
  props.setProperty('CACHE_VER_' + table, next);
  return next;
}

function bumpAllCacheVersions() {
  Object.keys(TABLES).forEach(bumpCacheVersion);
  bumpCacheVersion('settings');
}

function cacheGetJson(baseKey) {
  var cache = CacheService.getScriptCache();
  var meta = cache.get(baseKey + ':n');
  if (!meta) return null;
  var n = Number(meta);
  var keys = [];
  for (var i = 0; i < n; i++) keys.push(baseKey + ':' + i);
  var parts = cache.getAll(keys);
  var str = '';
  for (var j = 0; j < n; j++) {
    var part = parts[baseKey + ':' + j];
    if (part === undefined || part === null) return null; // ada chunk yang kedaluwarsa
    str += part;
  }
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

function cachePutJson(baseKey, value) {
  try {
    var cache = CacheService.getScriptCache();
    var str = JSON.stringify(value);
    var size = LIMITS.CACHE_CHUNK_CHARS;
    var entries = {};
    var n = Math.max(1, Math.ceil(str.length / size));
    for (var i = 0; i < n; i++) entries[baseKey + ':' + i] = str.substr(i * size, size);
    cache.putAll(entries, LIMITS.CACHE_TTL_SECONDS);
    cache.put(baseKey + ':n', String(n), LIMITS.CACHE_TTL_SECONDS);
  } catch (e) {
    // Cache gagal bukan alasan untuk menggagalkan request.
    console.warn('cachePutJson gagal', e);
  }
}

/** Ambil data tabel dari cache, atau jalankan loader lalu simpan ke cache. */
function cachedTable(table, loader) {
  var key = 't:' + table + ':v' + cacheVersion_(table);
  var hit = cacheGetJson(key);
  if (hit) return hit;
  var data = loader();
  cachePutJson(key, data);
  return data;
}

// ===================== Config.js =====================
/**
 * Genta Buana — konfigurasi & skema tabel.
 *
 * Semua global memakai `var`/function declaration supaya aman terhadap urutan
 * pemuatan file di Apps Script (file dimuat berurutan, tapi function
 * declaration di-hoist ke global scope).
 */

var APP_VERSION = '1.0.0';

/** Batas umum. Lihat README bagian "Batasan Apps Script". */
var LIMITS = {
  MAX_BODY_CHARS: 6 * 1024 * 1024, // ~6MB teks JSON per request
  MAX_IMAGE_BYTES: 2 * 1024 * 1024, // 2MB setelah decode base64 (client menargetkan <=1MB)
  LOCK_WAIT_MS: 10000,
  CACHE_TTL_SECONDS: 21600, // maksimum CacheService = 6 jam
  CACHE_CHUNK_CHARS: 90000, // < 100KB per value CacheService
  LOGIN_MAX_PER_USER: 5, // percobaan gagal per username / 15 menit
  LOGIN_MAX_PER_IP: 20, // percobaan gagal per IP / 15 menit
  LOGIN_WINDOW_SECONDS: 900,
  BOOKING_MAX_PER_IP: 5, // booking per IP / jam
  BOOKING_WINDOW_SECONDS: 3600
};

var ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

var BOOKING_STATUSES = ['baru', 'dihubungi', 'deal', 'batal'];

var STANDARD_COLUMNS_TAIL = ['sort_order', 'is_active', 'created_at', 'updated_at'];

/**
 * Definisi field per tabel. Tipe yang didukung:
 * string, text (string panjang), slug, number, integer, boolean, enum, date (YYYY-MM-DD),
 * json (array/objek, disimpan sebagai string JSON), phone.
 */
var TABLES = {
  categories: {
    label: 'Kategori',
    slugFrom: 'name',
    fields: {
      name: { type: 'string', required: true, max: 80 },
      slug: { type: 'slug', max: 100 },
      description: { type: 'text', max: 500 }
    }
  },
  packages: {
    label: 'Paket',
    slugFrom: 'name',
    imageFields: ['image_ids'],
    fields: {
      category_id: { type: 'string', required: true, max: 64 },
      name: { type: 'string', required: true, max: 120 },
      slug: { type: 'slug', max: 140 },
      description: { type: 'text', max: 5000 },
      price: { type: 'number', required: true, min: 0, max: 1000000000 },
      price_unit: { type: 'enum', values: ['per_acara', 'per_hari'], default: 'per_acara' },
      specs: { type: 'json', jsonKind: 'array', maxItems: 50, default: [] },
      capacity: { type: 'string', max: 160 },
      image_ids: { type: 'json', jsonKind: 'array', maxItems: 12, default: [] },
      is_featured: { type: 'boolean', default: false }
    }
  },
  equipment: {
    label: 'Peralatan',
    imageFields: ['image_id'],
    fields: {
      name: { type: 'string', required: true, max: 120 },
      description: { type: 'text', max: 2000 },
      price: { type: 'number', required: true, min: 0, max: 1000000000 },
      unit: { type: 'string', max: 40, default: 'per hari' },
      image_id: { type: 'string', max: 128 }
    }
  },
  gallery: {
    label: 'Galeri',
    imageFields: ['image_ids'],
    fields: {
      title: { type: 'string', required: true, max: 140 },
      event_type: { type: 'string', max: 80 },
      event_date: { type: 'date' },
      location: { type: 'string', max: 160 },
      description: { type: 'text', max: 2000 },
      image_ids: { type: 'json', jsonKind: 'array', maxItems: 30, default: [] }
    }
  },
  testimonials: {
    label: 'Testimoni',
    fields: {
      name: { type: 'string', required: true, max: 80 },
      event: { type: 'string', max: 120 },
      message: { type: 'text', required: true, max: 1500 },
      rating: { type: 'integer', min: 1, max: 5, default: 5 }
    }
  },
  faqs: {
    label: 'FAQ',
    fields: {
      question: { type: 'string', required: true, max: 250 },
      answer: { type: 'text', required: true, max: 3000 }
    }
  },
  bookings: {
    label: 'Booking',
    fields: {
      name: { type: 'string', required: true, max: 100 },
      phone: { type: 'phone', required: true, max: 20 },
      event_date: { type: 'date', required: true },
      location: { type: 'string', required: true, max: 250 },
      package_id: { type: 'string', max: 64 },
      message: { type: 'text', max: 2000 },
      status: { type: 'enum', values: BOOKING_STATUSES, default: 'baru' },
      admin_note: { type: 'text', max: 2000 }
    }
  },
  admins: {
    label: 'Admin',
    fields: {
      username: { type: 'string', required: true, max: 50 },
      password_hash: { type: 'string', required: true, max: 400 },
      role: { type: 'enum', values: ['owner', 'staff'], default: 'owner' },
      last_login_at: { type: 'string', max: 40 }
    }
  }
};

/** Kunci settings yang boleh disimpan + batas panjang. */
var SETTINGS_KEYS = {
  business_name: 120,
  tagline: 200,
  description: 1000,
  about: 6000,
  address: 400,
  service_area: 400,
  whatsapp: 20,
  phone: 20,
  email: 120,
  instagram: 200,
  facebook: 200,
  tiktok: 200,
  youtube: 200,
  maps_url: 600,
  maps_embed_url: 1200,
  opening_hours: 300,
  logo_id: 128,
  hero_image_id: 128,
  wa_default_message: 500,
  price_note: 500
};

/** Tabel yang boleh dimanipulasi lewat action CRUD generik. */
var CRUD_TABLES = ['categories', 'packages', 'equipment', 'gallery', 'testimonials', 'faqs'];

function getColumns(table) {
  var def = TABLES[table];
  if (!def) throw new AppError('INTERNAL', 'Tabel tidak dikenal: ' + table);
  return ['id'].concat(Object.keys(def.fields)).concat(STANDARD_COLUMNS_TAIL);
}

function getProp(name, required) {
  var value = PropertiesService.getScriptProperties().getProperty(name);
  if (required && !value) {
    throw new AppError('CONFIG', 'Script Property "' + name + '" belum diisi.');
  }
  return value || '';
}

function getSpreadsheet() {
  return SpreadsheetApp.openById(getProp('SPREADSHEET_ID', true));
}

function getUploadFolder() {
  return DriveApp.getFolderById(getProp('DRIVE_FOLDER_ID', true));
}

// ===================== Db.js =====================
/**
 * Repository generik: 1 sheet = 1 tabel, baris 1 = header.
 * Kolom dipetakan berdasarkan NAMA header (bukan posisi), jadi aman bila
 * pemilik usaha menggeser kolom di Spreadsheet.
 *
 * Fungsi tulis (insert/update/remove/...) WAJIB dipanggil di dalam withLock().
 * Bacaan di dalam operasi tulis selalu langsung dari Sheet (bukan cache).
 */

function getSheet_(table) {
  var sheet = getSpreadsheet().getSheetByName(table);
  if (!sheet) {
    throw new AppError('CONFIG', 'Sheet "' + table + '" belum ada. Jalankan fungsi setup() terlebih dahulu.');
  }
  return sheet;
}

function readRaw_(table) {
  var sheet = getSheet_(table);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return { sheet: sheet, header: [], rows: [] };
  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var header = values[0].map(function (h) {
    return String(h).trim();
  });
  return { sheet: sheet, header: header, rows: values.slice(1) };
}

function rowToRecord_(table, header, row) {
  var rec = {};
  header.forEach(function (col, i) {
    if (!col) return;
    rec[col] = fromCell(columnRule(table, col), row[i]);
  });
  return rec;
}

function recordToRow_(table, header, rec) {
  return header.map(function (col) {
    return toCell(columnRule(table, col), rec[col]);
  });
}

function readSheetRecords_(table) {
  var raw = readRaw_(table);
  return raw.rows
    .map(function (row) {
      return rowToRecord_(table, raw.header, row);
    })
    .filter(function (r) {
      return r.id;
    });
}

function sortRecords_(records) {
  return records.slice().sort(function (a, b) {
    var sa = Number(a.sort_order) || 0;
    var sb = Number(b.sort_order) || 0;
    if (sa !== sb) return sa - sb;
    return String(a.created_at).localeCompare(String(b.created_at));
  });
}

var Db = {
  /** Semua record (termasuk nonaktif), dari cache bila ada. */
  all: function (table) {
    return cachedTable(table, function () {
      return readSheetRecords_(table);
    });
  },

  /** Semua record langsung dari sheet (tanpa cache). Dipakai di dalam lock. */
  allFresh: function (table) {
    return readSheetRecords_(table);
  },

  list: function (table, opts) {
    opts = opts || {};
    var rows = Db.all(table);
    if (!opts.includeInactive) {
      rows = rows.filter(function (r) {
        return r.is_active;
      });
    }
    return sortRecords_(rows);
  },

  findById: function (table, id, fresh) {
    var rows = fresh ? Db.allFresh(table) : Db.all(table);
    for (var i = 0; i < rows.length; i++) if (rows[i].id === id) return rows[i];
    return null;
  },

  findBy: function (table, key, value, fresh) {
    var rows = fresh ? Db.allFresh(table) : Db.all(table);
    for (var i = 0; i < rows.length; i++) if (rows[i][key] === value) return rows[i];
    return null;
  },

  insert: function (table, data) {
    var raw = readRaw_(table);
    var now = new Date().toISOString();
    var maxOrder = 0;
    raw.rows.forEach(function (row) {
      var r = rowToRecord_(table, raw.header, row);
      if (r.id && Number(r.sort_order) > maxOrder) maxOrder = Number(r.sort_order);
    });
    var rec = {};
    getColumns(table).forEach(function (c) {
      rec[c] = '';
    });
    Object.keys(data).forEach(function (k) {
      rec[k] = data[k];
    });
    rec.id = Utilities.getUuid();
    rec.created_at = now;
    rec.updated_at = now;
    if (rec.is_active === '' || rec.is_active === undefined) rec.is_active = true;
    if (rec.sort_order === '' || rec.sort_order === undefined) rec.sort_order = maxOrder + 1;

    var rowValues = recordToRow_(table, raw.header, rec);
    raw.sheet.getRange(raw.rows.length + 2, 1, 1, raw.header.length).setValues([rowValues]);
    bumpCacheVersion(table);
    return rowToRecord_(table, raw.header, rowValues.map(stripQuote_));
  },

  update: function (table, id, patch) {
    var raw = readRaw_(table);
    var idIdx = raw.header.indexOf('id');
    for (var i = 0; i < raw.rows.length; i++) {
      if (String(raw.rows[i][idIdx]) !== id) continue;
      var rec = rowToRecord_(table, raw.header, raw.rows[i]);
      Object.keys(patch).forEach(function (k) {
        if (k === 'id' || k === 'created_at') return;
        rec[k] = patch[k];
      });
      rec.updated_at = new Date().toISOString();
      var rowValues = recordToRow_(table, raw.header, rec);
      raw.sheet.getRange(i + 2, 1, 1, raw.header.length).setValues([rowValues]);
      bumpCacheVersion(table);
      return rowToRecord_(table, raw.header, rowValues.map(stripQuote_));
    }
    throw new AppError('NOT_FOUND', 'Data tidak ditemukan.');
  },

  remove: function (table, id) {
    var raw = readRaw_(table);
    var idIdx = raw.header.indexOf('id');
    for (var i = 0; i < raw.rows.length; i++) {
      if (String(raw.rows[i][idIdx]) !== id) continue;
      var rec = rowToRecord_(table, raw.header, raw.rows[i]);
      raw.sheet.deleteRow(i + 2);
      bumpCacheVersion(table);
      return rec;
    }
    throw new AppError('NOT_FOUND', 'Data tidak ditemukan.');
  },

  /** Set sort_order berdasarkan urutan ids (1..n). Id yang tidak disebut tidak diubah. */
  reorder: function (table, ids) {
    var raw = readRaw_(table);
    var idIdx = raw.header.indexOf('id');
    var soIdx = raw.header.indexOf('sort_order');
    var updIdx = raw.header.indexOf('updated_at');
    if (soIdx === -1) throw new AppError('CONFIG', 'Kolom sort_order tidak ditemukan.');
    var pos = {};
    ids.forEach(function (id, i) {
      pos[id] = i + 1;
    });
    var now = new Date().toISOString();
    var changed = 0;
    var soCol = raw.rows.map(function (row) {
      var id = String(row[idIdx]);
      if (pos[id] !== undefined) {
        changed++;
        return [String(pos[id])];
      }
      return [String(row[soIdx])];
    });
    if (raw.rows.length) {
      raw.sheet.getRange(2, soIdx + 1, raw.rows.length, 1).setValues(soCol);
      if (updIdx !== -1) {
        var updCol = raw.rows.map(function (row) {
          return [pos[String(row[idIdx])] !== undefined ? now : String(row[updIdx])];
        });
        raw.sheet.getRange(2, updIdx + 1, raw.rows.length, 1).setValues(updCol);
      }
    }
    bumpCacheVersion(table);
    return { updated: changed };
  },

  count: function (table, predicate) {
    return Db.all(table).filter(predicate || function () {
      return true;
    }).length;
  }
};

function stripQuote_(v) {
  return typeof v === 'string' && v.charAt(0) === "'" ? v.substring(1) : v;
}

// ===================== DriveStore.js =====================
/**
 * Penyimpanan gambar di Google Drive (1 folder khusus upload).
 */

function estimateBase64Bytes_(b64) {
  var len = b64.length;
  var padding = b64.charAt(len - 1) === '=' ? (b64.charAt(len - 2) === '=' ? 2 : 1) : 0;
  return Math.floor((len * 3) / 4) - padding;
}

function sanitizeFileName_(name, mimeType) {
  var ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[mimeType] || 'bin';
  var base = String(name || 'gambar')
    .replace(/\.[a-zA-Z0-9]+$/, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .substring(0, 60) || 'gambar';
  var stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').substring(0, 14);
  return stamp + '-' + base + '.' + ext;
}

var DriveStore = {
  saveImage: function (payload) {
    var mimeType = requireString(payload, 'mimeType', 'Tipe file');
    var base64 = requireString(payload, 'base64', 'Isi file');
    if (ALLOWED_IMAGE_TYPES.indexOf(mimeType) === -1) {
      throw new AppError('VALIDATION', 'Format gambar harus JPG, PNG, atau WEBP.');
    }
    base64 = base64.replace(/^data:[^;]+;base64,/, '');
    if (!/^[A-Za-z0-9+/=\s]+$/.test(base64)) {
      throw new AppError('VALIDATION', 'Data gambar rusak.');
    }
    if (estimateBase64Bytes_(base64) > LIMITS.MAX_IMAGE_BYTES) {
      throw new AppError('VALIDATION', 'Ukuran gambar terlalu besar (maks 2MB setelah kompres).');
    }
    var bytes = Utilities.base64Decode(base64);
    var blob = Utilities.newBlob(bytes, mimeType, sanitizeFileName_(payload.fileName, mimeType));
    var file = getUploadFolder().createFile(blob);
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {
      // Akun Google Workspace bisa melarang sharing publik lewat kebijakan admin.
      file.setTrashed(true);
      throw new AppError(
        'CONFIG',
        'Gagal membagikan file sebagai "Anyone with the link". Periksa kebijakan sharing akun Google Anda.'
      );
    }
    var id = file.getId();
    return { fileId: id, url: 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1600' };
  },

  /**
   * Pindahkan file ke trash, HANYA jika file berada di folder upload.
   * Ini mencegah API dipakai untuk menghapus file lain di Drive pemilik.
   */
  trash: function (fileId) {
    if (!fileId || !FILE_ID_RE.test(fileId)) return false;
    try {
      var file = DriveApp.getFileById(fileId);
      var folderId = getProp('DRIVE_FOLDER_ID', true);
      var parents = file.getParents();
      var inFolder = false;
      while (parents.hasNext()) {
        if (parents.next().getId() === folderId) inFolder = true;
      }
      if (!inFolder) return false;
      file.setTrashed(true);
      return true;
    } catch (e) {
      console.warn('Gagal trash file ' + fileId, e);
      return false;
    }
  },

  trashMany: function (ids) {
    var n = 0;
    (ids || []).forEach(function (id) {
      if (DriveStore.trash(id)) n++;
    });
    return n;
  }
};

/** Kumpulkan semua file id dari field gambar sebuah record. */
function collectImageIds(table, rec) {
  var ids = [];
  (TABLES[table].imageFields || []).forEach(function (f) {
    var v = rec && rec[f];
    if (Array.isArray(v)) ids = ids.concat(v);
    else if (v) ids.push(v);
  });
  return ids.filter(Boolean);
}

// ===================== handlers/Analytics.js =====================
/**
 * Analitik sederhana tanpa cookie & tanpa IP.
 *
 * - analytics.track   : dipanggil server Next.js untuk setiap kunjungan / klik WhatsApp.
 *                       Ditulis dengan appendRow (atomik) TANPA lock agar tidak berebut
 *                       dengan penyimpanan admin.
 * - aggregateAnalytics: dijalankan trigger setiap jam → merangkum baris event ke
 *                       sheet analytics_daily lalu menghapus baris event yang sudah diproses.
 * - analytics.summary : ringkasan untuk dashboard admin (gabungan harian + event yang
 *                       belum dirangkum).
 */

var ANALYTICS_EVENTS_COLUMNS = ['ts', 'date', 'type', 'path', 'ref', 'device', 'new_visitor', 'pkg'];
var ANALYTICS_DAILY_COLUMNS = ['date', 'views', 'visitors', 'wa_clicks', 'pages', 'refs', 'devices', 'packages', 'updated_at'];
var ANALYTICS_EVENT_TYPES = ['view', 'wa_click'];

function jakartaDate_(d) {
  return Utilities.formatDate(d || new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
}

function addDays_(dateStr, n) {
  var d = new Date(dateStr + 'T00:00:00Z');
  return new Date(d.getTime() + n * 86400000).toISOString().substring(0, 10);
}

function emptyDay_() {
  return { views: 0, visitors: 0, wa_clicks: 0, pages: {}, refs: {}, devices: {}, packages: {} };
}

function bump_(obj, key, n) {
  if (!key) return;
  obj[key] = (obj[key] || 0) + (n || 1);
}

function mergeCounts_(into, from) {
  Object.keys(from || {}).forEach(function (k) {
    bump_(into, k, Number(from[k]) || 0);
  });
}

function mergeDay_(into, from) {
  into.views += Number(from.views) || 0;
  into.visitors += Number(from.visitors) || 0;
  into.wa_clicks += Number(from.wa_clicks) || 0;
  mergeCounts_(into.pages, from.pages);
  mergeCounts_(into.refs, from.refs);
  mergeCounts_(into.devices, from.devices);
  mergeCounts_(into.packages, from.packages);
}

function applyEvent_(day, ev) {
  if (ev.type === 'view') {
    day.views++;
    if (ev.new_visitor) day.visitors++;
    bump_(day.pages, ev.path);
    bump_(day.refs, ev.ref || '(langsung)');
    bump_(day.devices, ev.device);
  } else if (ev.type === 'wa_click') {
    day.wa_clicks++;
    if (ev.pkg) bump_(day.packages, ev.pkg);
  }
}

function parseJsonObj_(v) {
  if (!v) return {};
  try {
    var o = JSON.parse(String(v));
    return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  } catch (e) {
    return {};
  }
}

function cleanEvent_(e) {
  if (!e || typeof e !== 'object') return null;
  var type = String(e.type || '');
  if (ANALYTICS_EVENT_TYPES.indexOf(type) === -1) return null;
  var path = String(e.path || '/').split('?')[0].split('#')[0].substring(0, 200);
  if (path.charAt(0) !== '/') path = '/';
  var ref = String(e.ref || '').toLowerCase().replace(/^www\./, '');
  if (!/^[a-z0-9.-]{1,100}$/.test(ref)) ref = '';
  var device = e.device === 'mobile' ? 'mobile' : 'desktop';
  var pkg = String(e.pkg || '');
  if (!/^[a-z0-9-]{1,140}$/.test(pkg)) pkg = '';
  return { type: type, path: path, ref: ref, device: device, new_visitor: e.nv === true, pkg: pkg };
}

/** Baca event yang belum dirangkum → { rows: [...], count } */
function readRawEvents_() {
  var sheet = getSheet_('analytics_events');
  var last = sheet.getLastRow();
  if (last < 2) return { rows: [], count: 0 };
  var values = sheet.getRange(1, 1, last, ANALYTICS_EVENTS_COLUMNS.length).getValues();
  var header = values[0].map(String);
  var idx = {};
  header.forEach(function (h, i) {
    idx[h] = i;
  });
  var rows = values.slice(1).map(function (r) {
    return {
      date: String(r[idx.date] || ''),
      type: String(r[idx.type] || ''),
      path: String(r[idx.path] || ''),
      ref: String(r[idx.ref] || ''),
      device: String(r[idx.device] || ''),
      new_visitor: String(r[idx.new_visitor]).toUpperCase() === 'TRUE',
      pkg: String(r[idx.pkg] || ''),
    };
  });
  return { rows: rows, count: rows.length };
}

/** Baca analytics_daily → { map: {date: day}, rowIndex: {date: n} } */
function readDaily_() {
  var sheet = getSheet_('analytics_daily');
  var last = sheet.getLastRow();
  var map = {};
  var rowIndex = {};
  if (last < 2) return { sheet: sheet, map: map, rowIndex: rowIndex };
  var values = sheet.getRange(2, 1, last - 1, ANALYTICS_DAILY_COLUMNS.length).getValues();
  values.forEach(function (r, i) {
    var date = String(r[0] || '');
    if (!date) return;
    map[date] = {
      views: Number(r[1]) || 0,
      visitors: Number(r[2]) || 0,
      wa_clicks: Number(r[3]) || 0,
      pages: parseJsonObj_(r[4]),
      refs: parseJsonObj_(r[5]),
      devices: parseJsonObj_(r[6]),
      packages: parseJsonObj_(r[7]),
    };
    rowIndex[date] = i + 2;
  });
  return { sheet: sheet, map: map, rowIndex: rowIndex };
}

var AnalyticsHandlers = {
  /** { events: [{ type, path, ref?, device?, nv?, pkg? }] } (maks 10) */
  track: function (p) {
    var list = Array.isArray(p && p.events) ? p.events.slice(0, 10) : [];
    var sheet = getSheet_('analytics_events');
    var now = new Date();
    var date = jakartaDate_(now);
    var n = 0;
    list.forEach(function (raw) {
      var e = cleanEvent_(raw);
      if (!e) return;
      sheet.appendRow([now.toISOString(), date, e.type, e.path, e.ref, e.device, e.new_visitor ? 'TRUE' : 'FALSE', e.pkg]);
      n++;
    });
    return { recorded: n };
  },

  /** { days?: 7|30|90 } */
  summary: function (p) {
    var days = Math.max(1, Math.min(365, Math.floor(Number(p && p.days) || 30)));
    var today = jakartaDate_();
    var from = addDays_(today, -(days - 1));
    var prevFrom = addDays_(from, -days);

    var map = readDaily_().map;
    readRawEvents_().rows.forEach(function (ev) {
      if (!ev.date) return;
      if (!map[ev.date]) map[ev.date] = emptyDay_();
      applyEvent_(map[ev.date], ev);
    });

    var series = [];
    var current = emptyDay_();
    var previous = emptyDay_();
    for (var d = prevFrom; d <= today; d = addDays_(d, 1)) {
      var day = map[d] || emptyDay_();
      if (d >= from) {
        series.push({ date: d, views: day.views, visitors: day.visitors, wa_clicks: day.wa_clicks });
        mergeDay_(current, day);
      } else {
        mergeDay_(previous, day);
      }
    }

    var top = function (obj, limit) {
      return Object.keys(obj)
        .map(function (k) {
          return { key: k, count: obj[k] };
        })
        .sort(function (a, b) {
          return b.count - a.count;
        })
        .slice(0, limit);
    };

    return {
      range: { from: from, to: today, days: days },
      series: series,
      totals: { views: current.views, visitors: current.visitors, wa_clicks: current.wa_clicks },
      previous: { views: previous.views, visitors: previous.visitors, wa_clicks: previous.wa_clicks },
      pages: top(current.pages, 8),
      refs: top(current.refs, 8),
      devices: current.devices,
      packages: top(current.packages, 8),
    };
  }
};

/**
 * Rangkum event ke analytics_daily. Dipanggil trigger per jam (dipasang oleh setup()).
 * Bisa juga dijalankan manual dari editor.
 */
function aggregateAnalytics() {
  return withLock(function () {
    var raw = readRawEvents_();
    if (!raw.count) return { aggregated: 0 };
    var daily = readDaily_();
    var touched = {};
    raw.rows.forEach(function (ev) {
      if (!ev.date) return;
      if (!daily.map[ev.date]) daily.map[ev.date] = emptyDay_();
      applyEvent_(daily.map[ev.date], ev);
      touched[ev.date] = true;
    });
    var now = new Date().toISOString();
    var appendRows = [];
    Object.keys(touched)
      .sort()
      .forEach(function (date) {
        var d = daily.map[date];
        var row = [
          date,
          String(d.views),
          String(d.visitors),
          String(d.wa_clicks),
          JSON.stringify(d.pages),
          JSON.stringify(d.refs),
          JSON.stringify(d.devices),
          JSON.stringify(d.packages),
          now
        ];
        if (daily.rowIndex[date]) {
          daily.sheet.getRange(daily.rowIndex[date], 1, 1, row.length).setValues([row]);
        } else {
          appendRows.push(row);
        }
      });
    if (appendRows.length) {
      daily.sheet.getRange(daily.sheet.getLastRow() + 1, 1, appendRows.length, ANALYTICS_DAILY_COLUMNS.length).setValues(appendRows);
    }
    // Hapus baris event yang sudah dirangkum (baris 2..count+1). Event baru yang
    // masuk selama proses ini berada di bawahnya dan tidak ikut terhapus.
    getSheet_('analytics_events').deleteRows(2, raw.count);
    return { aggregated: raw.count };
  });
}

// ===================== handlers/Auth.js =====================
/**
 * Autentikasi admin. Hashing & verifikasi password dilakukan di Next.js
 * (scrypt), karena Apps Script tidak menyediakan bcrypt/scrypt.
 * Apps Script menyimpan hash dan menjaga rate limit percobaan login.
 */

var PASSWORD_HASH_RE = /^scrypt\$\d+\$\d+\$\d+\$[A-Za-z0-9+/=_-]+\$[A-Za-z0-9+/=_-]+$/;

function publicAdmin_(a) {
  return { id: a.id, username: a.username, role: a.role, last_login_at: a.last_login_at };
}

function findAdminByUsername_(username) {
  var u = String(username || '').trim().toLowerCase();
  var rows = Db.all('admins');
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].username).toLowerCase() === u) return rows[i];
  }
  return null;
}

var AuthHandlers = {
  /** { username, ip } -> { admin: {id, username, role, password_hash} | null } */
  getCredential: function (p) {
    var username = requireString(p, 'username', 'Username').toLowerCase();
    var ip = String((p && p.ip) || 'unknown');
    if (
      rateCount('login-user', username) >= LIMITS.LOGIN_MAX_PER_USER ||
      rateCount('login-ip', ip) >= LIMITS.LOGIN_MAX_PER_IP
    ) {
      throw new AppError(
        'RATE_LIMITED',
        'Terlalu banyak percobaan login. Silakan tunggu 15 menit lalu coba lagi.'
      );
    }
    var admin = findAdminByUsername_(username);
    if (!admin || !admin.is_active) return { admin: null };
    return {
      admin: { id: admin.id, username: admin.username, role: admin.role, password_hash: admin.password_hash }
    };
  },

  /** { username, ip } -> { remaining } */
  loginFailed: function (p) {
    var username = String((p && p.username) || '').trim().toLowerCase();
    var ip = String((p && p.ip) || 'unknown');
    var n = rateHit('login-user', username, LIMITS.LOGIN_WINDOW_SECONDS);
    rateHit('login-ip', ip, LIMITS.LOGIN_WINDOW_SECONDS);
    return { remaining: Math.max(0, LIMITS.LOGIN_MAX_PER_USER - n) };
  },

  /** { id, username } */
  loginSucceeded: function (p) {
    var id = requireString(p, 'id', 'id');
    rateReset('login-user', String(p.username || '').toLowerCase());
    return withLock(function () {
      return publicAdmin_(Db.update('admins', id, { last_login_at: new Date().toISOString() }));
    });
  },

  /** { id } -> admin publik (tanpa hash). Dipakai untuk memastikan admin masih aktif. */
  getAdmin: function (p) {
    var a = Db.findById('admins', requireString(p, 'id', 'id'));
    if (!a || !a.is_active) throw new AppError('NOT_FOUND', 'Admin tidak ditemukan atau nonaktif.');
    return publicAdmin_(a);
  },

  /** { id, password_hash } — hash dibuat di Next.js setelah password lama diverifikasi. */
  changePassword: function (p) {
    var id = requireString(p, 'id', 'id');
    var hash = requireString(p, 'password_hash', 'password_hash');
    if (!PASSWORD_HASH_RE.test(hash)) throw new AppError('VALIDATION', 'Format hash password tidak valid.');
    return withLock(function () {
      if (!Db.findById('admins', id, true)) throw new AppError('NOT_FOUND', 'Admin tidak ditemukan.');
      Db.update('admins', id, { password_hash: hash });
      return { id: id };
    });
  }
};

// ===================== handlers/Bookings.js =====================
/**
 * bookings: inbox dari form booking publik.
 * Action: bookings.create (publik, rate limited), bookings.list,
 *         bookings.updateStatus, bookings.delete
 */

function todayJakarta_() {
  return Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
}

function notifyNewBooking_(rec, pkgName) {
  var to = getProp('NOTIFY_EMAIL', false);
  if (!to) return;
  try {
    var body = [
      'Ada booking baru dari website Genta Buana:',
      '',
      'Nama     : ' + rec.name,
      'WhatsApp : ' + rec.phone + '  (https://wa.me/' + rec.phone + ')',
      'Tanggal  : ' + rec.event_date,
      'Lokasi   : ' + rec.location,
      'Paket    : ' + (pkgName || '-'),
      'Pesan    : ' + (rec.message || '-'),
      '',
      'Kelola di halaman admin > Booking.'
    ].join('\n');
    MailApp.sendEmail({ to: to, subject: '[Genta Buana] Booking baru: ' + rec.name, body: body });
  } catch (e) {
    // Kuota MailApp (100/hari untuk akun gratis) bisa habis; booking tetap tersimpan.
    console.warn('Gagal kirim email notifikasi', e);
  }
}

var BookingHandlers = {
  create: function (p) {
    p = p || {};
    var ip = String(p.ip || 'unknown');
    if (rateCount('booking-ip', ip) >= LIMITS.BOOKING_MAX_PER_IP) {
      throw new AppError(
        'RATE_LIMITED',
        'Anda sudah mengirim beberapa booking. Silakan hubungi kami lewat WhatsApp untuk respon lebih cepat.'
      );
    }
    var data = validateRecord(
      'bookings',
      {
        name: p.name,
        phone: p.phone,
        event_date: p.event_date,
        location: p.location,
        package_id: p.package_id || '',
        message: p.message || ''
      },
      { partial: false }
    );
    if (data.event_date < todayJakarta_()) {
      throw new AppError('VALIDATION', 'Tanggal acara tidak boleh di masa lalu.', {
        fieldErrors: { event_date: 'Tanggal acara tidak boleh di masa lalu' }
      });
    }
    var pkg = data.package_id ? Db.findById('packages', data.package_id) : null;
    if (!pkg) data.package_id = '';
    data.status = 'baru';
    data.admin_note = '';

    var rec = withLock(function () {
      return Db.insert('bookings', data);
    });
    rateHit('booking-ip', ip, LIMITS.BOOKING_WINDOW_SECONDS);
    notifyNewBooking_(rec, pkg ? pkg.name : '');
    return { id: rec.id };
  },

  list: function (p) {
    var status = p && p.status;
    var pkgs = {};
    Db.all('packages').forEach(function (x) {
      pkgs[x.id] = x.name;
    });
    return Db.all('bookings')
      .filter(function (b) {
        return !status || b.status === status;
      })
      .sort(function (a, b) {
        return String(b.created_at).localeCompare(String(a.created_at));
      })
      .map(function (b) {
        b.package_name = b.package_id ? pkgs[b.package_id] || '(paket dihapus)' : '';
        return b;
      });
  },

  updateStatus: function (p) {
    var id = requireString(p, 'id', 'id');
    var patch = validateRecord(
      'bookings',
      { status: p.status, admin_note: p.admin_note },
      { partial: true }
    );
    if (p.admin_note === undefined) delete patch.admin_note;
    if (!patch.status) throw new AppError('VALIDATION', 'Status wajib diisi');
    return withLock(function () {
      return Db.update('bookings', id, patch);
    });
  },

  delete: function (p) {
    var id = requireString(p, 'id', 'id');
    return withLock(function () {
      Db.remove('bookings', id);
      return { id: id };
    });
  }
};

// ===================== handlers/Crud.js =====================
/**
 * Handler CRUD generik untuk tabel konten.
 * Action: <tabel>.list | get | create | update | delete | reorder | toggle
 *
 * Payload:
 *   list    { includeInactive?: boolean }
 *   get     { id } | { slug }
 *   create  { data: {...} }
 *   update  { id, data: {...} }   (partial)
 *   delete  { id }
 *   reorder { ids: string[] }      (urutan baru, index 0 = paling atas)
 *   toggle  { id, is_active: boolean }
 */

function ensureUniqueSlug_(table, base, excludeId) {
  var slug = base || 'item';
  var rows = Db.allFresh(table);
  var taken = {};
  rows.forEach(function (r) {
    if (r.id !== excludeId) taken[r.slug] = true;
  });
  if (!taken[slug]) return slug;
  for (var i = 2; i < 1000; i++) {
    var candidate = slug + '-' + i;
    if (!taken[candidate]) return candidate;
  }
  return slug + '-' + Utilities.getUuid().substring(0, 8);
}

var CRUD_HOOKS = {
  packages: {
    beforeSave: function (data) {
      if ('category_id' in data && !Db.findById('categories', data.category_id, true)) {
        throw new AppError('VALIDATION', 'Kategori tidak ditemukan.', {
          fieldErrors: { category_id: 'Pilih kategori yang valid' }
        });
      }
    }
  },
  categories: {
    beforeDelete: function (existing) {
      var used = Db.allFresh('packages').filter(function (p) {
        return p.category_id === existing.id;
      }).length;
      if (used > 0) {
        throw new AppError(
          'CONFLICT',
          'Kategori ini masih dipakai oleh ' + used + ' paket. Pindahkan atau hapus paketnya terlebih dahulu.'
        );
      }
    }
  }
};

function crudHandlers(table) {
  var def = TABLES[table];
  var hooks = CRUD_HOOKS[table] || {};
  var hasSlug = !!def.fields.slug;

  return {
    list: function (p) {
      return Db.list(table, { includeInactive: !!(p && p.includeInactive) });
    },

    get: function (p) {
      var rec = null;
      if (p && p.id) rec = Db.findById(table, String(p.id));
      else if (p && p.slug && hasSlug) rec = Db.findBy(table, 'slug', String(p.slug));
      else throw new AppError('VALIDATION', 'id atau slug wajib diisi');
      if (!rec) throw new AppError('NOT_FOUND', def.label + ' tidak ditemukan.');
      return rec;
    },

    create: function (p) {
      return withLock(function () {
        var data = validateRecord(table, (p && p.data) || {}, { partial: false });
        if (hooks.beforeSave) hooks.beforeSave(data, null);
        if (hasSlug) data.slug = ensureUniqueSlug_(table, data.slug || slugify(data[def.slugFrom]), null);
        return Db.insert(table, data);
      });
    },

    update: function (p) {
      var id = requireString(p, 'id', 'id');
      var removed = [];
      var result = withLock(function () {
        var existing = Db.findById(table, id, true);
        if (!existing) throw new AppError('NOT_FOUND', def.label + ' tidak ditemukan.');
        var data = validateRecord(table, (p && p.data) || {}, { partial: true });
        if (hooks.beforeSave) hooks.beforeSave(data, existing);
        if (hasSlug && ('slug' in data || def.slugFrom in data)) {
          var base = data.slug || existing.slug || slugify(data[def.slugFrom] || existing[def.slugFrom]);
          data.slug = ensureUniqueSlug_(table, base, id);
        }
        var updated = Db.update(table, id, data);
        var before = collectImageIds(table, existing);
        var after = collectImageIds(table, updated);
        removed = before.filter(function (x) {
          return after.indexOf(x) === -1;
        });
        return updated;
      });
      // Trash file di luar lock: operasi Drive lambat dan tidak perlu dikunci.
      DriveStore.trashMany(removed);
      return result;
    },

    delete: function (p) {
      var id = requireString(p, 'id', 'id');
      var removedRec = withLock(function () {
        var existing = Db.findById(table, id, true);
        if (!existing) throw new AppError('NOT_FOUND', def.label + ' tidak ditemukan.');
        if (hooks.beforeDelete) hooks.beforeDelete(existing);
        return Db.remove(table, id);
      });
      var trashed = DriveStore.trashMany(collectImageIds(table, removedRec));
      return { id: id, trashedFiles: trashed };
    },

    reorder: function (p) {
      var ids = p && p.ids;
      if (!Array.isArray(ids) || ids.length > 1000) throw new AppError('VALIDATION', 'Daftar urutan tidak valid');
      ids = ids.map(String);
      return withLock(function () {
        return Db.reorder(table, ids);
      });
    },

    toggle: function (p) {
      var id = requireString(p, 'id', 'id');
      if (typeof p.is_active !== 'boolean') throw new AppError('VALIDATION', 'is_active harus boolean');
      return withLock(function () {
        if (!Db.findById(table, id, true)) throw new AppError('NOT_FOUND', def.label + ' tidak ditemukan.');
        return Db.update(table, id, { is_active: p.is_active });
      });
    }
  };
}

// ===================== handlers/Public.js =====================
/**
 * Data untuk halaman publik & dashboard admin.
 */

var PublicHandlers = {
  /**
   * Semua konten aktif dalam satu panggilan (dicache di Next.js dengan tag
   * "public-content"). Paket dari kategori nonaktif ikut disembunyikan.
   */
  snapshot: function () {
    var categories = Db.list('categories');
    var activeCat = {};
    categories.forEach(function (c) {
      activeCat[c.id] = true;
    });
    return {
      settings: getSettings(),
      categories: categories,
      packages: Db.list('packages').filter(function (p) {
        return activeCat[p.category_id];
      }),
      equipment: Db.list('equipment'),
      gallery: Db.list('gallery'),
      testimonials: Db.list('testimonials'),
      faqs: Db.list('faqs'),
      generated_at: new Date().toISOString()
    };
  }
};

var DashboardHandlers = {
  stats: function () {
    var bookings = Db.all('bookings');
    var latest = bookings
      .slice()
      .sort(function (a, b) {
        return String(b.created_at).localeCompare(String(a.created_at));
      })
      .slice(0, 5);
    var countActive = function (t) {
      return Db.count(t, function (r) {
        return r.is_active;
      });
    };
    return {
      packages: { active: countActive('packages'), total: Db.count('packages') },
      categories: { active: countActive('categories'), total: Db.count('categories') },
      equipment: { active: countActive('equipment'), total: Db.count('equipment') },
      gallery: { active: countActive('gallery'), total: Db.count('gallery') },
      testimonials: { active: countActive('testimonials'), total: Db.count('testimonials') },
      faqs: { active: countActive('faqs'), total: Db.count('faqs') },
      bookings: {
        baru: bookings.filter(function (b) {
          return b.status === 'baru';
        }).length,
        dihubungi: bookings.filter(function (b) {
          return b.status === 'dihubungi';
        }).length,
        deal: bookings.filter(function (b) {
          return b.status === 'deal';
        }).length,
        total: bookings.length
      },
      latestBookings: latest
    };
  }
};

// ===================== handlers/Settings.js =====================
/**
 * settings: sheet key/value. Action: settings.get, settings.update
 */

function readSettingsFresh_() {
  var sheet = getSheet_('settings');
  var lastRow = sheet.getLastRow();
  var out = {};
  if (lastRow < 2) return out;
  var values = sheet.getRange(1, 1, lastRow, 3).getValues();
  var header = values[0].map(String);
  var kIdx = header.indexOf('key');
  var vIdx = header.indexOf('value');
  for (var i = 1; i < values.length; i++) {
    var k = String(values[i][kIdx] || '').trim();
    if (k) out[k] = values[i][vIdx] === null || values[i][vIdx] === undefined ? '' : String(values[i][vIdx]);
  }
  return out;
}

function getSettings() {
  var stored = cachedTable('settings', readSettingsFresh_);
  var out = {};
  Object.keys(SETTINGS_KEYS).forEach(function (k) {
    out[k] = stored[k] || '';
  });
  return out;
}

var SettingsHandlers = {
  get: function () {
    return getSettings();
  },

  update: function (p) {
    var values = p && p.values;
    if (!values || typeof values !== 'object') throw new AppError('VALIDATION', 'values wajib diisi');
    var errors = {};
    var clean = {};
    Object.keys(values).forEach(function (k) {
      if (!(k in SETTINGS_KEYS)) return; // abaikan key tak dikenal
      var v = values[k] === null || values[k] === undefined ? '' : String(values[k]).trim();
      if (v.length > SETTINGS_KEYS[k]) errors[k] = 'Maksimal ' + SETTINGS_KEYS[k] + ' karakter';
      if ((k === 'whatsapp' || k === 'phone') && v) {
        v = normalizePhone(v);
        if (v.length < 9 || v.length > 15) errors[k] = 'Nomor tidak valid';
      }
      if ((k === 'logo_id' || k === 'hero_image_id') && v && !FILE_ID_RE.test(v)) errors[k] = 'ID gambar tidak valid';
      if (k === 'maps_embed_url' && v && v.indexOf('https://www.google.com/maps/embed') !== 0) {
        errors[k] = 'Gunakan link embed dari Google Maps (Bagikan > Sematkan peta)';
      }
      clean[k] = v;
    });
    if (Object.keys(errors).length) {
      throw new AppError('VALIDATION', 'Periksa kembali isian Anda.', { fieldErrors: errors });
    }

    var replacedFiles = [];
    withLock(function () {
      var sheet = getSheet_('settings');
      var lastRow = sheet.getLastRow();
      var data = lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, 3).getValues() : [];
      var rowByKey = {};
      data.forEach(function (row, i) {
        rowByKey[String(row[0]).trim()] = { index: i + 2, value: String(row[1]) };
      });
      var now = new Date().toISOString();
      var appendRows = [];
      Object.keys(clean).forEach(function (k) {
        var cell = toCell({ type: 'string' }, clean[k]);
        if (rowByKey[k]) {
          if (rowByKey[k].value === clean[k]) return;
          if ((k === 'logo_id' || k === 'hero_image_id') && rowByKey[k].value) {
            replacedFiles.push(rowByKey[k].value);
          }
          sheet.getRange(rowByKey[k].index, 2, 1, 2).setValues([[cell, now]]);
        } else {
          appendRows.push([k, cell, now]);
        }
      });
      if (appendRows.length) {
        sheet.getRange(sheet.getLastRow() + 1, 1, appendRows.length, 3).setValues(appendRows);
      }
      bumpCacheVersion('settings');
    });
    DriveStore.trashMany(replacedFiles);
    return getSettings();
  }
};

// ===================== Lock.js =====================
/**
 * Semua operasi tulis dibungkus withLock() agar tidak terjadi race condition
 * (dua admin menyimpan bersamaan, atau booking masuk bersamaan).
 * Re-entrant: pemanggilan bertingkat di eksekusi yang sama hanya mengunci sekali.
 */
var lockDepth_ = 0;

function withLock(fn) {
  if (lockDepth_ > 0) {
    lockDepth_++;
    try {
      return fn();
    } finally {
      lockDepth_--;
    }
  }
  var lock = LockService.getScriptLock();
  var acquired = lock.tryLock(LIMITS.LOCK_WAIT_MS);
  if (!acquired) {
    throw new AppError('BUSY', 'Server sedang sibuk memproses permintaan lain. Silakan coba lagi.');
  }
  lockDepth_ = 1;
  try {
    return fn();
  } finally {
    lockDepth_ = 0;
    // flush memastikan perubahan Spreadsheet ditulis sebelum lock dilepas
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

// ===================== Main.js =====================
/**
 * Entry point Web App.
 *
 * Request : POST body JSON { apiKey, action, payload }
 * Response: { success, data, message, code? }
 *
 * Apps Script Web App tidak bisa membaca header HTTP, sehingga API key
 * dikirim di body. Endpoint ini hanya boleh dipanggil dari server Next.js.
 */

function getRoutes_() {
  var routes = {
    'system.ping': function () {
      return { version: APP_VERSION, time: new Date().toISOString() };
    },
    'system.clearCache': function () {
      bumpAllCacheVersions();
      return { cleared: true };
    },
    'public.snapshot': PublicHandlers.snapshot,
    'dashboard.stats': DashboardHandlers.stats,
    'settings.get': SettingsHandlers.get,
    'settings.update': SettingsHandlers.update,
    'bookings.create': BookingHandlers.create,
    'bookings.list': BookingHandlers.list,
    'bookings.updateStatus': BookingHandlers.updateStatus,
    'bookings.delete': BookingHandlers.delete,
    'upload.image': DriveStore.saveImage,
    'upload.delete': function (p) {
      return { trashed: DriveStore.trash(requireString(p, 'fileId', 'fileId')) };
    },
    'auth.getCredential': AuthHandlers.getCredential,
    'auth.loginFailed': AuthHandlers.loginFailed,
    'auth.loginSucceeded': AuthHandlers.loginSucceeded,
    'admins.get': AuthHandlers.getAdmin,
    'admins.changePassword': AuthHandlers.changePassword,
    'analytics.track': AnalyticsHandlers.track,
    'analytics.summary': AnalyticsHandlers.summary
  };
  CRUD_TABLES.forEach(function (table) {
    var h = crudHandlers(table);
    Object.keys(h).forEach(function (op) {
      routes[table + '.' + op] = h[op];
    });
  });
  return routes;
}

/** Perbandingan string waktu-konstan untuk API key. */
function safeEqual_(a, b) {
  a = String(a || '');
  b = String(b || '');
  var diff = a.length ^ b.length;
  var len = Math.max(a.length, b.length);
  for (var i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/** Logika inti (tanpa ContentService) supaya mudah dites. */
function handleRequest(rawBody) {
  try {
    if (typeof rawBody !== 'string' || !rawBody) throw new AppError('BAD_REQUEST', 'Body kosong.');
    if (rawBody.length > LIMITS.MAX_BODY_CHARS) throw new AppError('BAD_REQUEST', 'Body terlalu besar.');
    var body;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      throw new AppError('BAD_REQUEST', 'Body harus JSON.');
    }
    var expected = getProp('API_KEY', true);
    if (expected.length < 32) throw new AppError('CONFIG', 'API_KEY terlalu pendek (minimal 32 karakter).');
    if (!safeEqual_(body.apiKey, expected)) throw new AppError('UNAUTHORIZED', 'API key tidak valid.');

    var action = String(body.action || '');
    var handler = getRoutes_()[action];
    if (!handler) throw new AppError('NOT_FOUND', 'Action tidak dikenal: ' + action);

    var payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
    return ok(handler(payload));
  } catch (err) {
    return fail(err);
  }
}

function doPost(e) {
  var raw = e && e.postData ? e.postData.contents : '';
  return jsonOutput(handleRequest(raw));
}

/** Health check. Tidak mengembalikan data apa pun. */
function doGet() {
  return jsonOutput(ok({ status: 'ok', version: APP_VERSION }, 'Genta Buana API'));
}

// ===================== RateLimit.js =====================
/**
 * Rate limit sederhana berbasis CacheService (state bersama antar request,
 * berbeda dengan memori serverless Vercel yang tidak dibagi antar instance).
 * Catatan: increment CacheService tidak atomik, jadi batasnya perkiraan
 * (cukup untuk mencegah brute force/spam, bukan penghitung yang presisi).
 */

function rateKey_(scope, id) {
  var safe = String(id || 'unknown').toLowerCase().replace(/[^a-z0-9:._@-]/g, '').substring(0, 120);
  return 'rl:' + scope + ':' + safe;
}

function rateCount(scope, id) {
  return Number(CacheService.getScriptCache().get(rateKey_(scope, id)) || '0');
}

function rateHit(scope, id, windowSeconds) {
  var cache = CacheService.getScriptCache();
  var key = rateKey_(scope, id);
  var n = Number(cache.get(key) || '0') + 1;
  cache.put(key, String(n), windowSeconds);
  return n;
}

function rateReset(scope, id) {
  CacheService.getScriptCache().remove(rateKey_(scope, id));
}

// ===================== Response.js =====================
/**
 * Format response seragam: { success, data, message, code? }
 * Apps Script Web App selalu membalas HTTP 200, jadi status sukses/gagal
 * dibaca dari field `success` (dan `code` untuk jenis error).
 */

/**
 * Error yang aman ditampilkan ke pemanggil.
 * Kode: BAD_REQUEST, VALIDATION, UNAUTHORIZED, NOT_FOUND, CONFLICT,
 *       RATE_LIMITED, BUSY, CONFIG, INTERNAL
 */
function AppError(code, message, details) {
  this.name = 'AppError';
  this.code = code;
  this.message = message;
  this.details = details || null;
  this.stack = new Error(message).stack;
}
AppError.prototype = Object.create(Error.prototype);
AppError.prototype.constructor = AppError;

function ok(data, message) {
  return { success: true, data: data === undefined ? null : data, message: message || 'OK' };
}

function fail(err) {
  if (err instanceof AppError) {
    var out = { success: false, data: err.details, message: err.message, code: err.code };
    return out;
  }
  // Error tak terduga: jangan bocorkan detail internal ke klien, tapi log lengkap.
  console.error('[INTERNAL]', err && err.stack ? err.stack : err);
  return {
    success: false,
    data: null,
    message: 'Terjadi kesalahan pada server. Silakan coba lagi.',
    code: 'INTERNAL'
  };
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

// ===================== Setup.js =====================
/**
 * SETUP — jalankan manual dari editor Apps Script (pilih fungsi "setup" lalu Run).
 * Fungsi ini TIDAK bisa dipanggil lewat API.
 *
 * Idempoten: aman dijalankan berkali-kali. Sheet yang sudah ada tidak ditimpa,
 * kolom yang belum ada ditambahkan di ujung, dan seed hanya diisi bila sheet kosong.
 */

var SHEET_ORDER = ['settings', 'categories', 'packages', 'equipment', 'gallery', 'testimonials', 'faqs', 'bookings', 'admins', 'analytics_events', 'analytics_daily'];

function sheetColumns_(name) {
  if (name === 'settings') return ['key', 'value', 'updated_at'];
  if (name === 'analytics_events') return ANALYTICS_EVENTS_COLUMNS;
  if (name === 'analytics_daily') return ANALYTICS_DAILY_COLUMNS;
  return getColumns(name);
}

function setup() {
  getProp('SPREADSHEET_ID', true);
  getProp('DRIVE_FOLDER_ID', true);
  var ss = getSpreadsheet();
  var report = [];

  withLock(function () {
    SHEET_ORDER.forEach(function (name) {
      var columns = sheetColumns_(name);
      var res = ensureSheet_(ss, name, columns);
      report.push(name + ': ' + res);
    });

    var seeded = seedAll_(ss);
    report.push('seed: ' + (seeded.length ? seeded.join(', ') : 'tidak ada (data sudah ada)'));

    // Hapus sheet bawaan yang kosong ("Sheet1" / "Lembar1")
    // Catat nama SEBELUM menghapus: objek sheet yang sudah dihapus tidak bisa dibaca lagi.
    ss.getSheets().forEach(function (sh) {
      var name = sh.getName();
      if (SHEET_ORDER.indexOf(name) === -1 && sh.getLastRow() === 0 && ss.getSheets().length > 1) {
        ss.deleteSheet(sh);
        report.push('hapus sheet kosong: ' + name);
      }
    });
  });

  bumpAllCacheVersions();
  report.push(installEditTrigger_());
  report.push(installAnalyticsTrigger_());
  report.push(checkConfigText_());
  console.log('SETUP SELESAI\n' + report.join('\n'));
  return report;
}

function ensureSheet_(ss, name, columns) {
  var sheet = ss.getSheetByName(name);
  var status = 'sudah ada';
  if (!sheet) {
    sheet = ss.insertSheet(name);
    status = 'dibuat';
  }
  var lastCol = sheet.getLastColumn();
  var header = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  var missing = columns.filter(function (c) {
    return header.indexOf(c) === -1;
  });
  if (missing.length) {
    var startCol = header.filter(Boolean).length + 1;
    sheet.getRange(1, startCol, 1, missing.length).setValues([missing]);
    if (status === 'sudah ada') status = 'tambah kolom: ' + missing.join(', ');
  }
  var totalCols = Math.max(sheet.getLastColumn(), columns.length);
  // Format seluruh kolom sebagai Plain Text agar nomor HP (0/62 di depan) & tanggal tidak dikonversi otomatis.
  sheet.getRange(1, 1, sheet.getMaxRows(), totalCols).setNumberFormat('@');
  sheet.getRange(1, 1, 1, totalCols).setFontWeight('bold').setBackground('#1f2937').setFontColor('#fbbf24');
  sheet.setFrozenRows(1);
  return status;
}

function writeRows_(sheet, table, records) {
  var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  var now = new Date().toISOString();
  var rows = records.map(function (r, i) {
    var rec = {};
    Object.keys(r).forEach(function (k) {
      rec[k] = r[k];
    });
    rec.id = rec.id || Utilities.getUuid();
    rec.sort_order = rec.sort_order || i + 1;
    rec.is_active = rec.is_active === undefined ? true : rec.is_active;
    rec.created_at = now;
    rec.updated_at = now;
    return header.map(function (col) {
      return toCell(columnRule(table, col), rec[col]);
    });
  });
  if (rows.length) sheet.getRange(2, 1, rows.length, header.length).setValues(rows);
}

function isEmptySheet_(sheet) {
  return sheet.getLastRow() < 2;
}

function seedAll_(ss) {
  var done = [];
  var seed = getSeedData_();

  var settingsSheet = ss.getSheetByName('settings');
  if (isEmptySheet_(settingsSheet)) {
    var now = new Date().toISOString();
    var rows = Object.keys(seed.settings).map(function (k) {
      return [k, toCell({ type: 'string' }, seed.settings[k]), now];
    });
    settingsSheet.getRange(2, 1, rows.length, 3).setValues(rows);
    done.push('settings');
  }

  ['categories', 'packages', 'equipment', 'gallery', 'testimonials', 'faqs'].forEach(function (t) {
    var sh = ss.getSheetByName(t);
    if (isEmptySheet_(sh)) {
      writeRows_(sh, t, seed[t]);
      done.push(t);
    }
  });

  var adminSheet = ss.getSheetByName('admins');
  if (isEmptySheet_(adminSheet)) {
    var username = getProp('ADMIN_INITIAL_USERNAME', false);
    var hash = getProp('ADMIN_INITIAL_PASSWORD_HASH', false);
    if (username && hash && PASSWORD_HASH_RE.test(hash)) {
      writeRows_(adminSheet, 'admins', [
        { username: username.toLowerCase(), password_hash: hash, role: 'owner', last_login_at: '' }
      ]);
      done.push('admins (' + username + ')');
    } else {
      console.warn(
        'Admin belum dibuat: isi Script Properties ADMIN_INITIAL_USERNAME & ADMIN_INITIAL_PASSWORD_HASH ' +
          '(buat hash dengan "npm run hash-password"), lalu jalankan setup() lagi.'
      );
    }
  }
  return done;
}

function getSeedData_() {
  var cHajatan = Utilities.getUuid();
  var cEvent = Utilities.getUuid();
  var cMeeting = Utilities.getUuid();
  return {
    settings: {
      business_name: 'Genta Buana',
      tagline: 'Sewa Sound System & Perlengkapan Acara',
      description:
        'Genta Buana melayani sewa sound system untuk hajatan, pernikahan, acara kampung, event sekolah, dan kantor. Peralatan terawat, operator berpengalaman, harga transparan.',
      about:
        'Genta Buana adalah penyedia jasa sewa sound system dan perlengkapan acara. Kami percaya setiap acara layak terdengar jernih dan berkesan.\n\nKami melayani pemasangan, pengoperasian oleh operator berpengalaman, hingga pembongkaran setelah acara selesai, sehingga Anda bisa fokus menikmati acara.',
      address: '[ISI: alamat lengkap]',
      service_area: '[ISI: area layanan, mis. Kota & Kabupaten sekitarnya]',
      whatsapp: '6281234567890',
      phone: '6281234567890',
      email: 'halo@gentabuana.example',
      instagram: 'https://instagram.com/gentabuana',
      facebook: '',
      tiktok: '',
      youtube: '',
      maps_url: '',
      maps_embed_url: '',
      opening_hours: 'Setiap hari, 08.00 - 21.00 WIB',
      logo_id: '',
      hero_image_id: '',
      wa_default_message: 'Halo Genta Buana, saya ingin bertanya tentang sewa sound system.',
      price_note: 'Harga dapat berubah sesuai lokasi & durasi acara. Belum termasuk biaya transport luar kota.'
    },
    categories: [
      { id: cHajatan, name: 'Hajatan & Pernikahan', slug: 'hajatan-pernikahan', description: 'Paket untuk resepsi, akad, khitanan, dan syukuran.' },
      { id: cEvent, name: 'Event & Panggung', slug: 'event-panggung', description: 'Paket untuk panggung hiburan, acara kampung, dan konser kecil.' },
      { id: cMeeting, name: 'Seminar, Sekolah & Kantor', slug: 'seminar-sekolah-kantor', description: 'Paket ringkas untuk rapat, seminar, wisuda, dan pentas sekolah.' }
    ],
    packages: [
      {
        category_id: cMeeting, name: 'Paket Meeting Ringkas', slug: 'paket-meeting-ringkas',
        description: 'Cocok untuk rapat, seminar, pengajian kecil, atau acara di dalam ruangan.',
        price: 600000, price_unit: 'per_hari',
        specs: [{ label: 'Speaker', value: '2x speaker aktif 12 inch' }, { label: 'Mixer', value: 'Mixer 6 channel' }, { label: 'Mic', value: '2 mic wireless + 1 mic kabel' }, { label: 'Lainnya', value: 'Stand speaker & kabel lengkap' }],
        capacity: 'Hingga 100 orang · 800 W', image_ids: [], is_featured: false
      },
      {
        category_id: cHajatan, name: 'Paket Hajatan Standar', slug: 'paket-hajatan-standar',
        description: 'Paket paling laris untuk hajatan rumahan dan syukuran dengan suara jernih dan bertenaga.',
        price: 1500000, price_unit: 'per_acara',
        specs: [{ label: 'Speaker', value: '4x speaker 15 inch' }, { label: 'Subwoofer', value: '1x subwoofer 18 inch' }, { label: 'Mixer', value: 'Mixer 12 channel' }, { label: 'Mic', value: '3 mic wireless' }, { label: 'Operator', value: '1 operator selama acara' }],
        capacity: '200 - 300 tamu · 3.000 W', image_ids: [], is_featured: true
      },
      {
        category_id: cHajatan, name: 'Paket Pernikahan Premium', slug: 'paket-pernikahan-premium',
        description: 'Line array untuk resepsi pernikahan besar, lengkap dengan mixer digital dan lighting dasar.',
        price: 3500000, price_unit: 'per_acara',
        specs: [{ label: 'Speaker', value: 'Line array 4 top' }, { label: 'Subwoofer', value: '2x subwoofer 18 inch' }, { label: 'Mixer', value: 'Mixer digital 16 channel' }, { label: 'Mic', value: '4 mic wireless' }, { label: 'Lighting', value: '8 lampu PAR LED' }, { label: 'Operator', value: '2 operator' }],
        capacity: '400 - 600 tamu · 6.000 W', image_ids: [], is_featured: true
      },
      {
        category_id: cEvent, name: 'Paket Panggung Hiburan', slug: 'paket-panggung-hiburan',
        description: 'Siap untuk organ tunggal, band, dan dangdutan di acara kampung atau 17-an.',
        price: 6500000, price_unit: 'per_acara',
        specs: [{ label: 'Speaker', value: 'Line array 8 top' }, { label: 'Subwoofer', value: '4x subwoofer 18 inch' }, { label: 'Monitor', value: '4 monitor panggung' }, { label: 'Mixer', value: 'Mixer digital 32 channel' }, { label: 'Mic', value: '6 mic wireless + mic instrumen' }, { label: 'Genset', value: 'Genset 10.000 W' }],
        capacity: '1.000+ penonton · 10.000 W', image_ids: [], is_featured: true
      },
      {
        category_id: cMeeting, name: 'Paket Pentas Sekolah', slug: 'paket-pentas-sekolah',
        description: 'Untuk perpisahan, wisuda, dan pentas seni sekolah. Termasuk monitor panggung.',
        price: 2000000, price_unit: 'per_acara',
        specs: [{ label: 'Speaker', value: '4x speaker 15 inch' }, { label: 'Subwoofer', value: '2x subwoofer 18 inch' }, { label: 'Monitor', value: '2 monitor panggung' }, { label: 'Mic', value: '4 mic wireless' }],
        capacity: '300 - 500 orang · 4.000 W', image_ids: [], is_featured: false
      },
      {
        category_id: cEvent, name: 'Paket Acara Kampung', slug: 'paket-acara-kampung',
        description: 'Untuk pengajian akbar, lomba, dan acara warga di lapangan terbuka.',
        price: 2500000, price_unit: 'per_acara',
        specs: [{ label: 'Speaker', value: '6x speaker 15 inch' }, { label: 'Subwoofer', value: '2x subwoofer 18 inch' }, { label: 'Mixer', value: 'Mixer 16 channel' }, { label: 'Mic', value: '4 mic wireless' }],
        capacity: '500 - 800 orang · 5.000 W', image_ids: [], is_featured: false
      }
    ],
    equipment: [
      { name: 'Speaker aktif 15 inch', description: 'Speaker aktif 1.000 W + stand', price: 150000, unit: 'per hari', image_id: '' },
      { name: 'Subwoofer 18 inch', description: 'Subwoofer aktif untuk bass bertenaga', price: 250000, unit: 'per hari', image_id: '' },
      { name: 'Mixer 12 channel', description: 'Mixer analog dengan efek vokal', price: 150000, unit: 'per hari', image_id: '' },
      { name: 'Mic wireless', description: 'Mic wireless genggam (1 unit)', price: 75000, unit: 'per hari', image_id: '' },
      { name: 'Lampu PAR LED', description: 'Lampu panggung RGB', price: 50000, unit: 'per unit/hari', image_id: '' },
      { name: 'Genset 5.000 W', description: 'Genset silent + operator', price: 500000, unit: 'per hari', image_id: '' }
    ],
    gallery: [
      { title: 'Resepsi Pernikahan Andi & Sari', event_type: 'Pernikahan', event_date: '2026-06-14', location: '[ISI lokasi]', description: 'Paket Pernikahan Premium', image_ids: [] },
      { title: 'Panggung 17 Agustus', event_type: 'Acara Kampung', event_date: '2026-08-17', location: '[ISI lokasi]', description: 'Paket Panggung Hiburan', image_ids: [] },
      { title: 'Wisuda SMA', event_type: 'Sekolah', event_date: '2026-05-30', location: '[ISI lokasi]', description: 'Paket Pentas Sekolah', image_ids: [] },
      { title: 'Seminar Kantor', event_type: 'Kantor', event_date: '2026-03-12', location: '[ISI lokasi]', description: 'Paket Meeting Ringkas', image_ids: [] }
    ],
    testimonials: [
      { name: 'Bu Rina', event: 'Pernikahan anak', message: 'Suaranya jernih, operatornya sigap, dan datang tepat waktu. Tamu-tamu puas semua.', rating: 5 },
      { name: 'Pak Dodi', event: 'Ketua RT, acara 17-an', message: 'Harga jelas dari awal, tidak ada biaya tambahan mendadak. Tahun depan pakai lagi.', rating: 5 },
      { name: 'Panitia Wisuda SMA', event: 'Wisuda sekolah', message: 'Pemasangan rapi dan cepat. Mic wireless aman tanpa dengung.', rating: 4 }
    ],
    faqs: [
      { question: 'Bagaimana cara memesan?', answer: 'Pilih paket di halaman Pricelist, lalu klik "Pesan via WhatsApp" atau isi form booking. Kami akan menghubungi Anda untuk konfirmasi.' },
      { question: 'Apakah harga sudah termasuk operator?', answer: 'Sebagian besar paket sudah termasuk operator. Detailnya tertulis di spesifikasi setiap paket.' },
      { question: 'Berapa lama sebelum acara sebaiknya memesan?', answer: 'Idealnya 1 - 2 minggu sebelumnya, terutama di musim nikahan. Untuk pesanan mendadak, silakan hubungi kami lewat WhatsApp.' },
      { question: 'Apakah perlu DP?', answer: 'Ya, kami meminta DP untuk mengunci tanggal. Pelunasan dilakukan di hari acara.' },
      { question: 'Apakah melayani di luar kota?', answer: 'Bisa. Biaya transport menyesuaikan jarak lokasi acara.' },
      { question: 'Bagaimana jika listrik di lokasi kurang?', answer: 'Kami menyediakan sewa genset. Beri tahu kami daya listrik di lokasi saat konsultasi.' }
    ]
  };
}

/* ---------- Utilitas yang bisa dijalankan manual dari editor ---------- */

/** Buat API_KEY acak bila belum ada, lalu tampilkan di log (salin ke .env Next.js sebagai GAS_API_KEY). */
function initApiKey() {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('API_KEY');
  if (!key) {
    key = (Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
    props.setProperty('API_KEY', key);
    console.log('API_KEY baru dibuat. Salin ke GAS_API_KEY di .env / Vercel:\n' + key);
  } else {
    console.log('API_KEY sudah ada (panjang ' + key.length + ' karakter). Lihat di Project Settings > Script Properties.');
  }
}

/** Cek Script Properties & akses ke Spreadsheet/Drive. */
function checkConfig() {
  console.log(checkConfigText_());
}

function checkConfigText_() {
  var lines = ['--- Cek konfigurasi ---'];
  ['API_KEY', 'SPREADSHEET_ID', 'DRIVE_FOLDER_ID', 'ADMIN_INITIAL_USERNAME', 'ADMIN_INITIAL_PASSWORD_HASH', 'NOTIFY_EMAIL'].forEach(function (k) {
    var v = getProp(k, false);
    lines.push(k + ': ' + (v ? 'terisi' : k === 'NOTIFY_EMAIL' ? 'kosong (opsional)' : 'BELUM DIISI'));
  });
  try {
    lines.push('Spreadsheet: ' + getSpreadsheet().getName());
  } catch (e) {
    lines.push('Spreadsheet: GAGAL dibuka (' + e.message + ')');
  }
  try {
    lines.push('Folder Drive: ' + getUploadFolder().getName());
  } catch (e2) {
    lines.push('Folder Drive: GAGAL dibuka (' + e2.message + ')');
  }
  return lines.join('\n');
}

/** Hapus cache Apps Script (mis. setelah mengedit Spreadsheet secara manual). */
function clearCache() {
  bumpAllCacheVersions();
  console.log('Cache Apps Script dibersihkan.');
}

/**
 * Trigger onEdit untuk Spreadsheet: bila pemilik mengedit Sheet secara manual,
 * cache tabel terkait otomatis di-invalidate.
 */
function installEditTrigger_() {
  try {
    var exists = ScriptApp.getProjectTriggers().some(function (t) {
      return t.getHandlerFunction() === 'onSheetEdit';
    });
    if (exists) return 'trigger onEdit: sudah ada';
    ScriptApp.newTrigger('onSheetEdit').forSpreadsheet(getProp('SPREADSHEET_ID', true)).onEdit().create();
    return 'trigger onEdit: dipasang';
  } catch (e) {
    return 'trigger onEdit: gagal dipasang (' + e.message + ')';
  }
}

/** Trigger per jam untuk merangkum event analitik ke analytics_daily. */
function installAnalyticsTrigger_() {
  try {
    var exists = ScriptApp.getProjectTriggers().some(function (t) {
      return t.getHandlerFunction() === 'aggregateAnalytics';
    });
    if (exists) return 'trigger analitik per jam: sudah ada';
    ScriptApp.newTrigger('aggregateAnalytics').timeBased().everyHours(1).create();
    return 'trigger analitik per jam: dipasang';
  } catch (e) {
    return 'trigger analitik per jam: gagal dipasang (' + e.message + ')';
  }
}

function onSheetEdit(e) {
  try {
    var name = e && e.range ? e.range.getSheet().getName() : '';
    if (name === 'settings' || TABLES[name]) bumpCacheVersion(name);
  } catch (err) {
    console.warn('onSheetEdit gagal', err);
  }
}

// ===================== Validate.js =====================
/**
 * Validasi dasar di sisi Apps Script (lapis kedua setelah Zod di Next.js),
 * plus konversi nilai <-> sel Spreadsheet.
 */

var FILE_ID_RE = /^[A-Za-z0-9_-]{10,128}$/;
var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' dan ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

function normalizePhone(input) {
  var digits = String(input || '').replace(/[^0-9]/g, '');
  if (digits.indexOf('0') === 0) digits = '62' + digits.substring(1);
  if (digits.indexOf('8') === 0) digits = '62' + digits;
  return digits;
}

function isValidDate_(str) {
  if (!DATE_RE.test(str)) return false;
  var d = new Date(str + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().substring(0, 10) === str;
}

function isPlainObject_(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Validasi & bersihkan satu field. Melempar pesan error (string) bila tidak valid.
 */
function cleanField_(name, rule, raw) {
  var label = rule.label || name;
  var empty = raw === undefined || raw === null || raw === '';

  if (empty) {
    if (rule.required) throw label + ' wajib diisi';
    if (rule.default !== undefined) return JSON.parse(JSON.stringify(rule.default));
    if (rule.type === 'json') return [];
    if (rule.type === 'boolean') return false;
    if (rule.type === 'number' || rule.type === 'integer') return 0;
    return '';
  }

  switch (rule.type) {
    case 'string':
    case 'text': {
      var s = String(raw).trim();
      if (rule.required && !s) throw label + ' wajib diisi';
      if (rule.max && s.length > rule.max) throw label + ' maksimal ' + rule.max + ' karakter';
      return s;
    }
    case 'slug': {
      var slug = slugify(raw);
      if (rule.max && slug.length > rule.max) throw label + ' terlalu panjang';
      return slug;
    }
    case 'number':
    case 'integer': {
      var n = raw;
      if (typeof raw !== 'number') {
        var str = String(raw).trim();
        if (!/^-?\d+(\.\d+)?$/.test(str)) throw label + ' harus berupa angka';
        n = Number(str);
      }
      if (!isFinite(n)) throw label + ' harus berupa angka';
      if (rule.type === 'integer' && Math.floor(n) !== n) throw label + ' harus bilangan bulat';
      if (rule.min !== undefined && n < rule.min) throw label + ' minimal ' + rule.min;
      if (rule.max !== undefined && n > rule.max) throw label + ' maksimal ' + rule.max;
      return n;
    }
    case 'boolean': {
      if (raw === true || raw === false) return raw;
      var b = String(raw).toLowerCase();
      if (b === 'true' || b === '1' || b === 'ya') return true;
      if (b === 'false' || b === '0' || b === 'tidak') return false;
      throw label + ' tidak valid';
    }
    case 'enum': {
      var e = String(raw);
      if (rule.values.indexOf(e) === -1) throw label + ' tidak valid';
      return e;
    }
    case 'date': {
      var d = String(raw).substring(0, 10);
      if (!isValidDate_(d)) throw label + ' harus berformat YYYY-MM-DD';
      return d;
    }
    case 'phone': {
      var p = normalizePhone(raw);
      if (p.length < 9 || p.length > 15) throw label + ' tidak valid';
      return p;
    }
    case 'json': {
      var val = raw;
      if (typeof val === 'string') {
        try {
          val = JSON.parse(val);
        } catch (err) {
          throw label + ' bukan JSON yang valid';
        }
      }
      if (rule.jsonKind === 'array' && !Array.isArray(val)) throw label + ' harus berupa daftar';
      if (Array.isArray(val)) {
        if (rule.maxItems && val.length > rule.maxItems) {
          throw label + ' maksimal ' + rule.maxItems + ' item';
        }
        val = val.map(function (item) {
          if (typeof item === 'string') {
            var t = item.trim();
            if (t.length > 300) throw label + ': item terlalu panjang';
            return t;
          }
          if (isPlainObject_(item)) {
            var o = {};
            Object.keys(item).forEach(function (k) {
              if (k.length > 40) throw label + ': kunci terlalu panjang';
              var v = String(item[k] === null || item[k] === undefined ? '' : item[k]).trim();
              if (v.length > 300) throw label + ': nilai terlalu panjang';
              o[k] = v;
            });
            return o;
          }
          throw label + ': item tidak valid';
        });
      }
      return val;
    }
    default:
      throw 'Tipe field tidak dikenal: ' + rule.type;
  }
}

/**
 * Validasi input untuk sebuah tabel.
 * @param {string} table
 * @param {Object} input
 * @param {{partial?: boolean}} opts partial=true untuk update (hanya field yang dikirim)
 * @return {Object} record bersih (tanpa id/timestamps)
 */
function validateRecord(table, input, opts) {
  opts = opts || {};
  if (!isPlainObject_(input)) throw new AppError('VALIDATION', 'Data tidak valid');
  var fields = TABLES[table].fields;
  var out = {};
  var errors = {};

  Object.keys(fields).forEach(function (name) {
    if (opts.partial && !(name in input)) return;
    try {
      out[name] = cleanField_(name, fields[name], input[name]);
    } catch (msg) {
      errors[name] = typeof msg === 'string' ? msg : 'Tidak valid';
    }
  });

  if ('sort_order' in input) {
    var so = Number(input.sort_order);
    if (!isFinite(so) || Math.floor(so) !== so) errors.sort_order = 'Urutan harus bilangan bulat';
    else out.sort_order = so;
  }
  if ('is_active' in input) {
    try {
      out.is_active = cleanField_('is_active', { type: 'boolean' }, input.is_active);
    } catch (msg2) {
      errors.is_active = msg2;
    }
  }

  // Validasi khusus tipe array file id
  (TABLES[table].imageFields || []).forEach(function (f) {
    if (!(f in out)) return;
    var ids = Array.isArray(out[f]) ? out[f] : out[f] ? [out[f]] : [];
    ids.forEach(function (id) {
      if (!FILE_ID_RE.test(id)) errors[f] = 'ID gambar tidak valid';
    });
  });

  if (Object.keys(errors).length) {
    throw new AppError('VALIDATION', 'Periksa kembali isian Anda.', { fieldErrors: errors });
  }
  return out;
}

/** Nilai JS -> string sel. Apostrof di depan mencegah teks dibaca sebagai formula. */
function toCell(rule, value) {
  if (value === undefined || value === null) return '';
  var type = rule ? rule.type : 'string';
  var s;
  if (type === 'json') s = JSON.stringify(value);
  else if (type === 'boolean') s = value ? 'TRUE' : 'FALSE';
  else s = String(value);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

/** Nilai sel -> JS sesuai tipe. Toleran terhadap data yang diedit manual di Sheet. */
function fromCell(rule, value) {
  var type = rule ? rule.type : 'string';
  if (value instanceof Date) {
    if (type === 'date') {
      return Utilities.formatDate(value, 'Asia/Jakarta', 'yyyy-MM-dd');
    }
    return value.toISOString();
  }
  if (value === null || value === undefined) value = '';
  switch (type) {
    case 'number':
    case 'integer': {
      if (value === '') return 0;
      var n = Number(value);
      return isFinite(n) ? n : 0;
    }
    case 'boolean': {
      if (value === true || value === false) return value;
      var b = String(value).toLowerCase();
      return b === 'true' || b === '1' || b === 'ya';
    }
    case 'json': {
      if (value === '') return rule.jsonKind === 'array' ? [] : null;
      try {
        return JSON.parse(String(value));
      } catch (e) {
        // fallback: daftar dipisah koma (kalau diedit manual)
        return String(value)
          .split(',')
          .map(function (x) {
            return x.trim();
          })
          .filter(Boolean);
      }
    }
    default:
      return String(value);
  }
}

function columnRule(table, column) {
  if (column === 'sort_order') return { type: 'integer' };
  if (column === 'is_active') return { type: 'boolean' };
  return TABLES[table].fields[column] || { type: 'string' };
}

function requireString(payload, key, label) {
  var v = payload && payload[key];
  if (typeof v !== 'string' || !v.trim()) {
    throw new AppError('VALIDATION', (label || key) + ' wajib diisi');
  }
  return v.trim();
}
