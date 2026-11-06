/**
 * Handler CRUD generik untuk tabel konten.
 * Action: <tabel>.list | get | create | update | delete | reorder | toggle
 *
 * Payload:
 *   list    { includeInactive?: boolean }
 *   get     { id } | { slug }
 *   create  { data: {...} }
 *   update  { id, data: {...} }   (partial)
 *   delete  { id }
 *   reorder { ids: string[] }      (urutan baru, index 0 = paling atas)
 *   toggle  { id, is_active: boolean }
 */

function ensureUniqueSlug_(table, base, excludeId) {
  var slug = base || 'item';
  var rows = Db.allFresh(table);
  var taken = {};
  rows.forEach(function (r) {
    if (r.id !== excludeId) taken[r.slug] = true;
  });
  if (!taken[slug]) return slug;
  for (var i = 2; i < 1000; i++) {
    var candidate = slug + '-' + i;
    if (!taken[candidate]) return candidate;
  }
  return slug + '-' + Utilities.getUuid().substring(0, 8);
}

var CRUD_HOOKS = {
  packages: {
    beforeSave: function (data) {
      if ('category_id' in data && !Db.findById('categories', data.category_id, true)) {
        throw new AppError('VALIDATION', 'Kategori tidak ditemukan.', {
          fieldErrors: { category_id: 'Pilih kategori yang valid' }
        });
      }
    }
  },
  categories: {
    beforeDelete: function (existing) {
      var used = Db.allFresh('packages').filter(function (p) {
        return p.category_id === existing.id;
      }).length;
      if (used > 0) {
        throw new AppError(
          'CONFLICT',
          'Kategori ini masih dipakai oleh ' + used + ' paket. Pindahkan atau hapus paketnya terlebih dahulu.'
        );
      }
    }
  }
};

function crudHandlers(table) {
  var def = TABLES[table];
  var hooks = CRUD_HOOKS[table] || {};
  var hasSlug = !!def.fields.slug;

  return {
    list: function (p) {
      return Db.list(table, { includeInactive: !!(p && p.includeInactive) });
    },

    get: function (p) {
      var rec = null;
      if (p && p.id) rec = Db.findById(table, String(p.id));
      else if (p && p.slug && hasSlug) rec = Db.findBy(table, 'slug', String(p.slug));
      else throw new AppError('VALIDATION', 'id atau slug wajib diisi');
      if (!rec) throw new AppError('NOT_FOUND', def.label + ' tidak ditemukan.');
      return rec;
    },

    create: function (p) {
      return withLock(function () {
        var data = validateRecord(table, (p && p.data) || {}, { partial: false });
        if (hooks.beforeSave) hooks.beforeSave(data, null);
        if (hasSlug) data.slug = ensureUniqueSlug_(table, data.slug || slugify(data[def.slugFrom]), null);
        return Db.insert(table, data);
      });
    },

    update: function (p) {
      var id = requireString(p, 'id', 'id');
      var removed = [];
      var result = withLock(function () {
        var existing = Db.findById(table, id, true);
        if (!existing) throw new AppError('NOT_FOUND', def.label + ' tidak ditemukan.');
        var data = validateRecord(table, (p && p.data) || {}, { partial: true });
        if (hooks.beforeSave) hooks.beforeSave(data, existing);
        if (hasSlug && ('slug' in data || def.slugFrom in data)) {
          var base = data.slug || existing.slug || slugify(data[def.slugFrom] || existing[def.slugFrom]);
          data.slug = ensureUniqueSlug_(table, base, id);
        }
        var updated = Db.update(table, id, data);
        var before = collectImageIds(table, existing);
        var after = collectImageIds(table, updated);
        removed = before.filter(function (x) {
          return after.indexOf(x) === -1;
        });
        return updated;
      });
      // Trash file di luar lock: operasi Drive lambat dan tidak perlu dikunci.
      DriveStore.trashMany(removed);
      return result;
    },

    delete: function (p) {
      var id = requireString(p, 'id', 'id');
      var removedRec = withLock(function () {
        var existing = Db.findById(table, id, true);
        if (!existing) throw new AppError('NOT_FOUND', def.label + ' tidak ditemukan.');
        if (hooks.beforeDelete) hooks.beforeDelete(existing);
        return Db.remove(table, id);
      });
      var trashed = DriveStore.trashMany(collectImageIds(table, removedRec));
      return { id: id, trashedFiles: trashed };
    },

    reorder: function (p) {
      var ids = p && p.ids;
      if (!Array.isArray(ids) || ids.length > 1000) throw new AppError('VALIDATION', 'Daftar urutan tidak valid');
      ids = ids.map(String);
      return withLock(function () {
        return Db.reorder(table, ids);
      });
    },

    toggle: function (p) {
      var id = requireString(p, 'id', 'id');
      if (typeof p.is_active !== 'boolean') throw new AppError('VALIDATION', 'is_active harus boolean');
      return withLock(function () {
        if (!Db.findById(table, id, true)) throw new AppError('NOT_FOUND', def.label + ' tidak ditemukan.');
        return Db.update(table, id, { is_active: p.is_active });
      });
    }
  };
}
