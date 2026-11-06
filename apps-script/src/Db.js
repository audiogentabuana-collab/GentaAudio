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
