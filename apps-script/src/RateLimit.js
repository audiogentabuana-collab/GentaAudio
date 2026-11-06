/**
 * Rate limit sederhana berbasis CacheService (state bersama antar request,
 * berbeda dengan memori serverless Vercel yang tidak dibagi antar instance).
 * Catatan: increment CacheService tidak atomik, jadi batasnya perkiraan
 * (cukup untuk mencegah brute force/spam, bukan penghitung yang presisi).
 */

function rateKey_(scope, id) {
  var safe = String(id || 'unknown').toLowerCase().replace(/[^a-z0-9:._@-]/g, '').substring(0, 120);
  return 'rl:' + scope + ':' + safe;
}

function rateCount(scope, id) {
  return Number(CacheService.getScriptCache().get(rateKey_(scope, id)) || '0');
}

function rateHit(scope, id, windowSeconds) {
  var cache = CacheService.getScriptCache();
  var key = rateKey_(scope, id);
  var n = Number(cache.get(key) || '0') + 1;
  cache.put(key, String(n), windowSeconds);
  return n;
}

function rateReset(scope, id) {
  CacheService.getScriptCache().remove(rateKey_(scope, id));
}
