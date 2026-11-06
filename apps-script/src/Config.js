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
