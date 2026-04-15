// Minimal Node.js polyfills for QuickJS compatibility
// These provide stub implementations that allow the bundle to load

// EventEmitter polyfill - use function/prototype pattern for enumerable methods
// Some libraries (like PouchDB) uses Object.keys(EE.prototype) which requires enumerable methods
function EventEmitter() {
  this._events = {};
}

EventEmitter.prototype.on = function(event, listener) {
  if (!this._events[event]) this._events[event] = [];
  this._events[event].push(listener);
  return this;
};

EventEmitter.prototype.once = function(event, listener) {
  const self = this;
  const onceWrapper = function(...args) {
    self.off(event, onceWrapper);
    listener.apply(self, args);
  };
  return this.on(event, onceWrapper);
};

EventEmitter.prototype.off = function(event, listener) {
  if (!this._events[event]) return this;
  this._events[event] = this._events[event].filter(l => l !== listener);
  return this;
};

EventEmitter.prototype.removeListener = function(event, listener) {
  return this.off(event, listener);
};

EventEmitter.prototype.removeAllListeners = function(event) {
  if (event) {
    delete this._events[event];
  } else {
    this._events = {};
  }
  return this;
};

EventEmitter.prototype.emit = function(event, ...args) {
  if (!this._events[event]) return false;
  this._events[event].forEach(listener => listener.apply(this, args));
  return true;
};

EventEmitter.prototype.listeners = function(event) {
  return this._events[event] || [];
};

EventEmitter.prototype.listenerCount = function(event) {
  return this.listeners(event).length;
};

EventEmitter.prototype.addListener = function(event, listener) {
  return this.on(event, listener);
};

EventEmitter.prototype.prependListener = function(event, listener) {
  if (!this._events[event]) this._events[event] = [];
  this._events[event].unshift(listener);
  return this;
};

EventEmitter.prototype.setMaxListeners = function() { return this; };
EventEmitter.prototype.getMaxListeners = function() { return 10; };
EventEmitter.prototype.eventNames = function() { return Object.keys(this._events); };

// Stream base class
class Stream extends EventEmitter {
  pipe(dest) { return dest; }
}

// Stream subclasses
class Readable extends Stream {
  constructor(options) {
    super();
    this._readableState = { flowing: null, ended: false };
    this._options = options || {};
  }
  read() { return null; }
  push(chunk) { 
    if (chunk !== null) this.emit('data', chunk);
    else this.emit('end');
    return true;
  }
  setEncoding() { return this; }
  pause() { return this; }
  resume() { return this; }
  isPaused() { return false; }
  unpipe() { return this; }
  unshift() {}
  wrap() { return this; }
  [Symbol.asyncIterator]() {
    const self = this;
    return {
      async next() {
        return { done: true, value: undefined };
      }
    };
  }
  
  // Static from method for creating readable from iterables
  static from(iterable, options) {
    const readable = new Readable(options);
    
    // Handle async iterators/generators
    if (iterable && typeof iterable[Symbol.asyncIterator] === 'function') {
      const asyncIterator = iterable[Symbol.asyncIterator]();
      readable._read = async function() {
        try {
          const { value, done } = await asyncIterator.next();
          if (done) {
            readable.push(null);
          } else {
            readable.push(value);
          }
        } catch (err) {
          readable.destroy(err);
        }
      };
    }
    // Handle sync iterators
    else if (iterable && typeof iterable[Symbol.iterator] === 'function') {
      const iterator = iterable[Symbol.iterator]();
      readable._read = function() {
        const { value, done } = iterator.next();
        if (done) {
          readable.push(null);
        } else {
          readable.push(value);
        }
      };
    }
    
    readable.destroy = function(err) {
      if (err) readable.emit('error', err);
      readable.emit('close');
    };
    
    return readable;
  }
}

class Writable extends Stream {
  constructor(options) {
    super();
    this._writableState = { ended: false };
  }
  write(chunk, encoding, cb) { 
    if (typeof encoding === 'function') cb = encoding;
    if (cb) cb();
    return true;
  }
  end(chunk, encoding, cb) { 
    if (typeof chunk === 'function') cb = chunk;
    else if (typeof encoding === 'function') cb = encoding;
    this.emit('finish');
    if (cb) cb();
  }
  cork() {}
  uncork() {}
  setDefaultEncoding() { return this; }
}

class Duplex extends Readable {
  constructor(options) {
    super(options);
    Writable.call(this, options);
  }
  write(chunk, encoding, cb) { return Writable.prototype.write.call(this, chunk, encoding, cb); }
  end(chunk, encoding, cb) { return Writable.prototype.end.call(this, chunk, encoding, cb); }
}

class Transform extends Duplex {
  _transform(chunk, encoding, cb) { cb(null, chunk); }
  _flush(cb) { cb(); }
}

class PassThrough extends Transform {}

// Export polyfills as modules
if (typeof module !== 'undefined' && module.exports) {
  // Create stream module export (matches Node.js structure)
  const streamModule = Stream;
  streamModule.Stream = Stream;
  streamModule.Readable = Readable;
  streamModule.Writable = Writable;
  streamModule.Duplex = Duplex;
  streamModule.Transform = Transform;
  streamModule.PassThrough = PassThrough;

  // Create events module export
  const eventsModule = EventEmitter;
  eventsModule.EventEmitter = EventEmitter;

  module.exports = {
    EventEmitter,
    events: eventsModule,
    util: {
      inherits: function(ctor, superCtor) {
        if (superCtor) {
          ctor.super_ = superCtor;
          ctor.prototype = Object.create(superCtor.prototype, {
            constructor: { value: ctor, writable: true, configurable: true }
          });
        }
      },
      promisify: function(fn) {
        return function(...args) {
          return new Promise((resolve, reject) => {
            fn(...args, (err, result) => {
              if (err) reject(err);
              else resolve(result);
            });
          });
        };
      },
      format: function(fmt, ...args) {
        let i = 0;
        return String(fmt).replace(/%[sdj%]/g, (x) => {
          if (x === '%%') return '%';
          if (i >= args.length) return x;
          switch (x) {
            case '%s': return String(args[i++]);
            case '%d': return Number(args[i++]);
            case '%j': return JSON.stringify(args[i++]);
            default: return x;
          }
        });
      },
      inspect: function(obj) { return JSON.stringify(obj, null, 2); },
      debuglog: function() { return function() {}; },
      deprecate: function(fn) { return fn; },
      types: {
        isPromise: (v) => v instanceof Promise,
        isDate: (v) => v instanceof Date,
        isRegExp: (v) => v instanceof RegExp,
      },
      isDeepStrictEqual: function(a, b) {
        return JSON.stringify(a) === JSON.stringify(b);
      },
      TextEncoder: typeof TextEncoder !== 'undefined' ? TextEncoder : class TextEncoder {
        encode(str) {
          const arr = [];
          for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            if (code < 128) arr.push(code);
            else if (code < 2048) arr.push(192 | (code >> 6), 128 | (code & 63));
            else arr.push(224 | (code >> 12), 128 | ((code >> 6) & 63), 128 | (code & 63));
          }
          return new Uint8Array(arr);
        }
      },
      TextDecoder: typeof TextDecoder !== 'undefined' ? TextDecoder : class TextDecoder {
        decode(arr) {
          let str = '';
          for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i]);
          return str;
        }
      }
    },
    stream: streamModule,
    path: {
      join: (...parts) => parts.join('/').replace(/\/+/g, '/'),
      resolve: (...parts) => '/' + parts.join('/').replace(/\/+/g, '/'),
      dirname: (p) => p.split('/').slice(0, -1).join('/') || '/',
      basename: (p, ext) => {
        const base = p.split('/').pop() || '';
        return ext && base.endsWith(ext) ? base.slice(0, -ext.length) : base;
      },
      extname: (p) => { const m = p.match(/\.[^.]+$/); return m ? m[0] : ''; },
      sep: '/',
      delimiter: ':',
      isAbsolute: (p) => p.startsWith('/'),
      normalize: (p) => p.replace(/\/+/g, '/'),
      parse: (p) => ({
        root: p.startsWith('/') ? '/' : '',
        dir: p.split('/').slice(0, -1).join('/'),
        base: p.split('/').pop(),
        ext: (p.match(/\.[^.]+$/) || [''])[0],
        name: (p.split('/').pop() || '').replace(/\.[^.]+$/, '')
      }),
      format: (obj) => (obj.dir || obj.root || '') + '/' + (obj.base || obj.name + obj.ext),
      relative: (from, to) => to,
      posix: null,
      win32: null
    },
    http: (function() {
      // IncomingMessage class (for HTTP requests)
      class IncomingMessage extends Stream {
        constructor() {
          super();
          this.headers = {};
          this.rawHeaders = [];
          this.httpVersion = '1.1';
          this.method = 'GET';
          this.url = '/';
          this.statusCode = 200;
          this.statusMessage = 'OK';
        }
        setTimeout() { return this; }
      }
      
      // ServerResponse class (for HTTP responses)
      class ServerResponse extends Stream {
        constructor() {
          super();
          this.statusCode = 200;
          this.statusMessage = 'OK';
          this.headersSent = false;
          this._headers = {};
        }
        setHeader(name, value) { this._headers[name.toLowerCase()] = value; }
        getHeader(name) { return this._headers[name.toLowerCase()]; }
        removeHeader(name) { delete this._headers[name.toLowerCase()]; }
        writeHead(statusCode, statusMessage, headers) {
          this.statusCode = statusCode;
          if (typeof statusMessage === 'object') headers = statusMessage;
          else this.statusMessage = statusMessage || '';
          if (headers) Object.entries(headers).forEach(([k, v]) => this.setHeader(k, v));
        }
        write() { return true; }
        end() { this.emit('finish'); }
      }
      
      return {
        createServer: () => ({ listen: () => {}, on: () => {}, close: () => {} }),
        request: () => ({ on: () => {}, end: () => {}, write: () => {} }),
        get: () => ({ on: () => {}, end: () => {} }),
        Agent: class {},
        IncomingMessage: IncomingMessage,
        ServerResponse: ServerResponse,
        METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
        STATUS_CODES: { 200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 500: 'Internal Server Error' }
      };
    })(),
    https: {
      createServer: () => ({ listen: () => {}, on: () => {}, close: () => {} }),
      request: () => ({ on: () => {}, end: () => {}, write: () => {} }),
      get: () => ({ on: () => {}, end: () => {} }),
      Agent: class {}
    },
    os: {
      platform: () => 'quickjs',
      arch: () => 'unknown',
      tmpdir: () => '/tmp',
      homedir: () => '/home',
      hostname: () => 'localhost',
      cpus: () => [],
      freemem: () => 0,
      totalmem: () => 0,
      EOL: '\n',
      type: () => 'QuickJS',
      release: () => '1.0.0'
    },
    crypto: {
      randomBytes: (size) => new Uint8Array(size),
      createHash: () => ({
        update: function() { return this; },
        digest: () => 'mock-hash'
      }),
      createHmac: () => ({
        update: function() { return this; },
        digest: () => 'mock-hmac'
      }),
      randomUUID: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      })
    },
    url: {
      parse: (urlString) => {
        try {
          const u = new URL(urlString);
          return {
            protocol: u.protocol,
            host: u.host,
            hostname: u.hostname,
            port: u.port,
            pathname: u.pathname,
            search: u.search,
            hash: u.hash,
            href: u.href
          };
        } catch {
          return { href: urlString };
        }
      },
      format: (obj) => obj.href || '',
      resolve: (from, to) => to,
      URL: typeof URL !== 'undefined' ? URL : class URL {
        constructor(url) { this.href = url; }
      }
    },
    buffer: {
      Buffer: {
        from: (data) => ({ 
          toString: () => typeof data === 'string' ? data : '',
          length: typeof data === 'string' ? data.length : 0
        }),
        alloc: (size) => ({ length: size, toString: () => '' }),
        isBuffer: () => false,
        concat: (list) => list[0] || { toString: () => '' }
      }
    },
    querystring: {
      parse: (str) => {
        const obj = {};
        str.split('&').forEach(pair => {
          const [k, v] = pair.split('=');
          if (k) obj[decodeURIComponent(k)] = v ? decodeURIComponent(v) : '';
        });
        return obj;
      },
      stringify: (obj) => Object.entries(obj).map(([k, v]) => 
        `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&'),
      encode: (obj) => Object.entries(obj).map(([k, v]) => 
        `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&'),
      decode: (str) => {
        const obj = {};
        str.split('&').forEach(pair => {
          const [k, v] = pair.split('=');
          if (k) obj[decodeURIComponent(k)] = v ? decodeURIComponent(v) : '';
        });
        return obj;
      }
    },
    assert: {
      ok: (v, msg) => { if (!v) throw new Error(msg || 'Assertion failed'); },
      strictEqual: (a, b, msg) => { if (a !== b) throw new Error(msg || `${a} !== ${b}`); },
      deepStrictEqual: (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(msg); },
      throws: (fn, msg) => { try { fn(); throw new Error(msg || 'Expected throw'); } catch {} }
    },
    zlib: {
      // Constants
      Z_NO_FLUSH: 0,
      Z_PARTIAL_FLUSH: 1,
      Z_SYNC_FLUSH: 2,
      Z_FULL_FLUSH: 3,
      Z_FINISH: 4,
      Z_BLOCK: 5,
      Z_TREES: 6,
      Z_OK: 0,
      Z_STREAM_END: 1,
      Z_NEED_DICT: 2,
      Z_ERRNO: -1,
      Z_STREAM_ERROR: -2,
      Z_DATA_ERROR: -3,
      Z_MEM_ERROR: -4,
      Z_BUF_ERROR: -5,
      Z_VERSION_ERROR: -6,
      Z_NO_COMPRESSION: 0,
      Z_BEST_SPEED: 1,
      Z_BEST_COMPRESSION: 9,
      Z_DEFAULT_COMPRESSION: -1,
      Z_FILTERED: 1,
      Z_HUFFMAN_ONLY: 2,
      Z_RLE: 3,
      Z_FIXED: 4,
      Z_DEFAULT_STRATEGY: 0,
      // Methods
      gzip: (data, cb) => cb(null, data),
      gunzip: (data, cb) => cb(null, data),
      deflate: (data, cb) => cb(null, data),
      inflate: (data, cb) => cb(null, data),
      createGzip: () => new Transform(),
      createGunzip: () => new Transform(),
      createDeflate: () => new Transform(),
      createInflate: () => new Transform(),
      createDeflateRaw: () => new Transform(),
      createInflateRaw: () => new Transform(),
      constants: {
        Z_NO_FLUSH: 0,
        Z_PARTIAL_FLUSH: 1,
        Z_SYNC_FLUSH: 2,
        Z_FULL_FLUSH: 3,
        Z_FINISH: 4,
        Z_BLOCK: 5
      }
    },
    net: {
      createServer: () => ({ listen: () => {}, on: () => {} }),
      createConnection: () => new EventEmitter(),
      Socket: class extends EventEmitter {}
    },
    tls: {
      createServer: () => ({ listen: () => {}, on: () => {} }),
      connect: () => new EventEmitter()
    },
    dns: {
      lookup: (hostname, cb) => cb(null, '127.0.0.1', 4),
      resolve: (hostname, cb) => cb(null, ['127.0.0.1'])
    },
    child_process: {
      spawn: () => new EventEmitter(),
      exec: (cmd, cb) => cb(new Error('child_process not available')),
      execSync: () => { throw new Error('child_process not available'); }
    },
    tty: {
      isatty: () => false,
      ReadStream: class ReadStream extends Stream {
        constructor(fd) {
          super();
          this.fd = fd;
          this.isTTY = false;
          this.isRaw = false;
        }
        setRawMode() { return this; }
      },
      WriteStream: class WriteStream extends Stream {
        constructor(fd) {
          super();
          this.fd = fd;
          this.isTTY = false;
          this.columns = 80;
          this.rows = 24;
        }
        clearLine() {}
        clearScreenDown() {}
        cursorTo() {}
        moveCursor() {}
        getColorDepth() { return 1; }
        hasColors() { return false; }
        getWindowSize() { return [this.columns, this.rows]; }
      }
    },
    string_decoder: {
      StringDecoder: class StringDecoder {
        constructor(encoding) { this.encoding = encoding || 'utf8'; }
        write(buffer) { return typeof buffer === 'string' ? buffer : ''; }
        end(buffer) { return buffer ? this.write(buffer) : ''; }
      }
    },
    process: {
      env: {},
      cwd: () => '/',
      platform: 'quickjs',
      version: 'v0.0.0',
      versions: {},
      arch: 'unknown',
      pid: 1,
      stdout: { fd: 1, write: () => true, isTTY: false },
      stderr: { fd: 2, write: () => true, isTTY: false },
      stdin: { fd: 0, read: () => null, isTTY: false },
      exit: () => {},
      nextTick: (cb) => setTimeout(cb, 0),
      hrtime: () => [0, 0],
      memoryUsage: () => ({ rss: 0, heapTotal: 0, heapUsed: 0, external: 0 }),
      on: () => {},
      once: () => {},
      emit: () => {},
      removeListener: () => {}
    },
    // fs polyfill that bridges to Tauri fs API when available
    fs: (function() {
      // Try to get Tauri fs API
      const getTauriFs = () => {
        if (typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.fs) {
          return window.__TAURI__.fs;
        }
        return null;
      };

      // Sync methods - cannot work in browser, throw clear errors
      const syncNotAvailable = (method) => {
        return (...args) => {
          const tauriFs = getTauriFs();
          if (tauriFs) {
            throw new Error(`fs.${method}() is sync and not available in browser. Use async fs.promises.${method.replace('Sync', '')}() with Tauri fs API instead.`);
          }
          throw new Error(`fs.${method}() not available in this environment`);
        };
      };

      // Async methods that delegate to Tauri
      const wrapTauriAsync = (tauriMethod) => {
        return async (...args) => {
          const tauriFs = getTauriFs();
          if (tauriFs && typeof tauriFs[tauriMethod] === 'function') {
            return await tauriFs[tauriMethod](...args);
          }
          throw new Error(`fs.${tauriMethod}() not available - Tauri fs API not found`);
        };
      };

      // Create promises namespace
      const promises = {
        readFile: wrapTauriAsync('readTextFile'),
        writeFile: wrapTauriAsync('writeTextFile'),
        readdir: wrapTauriAsync('readDir'),
        mkdir: async (path, options) => {
          const tauriFs = getTauriFs();
          if (tauriFs) return await tauriFs.mkdir(path, { recursive: options?.recursive });
          throw new Error('fs.promises.mkdir() not available');
        },
        rm: wrapTauriAsync('remove'),
        rmdir: wrapTauriAsync('remove'),
        stat: async (path) => {
          const tauriFs = getTauriFs();
          if (tauriFs) {
            const exists = await tauriFs.exists(path);
            return { isFile: () => exists, isDirectory: () => exists, size: 0 };
          }
          throw new Error('fs.promises.stat() not available');
        },
        access: async (path) => {
          const tauriFs = getTauriFs();
          if (tauriFs) {
            const exists = await tauriFs.exists(path);
            if (!exists) throw new Error(`ENOENT: no such file or directory, access '${path}'`);
          } else {
            throw new Error('fs.promises.access() not available');
          }
        },
        copyFile: wrapTauriAsync('copyFile'),
        rename: wrapTauriAsync('rename'),
        unlink: wrapTauriAsync('remove')
      };

      return {
        // Sync methods - throw errors in browser
        existsSync: syncNotAvailable('existsSync'),
        readFileSync: syncNotAvailable('readFileSync'),
        writeFileSync: syncNotAvailable('writeFileSync'),
        mkdirSync: syncNotAvailable('mkdirSync'),
        readdirSync: syncNotAvailable('readdirSync'),
        statSync: syncNotAvailable('statSync'),
        unlinkSync: syncNotAvailable('unlinkSync'),
        rmdirSync: syncNotAvailable('rmdirSync'),
        copyFileSync: syncNotAvailable('copyFileSync'),
        renameSync: syncNotAvailable('renameSync'),
        accessSync: syncNotAvailable('accessSync'),
        
        // Async methods (callback style)
        readFile: (path, opts, cb) => {
          if (typeof opts === 'function') { cb = opts; opts = {}; }
          promises.readFile(path).then(data => cb(null, data)).catch(err => cb(err));
        },
        writeFile: (path, data, opts, cb) => {
          if (typeof opts === 'function') { cb = opts; opts = {}; }
          promises.writeFile(path, data).then(() => cb(null)).catch(err => cb(err));
        },
        mkdir: (path, opts, cb) => {
          if (typeof opts === 'function') { cb = opts; opts = {}; }
          promises.mkdir(path, opts).then(() => cb(null)).catch(err => cb(err));
        },
        readdir: (path, opts, cb) => {
          if (typeof opts === 'function') { cb = opts; opts = {}; }
          promises.readdir(path).then(data => cb(null, data)).catch(err => cb(err));
        },
        stat: (path, cb) => {
          promises.stat(path).then(data => cb(null, data)).catch(err => cb(err));
        },
        access: (path, mode, cb) => {
          if (typeof mode === 'function') { cb = mode; }
          promises.access(path).then(() => cb(null)).catch(err => cb(err));
        },
        unlink: (path, cb) => {
          promises.unlink(path).then(() => cb(null)).catch(err => cb(err));
        },
        copyFile: (src, dest, cb) => {
          promises.copyFile(src, dest).then(() => cb(null)).catch(err => cb(err));
        },
        rename: (oldPath, newPath, cb) => {
          promises.rename(oldPath, newPath).then(() => cb(null)).catch(err => cb(err));
        },
        
        // exists (deprecated but still used)
        exists: (path, cb) => {
          const tauriFs = getTauriFs();
          if (tauriFs) {
            tauriFs.exists(path).then(exists => cb(exists)).catch(() => cb(false));
          } else {
            cb(false);
          }
        },
        
        // Promises API
        promises,
        
        // Constants
        constants: {
          F_OK: 0,
          R_OK: 4,
          W_OK: 2,
          X_OK: 1
        },
        
        // Stream creators (stubs)
        createReadStream: () => new Stream(),
        createWriteStream: () => new Stream()
      };
    })()
  };
  
  // Helper function to get a specific polyfill by name
  module.exports.getPolyfill = function(moduleName) {
    const polyfills = module.exports;
    return polyfills[moduleName] || polyfills.events;
  };
}
