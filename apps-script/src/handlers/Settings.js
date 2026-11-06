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
