/**
 * bookings: inbox dari form booking publik.
 * Action: bookings.create (publik, rate limited), bookings.list,
 *         bookings.updateStatus, bookings.delete
 */

function todayJakarta_() {
  return Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
}

function notifyNewBooking_(rec, pkgName) {
  var to = getProp('NOTIFY_EMAIL', false);
  if (!to) return;
  try {
    var body = [
      'Ada booking baru dari website Genta Buana:',
      '',
      'Nama     : ' + rec.name,
      'WhatsApp : ' + rec.phone + '  (https://wa.me/' + rec.phone + ')',
      'Tanggal  : ' + rec.event_date,
      'Lokasi   : ' + rec.location,
      'Paket    : ' + (pkgName || '-'),
      'Pesan    : ' + (rec.message || '-'),
      '',
      'Kelola di halaman admin > Booking.'
    ].join('\n');
    MailApp.sendEmail({ to: to, subject: '[Genta Buana] Booking baru: ' + rec.name, body: body });
  } catch (e) {
    // Kuota MailApp (100/hari untuk akun gratis) bisa habis; booking tetap tersimpan.
    console.warn('Gagal kirim email notifikasi', e);
  }
}

var BookingHandlers = {
  create: function (p) {
    p = p || {};
    var ip = String(p.ip || 'unknown');
    if (rateCount('booking-ip', ip) >= LIMITS.BOOKING_MAX_PER_IP) {
      throw new AppError(
        'RATE_LIMITED',
        'Anda sudah mengirim beberapa booking. Silakan hubungi kami lewat WhatsApp untuk respon lebih cepat.'
      );
    }
    var data = validateRecord(
      'bookings',
      {
        name: p.name,
        phone: p.phone,
        event_date: p.event_date,
        location: p.location,
        package_id: p.package_id || '',
        message: p.message || ''
      },
      { partial: false }
    );
    if (data.event_date < todayJakarta_()) {
      throw new AppError('VALIDATION', 'Tanggal acara tidak boleh di masa lalu.', {
        fieldErrors: { event_date: 'Tanggal acara tidak boleh di masa lalu' }
      });
    }
    var pkg = data.package_id ? Db.findById('packages', data.package_id) : null;
    if (!pkg) data.package_id = '';
    data.status = 'baru';
    data.admin_note = '';

    var rec = withLock(function () {
      return Db.insert('bookings', data);
    });
    rateHit('booking-ip', ip, LIMITS.BOOKING_WINDOW_SECONDS);
    notifyNewBooking_(rec, pkg ? pkg.name : '');
    return { id: rec.id };
  },

  list: function (p) {
    var status = p && p.status;
    var pkgs = {};
    Db.all('packages').forEach(function (x) {
      pkgs[x.id] = x.name;
    });
    return Db.all('bookings')
      .filter(function (b) {
        return !status || b.status === status;
      })
      .sort(function (a, b) {
        return String(b.created_at).localeCompare(String(a.created_at));
      })
      .map(function (b) {
        b.package_name = b.package_id ? pkgs[b.package_id] || '(paket dihapus)' : '';
        return b;
      });
  },

  updateStatus: function (p) {
    var id = requireString(p, 'id', 'id');
    var patch = validateRecord(
      'bookings',
      { status: p.status, admin_note: p.admin_note },
      { partial: true }
    );
    if (p.admin_note === undefined) delete patch.admin_note;
    if (!patch.status) throw new AppError('VALIDATION', 'Status wajib diisi');
    return withLock(function () {
      return Db.update('bookings', id, patch);
    });
  },

  delete: function (p) {
    var id = requireString(p, 'id', 'id');
    return withLock(function () {
      Db.remove('bookings', id);
      return { id: id };
    });
  }
};
