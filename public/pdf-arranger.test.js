import './build/pdf.mjs';
import PDFPage from './pdf-page.js';
import PDFArranger from './pdf-arranger.js';
import fetch from 'node-fetch';

globalThis.fetch = fetch;

test('adds 1 + 2 to equal 3', () => {
  expect(4).toBe(4);
});

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

  expect(page.children.length).toBe(2);
  expect(page.firstChild.tagName).toBe("CANVAS");
  expect(page.lastChild.tagName).toBe("DIV");
  expect(page.classList.contains("load")).toBe(true);
  expect(page.hasAttribute("draggable")).toBe(true);
  expect(page.hasAttribute("droppable")).toBe(true);

  // Test canvas
  let canvas = page.firstChild;
  expect(canvas.getAttribute("droppable")).toEqual("false");
  
  
  // Test caption
  let caption = page.lastChild;
  expect(caption.classList.contains("caption")).toBe(true);
  expect(caption.getAttribute('data-num')).toBe("4");
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

test('PDF Arranger - Construction', () => {
  let arranger = new PDFArranger(20);

  expect(arranger.selected.size).toBe(0);
});
