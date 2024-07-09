import 'pdfjs-dist';
import PDFPage from './pdf-page.js';
import PDFReorganizer from './pdf-reorganizer.js';
import fetch from 'node-fetch';

globalThis.fetch = fetch;

test('PDF Page - Construct', () => {
  let page = new PDFPage(4, null);
  expect(page.num).toBe(4);
  expect(page.deleted).toBe(false);
  expect(page.splittedBefore).toBe(false);
  expect(page.rotation).toBe(0);
  expect(page._selected).toBe(false);
  expect(page._pdfjsref).toBe(null);
});

test('PDF Page - Element', () => {
  let page = new PDFPage(4, null);
  expect(page.tagName).toBe('PDF-PAGE');

  expect(page.children.length).toBe(1);
  expect(page.firstChild.tagName).toBe("DIV");
  expect(page.classList.contains("load")).toBe(true);
  expect(page.hasAttribute("draggable")).toBe(true);
  expect(page.hasAttribute("droppable")).toBe(true);

  expect(page.firstChild.getAttribute('data-num')).toBe("4");

  // Test canvas
  let canvas = page.firstChild;
  expect(canvas.getAttribute("droppable")).toEqual("false");
});

test('PDF Page - Swap selection', () => {
  let page = new PDFPage(4, null);
  expect(page._selected).toBe(false);

  let cl = page.classList;
  expect(cl.contains("selected")).toBe(false);
  
  page.swapSelected();
  expect(page._selected).toBe(true);
  expect(cl.contains("selected")).toBe(true);

  page.swapSelected();
  expect(page._selected).toBe(false);
  expect(cl.contains("selected")).toBe(false);

  page.selectOn()
  expect(page._selected).toBe(true);
  expect(cl.contains("selected")).toBe(true);

  page.selectOn()
  expect(page._selected).toBe(true);
  expect(cl.contains("selected")).toBe(true);
  
  page.selectOff()
  expect(page._selected).toBe(false);
  expect(cl.contains("selected")).toBe(false);

  page.selectOff()
  expect(page._selected).toBe(false);
  expect(cl.contains("selected")).toBe(false);

  page.swapSelected();
  expect(page._selected).toBe(true);
  expect(cl.contains("selected")).toBe(true);
});

test('PDF Page - Remove', () => {
  let page = new PDFPage(4, null);
  expect(page._selected).toBe(false);
  expect(page.deleted).toBe(false);

  expect(page.classList.contains("deleted")).toBe(false);
  expect(page.getAttribute("draggable")).toBe("true"); 
  
  page.remove();
  expect(page.deleted).toBe(true);
  expect(page.classList.contains("deleted")).toBe(true);
  expect(page.getAttribute("draggable")).toBe("false");

  // Unselect if selected
  page = new PDFPage(4, null);
  expect(page._selected).toBe(false);
  expect(page.deleted).toBe(false);

  page.swapSelected();
  expect(page._selected).toBe(true);

  expect(page.classList.contains("deleted")).toBe(false);
  expect(page.classList.contains("selected")).toBe(true);
  expect(page.getAttribute("draggable")).toBe("true"); 
  
  page.remove();

  expect(page.deleted).toBe(true);
  expect(page.classList.contains("deleted")).toBe(true);
  expect(page.getAttribute("draggable")).toBe("false");
  expect(page.classList.contains("selected")).toBe(false);
  expect(page._selected).toBe(false);

  // Unable to select when deleted
  page.swapSelected();
  expect(page._selected).toBe(false);
});

test('PDF Page - Rotate', () => {
  let page = new PDFPage(4, null);
  expect(page.rotation).toBe(0);

  page.rotateRight();
  expect(page._rotation).toBe(90);
  expect(page.rotation).toBe(90);

  page.rotateRight();
  expect(page._rotation).toBe(180);
  expect(page.rotation).toBe(180);

  page.rotateRight();
  expect(page._rotation).toBe(270);
  expect(page.rotation).toBe(270);

  page.rotateRight();
  expect(page._rotation).toBe(360);
  expect(page.rotation).toBe(0);

  page.rotateRight();
  expect(page._rotation).toBe(450);
  expect(page.rotation).toBe(90);

  page.rotateLeft();
  expect(page._rotation).toBe(360);
  expect(page.rotation).toBe(0);

  page.rotateLeft();
  expect(page._rotation).toBe(270);
  expect(page.rotation).toBe(270);

  page.rotateLeft();
  expect(page._rotation).toBe(180);
  expect(page.rotation).toBe(180);

  page.rotateLeft();
  expect(page._rotation).toBe(90);
  expect(page.rotation).toBe(90);

  page.rotateLeft();
  expect(page._rotation).toBe(0);
  expect(page.rotation).toBe(0);

  page.rotateLeft();
  expect(page._rotation).toBe(-90);
  expect(page.rotation).toBe(270);

  page.rotateLeft();
  expect(page._rotation).toBe(-180);
  expect(page.rotation).toBe(180);

  page.rotateLeft();
  expect(page._rotation).toBe(-270);
  expect(page.rotation).toBe(90);

  page.rotateLeft();
  expect(page._rotation).toBe(-360);
  expect(page.rotation).toBe(0);

  page.rotateLeft();
  expect(page._rotation).toBe(-450);
  expect(page.rotation).toBe(270);
});

test('PDF Reorganizer - Construction', () => {
  let reorganizer = new PDFReorganizer(20);

  expect(reorganizer.selected.size).toBe(0);
});

test('PDF Reorganizer - Elements', () => {
  let reorganizer = new PDFReorganizer();

  expect(reorganizer.children.length).toBe(0);

  let s = reorganizer.shadow;
  expect(s.firstChild.tagName).toBe("NAV");
  expect(s.lastChild.tagName).toBe("DIV");
  expect(s.lastChild.getAttribute('id')).toBe("pdf-viewport");
});
