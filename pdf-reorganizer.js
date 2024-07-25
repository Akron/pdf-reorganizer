//import * as pdfjsLib from 'pdfjs-dist';
import {getDocument, GlobalWorkerOptions} from 'pdfjs-dist';
import * as PdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs";

import PDFPage from './pdf-page.js';

// The workerSrc property shall be specified.
GlobalWorkerOptions.workerSrc = "pdfjs-dist/build/pdf.worker.mjs";


/**
 * @class PDFReorganizer extends an HTMLElement
 * that allows to rearrange, split, and
 * modify PDFs.
 *
 * @exports
 */
export default class PDFReorganizer extends HTMLElement {

  /**
   * @constructor
   */
  constructor() {
    super();
    this.url;
    this.css;
    this.onprocess;
    this.numPages = 0;
    this.pdfDoc = undefined;

    this._cursor = null;
    this._dropTarget = null;
    this.zoomfactor = 4;
    this.scrollStep = 14;
    this.selected = new Set();
    
    this.attachShadow({ mode: "open" });
   
    const nav = document.createElement('nav');

    this.splitBeforeElem = _addNavItem("split-before", "#splitscreen_vertical_add", "Split before selected pages (Ctrl+Shift+S)");
    nav.appendChild(this.splitBeforeElem);

    this.rotateLeftElem = _addNavItem("rotate-left", "#rotate_90_degrees_ccw", "Rotate 90deg ccw (Ctrl+left arrow");
    nav.appendChild(this.rotateLeftElem);
    
    this.rotateRightElem = _addNavItem("rotate-right", "#rotate_90_degrees_cw", "Rotate 90deg cw (Ctrl+right arrow)");
    nav.appendChild(this.rotateRightElem);

    this.selElem = _addNavItem("select", "#select", "Start selection mode");
    nav.appendChild(this.selElem);
    
    this.allElem = _addNavItem("select-all", "#select_all", "Select all pages (Ctrl+a)");
    nav.appendChild(this.allElem);

    this.delElem = _addNavItem("delete", "#scan_delete", "Delete selected pages (Delete+Shift)");
    nav.appendChild(this.delElem);

    this.magElem = _addNavItem("magnify", "#zoom_in", "Start magnifying mode");
    nav.appendChild(this.magElem);

    this.processElem = _addNavItem("process", "#play_arrow", "Start processing");
    nav.appendChild(this.processElem);

    this.viewport = document.createElement('div');
    this.viewport.setAttribute('id', 'pdf-viewport');

    const shadow = this.shadowRoot;
    shadow.appendChild(this.svgSymbols());
    shadow.appendChild(nav);
    shadow.appendChild(this.viewport);
  }

  connectedCallback () {
    let instance = this;
    this.embedCSS();

    if (this.url != undefined)
      this.loadDocument(this.url);

    if (this.onprocess != null) {
      this.addEventListener("processed", this.onprocess)
    };

    this.delElem.addEventListener('click', this.remove.bind(this));
    this.rotateLeftElem.addEventListener('click', this.rotateLeft.bind(this));
    this.rotateRightElem.addEventListener('click', this.rotateRight.bind(this));
    this.splitBeforeElem.addEventListener('click', this.splitBefore.bind(this));
    this.magElem.addEventListener('click', this.toggleMagnifier.bind(this));
    this.allElem.addEventListener('click', this.selectAll.bind(this));
    this.selElem.addEventListener('click', this.toggleSelector.bind(this));

    this.processElem.addEventListener('click', (function() {
      this.process();
    }).bind(this));

    document.addEventListener("keydown", this._keyDownHandler.bind(this));

    // Lazy loading
    this.observeViewport = new IntersectionObserver((entries,observer) => {
      entries.forEach(entry => {

        if (!entry.isIntersecting)
          return;
        
        var page = entry.target;

        // Render the page, when it intersects with the viewport
        instance.pdfDoc.getPage(page.num).then((pdfPage) => {
          // instance.pages[pdfPage._pageIndex].render(pdfPage);
          page.render(pdfPage);
        });

        // Forget the page
        observer.unobserve(page);
      })
    }, {
      root: this.viewport,
      rootMargin: '10px 10px 10px 10px'
    });
  };

  disconnectedCallback() {
    this.observeViewport.disconnect();
  };
  
  static get observedAttributes() {
    return ['url','onprocess'];
  }

  // attribute change
  attributeChangedCallback(property, oldValue, newValue) {
    if (oldValue === newValue)
      return;

    // Overload attributes, e.g. from the element attribute list
    this[property] = newValue;
  }
  
  /**
   * Return selected elements in order of appearance
   * in the viewport.
   */
  _selectedSort () {
    if (this.selected.size < 2)
      return this.selected;
      
    let nodeList = Array.from(this.viewport.childNodes);
    let selList = Array.from(this.selected);
    
    selList.sort(function(a, b) {
      return nodeList.indexOf(a) - nodeList.indexOf(b);
    });

    return selList;
  }
 
  /**
   * Handle key presses.
   */
  _keyDownHandler (ev) {
    var letter = String.fromCharCode(ev.which);

    // delete
    switch (ev.key) {
    case "Delete":
      ev.preventDefault();
      if (ev.shiftKey || this.cursor == null)
        this.remove();
      else
        this.cursor.remove();
      break;
      
    // Move left
    case "ArrowLeft":
      ev.preventDefault();

      if (this.cursor?.magnified) {
        if (ev.ctrlKey)
            this.cursor.scrollLeft = 0;
          else
            this.cursor.scrollLeft -= this.scrollStep;
        break;
      };      

      // Rotate
      if (ev.ctrlKey) {
        if (ev.shiftKey)
          this.rotateLeft();
        else if (this.cursor != null)
          this.cursor.rotateLeft();
        break;
      };

      // drop
      if (ev.altKey) {
        if (this.selected.size > 0) {
          const cl = this.cursor.classList;
          cl.add('drag-left');
          cl.remove('drag-right');
        }
        this.dropTarget = this.cursor;
        return; // Don't reset dropTarget!
      };

      this._moveLeft();
      break;

    // Move up
    case "ArrowUp":

      ev.preventDefault();

      if (this.cursor?.magnified) {
        if (ev.ctrlKey)
            this.cursor.scrollTop = 0;
          else
            this.cursor.scrollTop -= this.scrollStep;
        break;
      };
      
      this._moveUp();
      break;

    // Move right
    case "ArrowRight":
      ev.preventDefault();

      if (this.cursor?.magnified) {
        const c = this.cursor;
        if (ev.ctrlKey)
            c.scrollLeft = c.scrollWidth - c.clientWidth;
        else
          c.scrollLeft += this.scrollStep;
        break;
      };

      // Rotate
      if (ev.ctrlKey) {
        if (ev.shiftKey)
          this.rotateRight();
        else if (this.cursor != null)
          this.cursor.rotateRight();
        break;
      };

      // drop
      if (ev.altKey) {
        if (this.selected.size > 0) {
          const cl = this.cursor.classList;
          cl.add('drag-right');
          cl.remove('drag-left');
        }
        this.dropTarget = this.cursor;
        return; // Don't reset dropTarget!
      };

      this._moveRight();
      break;

    // Move down
    case "ArrowDown":
      ev.preventDefault();

      if (this.cursor?.magnified) {
        const c = this.cursor;
        if (ev.ctrlKey)
          c.scrollTop = c.scrollHeight - c.clientHeight;
        else
          c.scrollTop += this.scrollStep;
        break;
      };
      
      this._moveDown();
      break;

    // Split before
    case "s":
    case "S":

      if (ev.ctrlKey) {
        ev.preventDefault();
        if (ev.shiftKey || this.cursor == null) {
          this.splitBefore();
        }
        else
          this.cursor.splitBefore();
      };
      break;
      
    // Select all
    case "a":
      if (ev.ctrlKey) {
        ev.preventDefault();
        this.selectAll();
        break;
      };
     
    case "+":
      if (!ev.ctrlKey)
        break;
      ev.preventDefault();
      this.cursor.magnify();

      break;

    case "Escape":
      if (this.cursor.magnified) {
        // ev.preventDefault();
        this.cursor.unmagnify();
      };

      break;
      
    // Space
    case " ":
      if (this.cursor != null) {
        ev.preventDefault();
        this.cursor.swapSelected();
      };    
      break;

    case "Enter":

      const dt = this.dropTarget;
      if (dt != null && this.selected.size > 0) {
        if (dt.classList.contains("drag-left")) {
          this.moveBefore(dt);
        } else {
          this.moveAfter(dt);
        }
        this.dropTarget = null;
        ev.preventDefault();
      };
      
      /*
    default:
      console.log(ev);
      */
    };
    this.dropTarget = null;
  }
  
  /**
   * Move cursor to left.
   */
  _moveLeft () {
        
    // Todo: scroll if not in viewport
    let prev;

    // Already initialized
    if (this.cursor != null) {

      // Nowhere to move
      if (this.numPages <= 1)
        return;

      prev = this.cursor.previousSibling;
    };

    // Init or overflow
    if (prev == null)
      prev = this.viewport.lastChild;

    this.cursor = prev;
    if (prev != null)
      this.cursor.classList.add('move');

    this.cursor.showInViewport();
  }

  /**
   * Move cursor to right.
   */
  _moveRight () {

    // Todo: scroll if not in viewport
    let next = null;

    // Already initialized
    if (this.cursor != null) {

      // Nowhere to move
      if (this.numPages <= 1)
        return;

      next = this.cursor.nextSibling;
    };

    // Init or overflow
    if (next == null)
      next = this.viewport.firstChild;

    this.cursor = next;
    if (next != null)
      this.cursor.classList.add('move');

    this.cursor.showInViewport();
  }

  /**
   * Move cursor up.
   */
  _moveUp () {

    // Init cursor
    if (this.cursor == null) {
      this.cursor = this.viewport.lastChild;
      this.cursor.classList.add('move');
      return;
    };

    // Nowhere to move
    if (this.numPages <= 1)
      return;

    let currentLeft = this.cursor.offsetLeft;
    let currentTop = this.cursor.offsetTop;

    // Move prev
    let prev = this.cursor.previousSibling;

    // Move cursor to the last element of the previous line
    while (prev != null && prev.offsetTop == currentTop)
      prev = prev.previousSibling;

    if (prev == null) {
      prev = this.viewport.lastChild;

      // There is only a single line - do nothing!
      if (prev.offsetTop == currentTop)
        return;
    };

    // move cursor to the vertically aligned element
    // Here the handling differs from down
    while (prev != null && prev.offsetLeft > currentLeft)
      prev = prev.previousSibling;

    // There is one
    if (prev == null)
      return;

    this.cursor = prev;
    this.cursor.classList.add('move');
    this.cursor.showInViewport();
  }

  /**
   * Move cursor down.
   */
  _moveDown () {

    // Init cursor
    if (this.cursor == null) {
      this.cursor = this.viewport.firstChild;
      this.cursor.classList.add('move');
      return;
    };

    // Nowhere to move
    if (this.numPages <= 1)
      return;

    let currentLeft = this.cursor.offsetLeft;
    let currentTop = this.cursor.offsetTop;

    // Move next
    let next = this.cursor.nextSibling;

    // Move cursor to the first element of the next line
    while (next != null && next.offsetTop == currentTop)
      next = next.nextSibling;

    if (next == null) {
      next = this.viewport.firstChild;

      // There is only a single line - do nothing!
      if (next.offsetTop == currentTop)
        return;
    };

    // move cursor to the vertically aligned element
    while (next != null && next.offsetLeft < currentLeft) {
      var tmpnext = next.nextSibling;

      // No next in this line
      if (tmpnext != null)
        next = tmpnext;
      else {
        // There is no element below
        break;
      };
    };
    
    // There is one
    if (next == null)
      next = this.viewport.lastChild;

    this.cursor = next;
    this.cursor.classList.add('move');
    this.cursor.showInViewport();
  }

  
  /**
   * Removes all selected pages from the
   * PDF.
   *
   * @return {number} The number of deleted pages.
   */
  remove() {
    let i = 0;
    this.forEachSelected((page) => {
      page.remove();
      i++;
    });
    return i;
  }

  /**
   * Starts or ends the selector.
   */
  toggleSelector() {
    this.selElem?.classList.toggle("active");
    this.viewport.classList.remove("magnify");
    this.viewport.classList.toggle("select");
  }

  get selectorActive() {
    return this.viewport.classList.contains("select");
  }

  /**
   * Starts or ends the magnifier.
   */
  toggleMagnifier() {
    this.magElem?.classList.toggle("active");
    this.viewport.classList.remove("select");
    this.viewport.classList.toggle("magnify");
  }

  /**
   * Check if magnifier is active.
   */
  get magnifierActive() {
    return this.viewport.classList.contains("magnify");
  }

  /**
   * Rotates all selected pages from the
   * PDF 90 degrees to the left.
   *
   * @return {number} The number of rotated pages.
   */
  rotateLeft() {
    let i = 0;
    this.forEachSelected((page) => {
      page.rotateLeft();
      i++;
    });
    return i;
  }

  /**
   * Rotates all selected pages from the
   * PDF 90 degrees to the right.
   *
   * @return {number} The number of rotated pages.
   */
  rotateRight() {
    let i = 0;
    this.forEachSelected((page) => {
      page.rotateRight();
      i++;
    });
    return i;
  }

  /**
   * Select all pages.
   *
   * @return {number} The number of selected pages.
   */
  selectAll() {
    let i = 0;

    let nodeList = this.viewport.childNodes;
    nodeList.forEach((page) => {
      if (page.deleted)
        return;
      page.selectOn();
      i++;
    });

    return i;
  }
  
  /**
   * Add a single page to the selection.
   *
   * @param {page} The PDFPage object.
   */
  addSelect(page) {
    this.selected.add(page);
    this.selElem?.setAttribute('data-count',this.selected.size);
  }
  
  /**
   * Remove a single page from the selection.
   *
   * @param {page} The PDFPage object.
   */
  delSelect(page) {
    this.selected.delete(page);
    this.selElem?.setAttribute('data-count',this.selected.size);
  }

  /**
   * Remove all pages from the selection,
   * i.e. clear the selection.
   */
  delSelectAll() {
    let i = 0;
    this.forEachSelected(function (page) {
      page.selectOff();
      i++;
    });
    return i;
  }

  /**
   * Remove all pages from the selection,
   * except for one single page.
   *
   * @param {page} Single page to be excluded from clearance.
   */
  delSelectAllExceptFor(page) {
    this.forEachSelected(function (page1) {
      if (page1 !== page)
        page1.selectOff();
    });
  }

  /**
   * Single page selected for key navigation
   */
  set cursor (page) {
    if (this._cursor === page)
      return;
    if (this._cursor != null) {
      this._cursor.classList.remove("cursor","move");
      this._cursor.unmagnify();
    };
    this._cursor = page;
    if (page != null) {
      this._cursor.classList.add("cursor");
      this._cursor.focus();
    };
  }

  /**
   * Single page selected for key navigation
   */
  get cursor () {
    return this._cursor;
  };  
  
  /**
   * Set dropTarget for page moving.
   */
  set dropTarget (page) {
    if (this._dropTarget != null && this._dropTarget != page) {
      this._dropTarget.classList.remove('drag-left','drag-right');
    }
    this._dropTarget = page;
  }

  /**
   * Get dropTarget for page moving.
   */
  get dropTarget () {
    return this._dropTarget;
  }
  
  /**
   * Add splits before all pages in the selection.
   */
  splitBefore() {
    let i = 0;
    this.forEachSelected(function (page) {
      i = page.splitBefore() ? i+1 : i;
    });
    return i;
  }

  calcSplitCount () {
    if (this.splitBeforeElem) {
      const count = this.viewport.getElementsByClassName("split-before").length;
      this.splitBeforeElem.setAttribute("data-count",count);
    };
  }
  
  /**
   * Move all selected pages in front of a target page.
   *
   * @param {page} The target page.
   */
  moveBefore(page) {
    page.before(...this._selectedSort())
  }

  /**
   * Move all selected behind a target page.
   *
   * @param {page} The target page.
   */
  moveAfter(page) {
    page.after(...this._selectedSort())
  }

  /**
   * Helper function to iterate through all selected objects.
   *
   * @param {cb} Callback function.
   */
  forEachSelected(cb) {
    this.selected.forEach(cb);
  }

  /**
   * Load a PDF document.
   *
   * @param {url} URL or Int array representing the document.
   */
  loadDocument (url) {
    this.url = url;
    let instance = this;
    
    /* Clear possible data */
    this.delSelectAll();

    // Remove all pages from the viewport
    while (this.viewport.lastChild) {
      this.viewport.removeChild(this.viewport.lastChild);
    };

    this.viewport.scrollTop = 0;
    
    // Maybe there is a file already loaded
    if (this.pdfDoc != undefined) {
      this.pdfDoc.cleanup().then(() => {
        instance.pdfDoc.destroy();
        this.observeViewport?.disconnect();
      });
    };
    
    this.numPages = 0;
    /* End cleaning */

   
    // Asynchronous download of PDF
    let loadingTask = getDocument(this.url);
   
    return loadingTask.promise.then(function(pdf) {

      // Initialize the document length
      instance.numPages = pdf.numPages;

      instance.pdfDoc = pdf;
     
      let page;
      for (var i = 0; i < instance.numPages; i++) {
        page  = new PDFPage(i+1, instance);
        //// instance.pages[i] = page;
        instance.viewport.appendChild(page);
        instance.observeViewport?.observe(page);
      };

      return instance.numPages;
      
    }, function (reason) {     
      // PDF loading error
      console.error(reason);
      return 0;
    });
  }

  /**
   * Get a page at a certain index position. Includes deleted pages.
   * But respects order.
   *
   * @param {idx} The position of the page in the list.
   *
   * @return {PDFPage} The page at the certain page index in the list.
   */
  getPage(idx) {
    return this.viewport.childNodes[idx];
  }
  
  /**
   * Create a JSON array representing the modified document(s)
   * to generate.
   * This dispatches a custom event `processed` on the PDFReorganizer
   * object that has a `detail` objects containing a `directive`
   * object representing the JSON object.
   */
  process () {
    let nodeList = this.viewport.childNodes;
    let alldocs = new Array();
    let splitdocs = new Array();
    nodeList.forEach((page) => {

      // Skip deleted pages
      if (page.deleted)
        return;

      let val = page.num + "";

      // Normalize page rotation
      if (page.rotation != 0)
        val += '@' + page.rotation;

      if (page.splittedBefore && splitdocs.length > 0) {
        alldocs.push(splitdocs);
        splitdocs = new Array();
      };
      
      splitdocs.push(val);
    });
    alldocs.push(splitdocs);

    this.dispatchEvent(new CustomEvent("processed", {
      detail: {
        "src": [this.url],
        "docs": alldocs
      }
    }));
    
    return alldocs;
  }

  embedCSS() {
    let cssData = `
:host {
  --pdfro-main-color: #555;
  --pdfro-white: #ffffff;
  --pdfro-deleted-color: #777;
  --pdfro-hover-color: #aaa;
  --pdfro-selected-bg-color: #07d;
  --pdfro-selected-color: var(--pdfro-white);
  --pdfro-split-before-border-color: #696;
  --pdfro-split-before-bg-color: #6b6;
  --pdfro-split-before-counter-color: #fff;
  --pdfro-dragged-color: #7bf;
  --pdfro-loader: var(--pdfro-selected-bg-color);
  --pdfro-viewport-height: 244px;
  --pdfro-viewport-width: 232px;
  display: block;
  position: relative;
}

/* Ignored: */
pdf-reorganizer {
  display: block;
  position: inherit;
}

#pdf-viewport {
  counter-reset: splite 0;
  border: 1px solid var(--pdfro-main-color);
  padding: 10px; /* Make the dragger visible */
  padding-left: 42px; /* Make the nav visible */
  display: flex;
  flex-wrap: wrap;
  align-items: start;
  align-content: start;
/* from page: desired width + 2 * padding (8px) + 2 * border (5px) + 2x margin (3px) */
  min-width: 232px;
/* as above, + bottom padding (24px) */
  min-height: 256px;
  overflow-y: scroll;
  overflow-x: hidden;
  resize: both;
  height: var(--pdfro-viewport-height);
  width: var(--pdfro-viewport-width);
}

nav {
  position: absolute;
  z-index: 10;
/*  font-size: 80%; */
  display: block;
  border-radius: 5px;
  border: 1px solid var(--pdfro-main-color);
  background-color: var(--pdfro-white);
  box-shadow: rgba(50, 50, 50, 0.5) 2px 2px 2px 1px;
  margin:4pt;
  width: 28px;
}

nav > div {
  display: inline-block;
  cursor: pointer;
  padding: 2pt;
  padding-bottom: 0;
  margin: 2pt;
  fill: var(--pdfro-main-color);
  border-radius: 3px;
}

nav > div:hover, nav > div.active {
  background-color: var(--pdfro-selected-bg-color);
  color: var(--pdfro-white);
  fill: var(--pdfro-white);
}

nav > div::after {
 position: absolute;
  font-size: 8pt;
  background-color: var(--pdfro-selected-bg-color);
  color: var(--pdfro-white);
  border-radius: 8pt;
  padding: 0 3pt;
  margin-top: -6pt;
  content: attr(data-count);
  cursor: default;
  pointer-events: none;
}

nav > div[data-count="0"]::after,
nav > div[data-count="1"]::after {
  content: none;
  box-shadow: none;
}

nav > div > svg {
  width: 18px;
  height: 18px;
}

pdf-page {
  position: relative;
  border-radius: 6px;
  display: inline-block;
  background-color: transparent;
  border: 5px solid transparent;
  cursor: pointer;
  padding: 8px;
  padding-bottom: 24px;
  z-index: 1;
  color: var(--pdfro-main-color);
  /* Relevant for drag target */
  margin: 3px;
}

#pdf-viewport.magnify,
#pdf-viewport.magnify pdf-page {
  cursor: -moz-zoom-in; 
  cursor: -webkit-zoom-in; 
  cursor: zoom-in;
}


pdf-page div.container::after {
  position: absolute;
  text-align: center;
  width: 100%;
  bottom: 0;
  left: 0;
  font-size: 75%;
  content: "[" attr(data-num) "]";
}

/* Don't show page number on magnify */
pdf-page.magnify div.container::after {
  content: none;
}

pdf-page::after {
  position: absolute;
  top: 0;
  width: 10px;
  height: 200px;
  margin-top: -100px;
  border-radius: 5px;
  background-color: var(--pdfro-selected-bg-color);
  top: 50%;
}

pdf-page.drag-left,
pdf-page.drag-right {
  z-index:5;
}

pdf-page.drag-left::after {
  content: "";
  left: 0;
  margin-left: -13px;
}

pdf-page.drag-right::after {
  content: "";
  right: 0;
  margin-right: -13px;
}


@keyframes rotation {
  to {transform: rotate(360deg);}
}

pdf-page.load::before {
  content: '';
  box-sizing: border-box;
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 20px;
  margin-top: -10px;
  margin-left: -10px;
  border-radius: 50%;
  border-top: 2px solid var(--pdfro-loader);
  border-right: 2px solid transparent;
  animation: rotation .6s linear infinite;
}

canvas {
  opacity: 1;
  transition: rotate .2s ease-out, opacity 1000ms ease;

  z-index: -1;
  position: relative;
  border: 1px solid var(--pdfro-main-color);
}

pdf-page.load canvas {
  opacity: 0;
}

pdf-page.deleted {
  background-color: var(--pdfro-deleted-color);
  border-color: var(--pdfro-deleted-color);
}

pdf-page:not(.deleted):not(.selected):hover {
  background-color: var(--pdfro-hover-color);
}

pdf-page.cursor.move {
  outline-offset: 1px;
  outline: 3px dashed var(--pdfro-hover-color);
}

pdf-page.deleted canvas {
  opacity: .2;
}

pdf-page:first-of-type:not(.split-before) {
  counter-increment: splite;
}

pdf-page.split-before div.container::before {
  position: absolute;
  content: " " counter(splite);
  counter-increment: splite;
  top:0;
  left:0;
  color: var(--pdfro-split-before-counter-color);
  border: 1px solid var(--pdfro-split-before-border-color);
  background-color: var(--pdfro-split-before-bg-color);
  width: 16px;
  height: 16px;
  font-size: 9pt;
  border-radius: 10px;
  text-align: center;
  line-height: 11pt;
  text-shadow: var(--pdfro-split-before-border-color) 1px 1px 4px;
}

pdf-page.selected {
  background-color: var(--pdfro-selected-bg-color);
  color: var(--pdfro-selected-color);
}

pdf-page.dragged {
  background-color: var(--pdfro-dragged-color);
}

pdf-page.magnify {
  overflow: scroll;
}

pdf-page.magnify canvas {
  transform-origin: center;
  margin-left: 0 !important;
  margin-top: 0 !important;
  box-shadow: none;
  border-width: 0;
}
`;

    const zf = this.zoomfactor;
    cssData += `
canvas {
  box-shadow:
    rgba(50, 50, 93, 0.25) 0px ${6 * zf}px ${12 * zf}px -${2 * zf}px,
    rgba(0, 0, 0, 0.3) 0px ${3 * zf}px ${7 * zf}px -${3 * zf}px;

  /* box-shadow: rgba(50, 50, 50, 0.5) 9px ${2 * zf}px ${2 * zf}px ${1 * zf}px; */
  border-width: ${1 * zf}px;
}`;
    
    const css = new CSSStyleSheet();
    css.replace(cssData);
    this.shadowRoot.adoptedStyleSheets = [css];
  }

  /**
   * Embed material design icons.
   */
  svgSymbols() {
    const svgData = `
  <!-- published under the Apache License 2.0 https://www.apache.org/licenses/LICENSE-2.0.html -->
  <symbol viewBox="0 -960 960 960" id="play_arrow">
    <path d="M320-200v-560l440 280-440 280Zm80-280Zm0 134 210-134-210-134v268Z"></path>
  </symbol>
  <symbol viewBox="0 -960 960 960" id="rotate_90_degrees_ccw">
    <path d="M520-80q-51 0-100-14t-92-42l58-58q31 17 65 25.5t69 8.5q117 0 198.5-81.5T800-440q0-117-81.5-198.5T520-720h-6l62 62-56 58-160-160 160-160 56 58-62 62h6q150 0 255 105t105 255q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T520-80ZM280-200 40-440l240-240 240 240-240 240Zm0-114 126-126-126-126-126 126 126 126Zm0-126Z"></path>
  </symbol>
  <symbol viewBox="0 -960 960 960" id="rotate_90_degrees_cw">
    <path d="M440-80q-75 0-140.5-28.5t-114-77q-48.5-48.5-77-114T80-440q0-150 105-255t255-105h6l-62-62 56-58 160 160-160 160-56-58 62-62h-6q-117 0-198.5 81.5T160-440q0 117 81.5 198.5T440-160q35 0 69-8.5t65-25.5l58 58q-43 28-92 42T440-80Zm240-120L440-440l240-240 240 240-240 240Zm0-114 126-126-126-126-126 126 126 126Zm0-126Z"></path>
  </symbol>
  <symbol viewBox="0 -960 960 960" id="scan_delete">
    <path d="M240-800v200-200 640-9.5 9.5-640Zm0 720q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v174q-19-7-39-10.5t-41-3.5v-120H520v-200H240v640h254q8 23 20 43t28 37H240Zm396-20-56-56 84-84-84-84 56-56 84 84 84-84 56 56-83 84 83 84-56 56-84-83-84 83Z"></path>
  </symbol>
  <symbol viewBox="0 -960 960 960" id="select">
    <path d="M200-200v80q-33 0-56.5-23.5T120-200h80Zm-80-80v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80h80v80h-80Zm80-160h-80q0-33 23.5-56.5T200-840v80Zm80 640v-80h80v80h-80Zm0-640v-80h80v80h-80Zm160 640v-80h80v80h-80Zm0-640v-80h80v80h-80Zm160 640v-80h80v80h-80Zm0-640v-80h80v80h-80Zm160 560h80q0 33-23.5 56.5T760-120v-80Zm0-80v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80q33 0 56.5 23.5T840-760h-80Z"></path>
  </symbol>
  <symbol viewBox="0 -960 960 960" id="select_all">
    <path d="M280-280v-400h400v400H280Zm80-80h240v-240H360v240ZM200-200v80q-33 0-56.5-23.5T120-200h80Zm-80-80v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80h80v80h-80Zm80-160h-80q0-33 23.5-56.5T200-840v80Zm80 640v-80h80v80h-80Zm0-640v-80h80v80h-80Zm160 640v-80h80v80h-80Zm0-640v-80h80v80h-80Zm160 640v-80h80v80h-80Zm0-640v-80h80v80h-80Zm160 640v-80h80q0 33-23.5 56.5T760-120Zm0-160v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80q33 0 56.5 23.5T840-760h-80Z"></path>
  </symbol>
  <symbol viewBox="0 -960 960 960" id="splitscreen_vertical_add">
    <path d="M760-760H599h5-4 160Zm-240 0q0-33 23.5-56.5T600-840h160q33 0 56.5 23.5T840-760v400h-80v-400H600v640q-33 0-56.5-23.5T520-200v-560ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h160q33 0 56.5 23.5T440-760v560q0 33-23.5 56.5T360-120H200Zm160-640H200v560h160v-560Zm0 0H200h160ZM760-40v-80h-80v-80h80v-80h80v80h80v80h-80v80h-80Z"></path>
  </symbol>
  <symbol viewBox="0 -960 960 960" id="zoom_in">
    <path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Zm-40-60v-80h-80v-80h80v-80h80v80h80v80h-80v80h-80Z"></path>
  </symbol>`;
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('width',0);
    svg.setAttribute('height',0);
    svg.innerHTML = svgData;
    return svg;
  }
};


function _addNavItem(type,symbol,desc) {
  const elem = document.createElement("div");
  elem.setAttribute("class",type);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", symbol);
  svg.appendChild(use);
  elem.appendChild(svg);
  elem.title = desc;
  return elem
};


customElements.define('pdf-reorganizer', PDFReorganizer);
