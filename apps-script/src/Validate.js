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
