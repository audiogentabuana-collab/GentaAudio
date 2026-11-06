/**
 * Cache baca berbasis CacheService dengan:
 * - Versioning: versi tiap tabel disimpan di Script Properties. Setiap penulisan
 *   menaikkan versi, sehingga cache lama otomatis tidak terpakai. Ini menghindari
 *   race "pembaca lama menimpa cache setelah penulis meng-invalidate".
 * - Chunking: CacheService membatasi 100KB per value, jadi data besar dipecah.
 */

function cacheVersion_(table) {
  return PropertiesService.getScriptProperties().getProperty('CACHE_VER_' + table) || '0';
}

function bumpCacheVersion(table) {
  var props = PropertiesService.getScriptProperties();
  var next = String(Number(props.getProperty('CACHE_VER_' + table) || '0') + 1);
  props.setProperty('CACHE_VER_' + table, next);
  return next;
}

function bumpAllCacheVersions() {
  Object.keys(TABLES).forEach(bumpCacheVersion);
  bumpCacheVersion('settings');
}

function cacheGetJson(baseKey) {
  var cache = CacheService.getScriptCache();
  var meta = cache.get(baseKey + ':n');
  if (!meta) return null;
  var n = Number(meta);
  var keys = [];
  for (var i = 0; i < n; i++) keys.push(baseKey + ':' + i);
  var parts = cache.getAll(keys);
  var str = '';
  for (var j = 0; j < n; j++) {
    var part = parts[baseKey + ':' + j];
    if (part === undefined || part === null) return null; // ada chunk yang kedaluwarsa
    str += part;
  }
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

function cachePutJson(baseKey, value) {
  try {
    var cache = CacheService.getScriptCache();
    var str = JSON.stringify(value);
    var size = LIMITS.CACHE_CHUNK_CHARS;
    var entries = {};
    var n = Math.max(1, Math.ceil(str.length / size));
    for (var i = 0; i < n; i++) entries[baseKey + ':' + i] = str.substr(i * size, size);
    cache.putAll(entries, LIMITS.CACHE_TTL_SECONDS);
    cache.put(baseKey + ':n', String(n), LIMITS.CACHE_TTL_SECONDS);
  } catch (e) {
    // Cache gagal bukan alasan untuk menggagalkan request.
    console.warn('cachePutJson gagal', e);
  }
}

/** Ambil data tabel dari cache, atau jalankan loader lalu simpan ke cache. */
function cachedTable(table, loader) {
  var key = 't:' + table + ':v' + cacheVersion_(table);
  var hit = cacheGetJson(key);
  if (hit) return hit;
  var data = loader();
  cachePutJson(key, data);
  return data;
}
