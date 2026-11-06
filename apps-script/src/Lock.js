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
