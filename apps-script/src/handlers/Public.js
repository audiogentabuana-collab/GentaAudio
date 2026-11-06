/**
 * Data untuk halaman publik & dashboard admin.
 */

var PublicHandlers = {
  /**
   * Semua konten aktif dalam satu panggilan (dicache di Next.js dengan tag
   * "public-content"). Paket dari kategori nonaktif ikut disembunyikan.
   */
  snapshot: function () {
    var categories = Db.list('categories');
    var activeCat = {};
    categories.forEach(function (c) {
      activeCat[c.id] = true;
    });
    return {
      settings: getSettings(),
      categories: categories,
      packages: Db.list('packages').filter(function (p) {
        return activeCat[p.category_id];
      }),
      equipment: Db.list('equipment'),
      gallery: Db.list('gallery'),
      testimonials: Db.list('testimonials'),
      faqs: Db.list('faqs'),
      generated_at: new Date().toISOString()
    };
  }
};

var DashboardHandlers = {
  stats: function () {
    var bookings = Db.all('bookings');
    var latest = bookings
      .slice()
      .sort(function (a, b) {
        return String(b.created_at).localeCompare(String(a.created_at));
      })
      .slice(0, 5);
    var countActive = function (t) {
      return Db.count(t, function (r) {
        return r.is_active;
      });
    };
    return {
      packages: { active: countActive('packages'), total: Db.count('packages') },
      categories: { active: countActive('categories'), total: Db.count('categories') },
      equipment: { active: countActive('equipment'), total: Db.count('equipment') },
      gallery: { active: countActive('gallery'), total: Db.count('gallery') },
      testimonials: { active: countActive('testimonials'), total: Db.count('testimonials') },
      faqs: { active: countActive('faqs'), total: Db.count('faqs') },
      bookings: {
        baru: bookings.filter(function (b) {
          return b.status === 'baru';
        }).length,
        dihubungi: bookings.filter(function (b) {
          return b.status === 'dihubungi';
        }).length,
        deal: bookings.filter(function (b) {
          return b.status === 'deal';
        }).length,
        total: bookings.length
      },
      latestBookings: latest
    };
  }
};
