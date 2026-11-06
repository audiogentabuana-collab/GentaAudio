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
