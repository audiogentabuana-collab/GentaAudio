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
