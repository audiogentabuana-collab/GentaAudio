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
