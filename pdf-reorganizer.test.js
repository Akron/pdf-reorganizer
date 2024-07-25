import 'pdfjs-dist';
import PDFPage from './pdf-page.js';
import PDFReorganizer from './pdf-reorganizer.js';
import { describe, it, expect, vi, test } from 'vitest'
import { resolve } from 'path'


window = global;

describe('PDF Page', () => {

  it('should be constructable', () => {
    let page = new PDFPage(4, null);
    expect(page.num).toBe(4);
    expect(page.deleted).toBe(false);
    expect(page.splittedBefore).toBe(false);
    expect(page.rotation).toBe(0);
    expect(page.selected).toBe(false);
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
    expect(page.selected).toBe(false);

    let cl = page.classList;
    expect(cl.contains("selected")).toBe(false);
    
    page.swapSelected();
    expect(page.selected).toBe(true);
    expect(cl.contains("selected")).toBe(true);

    page.swapSelected();
    expect(page.selected).toBe(false);
    expect(cl.contains("selected")).toBe(false);

    page.selectOn()
    expect(page.selected).toBe(true);
    expect(cl.contains("selected")).toBe(true);

    page.selectOn()
    expect(page.selected).toBe(true);
    expect(cl.contains("selected")).toBe(true);
    
    page.selectOff()
    expect(page.selected).toBe(false);
    expect(cl.contains("selected")).toBe(false);

    page.selectOff()
    expect(page.selected).toBe(false);
    expect(cl.contains("selected")).toBe(false);

    page.swapSelected();
    expect(page.selected).toBe(true);
    expect(cl.contains("selected")).toBe(true);
  });

  it('should be removable', () => {
    let page = new PDFPage(4, null);
    expect(page.selected).toBe(false);
    expect(page.deleted).toBe(false);

    expect(page.classList.contains("deleted")).toBe(false);
    expect(page.getAttribute("draggable")).toBe("true"); 
    
    page.remove();
    expect(page.deleted).toBe(true);
    expect(page.classList.contains("deleted")).toBe(true);
    expect(page.getAttribute("draggable")).toBe("false");

    // Unselect if selected
    page = new PDFPage(4, null);
    expect(page.selected).toBe(false);
    expect(page.deleted).toBe(false);

    page.swapSelected();
    expect(page.selected).toBe(true);

    expect(page.classList.contains("deleted")).toBe(false);
    expect(page.classList.contains("selected")).toBe(true);
    expect(page.getAttribute("draggable")).toBe("true"); 
    
    page.remove();

    expect(page.deleted).toBe(true);
    expect(page.classList.contains("deleted")).toBe(true);
    expect(page.getAttribute("draggable")).toBe("false");
    expect(page.classList.contains("selected")).toBe(false);
    expect(page.selected).toBe(false);

    // Unable to select when deleted
    page.swapSelected();
    expect(page.selected).toBe(false);

    expect(page.deleted).toBe(false);
    expect(page.classList.contains("deleted")).toBe(false);

    page.unremove();

    expect(page.deleted).toBe(false);
    expect(page.classList.contains("deleted")).toBe(false);
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

    page.remove();

    // Ignore totation on deleted pages
    page.rotateLeft();
    expect(page._rotation).toBe(-450);
    expect(page.rotation).toBe(270);

    page.rotateRight();
    expect(page._rotation).toBe(-450);
    expect(page.rotation).toBe(270);
  });

  it('should split before', () => {
    let page = new PDFPage(4, null);
   
    expect(page.deleted).toBeFalsy();
    expect(page.classList.contains("split-before")).toBeFalsy();

    expect(page.splitBefore()).toBeTruthy();
    expect(page.splittedBefore).toBeTruthy();
    expect(page.classList.contains("split-before")).toBeTruthy();    

    expect(page.splitBefore()).toBeFalsy();
    expect(page.splittedBefore).toBeFalsy();
    expect(page.classList.contains("split-before")).toBeFalsy();

    expect(page.splitBefore()).toBeTruthy();
    expect(page.splittedBefore).toBeTruthy();
    expect(page.classList.contains("split-before")).toBeTruthy();

    // Unable to split on deleted pages
    page.remove();
    expect(page.splittedBefore).toBeFalsy();
    expect(page.classList.contains("split-before")).toBeFalsy();

    expect(page.splitBefore()).toBeFalsy();
    expect(page.splittedBefore).toBeFalsy();
    expect(page.classList.contains("split-before")).toBeFalsy();

    expect(page.splitBefore()).toBeFalsy();
    expect(page.splittedBefore).toBeFalsy();
    expect(page.classList.contains("split-before")).toBeFalsy();
  });

  it('should be magnifiable', () => {
    let page = new PDFPage(4, null);
   
    expect(page.deleted).toBeFalsy();
    expect(page.classList.contains("split-before")).toBeFalsy();
    expect(page.classList.contains("magnify")).toBeFalsy();

    expect(page.unmagnify()).toBeFalsy();
    
    expect(page.magnify()).toBeTruthy();

    expect(page.classList.contains("magnify")).toBeTruthy();

    expect(page.unmagnify()).toBeTruthy();

    expect(page.classList.contains("magnify")).toBeFalsy();

    page.remove();

    expect(page.deleted).toBe(true);

    expect(page.magnify()).toBeFalsy();

    expect(page.classList.contains("magnify")).toBeFalsy();

    page.unremove();
    page.rotateRight();
    expect(page.magnify()).toBeTruthy();
    expect(page.classList.contains("magnify")).toBeTruthy();
  });
});

describe('PDF Reorganizer', () => {
  let examplepdf = "file:" + resolve(__dirname, "demo/example.pdf");
  let examplepdf2 = "file:" + resolve(__dirname, "demo/example2.pdf");
  
  it('should be constructible', () => {
    let reorganizer = new PDFReorganizer(20);

    expect(reorganizer.selected.size).toBe(0);
  });

  it('should have the right element structure', () => {
    let reorganizer = new PDFReorganizer();

    expect(reorganizer.children.length).toBe(0);

    let s = reorganizer.shadowRoot;
    expect(s.firstChild.tagName).toBe("svg"); // symbols
    expect(s.children[1].tagName).toBe("NAV");
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

  it('should (de)select all pages', async () => {
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

  it('should process all pages', async () => {
    let reorganizer = new PDFReorganizer();
    // expect.assertions(3);
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    const result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);

    expect(JSON.stringify(reorganizer.process())).toEqual('[["1","2","3","4","5","6","7","8"]]');
  });

  it('should splitBefore pages', async () => {
    let reorganizer = new PDFReorganizer();
    // expect.assertions(3);
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    const result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);

    let page = reorganizer.getPage(3);

    expect(page.splitBefore()).toBeTruthy();

    page = reorganizer.getPage(6);

    expect(page.splitBefore()).toBeTruthy();

    expect(JSON.stringify(reorganizer.process())).toEqual('[["1","2","3"],["4","5","6"],["7","8"]]');

    expect(reorganizer.selectAll()).toBe(8);

    expect(reorganizer.splitBefore()).toBe(6);

    expect(JSON.stringify(reorganizer.process())).toEqual('[["1"],["2"],["3","4"],["5"],["6","7"],["8"]]');

    // Don't split on removed pages
    page = reorganizer.getPage(2);
    page.remove();
    expect(page.splitBefore()).toBeFalsy();
   
    expect(JSON.stringify(reorganizer.process())).toEqual('[["1"],["2","4"],["5"],["6","7"],["8"]]');
  });

  it('should rotate pages', async () => {
    let reorganizer = new PDFReorganizer();
    // expect.assertions(3);
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    const result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);

    let page = reorganizer.getPage(3);

    page.rotateLeft();

    page = reorganizer.getPage(6);

    page.rotateRight()

    expect(JSON.stringify(reorganizer.process())).toEqual('[["1","2","3","4@270","5","6","7@90","8"]]');

    expect(reorganizer.selectAll()).toBe(8);

    expect(reorganizer.rotateLeft()).toBe(8);

    expect(JSON.stringify(reorganizer.process())).toEqual('[["1@270","2@270","3@270","4@180","5@270","6@270","7","8@270"]]');

    expect(reorganizer.rotateRight()).toBe(8);

    expect(JSON.stringify(reorganizer.process())).toEqual('[["1","2","3","4@270","5","6","7@90","8"]]');
  });

  it('should remove pages', async () => {
    let reorganizer = new PDFReorganizer();
    // expect.assertions(3);
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    const result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);

    let page = reorganizer.getPage(3);

    page.remove();

    page = reorganizer.getPage(6);

    page.remove()

    expect(JSON.stringify(reorganizer.process())).toEqual('[["1","2","3","5","6","8"]]');

    expect(reorganizer.selectAll()).toBe(6);

    expect(reorganizer.remove()).toBe(6);

    expect(JSON.stringify(reorganizer.process())).toEqual('[[]]');
  });

  it('should move pages before/after', async () => {
    let reorganizer = new PDFReorganizer();
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    const result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);

    let page = reorganizer.getPage(3); // 4
    page.selectOn();
    page = reorganizer.getPage(6); // 7
    page.selectOn();
    expect(reorganizer.selected.size).toBe(2);

    reorganizer.moveBefore(reorganizer.getPage(2)); // 3
    
    expect(JSON.stringify(reorganizer.process())).toEqual('[["1","2","4","7","3","5","6","8"]]');

    // still selected
    expect(reorganizer.selected.size).toBe(2);

    reorganizer.moveAfter(reorganizer.getPage(5)); // 3

    expect(JSON.stringify(reorganizer.process())).toEqual('[["1","2","3","5","4","7","6","8"]]');
  });

  it('should reload for a new document', async () => {
    let reorganizer = new PDFReorganizer();
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    let result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);

    expect(reorganizer.viewport.children.length).toBe(8);

    result = await reorganizer.loadDocument(examplepdf2);
    expect(result).toBe(7);

    expect(reorganizer.viewport.children.length).toBe(7);
  });
});

describe('PDF Reorganizer (Key events)', () => {
  let examplepdf = "file:" + resolve(__dirname, "demo/example.pdf");
  let examplepdf2 = "file:" + resolve(__dirname, "demo/example2.pdf");

  function keyd(opt) {
    return new KeyboardEvent("keydown", opt)
  };
  
  it('should init a cursor and move (arrow right)', async () => {
    let reorganizer = new PDFReorganizer();
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    let result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);

    expect(reorganizer.viewport.children.length).toBe(8);

    expect(reorganizer.cursor).toBe(null);

    // Press right (init)
    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(1);

    // Press right (move)
    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(2);

    // Press right (move)
    for (var i = 0; i < 5; i++)
      reorganizer._keyHandler(keyd({key: 'ArrowRight'}));

    // Press right (move)
    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(8);

    // Press right (overflow)
    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(1);
  });

  it('should init a cursor and move (arrow left)', async () => {
    let reorganizer = new PDFReorganizer();
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    let result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);

    expect(reorganizer.viewport.children.length).toBe(8);

    expect(reorganizer.cursor).toBe(null);

    // Press left (init)
    reorganizer._keyHandler(keyd({key: 'ArrowLeft'}));
    expect(reorganizer.cursor.num).toBe(8);

    reorganizer._keyHandler(keyd({key: 'ArrowLeft'}));
    expect(reorganizer.cursor.num).toBe(7);

    for (var i = 0; i < 5; i++)
      reorganizer._keyHandler(keyd({key: 'ArrowLeft'}));

    reorganizer._keyHandler(keyd({key: 'ArrowLeft'}));
    expect(reorganizer.cursor.num).toBe(1);

    reorganizer._keyHandler(keyd({key: 'ArrowLeft'}));
    expect(reorganizer.cursor.num).toBe(8);
  });

  it('should move and delete/undelete', async () => {
    let reorganizer = new PDFReorganizer();
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    let result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(1);

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.deleted).toBeFalsy();

    reorganizer._keyHandler(keyd({key: 'Delete'}));
    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.deleted).toBeTruthy();

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(3);
    expect(reorganizer.cursor.deleted).toBeFalsy();

    reorganizer._keyHandler(keyd({key: 'ArrowLeft'}));
    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.deleted).toBeTruthy();

    reorganizer._keyHandler(keyd({key: ' '}));
    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.deleted).toBeFalsy();

    reorganizer._keyHandler(keyd({key: 'ArrowLeft'}));
    expect(reorganizer.cursor.num).toBe(1);
    expect(reorganizer.cursor.deleted).toBeFalsy();

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.deleted).toBeFalsy();
  });

  it('should move and select', async () => {
    let reorganizer = new PDFReorganizer();
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    let result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(1);

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.selected).toBeFalsy();
    expect(reorganizer.selected.size).toBe(0);

    reorganizer._keyHandler(keyd({key: ' '}));
    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.selected).toBeTruthy();
    expect(reorganizer.selected.size).toBe(1);

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(3);
    expect(reorganizer.cursor.selected).toBeFalsy();

    reorganizer._keyHandler(keyd({key: ' '}));
    expect(reorganizer.cursor.num).toBe(3);
    expect(reorganizer.cursor.selected).toBeTruthy();
    expect(reorganizer.selected.size).toBe(2);

    reorganizer._keyHandler(keyd({key: 'ArrowLeft'}));
    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.selected).toBeTruthy();

    expect(reorganizer.selected.has(reorganizer.cursor)).toBeTruthy();

    // Unselect all
    expect(reorganizer.delSelectAll()).toBe(2);

    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.selected).toBeFalsy();

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(3);
    expect(reorganizer.cursor.selected).toBeFalsy();
  });

  it('should move and rotate', async () => {
    let reorganizer = new PDFReorganizer();
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    let result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(1);
    expect(reorganizer.cursor.rotation).toBe(0);

    reorganizer._keyHandler(keyd({key: 'ArrowRight', ctrlKey: true}));
    expect(reorganizer.cursor.num).toBe(1);
    expect(reorganizer.cursor.rotation).toBe(90);

    reorganizer._keyHandler(keyd({key: 'ArrowRight', ctrlKey: true}));
    expect(reorganizer.cursor.num).toBe(1);
    expect(reorganizer.cursor.rotation).toBe(180);

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.rotation).toBe(0);

    reorganizer._keyHandler(keyd({key: 'ArrowLeft', ctrlKey: true}));
    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.rotation).toBe(270);

    reorganizer._keyHandler(keyd({key: 'ArrowLeft'}));
    expect(reorganizer.cursor.num).toBe(1);
    expect(reorganizer.cursor.rotation).toBe(180);   

    expect(reorganizer.selected.size).toBe(0);
  });

  it('should move and split before', async () => {
    let reorganizer = new PDFReorganizer();
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    let result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(1);
    expect(reorganizer.cursor.splittedBefore).toBeFalsy();
    

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.splittedBefore).toBeFalsy();

    reorganizer._keyHandler(keyd({key: 's', ctrlKey: true}));
    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.splittedBefore).toBeTruthy();

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(3);
    expect(reorganizer.cursor.splittedBefore).toBeFalsy();

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(4);
    expect(reorganizer.cursor.splittedBefore).toBeFalsy();

    reorganizer._keyHandler(keyd({key: 's', ctrlKey: true}));
    expect(reorganizer.cursor.num).toBe(4);
    expect(reorganizer.cursor.splittedBefore).toBeTruthy();

    expect(JSON.stringify(reorganizer.process())).toEqual('[["1"],["2","3"],["4","5","6","7","8"]]');
  });

  // I have no good idea how to test it without something like playwright,
  // as it requires a flexbox enabled viewport.
  test.todo('should move up/down with different rows');

  test.todo('should move before/after');

  test.todo('should use magnifier');

  test.todo('should scroll magnified in all directions');

  test.todo('should jump scroll magnified in all directions');

  test.todo('should accept configuration');
});
