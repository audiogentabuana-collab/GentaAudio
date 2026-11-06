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
