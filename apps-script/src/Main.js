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
    'admins.changePassword': AuthHandlers.changePassword
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
