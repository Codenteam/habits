/**
 * Browser runtime that interprets the data-* directives emitted by the
 * server-side widget renderers. Shipped to the browser as an inlined
 * `<script>` block by `compileUiSpec`.
 *
 * Exported as a string so the compiler can embed it without bundling.
 */
import { buildRuntimeIconJs } from './icons';

const RUNTIME_JS_TEMPLATE = String.raw`
(function () {
'use strict';

window.__HA_FILE_UPLOAD_V2__ = true;

__ICON_RUNTIME__

// ---------------------------------------------------------------------------
// 1. Boot config
// ---------------------------------------------------------------------------
var CFG = {};
// When cortex-bundle is inlined in a script tag, a stray script-close sequence in the
// bundle can leak compileUiSpec source into the document — including a bogus __ha_cfg node.
// Prefer the last script that parses to a real config (the packed frontend).
(function () {
  var nodes = document.querySelectorAll('script#__ha_cfg');
  for (var i = nodes.length - 1; i >= 0; i--) {
    try {
      var parsed = JSON.parse(nodes[i].textContent || '{}');
      if (parsed && typeof parsed === 'object' && (parsed.actions || parsed.meta || parsed.state)) {
        CFG = parsed;
        return;
      }
    } catch (e) { /* try earlier node */ }
  }
  var cfgEl = document.getElementById('__ha_cfg');
  try { CFG = JSON.parse((cfgEl && cfgEl.textContent) || '{}'); } catch (e) { CFG = {}; }
})();

var state = Object.assign({ __view: CFG.defaultView || 'main', __toasts: [] }, CFG.state || {});
if (!Array.isArray(state.messages)) state.messages = [];
else state.messages = state.messages.slice();
var ACTIONS = CFG.actions || {};
var META = CFG.meta || {};

// ---------------------------------------------------------------------------
// 2. Path get/set + templating
// ---------------------------------------------------------------------------
function getPath(obj, path) {
  if (path == null || path === '') return obj;
  var p = String(path);
  var parts = p.split('.');
  var cur = obj;
  // Preserve $-prefixed roots when the object actually has that key (e.g. scope.$response).
  if (parts[0] && parts[0][0] === '$' && cur != null && Object.prototype.hasOwnProperty.call(cur, parts[0])) {
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }
  if (p[0] === '$') p = p.slice(1);
  parts = p.split('.');
  cur = obj;
  for (var j = 0; j < parts.length; j++) {
    if (cur == null) return undefined;
    cur = cur[parts[j]];
  }
  return cur;
}
function setPath(obj, path, value) {
  var p = String(path);
  if (obj === state && p.indexOf('state.') === 0) p = p.slice(6);
  var parts = p.split('.');
  var cur = obj;
  for (var i = 0; i < parts.length - 1; i++) {
    var k = parts[i];
    if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
}

var FILTERS = {
  json: function (v) { try { return JSON.stringify(v, null, 2); } catch (e) { return String(v); } },
  truncate: function (v, n) { var s = v == null ? '' : String(v); n = parseInt(n, 10) || 80; return s.length > n ? s.slice(0, n) + '…' : s; },
  date: function (v) { if (!v) return ''; try { return new Date(v).toLocaleString(); } catch (e) { return String(v); } },
  dateShort: function (v) { if (!v) return ''; try { return new Date(v).toLocaleDateString(); } catch (e) { return String(v); } },
  upper: function (v) { return v == null ? '' : String(v).toUpperCase(); },
  lower: function (v) { return v == null ? '' : String(v).toLowerCase(); },
  parseJson: function (v) {
    if (v == null) return null;
    if (typeof v === 'object') return v;
    var s = String(v).trim();
    s = s.replace(/^\u0060\u0060\u0060(?:json)?\s*/i, '').replace(/\u0060\u0060\u0060\s*$/, '').trim();
    try { return JSON.parse(s); } catch (e) { return v; }
  },
  stringify: function (v) { try { return JSON.stringify(v); } catch (e) { return String(v); } },
  currency: function (v, code) {
    var n = typeof v === 'number' ? v : parseFloat(v);
    if (isNaN(n)) return String(v);
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: code || 'USD' }).format(n); }
    catch (e) { return String(n.toFixed(2)); }
  },
  number: function (v) { var n = parseFloat(v); return isNaN(n) ? '' : n.toLocaleString(); },
  default: function (v, d) { return v == null || v === '' ? d : v; },
};

/**
 * Evaluate a single template expression like "state.foo.bar | truncate:40".
 * scope may carry extra bindings such as item, index, oauth.
 */
function evalExpr(expr, scope) {
  if (expr == null) return '';
  var pipes = String(expr).split('|').map(function (s) { return s.trim(); });
  var path = pipes.shift();
  var val;
  // Literal string (single-quoted) support
  if (path.length > 1 && path[0] === "'" && path[path.length - 1] === "'") {
    val = path.slice(1, -1);
  } else if (scope && Object.prototype.hasOwnProperty.call(scope, path.split('.')[0])) {
    val = getPath(scope, path);
  } else if (path.indexOf('state.') === 0 || path === 'state') {
    val = getPath({ state: state }, path);
  } else {
    val = getPath({ state: state, scope: scope }, path);
    if (val === undefined && scope) val = getPath(scope, path);
    if (val === undefined) val = getPath(state, path);
  }
  for (var i = 0; i < pipes.length; i++) {
    var pf = pipes[i].split(':');
    var fname = pf[0].trim();
    var args = pf.slice(1).map(function (a) { return a.trim().replace(/^['"]|['"]$/g, ''); });
    if (FILTERS[fname]) val = FILTERS[fname].apply(null, [val].concat(args));
  }
  return val;
}

function renderTemplate(tpl, scope) {
  if (tpl == null) return '';
  return String(tpl).replace(/\{\{\s*([^}]+?)\s*\}\}/g, function (_, expr) {
    var v = evalExpr(expr, scope);
    return v == null ? '' : String(v);
  });
}

var _exprCache = {};
function compileExpr(src) {
  if (_exprCache[src]) return _exprCache[src];
  try {
    // eslint-disable-next-line no-new-func
    var fn = new Function('state', 'item', 'index', 'params', 'oauth', '$response', 'response', 'error', 'event', 'return (' + src + ')');
    _exprCache[src] = fn;
    return fn;
  } catch (e) {
    _exprCache[src] = function () { return undefined; };
    return _exprCache[src];
  }
}
var _SIMPLE_PATH = /^[a-zA-Z_$][\w.$]*$/;
var _SIMPLE_PATH_OR_FILTER = /^[a-zA-Z_$][\w.$]*(\s*\|\s*[a-zA-Z_$]\w*(\s*:\s*[^|]+)?)+$/;

/** Evaluate an expression that may include JS operators (! && || === etc). */
function evalAny(expr, scope) {
  if (expr == null) return undefined;
  if (typeof expr === 'boolean' || typeof expr === 'number') return expr;
  var s = String(expr).trim();
  if (s === '') return '';
  if (s.indexOf('{{') >= 0) return renderTemplate(s, scope);
  // Fast path for plain paths and path|filter chains.
  if (_SIMPLE_PATH.test(s) || _SIMPLE_PATH_OR_FILTER.test(s)) return evalExpr(s, scope);
  // Quoted literal
  if ((s[0] === "'" && s[s.length - 1] === "'") || (s[0] === '"' && s[s.length - 1] === '"')) return s.slice(1, -1);
  // Full expression
  try {
    var fn = compileExpr(s);
    return fn(state, scope && scope.item, scope && scope.index, scope && scope.params, state.__oauth, scope && scope.$response, scope && scope.response, scope && scope.error, scope && scope.event);
  } catch (e) {
    return undefined;
  }
}

function isTruthy(v) {
  if (v == null || v === false || v === 0 || v === '' || v === 'false') return false;
  if (Array.isArray(v) && v.length === 0) return false;
  if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) return false;
  return true;
}

function normalizeImageSrc(src, mime) {
  if (src == null || src === '') return '';
  var s = String(src);
  if (/^data:/i.test(s) || /^https?:\/\//i.test(s)) return s;
  var mt = mime ? String(mime).split(';')[0] : 'image/jpeg';
  if (s.indexOf('base64,') >= 0) {
    return s.indexOf('data:') === 0 ? s : 'data:' + mt + ';base64,' + s.split('base64,').pop();
  }
  return 'data:' + mt + ';base64,' + s;
}

function syncModals() {
  qa('template[data-modal]').forEach(function (tpl) {
    var id = tpl.getAttribute('data-modal');
    var open = isTruthy(evalAny(tpl.getAttribute('data-modal-when')));
    var existing = document.querySelector('[data-modal-instance="' + cssesc(id) + '"]');
    if (open && !existing) {
      var holder = document.createElement('div');
      holder.setAttribute('data-modal-instance', id);
      holder.innerHTML = tpl.innerHTML;
      document.body.appendChild(holder);
    } else if (!open && existing) {
      existing.remove();
    }
  });
}

// ---------------------------------------------------------------------------
// 3. State + render scheduling
// ---------------------------------------------------------------------------
var pending = false;
function update(fn) {
  if (typeof fn === 'function') fn(state); else if (fn) Object.assign(state, fn);
  schedule();
}
function schedule() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(function () { pending = false; render(); });
}

// ---------------------------------------------------------------------------
// 4. Toasts
// ---------------------------------------------------------------------------
function toast(msg, tone) {
  if (!msg) return;
  var host = document.querySelector('.ha-toast-host');
  if (!host) {
    host = document.createElement('div');
    host.className = 'ha-toast-host';
    document.body.appendChild(host);
  }
  var el = document.createElement('div');
  el.className = 'ha-toast' + (tone ? ' ha-status ha-status--' + tone : '');
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(function () { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(function () { el.remove(); }, 300); }, 4000);
}

// ---------------------------------------------------------------------------
// 5. Action dispatch (HTTP + streaming + oauth)
// ---------------------------------------------------------------------------
function buildBody(template, scope) {
  if (template == null) return undefined;
  if (typeof template === 'string') {
    var whole = template.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
    if (whole) return evalAny(whole[1].trim(), scope);
    return renderTemplate(template, scope);
  }
  if (Array.isArray(template)) return template.map(function (t) { return buildBody(t, scope); });
  if (typeof template === 'object') {
    var out = {};
    for (var k in template) if (Object.prototype.hasOwnProperty.call(template, k)) {
      out[k] = buildBody(template[k], scope);
    }
    return out;
  }
  return template;
}

function buildUrl(endpoint, query, scope) {
  var url = renderTemplate(endpoint || ('/api/' + (META.id || '')), scope);
  if (query) {
    var qs = Object.keys(query).map(function (k) {
      var v = buildBody(query[k], scope);
      return encodeURIComponent(k) + '=' + encodeURIComponent(v == null ? '' : v);
    }).join('&');
    if (qs) url += (url.indexOf('?') >= 0 ? '&' : '?') + qs;
  }
  return url;
}

var inflight = {}; // actionId -> AbortController

function buildAppendItem(tpl, resolved, response, scope) {
  if (tpl == null || typeof tpl !== 'object' || Array.isArray(tpl)) {
    return tpl === '$response' ? resolved : tpl;
  }
  var item = {};
  for (var k in tpl) {
    var v = tpl[k];
    if (v === '$response') item[k] = resolved;
    else if (typeof v === 'string' && (v.indexOf('{{') >= 0 || v.indexOf('state.') === 0 || v.indexOf('$') === 0)) {
      item[k] = evalAny(v, Object.assign({}, scope, { $response: resolved, response: response }));
    } else {
      item[k] = v;
    }
  }
  return item;
}

function getStateVal(path) {
  if (path == null || path === '') return undefined;
  var p = String(path);
  if (p.indexOf('state.') === 0) return getPath({ state: state }, p);
  return getPath(state, p);
}

function setStateVal(path, value) {
  var p = String(path);
  if (p.indexOf('state.') !== 0) p = 'state.' + p;
  setPath(state, p, value);
}

function applyAppendSpec(spec, resolved, response, scope) {
  if (typeof spec === 'string') {
    var arr = getStateVal(spec);
    if (!Array.isArray(arr)) arr = [];
    arr = arr.slice();
    arr.push(resolved);
    setStateVal(spec, arr);
    return;
  }
  if (spec && typeof spec === 'object') {
    for (var listPath in spec) {
      if (!Object.prototype.hasOwnProperty.call(spec, listPath)) continue;
      var itemTpl = spec[listPath];
      var arr2 = getStateVal(listPath);
      if (!Array.isArray(arr2)) arr2 = [];
      arr2 = arr2.slice();
      if (Array.isArray(itemTpl)) {
        for (var ti = 0; ti < itemTpl.length; ti++) {
          arr2.push(buildAppendItem(itemTpl[ti], resolved, response, scope));
        }
      } else {
        arr2.push(buildAppendItem(itemTpl, resolved, response, scope));
      }
      setStateVal(listPath, arr2);
    }
  }
}

function applySuccess(actionId, action, response, scope) {
  var s = action.onSuccess;
  if (s) {
  var resolved = action.responsePath ? getPath(response, action.responsePath) : (response && response.output != null ? response.output : response);
  if (s.append) {
    applyAppendSpec(s.append, resolved, response, scope);
  }
  if (s.set) {
    for (var k in s.set) {
      var expr = s.set[k];
      var scopeWithResponse = Object.assign({}, scope, { $response: resolved, response: response });
      var v;
      if (expr === '$response') v = resolved;
      else if (expr == null || typeof expr === 'boolean' || typeof expr === 'number') v = expr;
      else {
        var ev = evalAny(expr, scopeWithResponse);
        v = ev !== undefined ? ev : (typeof expr === 'string' ? expr : ev);
      }
      setPath(state, k, v);
    }
  }
  if (s.resetForm) {
    var formEl = document.querySelector('[data-form="' + s.resetForm + '"]');
    if (formEl) formEl.reset();
  }
  if (s.goto) setPath(state, '__view', s.goto);
  if (s.toast) toast(renderTemplate(s.toast, Object.assign({}, scope, { $response: resolved })), 'success');
  if (s.download) {
    var data = getPath(resolved, s.download.dataPath) || getPath(response, s.download.dataPath);
    var name = s.download.fileNamePath ? (getPath(resolved, s.download.fileNamePath) || 'download') : 'download';
    if (data) triggerDownload(data, name, s.download.mimeType || 'application/octet-stream');
  }
  var chain = s.reload != null ? s.reload : s.dispatch;
  if (chain) {
    var ids = Array.isArray(chain) ? chain : [chain];
    ids.forEach(function (id) { dispatch(id, {}); });
  }
  }
  // Reload history grids that list this action in data-history-reload-after
  if (actionId) {
    qa('[data-history-reload-after]').forEach(function (el) {
      var after = (el.getAttribute('data-history-reload-after') || '').split(',').map(function (s) { return s.trim(); });
      if (after.indexOf(actionId) >= 0) {
        dispatch(el.getAttribute('data-history-from'), {});
      }
    });
  }
  schedule();
}

function applyError(action, err, scope) {
  var e = action.onError;
  var message = (err && err.message) || String(err);
  if (e) {
    if (e.toast) toast(renderTemplate(e.toast, Object.assign({}, scope, { error: { message: message } })), 'danger');
    if (e.set) {
      for (var k in e.set) {
        setPath(state, k, evalAny(e.set[k], Object.assign({}, scope, { error: { message: message } })));
      }
    }
  } else {
    toast(message, 'danger');
  }
  schedule();
}

function dispatch(actionId, params) {
  var action = ACTIONS[actionId];
  if (!action) { toast('Unknown action: ' + actionId, 'danger'); return; }
  var scope = { params: params || {} };

  if (action.confirm && !window.confirm(renderTemplate(action.confirm, scope))) return;

  // Local state-only actions (no HTTP)
  if (action.set && !action.method && !action.type) {
    for (var sk in action.set) {
      var sv = action.set[sk];
      setPath(state, sk, sv === null ? null : evalAny(sv, scope));
    }
    if (action.clear) {
      var clr = Array.isArray(action.clear) ? action.clear : [action.clear];
      for (var cj = 0; cj < clr.length; cj++) {
        var cpath = clr[cj];
        var ccur = getPath({ state: state }, cpath);
        if (ccur === undefined) ccur = getPath(state, cpath);
        setPath(state, cpath, Array.isArray(ccur) ? [] : null);
      }
    }
    schedule();
    return;
  }

  if (action.type === 'navigate') {
    if (action.endpoint) {
      var navUrl = renderTemplate(action.endpoint, scope);
      if (/^https?:\/\//i.test(navUrl)) window.open(navUrl, '_blank', 'noopener');
      else window.location.href = navUrl;
    }
    return;
  }
  if (action.type === 'reset') {
    if (action.endpoint) { var f = document.querySelector(action.endpoint); if (f && f.reset) f.reset(); }
    return;
  }
  if (action.type === 'oauth') {
    fetch(action.oauth ? action.oauth.statusUrl : (action.endpoint || '/oauth/status'), { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) { setPath(state, '__oauth.' + actionId, data); schedule(); });
    return;
  }

  // HTTP / streaming
  var method = (action.method || 'POST').toUpperCase();
  var body = buildBody(action.body, scope);
  var url = buildUrl(action.endpoint || ('/api/' + (META.id || '')), action.query, scope);
  if (action.stream) url += (url.indexOf('?') >= 0 ? '&' : '?') + 'stream=true';

  // Loading state
  setPath(state, '__loading.' + actionId, true);
  schedule();

  // Cancel previous in-flight invocation
  if (inflight[actionId]) try { inflight[actionId].abort(); } catch (e) {}
  var ctrl = new AbortController();
  inflight[actionId] = ctrl;

  var headers = Object.assign({ 'Content-Type': 'application/json' }, action.headers || {});
  var opts = {
    method: method,
    headers: headers,
    credentials: 'include',
    signal: ctrl.signal,
  };
  if (method !== 'GET' && method !== 'HEAD' && body != null) {
    opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  if (action.stream === 'ndjson' || action.stream === 'tokens') {
    runStream(actionId, action, url, opts, scope);
  } else {
    fetch(url, opts)
      .then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error(t || ('HTTP ' + r.status)); });
        var ct = r.headers.get('content-type') || '';
        if (ct.indexOf('application/json') >= 0) return r.json();
        return r.text();
      })
      .then(function (data) {
        setPath(state, '__loading.' + actionId, false);
        setPath(state, '__last.' + actionId, data);
        applySuccess(actionId, action, data, scope);
      })
      .catch(function (err) {
        if (err && err.name === 'AbortError') return;
        setPath(state, '__loading.' + actionId, false);
        applyError(action, err, scope);
      });
  }
}

function runStream(actionId, action, url, opts, scope) {
  setPath(state, '__stream.' + actionId, []);
  if (action.clear) {
    var clears = Array.isArray(action.clear) ? action.clear : [action.clear];
    for (var ci = 0; ci < clears.length; ci++) {
      var cp = clears[ci];
      var cur = getPath({ state: state }, cp);
      if (cur === undefined) cur = getPath(state, cp);
      setPath(state, cp, Array.isArray(cur) ? [] : null);
    }
  }
  opts.headers = Object.assign({}, opts.headers, { Accept: 'application/x-ndjson' });
  fetch(url, opts)
    .then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error(t || ('HTTP ' + r.status)); });
      var reader = r.body.getReader();
      var dec = new TextDecoder();
      var buf = '';
      function pump() {
        return reader.read().then(function (chunk) {
          if (chunk.done) {
            if (buf.trim()) handleStreamLine(action, buf.trim(), scope, actionId);
            setPath(state, '__loading.' + actionId, false);
            schedule();
            return;
          }
          buf += dec.decode(chunk.value, { stream: true });
          var lines = buf.split('\n');
          buf = lines.pop() || '';
          for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (line) handleStreamLine(action, line, scope, actionId);
          }
          schedule();
          return pump();
        });
      }
      return pump();
    })
    .catch(function (err) {
      if (err && err.name === 'AbortError') return;
      setPath(state, '__loading.' + actionId, false);
      applyError(action, err, scope);
    });
}

function handleStreamLine(action, line, scope, actionId) {
  if (action.stream === 'tokens') {
    // Token streaming: try JSON first (e.g. {type:'token', content:''}), else append raw
    try {
      var ev = JSON.parse(line);
      var content = ev.content || ev.token || ev.chunk || '';
      var target = '__stream.' + actionId;
      var cur = getPath(state, target) || '';
      setPath(state, target, cur + content);
      if (ev.type === 'done') applySuccess(actionId, action, ev, scope);
    } catch (e) {
      var t = '__stream.' + actionId;
      var c = getPath(state, t) || '';
      setPath(state, t, c + line + '\n');
    }
    return;
  }
  // NDJSON
  var ev;
  try { ev = JSON.parse(line); } catch (e) { return; }
  // Run declared event handlers
  var handlers = action.events || [];
  for (var i = 0; i < handlers.length; i++) {
    var h = handlers[i];
    if (matchEvent(ev, h.match)) {
      if (h.append) {
        if (!ev.nodeId) continue;
        var arr = getPath(state, h.append) || [];
        if (!Array.isArray(arr)) arr = [];
        arr.push(ev);
        setPath(state, h.append, arr);
      }
      if (h.set) {
        for (var k in h.set) setPath(state, k, evalAny(h.set[k], Object.assign({}, scope, { event: ev })));
      }
      if (h.increment) {
        var cur = getPath(state, h.increment) || 0;
        setPath(state, h.increment, cur + 1);
      }
    }
  }
  // Default: also append into __stream.<actionId>
  var streamPath = '__stream.' + actionId;
  var streamArr = getPath(state, streamPath);
  if (!Array.isArray(streamArr)) { streamArr = []; setPath(state, streamPath, streamArr); }
  streamArr.push(ev);
}

function matchEvent(ev, match) {
  if (!match) return true;
  for (var k in match) if (ev[k] !== match[k]) return false;
  return true;
}

function triggerDownload(data, fileName, mimeType) {
  var isBase64 = typeof data === 'string' && /^[A-Za-z0-9+/=\n\r]+$/.test(data.replace(/^data:[^,]+,/, ''));
  var blob;
  if (isBase64) {
    var b64 = data.replace(/^data:[^,]+,/, '');
    var bin = atob(b64);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    blob = new Blob([arr], { type: mimeType });
  } else {
    blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type: mimeType });
  }
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = fileName || 'download';
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 200);
}

// ---------------------------------------------------------------------------
// 6. Markdown (tiny, opinionated)
// ---------------------------------------------------------------------------
function renderMarkdown(src) {
  if (src == null) return '';
  var html = String(src);
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/\u0060\u0060\u0060([\s\S]*?)\u0060\u0060\u0060/g, function (_, code) {
    return '<pre class="ha-mono" style="background:var(--ha-bg-base);padding:10px;border-radius:8px;overflow:auto">' + code + '</pre>';
  });
  html = html.replace(/\u0060([^\u0060]+)\u0060/g, '<code class="ha-mono">$1</code>');
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // Lists
  html = html.replace(/(^|\n)((?:- [^\n]+\n?)+)/g, function (_, pre, block) {
    var items = block.trim().split('\n').map(function (l) { return '<li>' + l.replace(/^- /, '') + '</li>'; }).join('');
    return pre + '<ul>' + items + '</ul>';
  });
  html = html.replace(/\n\n+/g, '</p><p>');
  return '<p>' + html + '</p>';
}

// ---------------------------------------------------------------------------
// 7. Render — DOM directive walker
// ---------------------------------------------------------------------------
function render() {
  // 7a. View visibility
  qa('[data-view-id]').forEach(function (el) {
    if (el.getAttribute('data-always-visible') === 'true') {
      el.style.display = '';
      return;
    }
    var id = el.getAttribute('data-view-id');
    el.classList.toggle('ha-view--active', id === state.__view);
    el.style.display = id === state.__view ? '' : 'none';
  });
  qa('[data-view-link]').forEach(function (el) {
    var id = el.getAttribute('data-view-link');
    var active = id === state.__view;
    el.classList.toggle('ha-tab--active', el.classList.contains('ha-tab') && active);
    el.classList.toggle('ha-sidebar__item--active', el.classList.contains('ha-sidebar__item') && active);
    el.classList.toggle('ha-bottom-nav__item--active', el.classList.contains('ha-bottom-nav__item') && active);
    el.classList.toggle('ha-chip--active', el.classList.contains('ha-chip') && active);
  });

  // 7b. show-when / hide-when
  qa('[data-show-when]').forEach(function (el) {
    var ok = isTruthy(evalAny(el.getAttribute('data-show-when')));
    el.style.display = ok ? '' : 'none';
  });
  qa('[data-hide-when]').forEach(function (el) {
    var hide = isTruthy(evalAny(el.getAttribute('data-hide-when')));
    el.style.display = hide ? 'none' : '';
  });

  // 7b2. Modals — mount shells before bound widgets hydrate their contents
  syncModals();

  // 7c1. Dynamic select options (optionsFrom)
  qa('select[data-options-from]').forEach(function (el) {
    var from = el.getAttribute('data-options-from');
    var labelKey = el.getAttribute('data-option-label') || 'name';
    var valueKey = el.getAttribute('data-option-value') || '_id';
    var arr = getPath({ state: state }, from) || [];
    if (!Array.isArray(arr)) arr = [];
    var bindPath = el.getAttribute('data-bind');
    var selected = bindPath ? getPath({ state: state }, bindPath) : el.value;
    var sig = from + '::' + arr.length + '::' + arr.map(function (it) {
      if (!it || typeof it !== 'object') return String(it);
      var v = it[valueKey];
      if (v == null && it.key != null) v = it.key;
      if (v == null && it.id != null) v = it.id;
      return String(v);
    }).join('|');
    if (el.getAttribute('data-options-sig') === sig) return;
    el.setAttribute('data-options-sig', sig);
    var html = '<option value=""></option>';
    for (var i = 0; i < arr.length; i++) {
      var item = arr[i];
      if (!item || typeof item !== 'object') continue;
      var val = item[valueKey];
      if (val == null && item.key != null) val = item.key;
      if (val == null && item.id != null) val = item.id;
      if (val == null || val === '') continue;
      var lab = item[labelKey];
      if (lab == null || lab === '') lab = String(val);
      var isSel = String(selected) === String(val) ? ' selected' : '';
      html += '<option value="' + escapeHtml(String(val)) + '"' + isSel + '>' + escapeHtml(String(lab)) + '</option>';
    }
    el.innerHTML = html;
  });

  // 7c. Input bindings (one-way state → DOM for inputs)
  qa('[data-bind]').forEach(function (el) {
    if (el.matches('input[type=file]')) return;
    var path = el.getAttribute('data-bind');
    var v = getPath({ state: state }, path);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
      if (el.type === 'checkbox') {
        if (el.checked !== !!v) el.checked = !!v;
      } else if (document.activeElement !== el) {
        if (el.value !== (v == null ? '' : String(v))) el.value = v == null ? '' : String(v);
      }
    } else {
      el.textContent = v == null ? '' : String(v);
    }
  });

  // 7d. Chip groups / radio cards / likert
  qa('[data-chip-host]').forEach(function (host) {
    var path = host.getAttribute('data-chip-host');
    var v = getPath({ state: state }, path);
    qa('[data-chip-group="' + cssesc(path) + '"]', host).forEach(function (chip) {
      var cv = chip.getAttribute('data-chip-value');
      var isActive = String(v) === cv;
      chip.classList.toggle('ha-chip--active', chip.classList.contains('ha-chip') && isActive);
      chip.classList.toggle('ha-mode__opt--active', chip.classList.contains('ha-mode__opt') && isActive);
      chip.classList.toggle('ha-likert__opt--active', chip.classList.contains('ha-likert__opt') && isActive);
      chip.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  });

  // 7e. Tag inputs
  qa('[data-tag-host]').forEach(function (host) {
    var path = host.getAttribute('data-tag-host');
    var arr = getPath({ state: state }, path) || [];
    if (!Array.isArray(arr)) arr = [];
    host.innerHTML = arr.map(function (t, i) {
      return '<span class="ha-chip">' + escapeHtml(String(t)) + ' <button type="button" data-tag-remove="' + cssesc(path) + '" data-tag-index="' + i + '" style="background:none;border:none;color:inherit;cursor:pointer">×</button></span>';
    }).join('');
  });

  // 7f. Templated text & attributes
  qa('[data-tmpl]').forEach(function (el) {
    var expr = el.getAttribute('data-tmpl');
    el.textContent = renderTemplate('{{' + expr + '}}', null);
  });
  qa('[data-tmpl-text]').forEach(function (el) {
    var tpl = el.getAttribute('data-tmpl-text');
    el.textContent = renderTemplate(tpl, null);
  });
  qa('[data-tmpl-icon]').forEach(function (el) {
    var tpl = el.getAttribute('data-tmpl-icon');
    var val = renderTemplate(tpl, null);
    var html = renderIcon(val, 'ha-icon');
    if (html) {
      var wrap = document.createElement('div');
      wrap.innerHTML = html;
      if (wrap.firstElementChild) el.replaceWith(wrap.firstElementChild);
    } else {
      el.remove();
    }
  });
  qa('*').forEach(function (el) {
    // attribute templating: data-tmpl-attr-<name>
    var tmplSrc = null;
    var tmplMime = null;
    for (var i = 0; i < el.attributes.length; i++) {
      var a = el.attributes[i];
      if (a.name.indexOf('data-tmpl-attr-') === 0) {
        var attrName = a.name.slice('data-tmpl-attr-'.length);
        var v = evalAny(a.value);
        if (attrName === 'src') tmplSrc = v;
        else if (attrName === 'data-image-mime') tmplMime = v;
        else if (v == null || v === '') { el.removeAttribute(attrName); }
        else { el.setAttribute(attrName, String(v)); }
      }
    }
    if (tmplSrc != null) {
      if (tmplSrc === '') el.removeAttribute('src');
      else {
        if (tmplMime) el.setAttribute('data-image-mime', String(tmplMime));
        else el.removeAttribute('data-image-mime');
        el.setAttribute('src', normalizeImageSrc(tmplSrc, tmplMime));
      }
    }
  });

  // 7g. Pre / markdown / html
  qa('[data-pre-from]').forEach(function (el) {
    var v = getPath({ state: state }, el.getAttribute('data-pre-from'));
    if (v == null) { el.textContent = ''; return; }
    el.textContent = typeof v === 'string' ? v : JSON.stringify(v, null, 2);
  });
  qa('[data-markdown-from]').forEach(function (el) {
    var src = el.getAttribute('data-markdown-from');
    var scope = el.getAttribute('data-item-scope') ? safeParseJson(el.getAttribute('data-item-scope')) : null;
    var v = scope ? getPath(scope, src) : getPath({ state: state }, src);
    if (v == null && scope) v = getPath(scope, 'item.' + src);
    var truncate = parseInt(el.getAttribute('data-markdown-truncate') || '', 10);
    var text = v ? (typeof v === 'string' ? v : JSON.stringify(v, null, 2)) : '';
    if (truncate && text.length > truncate) text = text.slice(0, truncate) + '…';
    el.innerHTML = text ? renderMarkdown(text) : '';
  });
  qa('[data-html-from]').forEach(function (el) {
    var v = getPath({ state: state }, el.getAttribute('data-html-from'));
    if (el.tagName === 'IFRAME') {
      el.srcdoc = v == null ? '' : String(v);
    } else {
      el.innerHTML = v == null ? '' : String(v);
    }
  });

  // 7h. Score ring
  qa('[data-score-from]').forEach(function (el) {
    var val = parseFloat(getPath({ state: state }, el.getAttribute('data-score-from'))) || 0;
    var max = parseFloat(el.getAttribute('data-score-max')) || 100;
    var pct = Math.max(0, Math.min(100, (val / max) * 100));
    el.style.setProperty('--val', String(pct));
    var disp = el.querySelector('[data-score-display]');
    if (disp) disp.textContent = String(Math.round(val));
  });

  // 7i. Bar chart
  qa('[data-bar-from]').forEach(function (el) {
    var arr = getPath({ state: state }, el.getAttribute('data-bar-from')) || [];
    if (!Array.isArray(arr)) arr = [];
    var labelKey = el.getAttribute('data-bar-label-key') || 'name';
    var valueKey = el.getAttribute('data-bar-value-key') || 'value';
    var maxAttr = parseFloat(el.getAttribute('data-bar-max'));
    var max = isFinite(maxAttr) ? maxAttr : arr.reduce(function (m, it) { return Math.max(m, parseFloat(it && it[valueKey]) || 0); }, 1) || 1;
    el.innerHTML = arr.map(function (it) {
      var v = parseFloat(it && it[valueKey]) || 0;
      var lbl = (it && it[labelKey]) || '';
      var pct = Math.max(0, Math.min(100, (v / max) * 100));
      return '<div class="ha-bar-row"><div class="ha-bar-row__label">' + escapeHtml(String(lbl)) + '</div><div class="ha-bar-row__track"><div class="ha-bar-row__fill" style="width:' + pct + '%"></div></div><div class="ha-bar-row__value">' + escapeHtml(String(v)) + '</div></div>';
    }).join('');
  });

  // 7j. Progress bar
  qa('[data-progress-from]').forEach(function (el) {
    var v = parseFloat(getPath({ state: state }, el.getAttribute('data-progress-from'))) || 0;
    var max = parseFloat(el.getAttribute('data-progress-max')) || 100;
    el.style.width = Math.max(0, Math.min(100, (v / max) * 100)) + '%';
  });

  // 7k. Metric grid (data-bound)
  qa('[data-metric-from]').forEach(function (el) {
    var arr = getPath({ state: state }, el.getAttribute('data-metric-from')) || [];
    if (!Array.isArray(arr)) arr = [];
    el.innerHTML = arr.map(function (m) {
      var icon = m.icon ? renderIcon(m.icon, 'ha-icon ha-icon--metric') : '';
      var sub = m.sublabel ? '<div class="ha-metric__sublabel">' + escapeHtml(String(m.sublabel)) + '</div>' : '';
      return '<div class="ha-metric">' + icon + '<div class="ha-metric__value">' + escapeHtml(String(m.value)) + '</div><div class="ha-metric__label">' + escapeHtml(String(m.label)) + '</div>' + sub + '</div>';
    }).join('');
  });

  // 7l. Status banner
  qa('[data-status-from]').forEach(function (el) {
    var data = getPath({ state: state }, el.getAttribute('data-status-from'));
    if (!data) { el.style.display = 'none'; return; }
    el.style.display = '';
    var text = typeof data === 'string' ? data : (data.text || data.message || '');
    var tone = (typeof data === 'object' && data.tone) || 'info';
    el.className = 'ha-status ha-status--' + tone;
    el.textContent = text;
  });

  // 7m. KV grid
  qa('[data-kv-from]').forEach(function (el) {
    var obj = getPath({ state: state }, el.getAttribute('data-kv-from')) || {};
    var fieldsRaw = el.getAttribute('data-kv-fields');
    var fields = fieldsRaw ? safeParseJson(fieldsRaw) : Object.keys(obj).map(function (k) { return { key: k, label: k }; });
    el.innerHTML = fields.map(function (f) {
      var v = getPath(obj, f.key);
      if (v && typeof v === 'object') v = JSON.stringify(v);
      var text = v == null ? '' : String(v);
      var valHtml = /^https?:\/\//i.test(text)
        ? '<a href="' + escapeHtml(text) + '" target="_blank" rel="noopener">' + escapeHtml(text) + '</a>'
        : escapeHtml(text);
      return '<div class="ha-kv__row"><div class="ha-kv__key">' + escapeHtml(f.label) + '</div><div class="ha-kv__val">' + valHtml + '</div></div>';
    }).join('');
  });

  // 7n. Data table
  qa('[data-table-from]').forEach(function (el) {
    var arr = getPath({ state: state }, el.getAttribute('data-table-from')) || [];
    if (!Array.isArray(arr)) arr = [];
    var cols = safeParseJson(el.getAttribute('data-table-cols')) || [];
    var rowActions = safeParseJson(el.getAttribute('data-table-actions')) || [];
    var colSpan = cols.length + (rowActions.length ? 1 : 0);
    var tbody = el.querySelector('tbody');
    if (!tbody) return;
    if (arr.length === 0) {
      tbody.innerHTML = '<tr><td colspan="' + colSpan + '" class="ha-help" style="text-align:center;padding:20px">' + escapeHtml(el.getAttribute('data-table-empty') || '') + '</td></tr>';
      return;
    }
    tbody.innerHTML = arr.map(function (row) {
      var cells = cols.map(function (c) {
        var v = getPath(row, c.key);
        return '<td' + (c.align ? ' style="text-align:' + c.align + '"' : '') + '>' + escapeHtml(v == null ? '' : String(v)) + '</td>';
      }).join('');
      if (rowActions.length) {
        var btns = rowActions.map(function (a) {
          var params = {};
          if (a.params) {
            for (var pk in a.params) params[pk] = renderTemplate(String(a.params[pk]), { item: row });
          }
          var tone = a.tone || a.variant || 'secondary';
          return '<button type="button" class="ha-btn ha-btn--sm ha-btn--' + tone + '" data-action-click="' + escapeHtml(a.action) + '" data-action-params=\'' + escapeHtml(JSON.stringify(params)) + '\'>' + escapeHtml(a.label) + '</button>';
        }).join(' ');
        cells += '<td class="ha-table__actions" style="white-space:nowrap">' + btns + '</td>';
      }
      return '<tr>' + cells + '</tr>';
    }).join('');
  });

  // 7o. Badge list
  qa('[data-badge-from], [data-badge-values]').forEach(function (el) {
    var valuesRaw = el.getAttribute('data-badge-values');
    var arr;
    if (valuesRaw) {
      var labels = safeParseJson(valuesRaw) || [];
      var scopeRaw = el.getAttribute('data-item-scope');
      var scope = scopeRaw ? safeParseJson(scopeRaw) : {};
      arr = labels.map(function (lbl) { return renderTemplate(String(lbl), scope); }).filter(Boolean);
    } else {
      arr = getPath({ state: state }, el.getAttribute('data-badge-from')) || [];
      if (!Array.isArray(arr)) {
        if (typeof arr === 'string') arr = arr.split(/[,;\n]/).map(function (s) { return s.trim(); }).filter(Boolean);
        else arr = [];
      }
    }
    var tone = el.getAttribute('data-badge-tone') || 'primary';
    var labelKey = el.getAttribute('data-badge-label-key');
    el.innerHTML = arr.map(function (it) {
      var lbl = labelKey && typeof it === 'object' ? it[labelKey] : it;
      return '<span class="ha-tag ha-tag--' + tone + '">' + escapeHtml(String(lbl)) + '</span>';
    }).join('');
  });

  // 7p. Numbered / bullet list
  qa('[data-list-from]').forEach(function (el) {
    var arr = getPath({ state: state }, el.getAttribute('data-list-from')) || [];
    if (!Array.isArray(arr)) {
      if (typeof arr === 'string') arr = arr.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      else arr = [];
    }
    var tmpl = el.getAttribute('data-list-tmpl') || '{{item}}';
    el.innerHTML = arr.map(function (item, i) {
      return '<li>' + renderTemplate(tmpl, { item: item, index: i }) + '</li>';
    }).join('');
  });

  // 7p2. Structured list (template widgets per item)
  qa('[data-ha-list-from]').forEach(function (el) {
    var arr = getPath({ state: state }, el.getAttribute('data-ha-list-from')) || [];
    if (!Array.isArray(arr)) arr = [];
    var limit = parseInt(el.getAttribute('data-ha-list-limit') || '', 10);
    if (limit > 0) arr = arr.slice(0, limit);
    var empty = el.getAttribute('data-ha-list-empty') || '';
    var keyField = el.getAttribute('data-ha-list-key');
    var tmpl = safeParseJson(el.getAttribute('data-ha-list-tmpl')) || [];
    var sig = el.getAttribute('data-ha-list-from') + '::' + arr.length + '::' + arr.map(function (it, i) {
      if (keyField && it && typeof it === 'object') return String(it[keyField]);
      return String(i);
    }).join('|');
    if (el.getAttribute('data-ha-list-sig') === sig) return;
    el.setAttribute('data-ha-list-sig', sig);
    if (arr.length === 0) {
      el.innerHTML = empty
        ? '<div class="ha-empty"><div class="ha-empty__title">' + escapeHtml(empty) + '</div></div>'
        : '';
      return;
    }
    el.innerHTML = arr.map(function (item, index) {
      var scope = { item: item, index: index };
      var parts = tmpl.map(function (w) {
        if (!w || !w.kind) return '';
        if (w.kind === 'text') {
          var textCls = w.muted ? 'ha-help' : w.strong ? 'ha-text--strong' : '';
          return '<p class="' + textCls + '">' + escapeHtml(renderTemplate(w.value || '', scope)) + '</p>';
        }
        if (w.kind === 'heading') {
          var lvl = Math.min(6, Math.max(1, w.level || 2));
          return '<h' + lvl + '>' + escapeHtml(renderTemplate(w.value || '', scope)) + '</h' + lvl + '>';
        }
        if (w.kind === 'markdown') {
          var src = w.source || '';
          var mdVal = getPath(scope, src);
          if (mdVal == null) mdVal = getPath(scope, 'item.' + src);
          var mdText = mdVal ? (typeof mdVal === 'string' ? mdVal : JSON.stringify(mdVal, null, 2)) : '';
          if (w.truncate && mdText.length > w.truncate) mdText = mdText.slice(0, w.truncate) + '…';
          return '<div class="ha-markdown">' + (mdText ? renderMarkdown(mdText) : '') + '</div>';
        }
        if (w.kind === 'badge-list') {
          var labels = w.values || [];
          var badges = labels.map(function (lbl) { return renderTemplate(String(lbl), scope); }).filter(Boolean);
          var tone = w.tone || 'primary';
          return '<div class="ha-chip-group">' + badges.map(function (lbl) {
            return '<span class="ha-tag ha-tag--' + tone + '">' + escapeHtml(lbl) + '</span>';
          }).join('') + '</div>';
        }
        return '';
      }).join('');
      var keyAttr = keyField && item && typeof item === 'object' && item[keyField] != null
        ? ' data-ha-list-item-key="' + escapeHtml(String(item[keyField])) + '"'
        : '';
      return '<div class="ha-list__item ha-stack"' + keyAttr + '>' + parts + '</div>';
    }).join('');
  });

  // 7p3. Standalone text / heading / alert templates
  qa('[data-text-tmpl]').forEach(function (el) {
    if (el.closest('[data-ha-list-from]')) return;
    el.textContent = renderTemplate(el.getAttribute('data-text-tmpl') || '', {});
  });
  qa('[data-heading-tmpl]').forEach(function (el) {
    if (el.closest('[data-ha-list-from]')) return;
    el.textContent = renderTemplate(el.getAttribute('data-heading-tmpl') || '', {});
  });
  qa('[data-alert-tmpl]').forEach(function (el) {
    el.textContent = renderTemplate(el.getAttribute('data-alert-tmpl') || '', {});
  });

  // 7q. Streaming panel
  qa('[data-stream-from]').forEach(function (el) {
    var arr = getPath({ state: state }, el.getAttribute('data-stream-from')) || [];
    if (!Array.isArray(arr)) arr = [];
    arr = arr.filter(function (item) { return item && item.nodeId; });
    var tmpl = safeParseJson(el.getAttribute('data-stream-tmpl')) || {};
    el.innerHTML = arr.map(function (item) {
      var stat = renderTemplate(tmpl.status || '{{item.status}}', { item: item });
      var cls = 'ha-stream__item' + (stat === 'completed' ? ' ha-stream__item--completed' : stat === 'failed' ? ' ha-stream__item--failed' : ' ha-stream__item--running');
      var title = renderTemplate(tmpl.title || '{{item.nodeName}}', { item: item });
      var body = renderTemplate(tmpl.body || '', { item: item });
      return '<div class="' + cls + '"><div class="ha-stream__head"><span>' + escapeHtml(title) + '</span><span class="ha-help">' + escapeHtml(stat) + '</span></div>' + (body ? '<div class="ha-stream__body">' + escapeHtml(body) + '</div>' : '') + '</div>';
    }).join('');
  });

  // 7r. Chat thread
  qa('[data-chat-from]').forEach(function (el) {
    var arr = getStateVal(el.getAttribute('data-chat-from'));
    if (!Array.isArray(arr)) arr = [];
    var showTools = el.getAttribute('data-chat-show-tools') === 'true';
    el.innerHTML = arr.map(function (m) {
      var role = m.role || 'assistant';
      var content = m.content || m.message || '';
      var html = '<div class="ha-bubble ha-bubble--' + (role === 'user' ? 'user' : 'assistant') + '">' + escapeHtml(String(content)) + '</div>';
      if (showTools && m.toolCalls && m.toolCalls.length) {
        html += '<div class="ha-bubble ha-bubble--tool">tools: ' + m.toolCalls.map(function (t) { return escapeHtml(t.name || t); }).join(', ') + '</div>';
      }
      return html;
    }).join('');
    if (el.scrollHeight) el.scrollTop = el.scrollHeight;
  });

  // 7s. History grid
  qa('[data-history-from]').forEach(function (el) {
    var rendered = el.getAttribute('data-history-rendered');
    if (rendered !== '1') return; // wait for load
    var actionId = el.getAttribute('data-history-from');
    var raw = getPath(state, '__last.' + actionId);
    var path = el.getAttribute('data-history-path');
    var arr = path ? getPath(raw && raw.output ? raw.output : raw, path) : (raw && raw.output ? raw.output : raw);
    if (!Array.isArray(arr)) {
      // try common shapes
      if (raw && raw.output && Array.isArray(raw.output[path])) arr = raw.output[path];
      else if (raw && Array.isArray(raw[path])) arr = raw[path];
      else if (raw && raw.output) {
        // pick first array value
        for (var k in raw.output) if (Array.isArray(raw.output[k])) { arr = raw.output[k]; break; }
      }
    }
    if (!Array.isArray(arr)) arr = [];
    var tmpl = safeParseJson(el.getAttribute('data-history-tmpl')) || {};
    if (arr.length === 0) {
      el.innerHTML = '<div class="ha-empty">' + renderIcon('lucide:Inbox', 'ha-icon ha-empty__icon') + '<div class="ha-empty__title">' + escapeHtml(el.getAttribute('data-history-empty') || '') + '</div></div>';
      return;
    }
    el.innerHTML = arr.map(function (item, i) {
      var title = renderTemplate(tmpl.title || '{{item.title}}', { item: item, index: i });
      var sub = tmpl.subtitle ? renderTemplate(tmpl.subtitle, { item: item, index: i }) : '';
      var meta = tmpl.meta ? renderTemplate(tmpl.meta, { item: item, index: i }) : '';
      var badge = tmpl.badge ? renderTemplate(tmpl.badge, { item: item, index: i }) : '';
      var imgSrc = tmpl.image ? normalizeImageSrc(renderTemplate(tmpl.image, { item: item, index: i })) : '';
      var img = imgSrc ? '<img src="' + escapeHtml(String(imgSrc)) + '" alt="" style="width:80px;height:80px;object-fit:contain;border-radius:8px;margin-bottom:8px;background:#fff;padding:4px" />' : '';
      return '<div class="ha-history__item" data-history-index="' + i + '">' +
        img +
        (badge ? '<span class="ha-tag" style="float:right">' + escapeHtml(badge) + '</span>' : '') +
        '<div class="ha-history__title">' + escapeHtml(title) + '</div>' +
        (sub ? '<div class="ha-history__subtitle">' + escapeHtml(sub) + '</div>' : '') +
        (meta ? '<div class="ha-history__meta">' + escapeHtml(meta) + '</div>' : '') +
      '</div>';
    }).join('');
  });

  // 7s2. Quiz questions
  qa('[data-quiz-from]').forEach(function (el) {
    var qPath = el.getAttribute('data-quiz-from');
    var aPath = el.getAttribute('data-quiz-answers') || 'state.currentAnswers';
    var questions = getPath({ state: state }, qPath);
    if (!Array.isArray(questions)) questions = [];
    var answers = getPath({ state: state }, aPath) || [];
    if (!Array.isArray(answers)) answers = [];
    var sig = qPath + '::' + questions.length + '::' + questions.map(function (q, i) {
      return (q && (q.id != null ? q.id : i + 1)) + ':' + (q && q.question);
    }).join('|');
    if (el.getAttribute('data-quiz-sig') !== sig) {
      el.setAttribute('data-quiz-sig', sig);
      if (questions.length === 0) {
        el.innerHTML = '';
        return;
      }
      el.innerHTML = questions.map(function (q, i) {
        var qid = q && q.id != null ? q.id : (i + 1);
        var opts = (q && q.options) || [];
        var type = (q && q.type) || (opts.length ? 'multiple-choice' : 'short-answer');
        var ans = null;
        for (var ai = 0; ai < answers.length; ai++) {
          if (answers[ai].questionId === qid || String(answers[ai].questionId) === String(qid)) {
            ans = answers[ai].answer;
            break;
          }
        }
        var controls = '';
        if (type === 'short-answer' || !opts.length) {
          controls = '<input type="text" class="ha-input" data-quiz-text data-quiz-qid="' + escapeHtml(String(qid)) + '" data-quiz-answers="' + escapeHtml(aPath) + '" value="' + escapeHtml(ans == null ? '' : String(ans)) + '" placeholder="Your answer" />';
        } else {
          controls = opts.map(function (opt, j) {
            var optStr = String(opt);
            var letter = String.fromCharCode(65 + j);
            var label = /^[A-Da-d][.)]\s/.test(optStr) ? optStr : (letter + '. ' + optStr);
            var checked = ans != null && String(ans) === String(opt) ? ' checked' : '';
            return '<label class="ha-chip" style="cursor:pointer;display:flex;align-items:center;gap:8px">' +
              '<input type="radio" name="quiz-q-' + escapeHtml(String(qid)) + '" data-quiz-qid="' + escapeHtml(String(qid)) + '" data-quiz-answers="' + escapeHtml(aPath) + '" value="' + escapeHtml(optStr) + '"' + checked + ' />' +
              '<span>' + escapeHtml(label) + '</span></label>';
          }).join('');
        }
        return '<div class="ha-card ha-stack" style="gap:12px">' +
          '<div class="ha-help">Question ' + (i + 1) + ' of ' + questions.length + '</div>' +
          '<div style="font-weight:600">' + escapeHtml((q && q.question) || '') + '</div>' +
          '<div class="ha-stack">' + controls + '</div></div>';
      }).join('');
    } else {
      qa('[data-quiz-qid]', el).forEach(function (input) {
        var qid = input.getAttribute('data-quiz-qid');
        var val = null;
        for (var ai = 0; ai < answers.length; ai++) {
          if (answers[ai].questionId === Number(qid) || String(answers[ai].questionId) === String(qid)) {
            val = answers[ai].answer;
            break;
          }
        }
        if (input.type === 'radio') input.checked = val != null && String(val) === String(input.value);
        else if (document.activeElement !== input) input.value = val == null ? '' : String(val);
      });
    }
  });

  // 7t. Loading buttons
  qa('[data-action-click]').forEach(function (btn) {
    var actId = btn.getAttribute('data-action-click');
    var loading = !!getPath(state, '__loading.' + actId);
    btn.disabled = loading || isTruthy(evalAny(btn.getAttribute('data-disabled-when')));
    var lbl = btn.getAttribute('data-submit-label');
    var llbl = btn.getAttribute('data-loading-label');
    if (lbl && llbl) {
      var hasSpin = btn.querySelector('.ha-spinner');
      if (loading && !hasSpin) { btn.innerHTML = '<span class="ha-spinner"></span> ' + escapeHtml(llbl); }
      else if (!loading && hasSpin) { btn.textContent = lbl; }
    }
  });
  qa('form[data-action-submit]').forEach(function (form) {
    var actId = form.getAttribute('data-action-submit');
    var loading = !!getPath(state, '__loading.' + actId);
    var sub = form.querySelector('button[type=submit]');
    if (!sub) return;
    sub.disabled = loading || isTruthy(evalAny(sub.getAttribute('data-disabled-when')));
    var lbl = sub.getAttribute('data-submit-label');
    var llbl = sub.getAttribute('data-loading-label');
    if (lbl && llbl) {
      var hasSpin = sub.querySelector('.ha-spinner');
      if (loading && !hasSpin) { sub.innerHTML = '<span class="ha-spinner"></span> ' + escapeHtml(llbl); }
      else if (!loading && hasSpin) { sub.textContent = lbl; }
    }
  });

  // 7v. OAuth cards
  qa('[data-oauth-card]').forEach(function (el) {
    var actId = el.getAttribute('data-oauth-card');
    var info = getPath(state, '__oauth.' + actId) || {};
    var dot = el.querySelector('[data-oauth-dot]');
    var lblEl = el.querySelector('[data-oauth-label]');
    var btn = el.querySelector('[data-oauth-connect]');
    var connected = !!(info.authenticated || info.connected || info.status === 'connected');
    if (!connected && info.tokens && Array.isArray(info.tokens)) {
      connected = info.tokens.some(function (t) { return t && t.hasValidToken && !t.isExpired; });
    }
    if (dot) {
      dot.classList.toggle('ha-footer-status__dot--idle', !connected);
      dot.style.background = connected ? 'var(--ha-success)' : '';
    }
    if (lblEl) lblEl.textContent = connected ? (el.getAttribute('data-oauth-connected-label') || 'Connected') : (el.getAttribute('data-oauth-disconnected-label') || 'Not connected');
    if (btn) btn.hidden = connected;
  });
}

function safeParseJson(s) { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function cssesc(s) { return String(s).replace(/(["\\\\])/g, '\\$1'); }

function bindValueFromEl(el) {
  if (el.type === 'checkbox') return el.checked;
  if (el.type === 'number' || el.type === 'range') return el.value === '' ? '' : Number(el.value);
  return el.value;
}

function syncBindFromEl(el) {
  var path = el.getAttribute && el.getAttribute('data-bind');
  if (!path) return;
  if (el.matches && el.matches('input[type=file]')) return;
  if (el.matches && el.matches('[data-tag-input]')) return;
  setPath(state, path, bindValueFromEl(el));
}

function syncFormFromDom(form) {
  qa('[data-bind]', form).forEach(syncBindFromEl);
}

function setQuizAnswer(aPath, qid, value) {
  var answers = getPath({ state: state }, aPath) || [];
  if (!Array.isArray(answers)) answers = [];
  var id = isFinite(Number(qid)) ? Number(qid) : qid;
  var found = false;
  for (var i = 0; i < answers.length; i++) {
    if (answers[i].questionId === id || String(answers[i].questionId) === String(id)) {
      answers[i].answer = value;
      found = true;
      break;
    }
  }
  if (!found) answers.push({ questionId: id, answer: value });
  setPath(state, aPath, answers.slice());
}

// ---------------------------------------------------------------------------
// 8. Event delegation
// ---------------------------------------------------------------------------
document.addEventListener('input', function (e) {
  var t = e.target;
  var path = t.getAttribute && t.getAttribute('data-bind');
  if (path) {
    syncBindFromEl(t);
    schedule();
    return;
  }
  if (t.getAttribute && t.getAttribute('data-quiz-text')) {
    setQuizAnswer(t.getAttribute('data-quiz-answers') || 'state.currentAnswers', t.getAttribute('data-quiz-qid'), t.value);
    schedule();
  }
});

document.addEventListener('change', function (e) {
  var t = e.target;
  if (t.tagName === 'INPUT' && t.type === 'file' && t.parentElement && t.parentElement.matches('[data-dropzone]')) {
    handleFile(t.parentElement, t.files && t.files[0]);
    return;
  }
  if (t.getAttribute && t.getAttribute('data-bind')) {
    syncBindFromEl(t);
    schedule();
    return;
  }
  if (t.tagName === 'INPUT' && t.type === 'radio' && t.getAttribute('data-quiz-qid')) {
    setQuizAnswer(t.getAttribute('data-quiz-answers') || 'state.currentAnswers', t.getAttribute('data-quiz-qid'), t.value);
    schedule();
  }
});

document.addEventListener('click', function (e) {
  var t = e.target;

  // View link
  var vl = t.closest && t.closest('[data-view-link]');
  if (vl) { state.__view = vl.getAttribute('data-view-link'); schedule(); return; }

  // Tab
  var tb = t.closest && t.closest('[data-tab]');
  if (tb && tb.getAttribute('data-tab-group')) {
    var group = tb.getAttribute('data-tab-group');
    var id = tb.getAttribute('data-tab');
    qa('[data-tab-group="' + cssesc(group) + '"][data-tab]').forEach(function (b) {
      b.classList.toggle('ha-tab--active', b.getAttribute('data-tab') === id);
    });
    qa('[data-tab-group="' + cssesc(group) + '"][data-tab-panel]').forEach(function (p) {
      p.classList.toggle('ha-tab-panel--active', p.getAttribute('data-tab-panel') === id);
    });
    return;
  }

  // Chip
  var ch = t.closest && t.closest('[data-chip-group]');
  if (ch) {
    var path = ch.getAttribute('data-chip-group');
    var val = ch.getAttribute('data-chip-value');
    var num = Number(val);
    setPath(state, path, isFinite(num) && String(num) === val ? num : val);
    schedule();
    return;
  }

  // Tag remove
  var trm = t.closest && t.closest('[data-tag-remove]');
  if (trm) {
    var p = trm.getAttribute('data-tag-remove');
    var i = parseInt(trm.getAttribute('data-tag-index'), 10);
    var arr = getPath({ state: state }, p) || [];
    if (Array.isArray(arr)) { arr.splice(i, 1); setPath(state, p, arr.slice()); schedule(); }
    return;
  }

  // History item click
  var hi = t.closest && t.closest('[data-history-index]');
  if (hi) {
    var grid = hi.closest('[data-history-from]');
    if (grid) {
      var cfg = safeParseJson(grid.getAttribute('data-history-onclick'));
      if (cfg) {
        var idx = parseInt(hi.getAttribute('data-history-index'), 10);
        var actionId = grid.getAttribute('data-history-from');
        var raw = getPath(state, '__last.' + actionId);
        var path = grid.getAttribute('data-history-path');
        var arr = path ? getPath(raw && raw.output ? raw.output : raw, path) : (raw && raw.output ? raw.output : raw);
        if (!Array.isArray(arr) && raw && raw.output) { for (var k in raw.output) if (Array.isArray(raw.output[k])) { arr = raw.output[k]; break; } }
        var item = (arr || [])[idx];
        if (cfg.set) for (var sk in cfg.set) {
          var sv = cfg.set[sk];
          setPath(state, sk, sv === '$item' || sv === 'item' ? item : evalAny(sv, { item: item }));
        }
        if (cfg.params) {
          var params = {};
          for (var pk in cfg.params) params[pk] = evalAny(cfg.params[pk], { item: item });
          if (cfg.action) dispatch(cfg.action, params);
        } else if (cfg.action) {
          dispatch(cfg.action, { item: item });
        }
        if (cfg.goto) setPath(state, '__view', cfg.goto);
        schedule();
      }
    }
    return;
  }

  // Action click
  var chatSend = t.closest && t.closest('[data-chat-send]');
  if (chatSend) {
    var chatRoot = chatSend.closest('.ha-chat');
    if (chatRoot) {
      var threadEl = chatRoot.querySelector('[data-chat-from]');
      var inputEl = chatRoot.querySelector('[data-chat-input]');
      if (threadEl && inputEl) {
        var msgListPath = threadEl.getAttribute('data-chat-from');
        var draftPath = inputEl.getAttribute('data-bind');
        var text = String(getStateVal(draftPath) || inputEl.value || '').trim();
        if (!text) return;
        var msgs = getStateVal(msgListPath);
        if (!Array.isArray(msgs)) msgs = [];
        msgs = msgs.slice();
        msgs.push({ role: 'user', content: text });
        setStateVal(msgListPath, msgs);
        setStateVal(draftPath, text);
        inputEl.value = text;
        schedule();
      }
    }
    var chatAid = chatSend.getAttribute('data-action-click');
    if (chatAid) dispatch(chatAid, {});
    return;
  }

  // Dropzone click — hidden file inputs are unreliable in Tauri/WebView iframes
  var dzClick = t.closest && t.closest('[data-dropzone]');
  if (dzClick && !(t.tagName === 'INPUT' && t.type === 'file')) {
    pickFileViaTauri(dzClick).then(function (used) {
      if (!used) {
        var fileInput = dzClick.querySelector('input[type="file"]');
        if (fileInput) fileInput.click();
      }
    });
    return;
  }

  var ac = t.closest && t.closest('[data-action-click]');
  if (ac) {
    var aid = ac.getAttribute('data-action-click');
    var params = safeParseJson(ac.getAttribute('data-action-params')) || {};
    dispatch(aid, params);
    return;
  }

  // Copy
  var cp = t.closest && t.closest('[data-copy-from]');
  if (cp) {
    var v = getPath({ state: state }, cp.getAttribute('data-copy-from'));
    var text = typeof v === 'string' ? v : JSON.stringify(v, null, 2);
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast('Copied', 'success'); });
    return;
  }

  // Download
  var dl = t.closest && t.closest('[data-download-from]');
  if (dl) {
    var data = getPath({ state: state }, dl.getAttribute('data-download-from'));
    var namePath = dl.getAttribute('data-download-name-path');
    var name = namePath ? getPath({ state: state }, namePath) : dl.getAttribute('data-download-name');
    triggerDownload(data, name || 'download', dl.getAttribute('data-download-mime') || 'application/octet-stream');
    return;
  }

  // Print
  var pr = t.closest && t.closest('[data-print-target]');
  if (pr) { window.print(); return; }

  // OAuth connect
  var oa = t.closest && t.closest('[data-oauth-connect]');
  if (oa) {
    var card = oa.closest('[data-oauth-card]');
    if (card) {
      var aid2 = card.getAttribute('data-oauth-card');
      var action = ACTIONS[aid2];
      if (action && action.oauth) window.location.href = action.oauth.initUrl;
    }
    return;
  }

  // Modal close (backdrop only — not clicks inside the dialog)
  var mc = t.closest && t.closest('[data-modal-close]');
  if (mc && !t.closest('.ha-modal, .ha-sheet')) {
    var inst = mc.closest('[data-modal-instance]');
    if (inst) {
      var modalId = inst.getAttribute('data-modal-instance');
      var tpl = document.querySelector('template[data-modal="' + cssesc(modalId) + '"]');
      if (tpl) {
        var when = tpl.getAttribute('data-modal-when');
        if (when) setPath(state, when, null);
      }
      inst.remove();
    }
    schedule();
    return;
  }

  // Quick action
  var qaBtn = t.closest && t.closest('[data-quick-action]');
  if (qaBtn) {
    var sets = safeParseJson(qaBtn.getAttribute('data-quick-action'));
    if (sets) for (var qk in sets) setPath(state, qk, sets[qk]);
    schedule();
    return;
  }

  // Repeatable add/remove
  var raddBtn = t.closest && t.closest('[data-repeat-add]');
  if (raddBtn) {
    var host = raddBtn.closest('[data-repeat-host]');
    if (host) addRepeat(host);
    return;
  }
  var rrmBtn = t.closest && t.closest('[data-repeat-remove]');
  if (rrmBtn) {
    var row = rrmBtn.closest('[data-repeat-row]');
    if (row) { row.remove(); syncRepeat(row.closest('[data-repeat-host]')); }
    return;
  }
});

document.addEventListener('submit', function (e) {
  var form = e.target;
  if (!form.matches || !form.matches('form[data-action-submit]')) return;
  e.preventDefault();
  syncFormFromDom(form);
  var actId = form.getAttribute('data-action-submit');
  // Inline validation (data-validate is JSON array)
  var raw = form.getAttribute('data-validate');
  if (raw) {
    var rules = safeParseJson(raw) || [];
    for (var i = 0; i < rules.length; i++) {
      if (isTruthy(evalAny(rules[i].when))) { toast(rules[i].message || 'Invalid', 'danger'); return; }
    }
  }
  dispatch(actId, {});
});

// Tag input — Enter to add
document.addEventListener('keydown', function (e) {
  var t = e.target;
  if (!t.matches || !t.matches('[data-tag-input]')) return;
  var sep = t.getAttribute('data-tag-separator') || 'Enter';
  if (e.key === sep || (sep === 'Comma' && e.key === ',')) {
    e.preventDefault();
    var v = t.value.trim();
    if (!v) return;
    var path = t.getAttribute('data-bind');
    var arr = getPath({ state: state }, path) || [];
    if (!Array.isArray(arr)) arr = [];
    arr.push(v);
    setPath(state, path, arr);
    t.value = '';
    schedule();
  }
});

// Dropzone drag&drop
document.addEventListener('dragover', function (e) {
  var dz = e.target.closest && e.target.closest('[data-dropzone]');
  if (dz) { e.preventDefault(); dz.classList.add('ha-dropzone--drag'); }
});
document.addEventListener('dragleave', function (e) {
  var dz = e.target.closest && e.target.closest('[data-dropzone]');
  if (dz) dz.classList.remove('ha-dropzone--drag');
});
document.addEventListener('drop', function (e) {
  var dz = e.target.closest && e.target.closest('[data-dropzone]');
  if (!dz) return;
  e.preventDefault();
  dz.classList.remove('ha-dropzone--drag');
  var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (f) handleFile(dz, f);
});

function guessMimeType(name) {
  var ext = (String(name).split('.').pop() || '').toLowerCase();
  var map = {
    txt: 'text/plain', csv: 'text/csv', json: 'application/json', pdf: 'application/pdf',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
    mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', webm: 'video/webm',
  };
  return map[ext] || 'application/octet-stream';
}

function acceptToDialogFilters(accept) {
  if (!accept) return undefined;
  if (accept.indexOf('image/*') >= 0) {
    return [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }];
  }
  var exts = accept.split(',').map(function (s) {
    return s.trim().replace(/^\./, '').replace(/^\*\/\*$/, '');
  }).filter(function (e) { return e && e.indexOf('/') < 0; });
  if (exts.length) return [{ name: 'Files', extensions: exts }];
  return undefined;
}

/** @returns {Promise<boolean>} true when handled (including user cancel) */
function pickFileViaTauri(dz) {
  var tauri = window.__TAURI__ || (window.parent && window.parent.__TAURI__);
  if (!tauri || !tauri.dialog || !tauri.dialog.open || !tauri.fs || !tauri.fs.readFile) {
    return Promise.resolve(false);
  }
  var accept = dz.getAttribute('data-accept');
  var opts = { multiple: false, title: 'Choose file' };
  var filters = acceptToDialogFilters(accept);
  if (filters) opts.filters = filters;
  return tauri.dialog.open(opts).then(function (path) {
    if (!path) return true;
    var filePath = Array.isArray(path) ? path[0] : path;
    if (!filePath) return true;
    return tauri.fs.readFile(filePath).then(function (bytes) {
      var name = String(filePath).split(/[/\\\\]/).pop() || 'file';
      var mime = guessMimeType(name);
      var u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      var file = new File([u8], name, { type: mime });
      handleFile(dz, file);
      return true;
    });
  }).catch(function (err) {
    console.warn('[HA] Tauri file picker failed:', err);
    return false;
  });
}

function handleFile(dz, file) {
  if (!file) return;
  var path = dz.getAttribute('data-dropzone');
  var asImage = dz.getAttribute('data-as-image') === 'true';
  var asBase64 = dz.getAttribute('data-as-base64') === 'true';
  var maxSize = parseInt(dz.getAttribute('data-max-size'), 10);
  if (maxSize && file.size > maxSize * 1024 * 1024) { toast('File too large (max ' + maxSize + ' MB)', 'danger'); return; }
  setPath(state, path + '__name', file.name);
  setPath(state, path + '__type', file.type);
  var hint = dz.querySelector('[data-dropzone-hint]');
  if (hint) hint.textContent = file.name;
  var preview = dz.querySelector('[data-dropzone-preview]');
  if (asImage && preview) {
    var url = URL.createObjectURL(file);
    preview.src = url; preview.hidden = false;
  }
  var reader = new FileReader();
  reader.onload = function () {
    var result = reader.result;
    if (asBase64 && typeof result === 'string') {
      var b64 = result.indexOf('base64,') >= 0 ? result.split('base64,')[1] : result;
      setPath(state, path, b64);
    } else {
      setPath(state, path, result);
    }
    schedule();
  };
  if (asBase64) reader.readAsDataURL(file);
  else reader.readAsText(file);
}

// Repeatable add/remove + sync
function addRepeat(host) {
  var tpl = host.querySelector('template[data-repeat-template]');
  var items = host.querySelector('[data-repeat-items]');
  if (!tpl || !items) return;
  var row = document.createElement('div');
  row.className = 'ha-repeat-row';
  row.setAttribute('data-repeat-row', '');
  row.innerHTML = tpl.innerHTML;
  items.appendChild(row);
  syncRepeat(host);
}
function syncRepeat(host) {
  if (!host) return;
  var path = host.getAttribute('data-repeat-host');
  var rows = host.querySelectorAll('[data-repeat-row]');
  var arr = [];
  rows.forEach(function (row, i) {
    var item = {};
    row.querySelectorAll('[data-bind]').forEach(function (input) {
      var p = input.getAttribute('data-bind');
      if (p.indexOf('item.') === 0) item[p.slice('item.'.length)] = input.type === 'number' ? Number(input.value) : input.value;
    });
    arr.push(item);
  });
  setPath(state, path, arr);
  schedule();
}

// ---------------------------------------------------------------------------
// 9. View transitions: run onEnter actions
// ---------------------------------------------------------------------------
var lastView = null;
function onViewMaybeChanged() {
  if (lastView === state.__view) return;
  lastView = state.__view;
  var sec = document.querySelector('[data-view-id="' + cssesc(state.__view) + '"]');
  if (!sec) return;
  var on = sec.getAttribute('data-on-enter');
  if (on) on.split(',').forEach(function (a) { a = a.trim(); if (a) dispatch(a, {}); });
  // Trigger history loads in this view (refresh every time the view opens)
  qa('[data-history-from]', sec).forEach(function (g) {
    if (g.getAttribute('data-history-rendered') !== '1') {
      g.setAttribute('data-history-rendered', '1');
    }
    dispatch(g.getAttribute('data-history-from'), {});
  });
}

// Hook into render to detect view changes
var _origRender = render;
render = function () { _origRender(); onViewMaybeChanged(); };

// ---------------------------------------------------------------------------
// 10. Boot
// ---------------------------------------------------------------------------
function boot() {
  // Initial repeatable rows
  qa('[data-repeat-host]').forEach(function (host) {
    var min = parseInt(host.getAttribute('data-repeat-min'), 10) || 0;
    for (var i = 0; i < min; i++) addRepeat(host);
  });
  // OAuth poll status
  qa('[data-oauth-card]').forEach(function (el) {
    var actId = el.getAttribute('data-oauth-card');
    var action = ACTIONS[actId];
    if (action && action.type === 'oauth') dispatch(actId, {});
  });
  // onEnter for default view
  if (CFG.onMount) {
    var mountActions = Array.isArray(CFG.onMount) ? CFG.onMount : [CFG.onMount];
    mountActions.forEach(function (a) {
      if (typeof a === 'string' && a) dispatch(a, {});
    });
  }
  schedule();
  // Polling actions
  for (var aid in ACTIONS) {
    var a = ACTIONS[aid];
    if (a.poll && a.poll.auto !== false) {
      (function (id, interval) {
        dispatch(id, {});
        setInterval(function () { dispatch(id, {}); }, interval);
      })(aid, a.poll.intervalMs || 5000);
    }
  }
  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// Expose for debugging
window.__ha = { state: state, dispatch: dispatch, schedule: schedule };

})();
`;

/** Build browser runtime JS (path-based icons, no Node fs). */
export function getRuntimeJs(): string {
  return RUNTIME_JS_TEMPLATE.replace('__ICON_RUNTIME__', buildRuntimeIconJs());
}
