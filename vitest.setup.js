import 'vitest-canvas-mock';
import { resolve } from 'path';
import { pathToFileURL } from 'url';

// Polyfills for
// - Promise.withResolvers
// - Promise.try
// - Map.prototype.getOrInsertComputed
// - Uint8Array.prototype.toHex
// - Uint8Array.fromBase64
// - WeakMap.prototype.getOrInsertComputed
// for environments that don't support these
// This must be done before any PDF.js imports
if (!Promise.withResolvers) {
  Promise.withResolvers = function() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}


// Also set it globally for consistency
globalThis.Promise = Promise;

if (!Promise.try) {
  Promise.try = function (callback, ...args) {
    return new Promise((resolve, reject) => {
      try {
        resolve(callback(...args));
      } catch (error) {
        reject(error);
      }
    });
  };
}

if (!Map.prototype.getOrInsertComputed) {
  Map.prototype.getOrInsertComputed = function (key, callbackfn) {
    if (this.has(key)) {
      return this.get(key);
    }

    const value = callbackfn(key);
    this.set(key, value);
    return value;
  };
}

if (!Uint8Array.prototype.toHex) {
  Uint8Array.prototype.toHex = function () {
    let hex = '';
    for (let i = 0; i < this.length; i++) {
      hex += this[i].toString(16).padStart(2, '0');
    }
    return hex;
  };
}

if (!Uint8Array.fromBase64) {
  Uint8Array.fromBase64 = function (base64) {
    const buf = Buffer.from(base64, 'base64');
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  };
}

if (!WeakMap.prototype.getOrInsertComputed) {
  WeakMap.prototype.getOrInsertComputed = function (key, callbackfn) {
    if (this.has(key)) {
      return this.get(key);
    }

    const value = callbackfn(key);
    this.set(key, value);
    return value;
  };
}

// Set up environment variables for PDF.js
globalThis.process = globalThis.process || {};
globalThis.process.env = globalThis.process.env || {};
globalThis.process.env.NODE_ENV = 'test';

// Set up PDF.js worker to avoid legacy build warnings in tests
import { GlobalWorkerOptions } from 'pdfjs-dist';

// Configure PDF.js worker for test environment
// Use a file URL that works in Node.js test environment
const workerPath = resolve('./node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

// Mock canvas-related operations for tests
Object.defineProperty(window, 'devicePixelRatio', {
  writable: true,
  value: 1,
});

// Mock ResizeObserver if not available
global.ResizeObserver = class ResizeObserver {
  constructor(cb) {
    this.cb = cb;
  }
  observe() {
    this.cb([{ borderBoxSize: { inlineSize: 0, blockSize: 0 } }], this);
  }
  unobserve() {}
  disconnect() {}
};