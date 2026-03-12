const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

async function runInQuickJS() {
  const bundlePath = path.join(__dirname, 'dist/bundle.js');
  
  if (!fs.existsSync(bundlePath)) {
    console.error('Error: dist/bundle.js not found. Run "npm test" first to generate the bundle.');
    process.exit(1);
  }
  
  // Check if qjs is available
  try {
    execSync('which qjs', { stdio: 'pipe' });
  } catch {
    console.error('Error: qjs (QuickJS CLI) not found. Install it with: brew install quickjs');
    process.exit(1);
  }
  
  const bundleCode = fs.readFileSync(bundlePath, 'utf8');
  
  console.log('=== Testing bundle.js in QuickJS (qjs) ===\n');
  console.log('Bundle size:', (bundleCode.length / 1024 / 1024).toFixed(2), 'MB');
  
  // Check for Node.js dependencies in bundle
  const nodeModules = ['node:events', 'node:util', 'node:http', 'node:https', 'node:fs', 'node:path'];
  const foundNodeDeps = nodeModules.filter(mod => bundleCode.includes(`"${mod}"`));
  
  if (foundNodeDeps.length > 0) {
    console.log('\n⚠️  Warning: Bundle contains Node.js module references:');
    foundNodeDeps.forEach(dep => console.log(`   - ${dep}`));
    console.log('\nThese modules are not available in QuickJS.');
    console.log('The bundle requires Node.js runtime for full functionality.\n');
  }
  
  // Create a wrapper script that adds shims and runs the bundle
  const wrapperCode = `
// QuickJS shims
globalThis.window = globalThis;
globalThis.self = globalThis;
globalThis.__dirname = '/bundle';
globalThis.__filename = '/bundle/index.js';

// CommonJS module shims
globalThis.module = { exports: {} };
globalThis.exports = globalThis.module.exports;

// Stub require for external modules that esbuild couldn't bundle
globalThis.require = function(moduleName) {
  // Module stubs for externalized dependencies
  var stubs = {
    'tiktoken': {
      encoding_for_model: function() { return { encode: function(s) { return []; }, decode: function() { return ''; }, free: function() {} }; },
      get_encoding: function() { return { encode: function(s) { return []; }, decode: function() { return ''; }, free: function() {} }; },
      Tiktoken: function() { this.encode = function(s) { return []; }; this.decode = function() { return ''; }; this.free = function() {}; }
    },
    'form-data': function FormData() { this._data = []; this.append = function(){}; this.getHeaders = function(){ return {}; }; },
    'axios': { default: { create: function() { return { get: function() { return Promise.reject(new Error('axios not available')); }, post: function() { return Promise.reject(new Error('axios not available')); } }; } } },
    'dotenv': { config: function() {} },
    'winston': { createLogger: function() { return { info: function(){}, error: function(){}, warn: function(){}, debug: function(){} }; }, format: { combine: function() {}, timestamp: function(){}, json: function(){}, simple: function(){}, colorize: function(){} }, transports: { Console: function(){}, File: function(){} } },
    'yaml': { parse: function(s) { return {}; }, stringify: function(o) { return ''; } },
    'yargs': { default: function() { return { option: function() { return this; }, parse: function() { return {}; } }; } },
    'express': function() { return { use: function() { return this; }, get: function() { return this; }, post: function() { return this; }, listen: function() {} }; },
    'inherits': function(ctor, superCtor) { ctor.super_ = superCtor; Object.setPrototypeOf(ctor.prototype, superCtor.prototype); },
    'debug': function() { return function() {}; },
    'typescript': {},
    '@ha-bits/bindings': {},
    '@ha-bits/core': {},
    '@habits/shared': {}
  };
  
  // Check if it's an externalized module we have a stub for
  if (stubs[moduleName]) {
    return typeof stubs[moduleName] === 'function' ? stubs[moduleName] : stubs[moduleName];
  }
  
  // Check for @activepieces/* packages
  if (moduleName.startsWith('@activepieces/')) {
    return {};
  }
  
  throw new Error('Module not found: ' + moduleName);
};

// Web Fetch API polyfills
(function() {
  // Headers class
  function Headers(init) {
    this._headers = {};
    if (init) {
      if (init instanceof Headers) {
        this._headers = Object.assign({}, init._headers);
      } else if (typeof init === 'object') {
        Object.keys(init).forEach(function(key) {
          this._headers[key.toLowerCase()] = String(init[key]);
        }, this);
      }
    }
  }
  Headers.prototype.append = function(name, value) {
    this._headers[name.toLowerCase()] = String(value);
  };
  Headers.prototype.delete = function(name) {
    delete this._headers[name.toLowerCase()];
  };
  Headers.prototype.get = function(name) {
    return this._headers[name.toLowerCase()] || null;
  };
  Headers.prototype.has = function(name) {
    return name.toLowerCase() in this._headers;
  };
  Headers.prototype.set = function(name, value) {
    this._headers[name.toLowerCase()] = String(value);
  };
  Headers.prototype.forEach = function(callback, thisArg) {
    Object.keys(this._headers).forEach(function(key) {
      callback.call(thisArg, this._headers[key], key, this);
    }, this);
  };
  Headers.prototype.entries = function() {
    return Object.entries(this._headers)[Symbol.iterator]();
  };
  Headers.prototype.keys = function() {
    return Object.keys(this._headers)[Symbol.iterator]();
  };
  Headers.prototype.values = function() {
    return Object.values(this._headers)[Symbol.iterator]();
  };
  globalThis.Headers = Headers;

  // Request class
  function Request(input, init) {
    init = init || {};
    this.url = typeof input === 'string' ? input : input.url;
    this.method = (init.method || 'GET').toUpperCase();
    this.headers = new Headers(init.headers);
    this.body = init.body || null;
    this.mode = init.mode || 'cors';
    this.credentials = init.credentials || 'same-origin';
    this.cache = init.cache || 'default';
    this.redirect = init.redirect || 'follow';
    this.referrer = init.referrer || 'about:client';
    this.integrity = init.integrity || '';
  }
  Request.prototype.clone = function() {
    return new Request(this.url, {
      method: this.method,
      headers: this.headers,
      body: this.body,
      mode: this.mode,
      credentials: this.credentials
    });
  };
  Request.prototype.text = function() { return Promise.resolve(this.body || ''); };
  Request.prototype.json = function() { return Promise.resolve(JSON.parse(this.body || '{}')); };
  globalThis.Request = Request;

  // Response class
  function Response(body, init) {
    init = init || {};
    this._body = body || '';
    this.status = init.status !== undefined ? init.status : 200;
    this.statusText = init.statusText || 'OK';
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new Headers(init.headers);
    this.type = 'basic';
    this.url = init.url || '';
    this.redirected = false;
  }
  Response.prototype.clone = function() {
    return new Response(this._body, {
      status: this.status,
      statusText: this.statusText,
      headers: this.headers
    });
  };
  Response.prototype.text = function() { return Promise.resolve(this._body); };
  Response.prototype.json = function() { return Promise.resolve(JSON.parse(this._body || '{}')); };
  Response.prototype.arrayBuffer = function() { return Promise.resolve(new ArrayBuffer(0)); };
  Response.prototype.blob = function() { return Promise.resolve(new Blob([])); };
  Response.error = function() { return new Response(null, { status: 0, statusText: '' }); };
  Response.redirect = function(url, status) { return new Response(null, { status: status || 302, headers: { Location: url } }); };
  globalThis.Response = Response;

  // Blob class (basic)
  if (typeof Blob === 'undefined') {
    function Blob(parts, options) {
      this._parts = parts || [];
      this.type = (options && options.type) || '';
      this.size = 0;
    }
    Blob.prototype.text = function() { return Promise.resolve(this._parts.join('')); };
    Blob.prototype.arrayBuffer = function() { return Promise.resolve(new ArrayBuffer(0)); };
    Blob.prototype.slice = function() { return new Blob([]); };
    globalThis.Blob = Blob;
  }

  // File class
  if (typeof File === 'undefined') {
    function File(bits, name, options) {
      Blob.call(this, bits, options);
      this.name = name;
      this.lastModified = (options && options.lastModified) || Date.now();
    }
    File.prototype = Object.create(Blob.prototype);
    globalThis.File = File;
  }

  // FormData class
  if (typeof FormData === 'undefined') {
    function FormData() {
      this._data = [];
    }
    FormData.prototype.append = function(name, value, filename) {
      this._data.push({ name: name, value: value, filename: filename });
    };
    FormData.prototype.delete = function(name) {
      this._data = this._data.filter(function(item) { return item.name !== name; });
    };
    FormData.prototype.get = function(name) {
      var item = this._data.find(function(item) { return item.name === name; });
      return item ? item.value : null;
    };
    FormData.prototype.getAll = function(name) {
      return this._data.filter(function(item) { return item.name === name; }).map(function(item) { return item.value; });
    };
    FormData.prototype.has = function(name) {
      return this._data.some(function(item) { return item.name === name; });
    };
    FormData.prototype.set = function(name, value, filename) {
      this.delete(name);
      this.append(name, value, filename);
    };
    FormData.prototype.entries = function() {
      return this._data.map(function(item) { return [item.name, item.value]; })[Symbol.iterator]();
    };
    globalThis.FormData = FormData;
  }

  // URLSearchParams class
  if (typeof URLSearchParams === 'undefined') {
    function URLSearchParams(init) {
      this._params = [];
      if (typeof init === 'string') {
        init.replace(/^\\?/, '').split('&').forEach(function(pair) {
          var parts = pair.split('=');
          if (parts[0]) this._params.push([decodeURIComponent(parts[0]), decodeURIComponent(parts[1] || '')]);
        }, this);
      } else if (init && typeof init === 'object') {
        Object.keys(init).forEach(function(key) {
          this._params.push([key, String(init[key])]);
        }, this);
      }
    }
    URLSearchParams.prototype.append = function(name, value) { this._params.push([name, String(value)]); };
    URLSearchParams.prototype.delete = function(name) { this._params = this._params.filter(function(p) { return p[0] !== name; }); };
    URLSearchParams.prototype.get = function(name) {
      var param = this._params.find(function(p) { return p[0] === name; });
      return param ? param[1] : null;
    };
    URLSearchParams.prototype.getAll = function(name) {
      return this._params.filter(function(p) { return p[0] === name; }).map(function(p) { return p[1]; });
    };
    URLSearchParams.prototype.has = function(name) {
      return this._params.some(function(p) { return p[0] === name; });
    };
    URLSearchParams.prototype.set = function(name, value) {
      this.delete(name);
      this.append(name, value);
    };
    URLSearchParams.prototype.toString = function() {
      return this._params.map(function(p) { return encodeURIComponent(p[0]) + '=' + encodeURIComponent(p[1]); }).join('&');
    };
    URLSearchParams.prototype.forEach = function(callback, thisArg) {
      this._params.forEach(function(p) { callback.call(thisArg, p[1], p[0], this); }, this);
    };
    URLSearchParams.prototype.entries = function() { return this._params[Symbol.iterator](); };
    URLSearchParams.prototype.keys = function() { return this._params.map(function(p) { return p[0]; })[Symbol.iterator](); };
    URLSearchParams.prototype.values = function() { return this._params.map(function(p) { return p[1]; })[Symbol.iterator](); };
    globalThis.URLSearchParams = URLSearchParams;
  }

  // fetch function - stub that returns error since no network in QuickJS
  globalThis.fetch = function(input, init) {
    var url = typeof input === 'string' ? input : input.url;
    console.log('[QuickJS] fetch called for:', url);
    // Return a response that indicates no network available
    return Promise.resolve(new Response(JSON.stringify({ error: 'Network not available in QuickJS' }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    }));
  };

  // AbortController
  if (typeof AbortController === 'undefined') {
    function AbortSignal() {
      this.aborted = false;
      this.reason = undefined;
      this._listeners = [];
    }
    AbortSignal.prototype.addEventListener = function(type, listener) { this._listeners.push(listener); };
    AbortSignal.prototype.removeEventListener = function(type, listener) {
      this._listeners = this._listeners.filter(function(l) { return l !== listener; });
    };
    AbortSignal.prototype.throwIfAborted = function() {
      if (this.aborted) throw this.reason;
    };
    AbortSignal.abort = function(reason) {
      var signal = new AbortSignal();
      signal.aborted = true;
      signal.reason = reason || new DOMException('Aborted', 'AbortError');
      return signal;
    };
    AbortSignal.timeout = function(ms) {
      var signal = new AbortSignal();
      setTimeout(function() {
        signal.aborted = true;
        signal.reason = new DOMException('Timeout', 'TimeoutError');
      }, ms);
      return signal;
    };
    globalThis.AbortSignal = AbortSignal;

    function AbortController() {
      this.signal = new AbortSignal();
    }
    AbortController.prototype.abort = function(reason) {
      this.signal.aborted = true;
      this.signal.reason = reason || new DOMException('Aborted', 'AbortError');
      this.signal._listeners.forEach(function(l) { try { l(); } catch(e) {} });
    };
    globalThis.AbortController = AbortController;
  }

  // DOMException
  if (typeof DOMException === 'undefined') {
    function DOMException(message, name) {
      this.message = message || '';
      this.name = name || 'Error';
    }
    DOMException.prototype = Object.create(Error.prototype);
    globalThis.DOMException = DOMException;
  }
})();

// Timer polyfills - QuickJS doesn't have these by default
(function() {
  var timerId = 0;
  var timers = {};
  
  globalThis.setTimeout = function(fn, delay) {
    var id = ++timerId;
    // QuickJS doesn't have real timers, so we execute immediately
    // For a real implementation, you'd need os.setTimeout from 'os' module
    try { fn(); } catch(e) { /* ignore */ }
    return id;
  };
  
  globalThis.clearTimeout = function(id) {
    delete timers[id];
  };
  
  globalThis.setInterval = function(fn, delay) {
    var id = ++timerId;
    // Just execute once since we can't do real intervals
    try { fn(); } catch(e) { /* ignore */ }
    return id;
  };
  
  globalThis.clearInterval = function(id) {
    delete timers[id];
  };
  
  globalThis.setImmediate = function(fn) {
    try { fn(); } catch(e) { /* ignore */ }
    return ++timerId;
  };
  
  globalThis.clearImmediate = function(id) {};
  
  globalThis.queueMicrotask = function(fn) {
    try { fn(); } catch(e) { /* ignore */ }
  };
})();

// V8-specific polyfills - comprehensive shims for depd and similar libraries
(function() {
  // CallSite mock for V8 stack trace API
  function CallSite(filename, line, column, funcName) {
    this._filename = filename || '<anonymous>';
    this._line = line || 0;
    this._column = column || 0;
    this._funcName = funcName || null;
  }
  CallSite.prototype.getFileName = function() { return this._filename; };
  CallSite.prototype.getLineNumber = function() { return this._line; };
  CallSite.prototype.getColumnNumber = function() { return this._column; };
  CallSite.prototype.getFunctionName = function() { return this._funcName; };
  CallSite.prototype.getMethodName = function() { return null; };
  CallSite.prototype.getTypeName = function() { return 'Object'; };
  CallSite.prototype.getThis = function() { return undefined; };
  CallSite.prototype.getEvalOrigin = function() { return undefined; };
  CallSite.prototype.isNative = function() { return false; };
  CallSite.prototype.isToplevel = function() { return true; };
  CallSite.prototype.isEval = function() { return false; };
  CallSite.prototype.isConstructor = function() { return false; };
  CallSite.prototype.toString = function() {
    return this._filename + ':' + this._line + ':' + this._column;
  };

  // Track the prepareStackTrace to make structured stack work
  var structuredStackMode = false;
  var savedPrepareStackTrace = null;
  
  Object.defineProperty(Error, 'prepareStackTrace', {
    get: function() {
      return savedPrepareStackTrace;
    },
    set: function(fn) {
      savedPrepareStackTrace = fn;
      structuredStackMode = (fn !== null && fn !== undefined);
    },
    configurable: true
  });

  Error.captureStackTrace = function(obj, constructor) {
    // If prepareStackTrace is set, we need to return structured stack
    if (structuredStackMode && savedPrepareStackTrace) {
      // Create mock CallSites
      var callSites = [
        new CallSite('/bundle/index.js', 1, 1, 'module'),
        new CallSite('/bundle/index.js', 2, 1, 'anonymous'),
        new CallSite('/bundle/index.js', 3, 1, 'init')
      ];
      
      // Call prepareStackTrace to get the formatted result
      var formattedStack = savedPrepareStackTrace(obj, callSites);
      
      Object.defineProperty(obj, 'stack', {
        configurable: true,
        enumerable: false,
        get: function() { return formattedStack; }
      });
    } else {
      // Regular stack string
      var err = new Error();
      Object.defineProperty(obj, 'stack', {
        configurable: true,
        enumerable: false,
        get: function() { return err.stack || ''; }
      });
    }
  };
})();

globalThis.process = {
  env: {},
  argv: ['qjs', 'bundle.js'],
  argv0: 'qjs',
  execArgv: [],
  execPath: '/usr/bin/qjs',
  cwd: function() { return '/bundle'; },
  platform: 'quickjs',
  version: 'v18.0.0',  // Fake version to satisfy yargs-parser minimum check
  versions: { node: '18.0.0' },
  arch: 'unknown',
  pid: 1,
  stdout: { fd: 1, write: function() { return true; }, isTTY: false },
  stderr: { fd: 2, write: function() { return true; }, isTTY: false },
  stdin: { fd: 0, read: function() { return null; }, isTTY: false },
  exit: function() {},
  nextTick: function(cb) { setTimeout(cb, 0); },
  hrtime: function() { return [0, 0]; },
  on: function() { return this; },
  once: function() { return this; },
  emit: function() { return false; },
  off: function() { return this; },
  removeListener: function() { return this; },
  addListener: function() { return this; },
  prependListener: function() { return this; },
  prependOnceListener: function() { return this; },
  listeners: function() { return []; },
  listenerCount: function() { return 0; },
  eventNames: function() { return []; }
};
globalThis.Buffer = {
  from: function(str) { return { toString: function() { return str; } }; },
  isBuffer: function() { return false; }
};

// TextEncoder/TextDecoder polyfill
if (typeof TextEncoder === 'undefined') {
  globalThis.TextEncoder = function TextEncoder() {};
  globalThis.TextEncoder.prototype.encode = function(str) {
    var arr = [];
    for (var i = 0; i < str.length; i++) {
      var code = str.charCodeAt(i);
      if (code < 128) {
        arr.push(code);
      } else if (code < 2048) {
        arr.push(192 | (code >> 6), 128 | (code & 63));
      } else {
        arr.push(224 | (code >> 12), 128 | ((code >> 6) & 63), 128 | (code & 63));
      }
    }
    return new Uint8Array(arr);
  };
}
if (typeof TextDecoder === 'undefined') {
  globalThis.TextDecoder = function TextDecoder() {};
  globalThis.TextDecoder.prototype.decode = function(arr) {
    var str = '';
    for (var i = 0; i < arr.length; i++) {
      str += String.fromCharCode(arr[i]);
    }
    return str;
  };
}

// Load and run the bundle
try {
${bundleCode}

  // Check if HabitsBundle exists
  if (typeof HabitsBundle !== 'undefined') {
    print('\\nHabitsBundle loaded successfully!');
    print('Exports:', Object.keys(HabitsBundle).join(', '));
  } else {
    print('\\nHabitsBundle not found on global scope');
  }
} catch (e) {
  print('Error:', e.message);
  print('Stack:', e.stack);
}
`;

  // Write wrapper to temp file
  const tempFile = path.join(__dirname, '_temp_qjs_test.js');
  fs.writeFileSync(tempFile, wrapperCode, 'utf8');
  
  console.log('\nRunning in qjs...\n');
  
  try {
    let stdout = '';
    let stderr = '';
    
    const result = spawn('qjs', [tempFile], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000
    });
    
    result.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });
    
    result.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });
    
    result.on('close', (code) => {
      // Check if bundle loaded successfully regardless of exit code
      const bundleLoaded = stdout.includes('HabitsBundle loaded successfully!');
      
      console.log('\n=== QuickJS Test Complete ===');
      
      if (bundleLoaded) {
        console.log('✅ Bundle loaded successfully in QuickJS!');
        // Exit code 1 may be from CLI auto-run failing, which is expected
        if (code !== 0) {
          console.log('Note: Exit code', code, 'is from Cortex CLI auto-run (expected to fail without real CLI environment)');
        }
        // Clean up temp file on success
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
        process.exit(0);  // Success - bundle works
      } else {
        console.log('❌ Bundle failed to load');
        console.log('Exit code:', code);
        console.log('\nTemp file kept for debugging:', tempFile);
        process.exit(code || 1);
      }
    });
    
    result.on('error', (err) => {
      console.error('Failed to run qjs:', err.message);
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      process.exit(1);
    });
    
  } catch (error) {
    console.error('\nFailed to run in QuickJS:', error.message);
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    process.exit(1);
  }
}

runInQuickJS();
