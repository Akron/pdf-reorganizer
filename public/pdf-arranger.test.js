import './build/pdf.mjs';
import PDFPage from './pdf-page.js';
import './pdf-arranger.js';

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
  expect(page.children.length).toBe(1);

  // Test outer element
  let outer = page.firstChild;
  expect(outer.tagName).toBe("DIV");
  expect(outer.children.length).toBe(2);
  expect(outer.firstChild.tagName).toBe("CANVAS");
  expect(outer.lastChild.tagName).toBe("DIV");
  expect(outer.classList.contains("outer")).toBe(true);
  expect(outer.classList.contains("load")).toBe(true);
  expect(outer.hasAttribute("draggable")).toBe(true);
  expect(outer.hasAttribute("droppable")).toBe(true);

  // Test canvas
  let canvas = outer.firstChild;
  expect(canvas.getAttribute("droppable")).toEqual("false");
  
  
  // Test caption
  let caption = outer.lastChild;
  expect(caption.classList.contains("caption")).toBe(true);
  expect(caption.getAttribute('data-num')).toBe("4");
});

test('PDF Page - Swap selection', () => {
  let page = new PDFPage(4, null);
  expect(page._selected).toBe(false);

  let outercl = page.firstChild.classList;
  expect(outercl.contains("selected")).toBe(false);
  
  page.swapSelected();
  expect(page._selected).toBe(true);
  expect(outercl.contains("selected")).toBe(true);

  page.swapSelected();
  expect(page._selected).toBe(false);
  expect(outercl.contains("selected")).toBe(false);

  page.selectOn()
  expect(page._selected).toBe(true);
  expect(outercl.contains("selected")).toBe(true);

  page.selectOn()
  expect(page._selected).toBe(true);
  expect(outercl.contains("selected")).toBe(true);
  
  page.selectOff()
  expect(page._selected).toBe(false);
  expect(outercl.contains("selected")).toBe(false);

  page.selectOff()
  expect(page._selected).toBe(false);
  expect(outercl.contains("selected")).toBe(false);

  page.swapSelected();
  expect(page._selected).toBe(true);
  expect(outercl.contains("selected")).toBe(true);
});

test('PDF Page - Remove', () => {
  let page = new PDFPage(4, null);
  expect(page._selected).toBe(false);
  expect(page.deleted).toBe(false);

  let outer = page.firstChild;
  expect(outer.classList.contains("deleted")).toBe(false);
  expect(outer.getAttribute("draggable")).toBe("true"); 
  
  page.remove();
  expect(page.deleted).toBe(true);
  expect(outer.classList.contains("deleted")).toBe(true);
  expect(outer.getAttribute("draggable")).toBe("false");

  // Unselect if selected
  page = new PDFPage(4, null);
  expect(page._selected).toBe(false);
  expect(page.deleted).toBe(false);

  page.swapSelected();
  expect(page._selected).toBe(true);

  outer = page.firstChild;
  expect(outer.classList.contains("deleted")).toBe(false);
  expect(outer.classList.contains("selected")).toBe(true);
  expect(outer.getAttribute("draggable")).toBe("true"); 
  
  page.remove();
  expect(page.deleted).toBe(true);
  expect(outer.classList.contains("deleted")).toBe(true);
  expect(outer.getAttribute("draggable")).toBe("false");
  expect(outer.classList.contains("selected")).toBe(false);
  expect(page._selected).toBe(false);

  // Unable to select when deleted
  page.swapSelected();
  expect(page._selected).toBe(false);
});
