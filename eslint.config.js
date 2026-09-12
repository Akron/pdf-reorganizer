import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2025,
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        HTMLElement: "readonly",
        HTMLDialogElement: "readonly",
        customElements: "readonly",
        CustomEvent: "readonly",
        Event: "readonly",
        IntersectionObserver: "readonly",
        CSSStyleSheet: "readonly",
        KeyboardEvent: "readonly",
        Promise: "readonly",
        console: "readonly",
        globalThis: "readonly",
        Map: "readonly",
        Set: "readonly",
        WeakMap: "readonly",
        Uint8Array: "readonly",
        Array: "readonly",
        Buffer: "readonly",
        URL: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-fallthrough": ["error", { commentPattern: "falls?\\s*through" }],
      "no-useless-assignment": "warn",
      "no-case-declarations": "warn",
    },
  },
  {
    files: ["**/*.test.js", "vitest.setup.js"],
    languageOptions: {
      globals: {
        global: "writable",
        window: "writable",
        globalThis: "writable",
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        vi: "readonly",
        beforeAll: "readonly",
        __dirname: "readonly",
        process: "writable",
        ResizeObserver: "writable",
      },
    },
    rules: {
      "no-self-assign": "off",
    },
  },
  {
    files: ["vite.config.js"],
    languageOptions: {
      globals: {
        process: "readonly",
      },
    },
  },
  {
    ignores: ["node_modules/", "dist/", "coverage/"],
  },
];
