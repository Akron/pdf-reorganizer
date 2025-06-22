import 'vitest-canvas-mock';

// Set up PDF.js worker to avoid legacy build warnings in tests
import { GlobalWorkerOptions } from 'pdfjs-dist';

// Configure PDF.js worker for test environment
if (typeof window !== 'undefined') {
  // In test environment, we can use the ES module worker
  GlobalWorkerOptions.workerSrc = 'node_modules/pdfjs-dist/build/pdf.worker.mjs';
}

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