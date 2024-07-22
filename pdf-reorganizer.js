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

    this.cursor = null;
    this.zoomfactor = 4;
    this.scrollStep = 14;
    this.selected = new Set();
    
    this.shadow = this.attachShadow({ mode: "open" });
   
    let nav = document.createElement('nav');

    // These elements should only exist once and be appended to the page in focus!
    this.splitBeforeElem = document.createElement("div");
    this.splitBeforeElem.setAttribute("class","split-before");
    this.splitBeforeElem.innerText = 'split before';
    nav.appendChild(this.splitBeforeElem);

    this.rotateLeftElem = document.createElement("div");
    this.rotateLeftElem.setAttribute("class","rotate-left");
    this.rotateLeftElem.innerText = 'left';
    nav.appendChild(this.rotateLeftElem);

    this.rotateRightElem = document.createElement("div");
    this.rotateRightElem.setAttribute("class","rotate-right");
    this.rotateRightElem.innerText = 'right';
    nav.appendChild(this.rotateRightElem);

    this.selElem = document.createElement("div");
    this.selElem.setAttribute("class","selectall");
    this.selElem.innerText = 'select all';
    nav.appendChild(this.selElem);

    this.delElem = document.createElement("div");
    this.delElem.setAttribute("class","delete");
    this.delElem.innerText = 'remove';
    nav.appendChild(this.delElem);
    
    this.processElem = document.createElement("div");
    this.processElem.setAttribute("class","process");
    this.processElem.innerText = 'process';
    nav.appendChild(this.processElem);

    this.viewport = document.createElement('div');
    this.viewport.setAttribute('id', 'pdf-viewport');
    
    this.shadow.appendChild(nav);
    this.shadow.appendChild(this.viewport);
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
    this.selElem.addEventListener('click', this.selectAll.bind(this));

    this.processElem.addEventListener('click', (function() {
      this.process();
    }).bind(this));

    document.addEventListener("keydown", this._keyHandler.bind(this));

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
    return ['url','css','onprocess'];
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
  _keyHandler (ev) {
    var letter = String.fromCharCode(ev.which);

    // delete
    switch (ev.key) {
    case "Delete":
      ev.preventDefault();
      if (ev.ctrlKey || this.cursor == null)
        this.remove();
      else
        this.cursor.remove();
      break;
      
    // Move left
    case "ArrowLeft":
      ev.preventDefault();

      if (this.cursor?.magnified) {
        this.cursor.scrollLeft -= this.scrollStep;
        break;
      };      

      if (ev.ctrlKey) {
        if (ev.shiftKey)
          this.rotateLeft();
        else if (this.cursor != null)
          this.cursor.rotateLeft();
        break;
      };

      this._moveLeft();
      break;

    // Move up
    case "ArrowUp":

      ev.preventDefault();

      if (this.cursor?.magnified) {
        this.cursor.scrollTop -= this.scrollStep;
        break;
      };
      
      this._moveUp();
      break;

    // Move right
    case "ArrowRight":
      ev.preventDefault();

      if (this.cursor?.magnified) {
        this.cursor.scrollLeft += this.scrollStep;
        break;
      };

      if (ev.ctrlKey) {
        if (ev.shiftKey)
          this.rotateRight();
        else if (this.cursor != null)
          this.cursor.rotateRight();
        break;
      };

      this._moveRight();
      break;

    // Move down
    case "ArrowDown":
      ev.preventDefault();

      if (this.cursor?.magnified) {
        this.cursor.scrollTop += this.scrollStep;
        break;
      };
      
      this._moveDown();
      break;

    // Split before
    case "y":
      if (ev.ctrlKey && this.cursor != null) {
        ev.preventDefault();
        this.cursor.splitBefore();
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
        ev.preventDefault();
        this.cursor.unmagnify();
      };

      break;

    // Space
    // case "Enter":
    case " ":
      if (this.cursor != null) {
        ev.preventDefault();
        this.cursor.swapSelected();
      };
      break;

    default:
      console.log(ev);
    };
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
  }
  
  /**
   * Remove a single page from the selection.
   *
   * @param {page} The PDFPage object.
   */
  delSelect(page) {
    this.selected.delete(page);
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
  };

  /**
   * Single page selected for key navigation
   */
  get cursor () {
    return this._cursor;
  };

  
  
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
   * Load CSS file and add it to the shadow dom.
   *
   * @param {url} URL of the CSS file.
   */
  loadCSS(url) {
    const shadow = this.shadow;
    const css = new CSSStyleSheet();

    fetch(url).then(
      response => response.text()
    ).then(
      data => {
        css.replace(data)
        shadow.adoptedStyleSheets = [css];
      }
    );
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
        directive: alldocs
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
}

pdf-reorganizer {
  display: block;
}

#pdf-viewport {
  counter-reset: splite 0;
  border: 1px solid var(--pdfro-main-color);
  padding: 10px; /* Make the dragger visible */
  padding-top: 20px; /* Make the nav visible */
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
  position: fixed;
  z-index: 5;
  display: block;
  width: 100%;
}

nav > div {
  display: inline-block;
  cursor: pointer;
}

nav > div:hover {
  background-color: var(--pdfro-selected-bg-color);
}

nav > div + div::before {
  content: "|";
  padding: 0 4pt;
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

pdf-page div.container::after {
  position: absolute;
  /*
  pointer-events: all;
  z-index: 5;
  */
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
  margin-top:-100px;
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
  transition: transform .2s ease-out, opacity 1000ms ease;
  // transition: opacity 1000ms ease;

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
  transition: none;
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
  border-width: ${1 * zf}px;
}`;
    
    const css = new CSSStyleSheet();
    css.replace(cssData);
    this.shadow.adoptedStyleSheets = [css];
  }
};

customElements.define('pdf-reorganizer', PDFReorganizer);
