import 'pdfjs-dist';
import PDFReorganizerPage from './pdf-reorganizer-page.js';
import PDFReorganizerComment from './pdf-reorganizer-comment.js';
import PDFReorganizer from './pdf-reorganizer.js';
import { describe, it, expect, vi, test, beforeAll } from 'vitest'
import { resolve } from 'path'

window = global;

beforeAll(() => {
  HTMLDialogElement.prototype.show = vi.fn();
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

describe('PDF Page', () => {

  it('should be constructable', () => {
    let page = new PDFReorganizerPage(4, null);
    expect(page.num).toBe(4);
    expect(page.removed).toBe(false);
    expect(page.splittedBefore).toBe(false);
    expect(page.rotation).toBe(0);
    expect(page.selected).toBe(false);
    expect(page._pdfjsref).toBe(null);
  });

  it('should have the right element structure', () => {
    let page = new PDFReorganizerPage(4, null);
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
    let page = new PDFReorganizerPage(4, null);
    expect(page.selected).toBe(false);

    let cl = page.classList;
    expect(cl.contains("selected")).toBe(false);
    
    page.selectToggle();
    expect(page.selected).toBe(true);
    expect(cl.contains("selected")).toBe(true);

    page.selectToggle();
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

    page.selectToggle();
    expect(page.selected).toBe(true);
    expect(cl.contains("selected")).toBe(true);
  });

  it('should be removable', () => {
    let page = new PDFReorganizerPage(4, null);
    expect(page.selected).toBe(false);
    expect(page.removed).toBe(false);

    expect(page.classList.contains("removed")).toBe(false);
    expect(page.getAttribute("draggable")).toBe("true"); 
    
    page.remove();
    expect(page.removed).toBe(true);
    expect(page.classList.contains("removed")).toBe(true);
    expect(page.getAttribute("draggable")).toBe("false");

    // Unselect if selected
    page = new PDFReorganizerPage(4, null);
    expect(page.selected).toBe(false);
    expect(page.removed).toBe(false);

    page.selectToggle();
    expect(page.selected).toBe(true);

    expect(page.classList.contains("removed")).toBe(false);
    expect(page.classList.contains("selected")).toBe(true);
    expect(page.getAttribute("draggable")).toBe("true"); 
    
    page.remove();

    expect(page.removed).toBe(true);
    expect(page.classList.contains("removed")).toBe(true);
    expect(page.getAttribute("draggable")).toBe("false");
    expect(page.classList.contains("selected")).toBe(false);
    expect(page.selected).toBe(false);

    // Unable to select when removed
    page.selectToggle();
    expect(page.selected).toBe(false);

    expect(page.removed).toBe(false);
    expect(page.classList.contains("removed")).toBe(false);

    page.unremove();

    expect(page.removed).toBe(false);
    expect(page.classList.contains("removed")).toBe(false);
  });

  it('should be rotatable', () => {
    let page = new PDFReorganizerPage(4, null);
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

    // Ignore totation on removed pages
    page.rotateLeft();
    expect(page._rotation).toBe(-450);
    expect(page.rotation).toBe(270);

    page.rotateRight();
    expect(page._rotation).toBe(-450);
    expect(page.rotation).toBe(270);
  });

  it('should split before', () => {
    let page = new PDFReorganizerPage(4, null);
   
    expect(page.removed).toBeFalsy();
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

    // Unable to split on removed pages
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
    let page = new PDFReorganizerPage(4, null);
   
    expect(page.removed).toBeFalsy();
    expect(page.classList.contains("split-before")).toBeFalsy();
    expect(page.classList.contains("magnify")).toBeFalsy();

    expect(page.unmagnify()).toBeFalsy();
    
    expect(page.magnify()).toBeTruthy();

    expect(page.classList.contains("magnify")).toBeTruthy();

    expect(page.unmagnify()).toBeTruthy();

    expect(page.classList.contains("magnify")).toBeFalsy();

    page.remove();

    expect(page.removed).toBe(true);

    expect(page.magnify()).toBeFalsy();

    expect(page.classList.contains("magnify")).toBeFalsy();

    page.unremove();
    page.rotateRight();
    expect(page.magnify()).toBeTruthy();
    expect(page.classList.contains("magnify")).toBeTruthy();
  });

  it('should be draggable (wo parent)', () => {
    let page = new PDFReorganizerPage(4, null);
    let dragEv = new Object();
    dragEv.dataTransfer = {
      "dropEffect" : "ok",
      "setDragImage" : function () {}
    };
    dragEv.preventDefault = function () {};

    expect(page.selected).toBe(false);
    expect(page.classList.contains("selected")).toBe(false);    

    page._dragStartHandler(dragEv);
    expect(page.selected).toBeTruthy();
    expect(page.classList.contains("selected")).toBeTruthy();
    expect(dragEv.dataTransfer.dropEffect).toBe("move");

    page._dragEndHandler(dragEv);
    expect(page.selected).toBeTruthy();
    expect(page.classList.contains("selected")).toBeTruthy();

    page.classList.add("drag-left","drag-right");
    expect(page.classList.contains("drag-left")).toBeTruthy();
    expect(page.classList.contains("drag-right")).toBeTruthy();

    page._dragLeaveHandler(dragEv);
    expect(page.classList.contains("drag-left")).toBeFalsy();
    expect(page.classList.contains("drag-right")).toBeFalsy();

    page.classList.add("drag-left","drag-right");
    dragEv.dataTransfer.dropEffect = "ok";
    page._dragOverHandler(dragEv);
    expect(dragEv.dataTransfer.dropEffect).toBe("move");
    expect(page.classList.contains("drag-left")).toBeFalsy();
    expect(page.classList.contains("drag-right")).toBeTruthy(); // default!

    let dir = "unknown";
    page._parent = {
      dropTarget : new Object(),
      moveAfter : function() { dir = "after"},
      moveBefore : function() { dir = "before"},
    };
    
    page._dropHandler(dragEv);
    expect(page.classList.contains("drag-left")).toBeFalsy();
    expect(page.classList.contains("drag-right")).toBeFalsy();
    expect(page._parent.dropTarget).toBeNull();
    expect(dir).toBe("after");
  });

  it('should be clickable (with limited parent)', () => {
    let page = new PDFReorganizerPage(4, null);
    let clickEv = new Object();
    clickEv.ctrlKey = false;

    let except = null;

    page._parent = {
      cursor : null,
      _magnifierActive : false,
      _selectorActive : false,
      mode : "",
      toggleMode : function (m) {
        this.mode = this._magnifierActive ? "" : "magnify";
      },
      delSelectAllExceptFor : function (obj) {
        except = obj;
      },
      addSelect : function () {},
      delSelect : function () {}
    };
    
    expect(page.selected).toBeFalsy();
    expect(except).toBeNull();
    page.classList.add('move','cursor');
    expect(page.classList.contains('selected')).toBeFalsy();
    expect(page._parent.cursor).toBeNull();

    page._clickHandler(clickEv);

    expect(page.selected).toBeTruthy();
    expect(page.classList.contains('selected')).toBeTruthy();
    expect(page.classList.contains('move')).toBeFalsy();
    expect(page.classList.contains('cursor')).toBeFalsy();
    expect(page._parent.cursor).toBe(page);

    page._clickHandler(clickEv);

    expect(page.selected).toBeFalsy();
    expect(page.classList.contains('selected')).toBeFalsy();
    expect(page.classList.contains('move')).toBeFalsy();
    expect(page.classList.contains('cursor')).toBeFalsy();

    expect(page.removed).toBe(false);
    expect(page.classList.contains("removed")).toBe(false);

    page.remove();
    expect(page.removed).toBeTruthy();
    expect(page.classList.contains("removed")).toBeTruthy();

    // Revive removed page
    page._clickHandler(clickEv);

    expect(page.selected).toBeFalsy();
    expect(page.classList.contains('selected')).toBeFalsy();
    expect(page.classList.contains('move')).toBeFalsy();
    expect(page.classList.contains('cursor')).toBeFalsy();
    expect(page.removed).toBeFalsy();
    expect(page.classList.contains("removed")).toBeFalsy();
    
  });
});

describe('PDF Reorganizer', () => {
  let examplepdf = "file:" + resolve(__dirname, "demo/example.pdf");
  let examplepdf2 = "file:" + resolve(__dirname, "demo/example2.pdf");
  
  it('should be constructible', () => {
    let reorganizer = new PDFReorganizer(20).init();

    expect(reorganizer.selected.size).toBe(0);
  });

  it('should have the right element structure', () => {
    let reorganizer = new PDFReorganizer().init();

    expect(reorganizer.children.length).toBe(0);

    let s = reorganizer.shadowRoot;
    expect(s.firstChild.tagName).toBe("svg"); // symbols
    expect(s.children[1].tagName).toBe("NAV");
    expect(s.lastChild.tagName).toBe("DIV");
    expect(s.lastChild.getAttribute('id')).toBe("pdf-viewport");
  });

  it('should load a PDF document', async () => {
    let reorganizer = new PDFReorganizer().init();
    expect.assertions(2);
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    const result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);
  });

  it('should (de)select all pages', async () => {
    let reorganizer = new PDFReorganizer().init();
    // expect.assertions(3);
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    const result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);

    expect(reorganizer.selected.size).toBe(0);

    expect(reorganizer.selectAll()).toBe(8);

    expect(reorganizer.selected.size).toBe(8);

    expect(reorganizer.selectAll(0)).toBe(8);

    expect(reorganizer.selected.size).toBe(0);
  });

  it('should process all pages', async () => {
    let reorganizer = new PDFReorganizer().init();
    // expect.assertions(3);
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    const result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);

    expect(JSON.stringify(reorganizer.process().docs)).toEqual('[[1,2,3,4,5,6,7,8]]');
  });

  it('should splitBefore pages', async () => {
    let reorganizer = new PDFReorganizer().init();
    // expect.assertions(3);
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    const result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);

    let page = reorganizer.getPage(3);

    expect(page.splitBefore()).toBeTruthy();

    page = reorganizer.getPage(6);

    expect(page.splitBefore()).toBeTruthy();

    expect(JSON.stringify(reorganizer.process().docs)).toEqual('[[1,2,3],[4,5,6],[7,8]]');

    expect(reorganizer.selectAll()).toBe(8);

    expect(reorganizer.splitBefore()).toBe(6);

    expect(JSON.stringify(reorganizer.process().docs)).toEqual('[[1],[2],[3,4],[5],[6,7],[8]]');

    // Don't split on removed pages
    page = reorganizer.getPage(2);
    page.remove();
    expect(page.splitBefore()).toBeFalsy();
   
    expect(JSON.stringify(reorganizer.process().docs)).toEqual('[[1],[2,4],[5],[6,7],[8]]');
  });

  it('should rotate pages', async () => {
    let reorganizer = new PDFReorganizer().init();
    // expect.assertions(3);
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    const result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);

    let page = reorganizer.getPage(3);

    page.rotateLeft();

    page = reorganizer.getPage(6);

    page.rotateRight()

    expect(JSON.stringify(reorganizer.process().docs)).toEqual('[[1,2,3,{"p":4,"r":270},5,6,{"p":7,"r":90},8]]');

    expect(reorganizer.selectAll()).toBe(8);

    expect(reorganizer.rotateLeft()).toBe(8);

    expect(JSON.stringify(reorganizer.process().docs)).toEqual('[[{"p":1,"r":270},{"p":2,"r":270},{"p":3,"r":270},{"p":4,"r":180},{"p":5,"r":270},{"p":6,"r":270},7,{"p":8,"r":270}]]');

    expect(reorganizer.rotateRight()).toBe(8);

    expect(JSON.stringify(reorganizer.process().docs)).toEqual('[[1,2,3,{"p":4,"r":270},5,6,{"p":7,"r":90},8]]');
  });

  it('should remove pages', async () => {
    let reorganizer = new PDFReorganizer().init();
    // expect.assertions(3);
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    const result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);

    let page = reorganizer.getPage(3);

    page.remove();

    page = reorganizer.getPage(6);

    page.remove()

    expect(JSON.stringify(reorganizer.process().docs)).toEqual('[[1,2,3,5,6,8]]');

    expect(reorganizer.selectAll()).toBe(6);

    expect(reorganizer.remove()).toBe(6);

    expect(JSON.stringify(reorganizer.process().docs)).toEqual('[[]]');
  });

  it('should move pages before/after', async () => {
    let reorganizer = new PDFReorganizer().init();
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
    
    expect(JSON.stringify(reorganizer.process().docs)).toEqual('[[1,2,4,7,3,5,6,8]]');

    // still selected
    expect(reorganizer.selected.size).toBe(2);

    reorganizer.moveAfter(reorganizer.getPage(5)); // 3

    expect(JSON.stringify(reorganizer.process().docs)).toEqual('[[1,2,3,5,4,7,6,8]]');
  });

  it('should reload for a new document', async () => {
    let reorganizer = new PDFReorganizer().init();
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    let result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);

    expect(reorganizer.viewport.children.length).toBe(8);

    result = await reorganizer.loadDocument(examplepdf2);
    expect(result).toBe(7);

    expect(reorganizer.viewport.children.length).toBe(7);
  });

  it('should use the selector mode', async () => {
    let reorganizer = new PDFReorganizer().init();
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    let result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);
    expect(reorganizer.selected.size).toBe(0);

    expect(reorganizer.mode).not.toEqual("select");
    expect(reorganizer.button["select"].classList.contains('active')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('magnify')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('select')).toBeFalsy();

    let page = reorganizer.getPage(3); // 4
    page._clickHandler({ctrlKey:null});
    expect(reorganizer.selected.size).toBe(1);

    page = reorganizer.getPage(4); // 5
    page._clickHandler({ctrlKey:null});
    expect(reorganizer.selected.size).toBe(1);

    page = reorganizer.getPage(5); // 6
    page._clickHandler({ctrlKey:null});
    expect(reorganizer.selected.size).toBe(1);

    reorganizer.toggleMode("select");

    page = reorganizer.getPage(3); // 4
    page._clickHandler({ctrlKey:null});
    expect(reorganizer.selected.size).toBe(2);

    page = reorganizer.getPage(4); // 5
    page._clickHandler({ctrlKey:null});
    expect(reorganizer.selected.size).toBe(3);

    page = reorganizer.getPage(5); // 6
    page._clickHandler({ctrlKey:null});
    expect(reorganizer.selected.size).toBe(2);
    
    expect(reorganizer.mode).toEqual("select");
    expect(reorganizer.button["select"].classList.contains('active')).toBeTruthy();
    expect(reorganizer.viewport.classList.contains('magnify')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('select')).toBeTruthy();
  });

  it('should use the magnifier mode', async () => {
    let reorganizer = new PDFReorganizer().init();
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    let result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);
    expect(reorganizer.selected.size).toBe(0);

    expect(reorganizer.mode).not.toEqual("magnify");
    expect(reorganizer.button["magnify"].classList.contains('active')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('magnify')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('select')).toBeFalsy();

    let page = reorganizer.getPage(3); // 4
    page._clickHandler({ctrlKey:null});
    expect(reorganizer.selected.size).toBe(1);
    expect(page.classList.contains('magnify')).toBeFalsy();
    page.selectOff();
    expect(reorganizer.selected.size).toBe(0);
    
    reorganizer.toggleMode("magnify");
    
    expect(reorganizer.mode).toEqual("magnify");
    expect(reorganizer.button["magnify"].classList.contains('active')).toBeTruthy();
    expect(reorganizer.viewport.classList.contains('magnify')).toBeTruthy();
    expect(reorganizer.viewport.classList.contains('select')).toBeFalsy();

    page = reorganizer.getPage(3); // 4
    page._clickHandler({ctrlKey:null});
    expect(reorganizer.selected.size).toBe(0);
    expect(page.classList.contains('magnify')).toBeTruthy();

    // This resets the mode
    expect(reorganizer.mode).not.toEqual("magnify");
    expect(reorganizer.button["magnify"].classList.contains('active')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('magnify')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('select')).toBeFalsy();

    // This will use the select mode and demagnify the former page
    let page2 = reorganizer.getPage(4); // 5
    page2._clickHandler({ctrlKey:null});
    expect(reorganizer.selected.size).toBe(1);
    expect(page2.classList.contains('magnify')).toBeFalsy();

    expect(page.classList.contains('magnify')).toBeFalsy();
  });

  it('should use the split-before mode', async () => {
    let reorganizer = new PDFReorganizer().init();
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    let result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);
    expect(reorganizer.selected.size).toBe(0);

    expect(reorganizer.mode).not.toEqual("split-before");
    expect(reorganizer.button["split-before"].classList.contains('active')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('split-before')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('magnify')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('select')).toBeFalsy();

    let page = reorganizer.getPage(3); // 4
    page._clickHandler({ctrlKey:null});
    expect(reorganizer.selected.size).toBe(1);
    expect(page.classList.contains('split-before')).toBeFalsy();
    page.selectOff();
    expect(reorganizer.selected.size).toBe(0);
    
    reorganizer.splitBefore();
    
    expect(reorganizer.mode).toEqual("split-before");
    expect(reorganizer.button["split-before"].classList.contains('active')).toBeTruthy();
    expect(reorganizer.viewport.classList.contains('split-before')).toBeTruthy();
    expect(reorganizer.viewport.classList.contains('magnify')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('select')).toBeFalsy();

    page = reorganizer.getPage(3); // 4
    page._clickHandler({ctrlKey:null});
    expect(reorganizer.selected.size).toBe(0);
    expect(page.classList.contains('magnify')).toBeFalsy();
    expect(page.classList.contains('split-before')).toBeTruthy();

    // This resets the mode
    expect(reorganizer.mode).not.toEqual("split-before");
    expect(reorganizer.button["split-before"].classList.contains('active')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('split-before')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('magnify')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('select')).toBeFalsy();

    // This will use the select mode and demagnify the former page
    let page2 = reorganizer.getPage(4); // 5
    page2._clickHandler({ctrlKey:null});
    expect(reorganizer.selected.size).toBe(1);
    expect(page2.classList.contains('split-before')).toBeFalsy();

    expect(page.classList.contains('split-before')).toBeTruthy();
  });

  it('should use the rotate-left mode', async () => {
    let reorganizer = new PDFReorganizer().init();
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    let result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);
    expect(reorganizer.selected.size).toBe(0);

    expect(reorganizer.mode).not.toEqual("rotate-left");
    expect(reorganizer.button["rotate-left"].classList.contains('active')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('split-before')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('rotate-left')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('magnify')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('select')).toBeFalsy();

    let page = reorganizer.getPage(3); // 4
    page._clickHandler({ctrlKey:null});
    expect(reorganizer.selected.size).toBe(1);
    expect(page.rotation).toEqual(0);
    page.selectOff();
    expect(reorganizer.selected.size).toBe(0);
    
    reorganizer.rotateLeft();
    
    expect(reorganizer.mode).toEqual("rotate-left");
    expect(reorganizer.button["rotate-left"].classList.contains('active')).toBeTruthy();
    expect(reorganizer.viewport.classList.contains('rotate-left')).toBeTruthy();
    expect(reorganizer.viewport.classList.contains('split-before')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('magnify')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('select')).toBeFalsy();

    page = reorganizer.getPage(3); // 4
    page._clickHandler({ctrlKey:null});
    expect(reorganizer.selected.size).toBe(0);
    expect(page.classList.contains('magnify')).toBeFalsy();
    expect(page.classList.contains('split-before')).toBeFalsy();
    expect(page.rotation).toEqual(270);

    // This resets the mode
    expect(reorganizer.mode).not.toEqual("rotate-left");
    expect(reorganizer.button["rotate-left"].classList.contains('active')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('rotate-left')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('magnify')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('select')).toBeFalsy();

    // This will use the select mode
    let page2 = reorganizer.getPage(4); // 5
    page2._clickHandler({ctrlKey:null});
    expect(reorganizer.selected.size).toBe(1);
    expect(page2.rotation).toEqual(0);

    expect(page.rotation).toEqual(270);
  });

  it('should use the rotate-right mode', async () => {
    let reorganizer = new PDFReorganizer().init();
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    let result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);
    expect(reorganizer.selected.size).toBe(0);

    expect(reorganizer.mode).not.toEqual("rotate-left");
    expect(reorganizer.button["rotate-right"].classList.contains('active')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('split-before')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('rotate-left')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('rotate-right')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('magnify')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('select')).toBeFalsy();

    let page = reorganizer.getPage(3); // 4
    page._clickHandler({ctrlKey:null});
    expect(reorganizer.selected.size).toBe(1);
    expect(page.rotation).toEqual(0);
    page.selectOff();
    expect(reorganizer.selected.size).toBe(0);
    
    reorganizer.rotateRight();
    
    expect(reorganizer.mode).toEqual("rotate-right");
    expect(reorganizer.button["rotate-right"].classList.contains('active')).toBeTruthy();
    expect(reorganizer.viewport.classList.contains('rotate-left')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('rotate-right')).toBeTruthy();
    expect(reorganizer.viewport.classList.contains('split-before')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('magnify')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('select')).toBeFalsy();

    page = reorganizer.getPage(3); // 4
    page._clickHandler({ctrlKey:null});
    expect(reorganizer.selected.size).toBe(0);
    expect(page.classList.contains('magnify')).toBeFalsy();
    expect(page.classList.contains('split-before')).toBeFalsy();
    expect(page.rotation).toEqual(90);

    // This resets the mode
    expect(reorganizer.mode).not.toEqual("rotate-right");
    expect(reorganizer.button["rotate-right"].classList.contains('active')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('rotate-right')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('rotate-left')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('magnify')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('select')).toBeFalsy();

    // This will use the select mode
    let page2 = reorganizer.getPage(4); // 5
    page2._clickHandler({ctrlKey:null});
    expect(reorganizer.selected.size).toBe(1);
    expect(page2.rotation).toEqual(0);

    expect(page.rotation).toEqual(90);
  });

  it('should use the remove mode', async () => {
    let reorganizer = new PDFReorganizer().init();
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    let result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);
    expect(reorganizer.selected.size).toBe(0);

    expect(reorganizer.mode).not.toEqual("remove");
    expect(reorganizer.button["remove"].classList.contains('active')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('split-before')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains("remove")).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('rotate-left')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('rotate-right')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('magnify')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('select')).toBeFalsy();

    let page = reorganizer.getPage(3); // 4
    page._clickHandler({ctrlKey:null});
    expect(reorganizer.selected.size).toBe(1);
    expect(page.rotation).toEqual(0);
    page.selectOff();
    expect(reorganizer.selected.size).toBe(0);
    
    reorganizer.remove();
    
    expect(reorganizer.mode).toEqual("remove");
    expect(reorganizer.button["remove"].classList.contains('active')).toBeTruthy();
    expect(reorganizer.viewport.classList.contains("remove")).toBeTruthy();
    expect(reorganizer.viewport.classList.contains('rotate-left')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('rotate-right')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('split-before')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('magnify')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('select')).toBeFalsy();

    page = reorganizer.getPage(3); // 4
    expect(page.removed).toBeFalsy();
    page._clickHandler({ctrlKey:null});
    expect(reorganizer.selected.size).toBe(0);
    expect(page.classList.contains('magnify')).toBeFalsy();
    expect(page.classList.contains('split-before')).toBeFalsy();
    expect(page.removed).toBeTruthy();

    // This resets the mode
    expect(reorganizer.mode).not.toEqual("remove");
    expect(reorganizer.button["remove"].classList.contains('active')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('rotate-right')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('rotate-left')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('magnify')).toBeFalsy();
    expect(reorganizer.viewport.classList.contains('select')).toBeFalsy();

    // This will use the select mode
    let page2 = reorganizer.getPage(4); // 5
    page2._clickHandler({ctrlKey:null});
    expect(reorganizer.selected.size).toBe(1);
    expect(page2.removed).toBeFalsy();

    expect(page.removed).toBeTruthy();
  });
  
  
  it('should deselect/inverse select all', async () => {
    let reorganizer = new PDFReorganizer().init();
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    let result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);
    expect(reorganizer.selected.size).toBe(0);

    reorganizer.selectAll(-1);
    expect(reorganizer.selected.size).toBe(8);

    reorganizer.selectAll(-1);
    expect(reorganizer.selected.size).toBe(0);

    reorganizer.selectAll(1);
    expect(reorganizer.selected.size).toBe(8);

    reorganizer.selectAll(0);
    expect(reorganizer.selected.size).toBe(0);

    let page = reorganizer.getPage(4); // 5
    page._clickHandler({});
    expect(page.selected).toBeTruthy();
    expect(reorganizer.selected.size).toBe(1);

    reorganizer.selectAll(-1);
    expect(reorganizer.selected.size).toBe(7);
    expect(page.selected).toBeFalsy();
  });
});

describe('PDF Reorganizer (Key events)', () => {
  let examplepdf = "file:" + resolve(__dirname, "demo/example.pdf");
  let examplepdf2 = "file:" + resolve(__dirname, "demo/example2.pdf");

  function keyd(opt) {
    return new KeyboardEvent("keydown", opt)
  };
  
  it('should init a cursor and move (arrow right)', async () => {
    let reorganizer = new PDFReorganizer().init();
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
    let reorganizer = new PDFReorganizer().init();
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

    reorganizer.cursor = reorganizer.cursor;
    
    reorganizer._keyHandler(keyd({key: 'ArrowLeft'}));
    expect(reorganizer.cursor.num).toBe(8);
  });

  it('should move and remove/unremove', async () => {
    let reorganizer = new PDFReorganizer().init();
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    let result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(1);

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.removed).toBeFalsy();

    reorganizer._keyHandler(keyd({key: 'Delete'}));
    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.removed).toBeTruthy();

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(3);
    expect(reorganizer.cursor.removed).toBeFalsy();

    reorganizer._keyHandler(keyd({key: 'ArrowLeft'}));
    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.removed).toBeTruthy();

    reorganizer._keyHandler(keyd({key: ' '}));
    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.removed).toBeFalsy();

    reorganizer._keyHandler(keyd({key: 'ArrowLeft'}));
    expect(reorganizer.cursor.num).toBe(1);
    expect(reorganizer.cursor.removed).toBeFalsy();

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.removed).toBeFalsy();
  });

  it('should move and select', async () => {
    let reorganizer = new PDFReorganizer().init();
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
    expect(reorganizer.selectAll(0)).toBe(8);

    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.selected).toBeFalsy();

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(3);
    expect(reorganizer.cursor.selected).toBeFalsy();
  });

  it('should move and rotate', async () => {
    let reorganizer = new PDFReorganizer().init();
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
    let reorganizer = new PDFReorganizer().init();
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

    expect(JSON.stringify(reorganizer.process().docs)).toEqual('[[1],[2,3],[4,5,6,7,8]]');
  });

  it('should move and remove all selected', async () => {
    let reorganizer = new PDFReorganizer().init();
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    let result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(1);
    expect(reorganizer.cursor.selected).toBeFalsy();
    expect(reorganizer.selected.size).toBe(0);

    reorganizer._keyHandler(keyd({key: ' '}));
    expect(reorganizer.selected.size).toBe(1);
    expect(reorganizer.cursor.removed).toBeFalsy();

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.selected).toBeFalsy();

    reorganizer._keyHandler(keyd({key: ' '}));
    expect(reorganizer.selected.size).toBe(2);
    
    expect(reorganizer.cursor.removed).toBeFalsy();
    reorganizer._keyHandler(keyd({key: 'Delete', shiftKey: true}));
    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.removed).toBeTruthy();

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(3);
    expect(reorganizer.cursor.removed).toBeFalsy();

    reorganizer._keyHandler(keyd({key: 'ArrowLeft'}));
    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.removed).toBeTruthy();

    reorganizer._keyHandler(keyd({key: 'ArrowLeft'}));
    expect(reorganizer.cursor.num).toBe(1);
    expect(reorganizer.cursor.removed).toBeTruthy();

    expect(JSON.stringify(reorganizer.process().docs)).toEqual('[[3,4,5,6,7,8]]');
  });

  it('should move and rotate all selected', async () => {
    let reorganizer = new PDFReorganizer().init();
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    let result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(1);
    expect(reorganizer.cursor.selected).toBeFalsy();
    expect(reorganizer.selected.size).toBe(0);

    reorganizer._keyHandler(keyd({key: ' '}));
    expect(reorganizer.selected.size).toBe(1);
    expect(reorganizer.cursor.removed).toBeFalsy();

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.selected).toBeFalsy();

    reorganizer._keyHandler(keyd({key: ' '}));
    expect(reorganizer.selected.size).toBe(2);
    expect(reorganizer.cursor.selected).toBeTruthy();
    expect(reorganizer.cursor.rotation).toEqual(0);
    
    expect(reorganizer.cursor.removed).toBeFalsy();
    reorganizer._keyHandler(keyd({key: 'ArrowRight', shiftKey: true, ctrlKey: true}));
    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.selected).toBeTruthy();
    expect(reorganizer.cursor.rotation).toEqual(90);

    reorganizer._keyHandler(keyd({key: 'ArrowRight', shiftKey: true, ctrlKey: true}));
    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.selected).toBeTruthy();
    expect(reorganizer.cursor.rotation).toEqual(180);

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(3);
    expect(reorganizer.cursor.selected).toBeFalsy();
    expect(reorganizer.cursor.rotation).toEqual(0);

    reorganizer._keyHandler(keyd({key: 'ArrowLeft', shiftKey: true, ctrlKey: true}));
    expect(reorganizer.cursor.num).toBe(3);
    expect(reorganizer.cursor.selected).toBeFalsy();
    expect(reorganizer.cursor.rotation).toEqual(0);

    reorganizer._keyHandler(keyd({key: 'ArrowLeft', ctrlKey: true}));
    expect(reorganizer.cursor.num).toBe(3);
    expect(reorganizer.cursor.selected).toBeFalsy();
    expect(reorganizer.cursor.rotation).toEqual(270);

    reorganizer._keyHandler(keyd({key: 'ArrowLeft'}));
    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.selected).toBeTruthy();
    expect(reorganizer.cursor.rotation).toEqual(90);

    reorganizer._keyHandler(keyd({key: 'ArrowRight', ctrlKey: true}));
    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.selected).toBeTruthy();
    expect(reorganizer.cursor.rotation).toEqual(180);
    
    reorganizer._keyHandler(keyd({key: 'ArrowLeft'}));
    expect(reorganizer.cursor.num).toBe(1);
    expect(reorganizer.cursor.selected).toBeTruthy();
    expect(reorganizer.cursor.rotation).toEqual(90);

    expect(JSON.stringify(reorganizer.process().docs)).toEqual('[[{"p":1,"r":90},{"p":2,"r":180},{"p":3,"r":270},4,5,6,7,8]]');
  });

  it('should move and drop before/after', async () => {
    let reorganizer = new PDFReorganizer().init();
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    let result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(1);
    expect(reorganizer.cursor.selected).toBeFalsy();
    expect(reorganizer.selected.size).toBe(0);

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.cursor.selected).toBeFalsy();
    expect(reorganizer.selected.size).toBe(0);
    
    reorganizer._keyHandler(keyd({key: ' '}));
    expect(reorganizer.selected.size).toBe(1);
    expect(reorganizer.cursor.removed).toBeFalsy();

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(3);
    expect(reorganizer.cursor.selected).toBeFalsy();

    reorganizer._keyHandler(keyd({key: ' '}));
    expect(reorganizer.selected.size).toBe(2);
    expect(reorganizer.cursor.selected).toBeTruthy();

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(4);
    expect(reorganizer.cursor.selected).toBeFalsy();

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(5);
    expect(reorganizer.cursor.selected).toBeFalsy();

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(6);

    // Add after
    expect(reorganizer.selected.size).toBe(2);
    expect(reorganizer.cursor.classList.contains('drag-left')).toBeFalsy();
    expect(reorganizer.cursor.classList.contains('drag-right')).toBeFalsy();
    reorganizer._keyHandler(keyd({key: 'ArrowRight', altKey: true}));
    expect(reorganizer.cursor.classList.contains('drag-left')).toBeFalsy();
    expect(reorganizer.cursor.classList.contains('drag-right')).toBeTruthy();

    reorganizer._keyHandler(keyd({key: 'Enter'}));
    expect(reorganizer.cursor.classList.contains('drag-left')).toBeFalsy();
    expect(reorganizer.cursor.classList.contains('drag-right')).toBeFalsy();
    expect(reorganizer.selected.size).toBe(2);

    expect(JSON.stringify(reorganizer.process().docs)).toEqual('[[1,4,5,6,2,3,7,8]]');

    reorganizer._keyHandler(keyd({key: 'ArrowLeft'}));
    expect(reorganizer.cursor.num).toBe(5);

    reorganizer._keyHandler(keyd({key: 'ArrowLeft'}));
    expect(reorganizer.cursor.num).toBe(4);

    reorganizer._keyHandler(keyd({key: 'ArrowLeft'}));
    expect(reorganizer.cursor.num).toBe(1);
    expect(reorganizer.selected.size).toBe(2);

    expect(reorganizer.cursor.selected).toBeFalsy();
    
    // Add before
    expect(reorganizer.cursor.classList.contains('drag-left')).toBeFalsy();
    expect(reorganizer.cursor.classList.contains('drag-right')).toBeFalsy();
    reorganizer._keyHandler(keyd({key: 'ArrowLeft', altKey: true}));
    expect(reorganizer.cursor.classList.contains('drag-left')).toBeTruthy();
    expect(reorganizer.cursor.classList.contains('drag-right')).toBeFalsy();

    reorganizer._keyHandler(keyd({key: 'Enter'}));
    expect(reorganizer.cursor.classList.contains('drag-left')).toBeFalsy();
    expect(reorganizer.cursor.classList.contains('drag-right')).toBeFalsy();
    expect(reorganizer.selected.size).toBe(2);

    expect(JSON.stringify(reorganizer.process().docs)).toEqual('[[2,3,1,4,5,6,7,8]]');
  });
  
  it('should move and magnify', async () => {
    let reorganizer = new PDFReorganizer().init();
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    let result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(3);
    expect(reorganizer.cursor.magnified).toBeFalsy();

    reorganizer._keyHandler(keyd({key: '+'}));
    expect(reorganizer.cursor.magnified).toBeFalsy();

    reorganizer._keyHandler(keyd({key: '+', ctrlKey:true}));
    expect(reorganizer.cursor.magnified).toBeTruthy();
    expect(reorganizer.cursor.scrollLeft).toEqual(0); 
    expect(reorganizer.cursor.scrollTop).toEqual(0); 

    // Navigate inside the magnifier
    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(3);
    expect(reorganizer.cursor.magnified).toBeTruthy();
    expect(reorganizer.cursor.scrollLeft).toEqual(1*reorganizer.scrollstep); 
    expect(reorganizer.cursor.scrollTop).toEqual(0); 

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(3);
    expect(reorganizer.cursor.magnified).toBeTruthy();
    expect(reorganizer.cursor.scrollLeft).toEqual(2*reorganizer.scrollstep); 
    expect(reorganizer.cursor.scrollTop).toEqual(0); 

    reorganizer._keyHandler(keyd({key: 'ArrowLeft'}));
    expect(reorganizer.cursor.num).toBe(3);
    expect(reorganizer.cursor.magnified).toBeTruthy();
    expect(reorganizer.cursor.scrollLeft).toEqual(1*reorganizer.scrollstep); 
    expect(reorganizer.cursor.scrollTop).toEqual(0); 

    reorganizer._keyHandler(keyd({key: 'ArrowDown'}));
    expect(reorganizer.cursor.num).toBe(3);
    expect(reorganizer.cursor.magnified).toBeTruthy();
    expect(reorganizer.cursor.scrollLeft).toEqual(1*reorganizer.scrollstep); 
    expect(reorganizer.cursor.scrollTop).toEqual(1*reorganizer.scrollstep); 

    reorganizer._keyHandler(keyd({key: 'ArrowDown'}));
    expect(reorganizer.cursor.num).toBe(3);
    expect(reorganizer.cursor.magnified).toBeTruthy();
    expect(reorganizer.cursor.scrollLeft).toEqual(1*reorganizer.scrollstep); 
    expect(reorganizer.cursor.scrollTop).toEqual(2*reorganizer.scrollstep); 

    reorganizer._keyHandler(keyd({key: 'ArrowUp'}));
    expect(reorganizer.cursor.num).toBe(3);
    expect(reorganizer.cursor.magnified).toBeTruthy();
    expect(reorganizer.cursor.scrollLeft).toEqual(1*reorganizer.scrollstep); 
    expect(reorganizer.cursor.scrollTop).toEqual(1*reorganizer.scrollstep); 

    // Jump inside magnified view
    reorganizer._keyHandler(keyd({key: 'ArrowRight', ctrlKey:true}));
    expect(reorganizer.cursor.num).toBe(3);
    expect(reorganizer.cursor.magnified).toBeTruthy();
    expect(reorganizer.cursor.scrollLeft).toEqual(reorganizer.cursor.scrollWidth - reorganizer.cursor.clientWidth); 
    expect(reorganizer.cursor.scrollTop).toEqual(1*reorganizer.scrollstep); 

    reorganizer._keyHandler(keyd({key: 'ArrowDown', ctrlKey:true}));
    expect(reorganizer.cursor.num).toBe(3);
    expect(reorganizer.cursor.magnified).toBeTruthy();
    expect(reorganizer.cursor.scrollLeft).toEqual(reorganizer.cursor.scrollWidth - reorganizer.cursor.clientWidth); 
    expect(reorganizer.cursor.scrollTop).toEqual(reorganizer.cursor.scrollHeight - reorganizer.cursor.clientHeight); 

    reorganizer.cursor.scrollTop = 56;
    reorganizer.cursor.scrollLeft = 56;

    reorganizer._keyHandler(keyd({key: 'ArrowUp', ctrlKey: true}));
    expect(reorganizer.cursor.num).toBe(3);
    expect(reorganizer.cursor.magnified).toBeTruthy();
    expect(reorganizer.cursor.scrollLeft).toEqual(56); 
    expect(reorganizer.cursor.scrollTop).toEqual(0); 

    reorganizer._keyHandler(keyd({key: 'ArrowLeft', ctrlKey: true}));
    expect(reorganizer.cursor.num).toBe(3);
    expect(reorganizer.cursor.magnified).toBeTruthy();
    expect(reorganizer.cursor.scrollLeft).toEqual(0); 
    expect(reorganizer.cursor.scrollTop).toEqual(0);

    reorganizer._keyHandler(keyd({key: 'Escape'}));
    expect(reorganizer.cursor.num).toBe(3);
    expect(reorganizer.cursor.magnified).toBeFalsy();

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(4);
    expect(reorganizer.cursor.magnified).toBeFalsy();
  });

  it('should select all pages', async () => {
    let reorganizer = new PDFReorganizer().init();
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    let result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(1);
    expect(reorganizer.selected.size).toBe(0);
    expect(reorganizer.cursor.selected).toBeFalsy();

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    expect(reorganizer.cursor.num).toBe(2);
    expect(reorganizer.selected.size).toBe(0);
    expect(reorganizer.cursor.selected).toBeFalsy();

    reorganizer._keyHandler(keyd({key: 'a', ctrlKey: '+'}));
    expect(reorganizer.cursor.selected).toBeTruthy();
    expect(reorganizer.selected.size).toBe(8);
  });

  it('should deselect/inverse select all', async () => {
    let reorganizer = new PDFReorganizer().init();
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    let result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);
    expect(reorganizer.selected.size).toBe(0);

    reorganizer._keyHandler(keyd({key: 'I', ctrlKey: true, shiftKey: true}));
    expect(reorganizer.selected.size).toBe(8);

    reorganizer._keyHandler(keyd({key: 'I', ctrlKey: true, shiftKey: true}));
    expect(reorganizer.selected.size).toBe(0);

    reorganizer._keyHandler(keyd({key: 'a', ctrlKey: true}));
    expect(reorganizer.selected.size).toBe(8);

    reorganizer._keyHandler(keyd({key: 'd', ctrlKey: true}));
    expect(reorganizer.selected.size).toBe(0);

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    reorganizer._keyHandler(keyd({key: ' '}));
    expect(reorganizer.cursor.selected).toBeTruthy();
    expect(reorganizer.selected.size).toBe(1);

    reorganizer._keyHandler(keyd({key: 'I', ctrlKey: true, shiftKey: true}));
    expect(reorganizer.selected.size).toBe(7);
    expect(reorganizer.cursor.selected).toBeFalsy();
  });

  it('should add comments', async () => {
    let reorganizer = new PDFReorganizer().init();
    expect(reorganizer.children.length).toBe(0);
    
    // Async testing
    let result = await reorganizer.loadDocument(examplepdf);
    expect(result).toBe(8);
    expect(reorganizer.selected.size).toBe(0);

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));
    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));

    expect(reorganizer.cursor.comment).toEqual("");

    reorganizer._keyHandler(keyd({key: 'c', ctrlKey: true}));
   
    reorganizer.commentDialog.input.value = "Kommentar";

    expect(reorganizer.cursor.comment).toEqual("");
    
    let submit = reorganizer.commentDialog._elt.children[2];
    expect(submit.classList.contains('submit')).toBeTruthy();

    submit.click();

    expect(reorganizer.cursor.comment).toEqual("Kommentar");

    reorganizer._keyHandler(keyd({key: 'ArrowRight'}));

    expect(reorganizer.cursor.comment).toEqual("");

    reorganizer._keyHandler(keyd({key: 'ArrowLeft'}));
    
    expect(reorganizer.cursor.comment).toEqual("Kommentar");

    reorganizer._keyHandler(keyd({key: 'c', ctrlKey: true}));
   
    expect(reorganizer.commentDialog.input.value).toEqual("Kommentar");    
  });  
  
  // I have no good idea how to test it without something like playwright,
  // as it requires a flexbox enabled viewport.
  test.todo('should move up/down with different rows');

  test.todo('should accept configuration');

  test.todo('should move and split before all selected');
});

describe('PDF Comment', () => {
  it('should have the correct structure', async () => {

    let comment = new PDFReorganizerComment(null);
    expect(comment._elt).toBeUndefined();
    
    let parent = document.createElement('div');

    comment = new PDFReorganizerComment(parent);
    expect(comment._elt).not.toBeUndefined();
    expect(comment._elt.tagName).toBe("DIALOG");
    expect(comment.input.tagName).toBe("INPUT");
    expect(comment.input.value).toBe("");
    expect(comment.value).toBeUndefined();
    expect(comment.cb).toBeUndefined();
  });

  it('should open and close a dialog', async () => {
    let parent = document.createElement('div');
    let comment = new PDFReorganizerComment(parent);
    let variable = "";
    
    comment.prompt(function (text) {
      variable = text;
    },"cool");

    expect(variable).toEqual("");
    
    expect(comment.input.value).toEqual("cool");
    expect(comment.value).toEqual("cool");
    
    comment.input.value = "cool2";

    expect(comment.value).toEqual("cool");

    let cancel = comment._elt.children[1];
    expect(cancel.classList.contains('cancel')).toBeTruthy();

    let submit = comment._elt.children[2];
    expect(submit.classList.contains('submit')).toBeTruthy();

    // Cancel
    cancel.click();

    expect(variable).toEqual("cool");

    // Submit
    comment.prompt(function (text) {
      variable = text;
    },"cool");

    comment.input.value = "cool3";
    expect(comment.input.value).toEqual("cool3");
    submit.click();

    expect(variable).toEqual("cool3");
  });
});
