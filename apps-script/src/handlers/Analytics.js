/**
 * Analitik sederhana tanpa cookie & tanpa IP.
 *
 * - analytics.track   : dipanggil server Next.js untuk setiap kunjungan / klik WhatsApp.
 *                       Ditulis dengan appendRow (atomik) TANPA lock agar tidak berebut
 *                       dengan penyimpanan admin.
 * - aggregateAnalytics: dijalankan trigger setiap jam → merangkum baris event ke
 *                       sheet analytics_daily lalu menghapus baris event yang sudah diproses.
 * - analytics.summary : ringkasan untuk dashboard admin (gabungan harian + event yang
 *                       belum dirangkum).
 */

var ANALYTICS_EVENTS_COLUMNS = ['ts', 'date', 'type', 'path', 'ref', 'device', 'new_visitor', 'pkg'];
var ANALYTICS_DAILY_COLUMNS = ['date', 'views', 'visitors', 'wa_clicks', 'pages', 'refs', 'devices', 'packages', 'updated_at'];
var ANALYTICS_EVENT_TYPES = ['view', 'wa_click'];

function jakartaDate_(d) {
  return Utilities.formatDate(d || new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
}

function addDays_(dateStr, n) {
  var d = new Date(dateStr + 'T00:00:00Z');
  return new Date(d.getTime() + n * 86400000).toISOString().substring(0, 10);
}

function emptyDay_() {
  return { views: 0, visitors: 0, wa_clicks: 0, pages: {}, refs: {}, devices: {}, packages: {} };
}

function bump_(obj, key, n) {
  if (!key) return;
  obj[key] = (obj[key] || 0) + (n || 1);
}

function mergeCounts_(into, from) {
  Object.keys(from || {}).forEach(function (k) {
    bump_(into, k, Number(from[k]) || 0);
  });
}

function mergeDay_(into, from) {
  into.views += Number(from.views) || 0;
  into.visitors += Number(from.visitors) || 0;
  into.wa_clicks += Number(from.wa_clicks) || 0;
  mergeCounts_(into.pages, from.pages);
  mergeCounts_(into.refs, from.refs);
  mergeCounts_(into.devices, from.devices);
  mergeCounts_(into.packages, from.packages);
}

function applyEvent_(day, ev) {
  if (ev.type === 'view') {
    day.views++;
    if (ev.new_visitor) day.visitors++;
    bump_(day.pages, ev.path);
    bump_(day.refs, ev.ref || '(langsung)');
    bump_(day.devices, ev.device);
  } else if (ev.type === 'wa_click') {
    day.wa_clicks++;
    if (ev.pkg) bump_(day.packages, ev.pkg);
  }
}

function parseJsonObj_(v) {
  if (!v) return {};
  try {
    var o = JSON.parse(String(v));
    return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  } catch (e) {
    return {};
  }
}

function cleanEvent_(e) {
  if (!e || typeof e !== 'object') return null;
  var type = String(e.type || '');
  if (ANALYTICS_EVENT_TYPES.indexOf(type) === -1) return null;
  var path = String(e.path || '/').split('?')[0].split('#')[0].substring(0, 200);
  if (path.charAt(0) !== '/') path = '/';
  var ref = String(e.ref || '').toLowerCase().replace(/^www\./, '');
  if (!/^[a-z0-9.-]{1,100}$/.test(ref)) ref = '';
  var device = e.device === 'mobile' ? 'mobile' : 'desktop';
  var pkg = String(e.pkg || '');
  if (!/^[a-z0-9-]{1,140}$/.test(pkg)) pkg = '';
  return { type: type, path: path, ref: ref, device: device, new_visitor: e.nv === true, pkg: pkg };
}

/** Baca event yang belum dirangkum → { rows: [...], count } */
function readRawEvents_() {
  var sheet = getSheet_('analytics_events');
  var last = sheet.getLastRow();
  if (last < 2) return { rows: [], count: 0 };
  var values = sheet.getRange(1, 1, last, ANALYTICS_EVENTS_COLUMNS.length).getValues();
  var header = values[0].map(String);
  var idx = {};
  header.forEach(function (h, i) {
    idx[h] = i;
  });
  var rows = values.slice(1).map(function (r) {
    return {
      date: String(r[idx.date] || ''),
      type: String(r[idx.type] || ''),
      path: String(r[idx.path] || ''),
      ref: String(r[idx.ref] || ''),
      device: String(r[idx.device] || ''),
      new_visitor: String(r[idx.new_visitor]).toUpperCase() === 'TRUE',
      pkg: String(r[idx.pkg] || ''),
    };
  });
  return { rows: rows, count: rows.length };
}

/** Baca analytics_daily → { map: {date: day}, rowIndex: {date: n} } */
function readDaily_() {
  var sheet = getSheet_('analytics_daily');
  var last = sheet.getLastRow();
  var map = {};
  var rowIndex = {};
  if (last < 2) return { sheet: sheet, map: map, rowIndex: rowIndex };
  var values = sheet.getRange(2, 1, last - 1, ANALYTICS_DAILY_COLUMNS.length).getValues();
  values.forEach(function (r, i) {
    var date = String(r[0] || '');
    if (!date) return;
    map[date] = {
      views: Number(r[1]) || 0,
      visitors: Number(r[2]) || 0,
      wa_clicks: Number(r[3]) || 0,
      pages: parseJsonObj_(r[4]),
      refs: parseJsonObj_(r[5]),
      devices: parseJsonObj_(r[6]),
      packages: parseJsonObj_(r[7]),
    };
    rowIndex[date] = i + 2;
  });
  return { sheet: sheet, map: map, rowIndex: rowIndex };
}

var AnalyticsHandlers = {
  /** { events: [{ type, path, ref?, device?, nv?, pkg? }] } (maks 10) */
  track: function (p) {
    var list = Array.isArray(p && p.events) ? p.events.slice(0, 10) : [];
    var sheet = getSheet_('analytics_events');
    var now = new Date();
    var date = jakartaDate_(now);
    var n = 0;
    list.forEach(function (raw) {
      var e = cleanEvent_(raw);
      if (!e) return;
      sheet.appendRow([now.toISOString(), date, e.type, e.path, e.ref, e.device, e.new_visitor ? 'TRUE' : 'FALSE', e.pkg]);
      n++;
    });
    return { recorded: n };
  },

  /** { days?: 7|30|90 } */
  summary: function (p) {
    var days = Math.max(1, Math.min(365, Math.floor(Number(p && p.days) || 30)));
    var today = jakartaDate_();
    var from = addDays_(today, -(days - 1));
    var prevFrom = addDays_(from, -days);

    var map = readDaily_().map;
    readRawEvents_().rows.forEach(function (ev) {
      if (!ev.date) return;
      if (!map[ev.date]) map[ev.date] = emptyDay_();
      applyEvent_(map[ev.date], ev);
    });

    var series = [];
    var current = emptyDay_();
    var previous = emptyDay_();
    for (var d = prevFrom; d <= today; d = addDays_(d, 1)) {
      var day = map[d] || emptyDay_();
      if (d >= from) {
        series.push({ date: d, views: day.views, visitors: day.visitors, wa_clicks: day.wa_clicks });
        mergeDay_(current, day);
      } else {
        mergeDay_(previous, day);
      }
    }

    var top = function (obj, limit) {
      return Object.keys(obj)
        .map(function (k) {
          return { key: k, count: obj[k] };
        })
        .sort(function (a, b) {
          return b.count - a.count;
        })
        .slice(0, limit);
    };

    return {
      range: { from: from, to: today, days: days },
      series: series,
      totals: { views: current.views, visitors: current.visitors, wa_clicks: current.wa_clicks },
      previous: { views: previous.views, visitors: previous.visitors, wa_clicks: previous.wa_clicks },
      pages: top(current.pages, 8),
      refs: top(current.refs, 8),
      devices: current.devices,
      packages: top(current.packages, 8),
    };
  }
};

/**
 * Rangkum event ke analytics_daily. Dipanggil trigger per jam (dipasang oleh setup()).
 * Bisa juga dijalankan manual dari editor.
 */
function aggregateAnalytics() {
  return withLock(function () {
    var raw = readRawEvents_();
    if (!raw.count) return { aggregated: 0 };
    var daily = readDaily_();
    var touched = {};
    raw.rows.forEach(function (ev) {
      if (!ev.date) return;
      if (!daily.map[ev.date]) daily.map[ev.date] = emptyDay_();
      applyEvent_(daily.map[ev.date], ev);
      touched[ev.date] = true;
    });
    var now = new Date().toISOString();
    var appendRows = [];
    Object.keys(touched)
      .sort()
      .forEach(function (date) {
        var d = daily.map[date];
        var row = [
          date,
          String(d.views),
          String(d.visitors),
          String(d.wa_clicks),
          JSON.stringify(d.pages),
          JSON.stringify(d.refs),
          JSON.stringify(d.devices),
          JSON.stringify(d.packages),
          now
        ];
        if (daily.rowIndex[date]) {
          daily.sheet.getRange(daily.rowIndex[date], 1, 1, row.length).setValues([row]);
        } else {
          appendRows.push(row);
        }
      });
    if (appendRows.length) {
      daily.sheet.getRange(daily.sheet.getLastRow() + 1, 1, appendRows.length, ANALYTICS_DAILY_COLUMNS.length).setValues(appendRows);
    }
    // Hapus baris event yang sudah dirangkum (baris 2..count+1). Event baru yang
    // masuk selama proses ini berada di bawahnya dan tidak ikut terhapus.
    getSheet_('analytics_events').deleteRows(2, raw.count);
    return { aggregated: raw.count };
  });
}
