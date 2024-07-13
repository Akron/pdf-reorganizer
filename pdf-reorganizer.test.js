import 'pdfjs-dist';
import PDFPage from './pdf-page.js';
import PDFReorganizer from './pdf-reorganizer.js';
import { describe, it, expect, vi } from 'vitest'
import { resolve } from 'path'


window = global;

describe('PDF Page', () => {

  it('should be constructable', () => {
    let page = new PDFPage(4, null);
    expect(page.num).toBe(4);
    expect(page.deleted).toBe(false);
    expect(page.splittedBefore).toBe(false);
    expect(page.rotation).toBe(0);
    expect(page._selected).toBe(false);
    expect(page._pdfjsref).toBe(null);
  });

  it('should have the right element structure', () => {
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

  it('should swap selections', () => {
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

  it('should be removable', () => {
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

  it('should be rotatable', () => {
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
});

describe('PDF Reorganizer', () => {
  let examplepdf = "file:" + resolve(__dirname, "demo/example.pdf");
  
  it('should be constructible', () => {
    let reorganizer = new PDFReorganizer(20);

    expect(reorganizer.selected.size).toBe(0);
  });

  it('should have the right element structure', () => {
    let reorganizer = new PDFReorganizer();

    expect(reorganizer.children.length).toBe(0);

    let s = reorganizer.shadow;
    expect(s.firstChild.tagName).toBe("NAV");
    expect(s.lastChild.tagName).toBe("DIV");
    expect(s.lastChild.getAttribute('id')).toBe("pdf-viewport");
  });

  it('should load a PDF document', async () => {
    let reorganizer = new PDFReorganizer();
    expect.assertions(2);
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    const result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);
  });

  it('should select all pages', async () => {
    let reorganizer = new PDFReorganizer();
    // expect.assertions(3);
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    const result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);

    expect(reorganizer.selected.size).toBe(0);

    expect(reorganizer.selectAll()).toBe(8);

    expect(reorganizer.selected.size).toBe(8);

    expect(reorganizer.delSelectAll()).toBe(8);

    expect(reorganizer.selected.size).toBe(0);
  });
});
