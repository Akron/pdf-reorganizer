import {getDocument, GlobalWorkerOptions} from 'pdfjs-dist';
import * as PdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs";

import PDFReorganizerPage from './pdf-reorganizer-page.js';
import PDFReorganizerComment from './pdf-reorganizer-comment.js';

// The workerSrc property shall be specified.
GlobalWorkerOptions.workerSrc = "pdfjs-dist/build/pdf.worker.mjs";


/**
 * PDFReorganizer extends an HTMLElement
 * that allows to rearrange, split, and
 * modify PDFs.
 *
 * @class
 * @classdesc PDFReorganizer is a web component to reorganize PDF documents.
 * @exports
 */

export default class PDFReorganizer extends HTMLElement {

  static observedAttributes = [
    "url",
    "split-before-button",
    "rotate-left-button",
    "rotate-right-button",
    "select-button",
    "select-all-button",
    "comment-button",
    "remove-button",
    "magnify-button",
    "process-button",
    "zoomfactor",
    "scrollstep",
  ];
  
  /**
   * @constructor
   *
   * @return {PDFReorganizer} The instance.
   */
  constructor() {
    super();
  }

  /**
   * Initialize the element.
   * This will setup the navigation structure
   * when embedded by connectedCallback(), but can also
   * be called independently of the DOM.
   *
   * @return {PDFReorganizer} The instance.
   */
  init () {
    this.url;
    this.numPages = 0;
    this.pdfDoc = undefined;

    this._cursor = null;
    this._dropTarget = null;

    /**
     * The active mode.
     */
    this.mode = "";
    
    if (!this.zoomfactor)
      this.zoomfactor = 6;

    if (!this.scrollstep)
      this.scrollstep = 14;

    this.selected = new Set();
    
    this.attachShadow({ mode: "open" });
   
    const nav = document.createElement('nav');
    this.navElem = nav;
   
    this.button = {
      "split-before": this._addNavItem(
        "split-before", "#splitscreen_vertical_add", "Split before selected pages (Ctrl+Shift+S)"
      ),
      "rotate-left": this._addNavItem(
        "rotate-left", "#rotate_90_degrees_ccw", "Rotate 90deg ccw (Ctrl+left arrow"
      ),
      "rotate-right": this._addNavItem(
        "rotate-right", "#rotate_90_degrees_cw", "Rotate 90deg cw (Ctrl+right arrow)"
      ),
      "select": this._addNavItem(
        "select", "#select", "Start selection mode"
      ),
      "select-all": this._addNavItem(
        "select-all", "#select_all", "Select all pages (Ctrl+a)"
      ),
      "comment": this._addNavItem(
        "comment", "#add_comment", "Introduce a comment to the page (Ctrl+c)"
      ),
      "remove": this._addNavItem(
        "remove", "#scan_delete", "Remove selected pages (Delete+Shift)"
      ),
      "magnify": this._addNavItem(
        "magnify", "#zoom_in", "Start magnifying mode"
      ),
      "process": this._addNavItem(
        "process", "#play_arrow", "Start processing"
      )
    };

    this.commentDialog = new PDFReorganizerComment(nav);
    
    this.viewport = document.createElement('div');
    this.viewport.setAttribute('id', 'pdf-viewport');

    const shadow = this.shadowRoot;
    shadow.appendChild(this._svgSymbols());
    shadow.appendChild(nav);
    shadow.appendChild(this.viewport);
    return this;
  }

  /**
   * Init the web component when embedded in the DOM.
   */
  connectedCallback () {
    this.init();
    let instance = this;
    
    this._embedCSS();

    if (this.url != undefined)
      this.loadDocument(this.url);

    this.button["remove"].addEventListener('click', this.remove.bind(this));
    this.button["rotate-left"].addEventListener('click', this.rotateLeft.bind(this));
    this.button["rotate-right"].addEventListener('click', this.rotateRight.bind(this));
    this.button["split-before"].addEventListener('click', this.splitBefore.bind(this));
    this.button["comment"].addEventListener('click', this.comment.bind(this));
    this.button["magnify"].addEventListener('click', (function() {this.toggleMode("magnify")}).bind(this));
    this.button["select-all"].addEventListener('click', this.selectAll.bind(this));
    this.button["select"].addEventListener('click', (function() {this.toggleMode("select")}).bind(this));
    this.button["process"].addEventListener('click', this.process.bind(this));

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

    this.addEventListener("keydown", this._keyHandler.bind(this));
    this.setAttribute('tabindex',0);
    this.focus();
  };

  /**
   * Clear the web component when removed from the DOM.
   */
  disconnectedCallback() {
    this.observeViewport.disconnect();
  };
  
  /**
   * React to attribute changes.
   */
  attributeChangedCallback(property, oldValue, newValue) {
    if (oldValue === newValue)
      return;

    // Overload attributes, e.g. from the element attribute list
    this[property] = newValue;
  }
  
  /**
   * Return selected elements in order of appearance
   * in the viewport.
   *
   * @private
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
   *
   * @private
   */
  _keyHandler (ev) {
    var letter = String.fromCharCode(ev.which);

    // Remove
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
            this.cursor.scrollLeft -= this.scrollstep;
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
            this.cursor.scrollTop -= this.scrollstep;
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
          c.scrollLeft += this.scrollstep;
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
          c.scrollTop += this.scrollstep;
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

    // Deselect all
    case "d":
      if (ev.ctrlKey) {
        ev.preventDefault();
        this.selectAll(0);
        break;
      };

    // Add comment
    case "c":
      if (ev.ctrlKey && this.cursor != null) {
        ev.preventDefault();
        this.comment();
        break;
      };

      
      // Inverse select all
    case "I":
      if (ev.ctrlKey) {
        ev.preventDefault();
        this.selectAll(-1);
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
        this.cursor.selectToggle();
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
   *
   * @private
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
   *
   * @private
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
   *
   * @private
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
   *
   * @private
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
   * Starts or ends a supported mode.
   */
  toggleMode(m) {

    // Was active before
    if (!this.button[m]?.classList.toggle("active"))
      this.mode = undefined;
    else {
      if (this.mode)
        this.button[this.mode]?.classList.remove("active");
      this.mode = m;
    }
     
    // TODO: Remove select
    const cl = this.viewport.classList;
    let exists = cl.contains(m);
    cl.remove("magnify","remove","select","split-before","rotate-left","rotate-right");
    if (!exists)
      cl.add(m);
  }

  /**
   * Start comment prompt at cursor position.
   */
  comment() {
    if (!this.cursor)
      return;

    this.commentDialog.prompt((function (text) {
      this.comment = text;
    }).bind(this.cursor), this.cursor.comment);
  }
  
  /**
   * Removes all selected pages from the
   * PDF or activates the remove mode, if none selected.
   *
   * @return {number} The number of removed pages.
   */
  remove() {
    if (this.selected.size == 0) {
      this.toggleMode("remove");
      return 0;
    };

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
    if (this.selected.size == 0) {
      this.toggleMode("rotate-left");
      return 0;
    };

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
    if (this.selected.size == 0) {
      this.toggleMode("rotate-right");
      return 0;
    };

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
   * @param {(number|Event)} [opt=1] Optional value.
   *        If numerical type:
   *        opt == 0 will deselect, opt < 0 will inverse,
   *        otherwise will select all.
   *        If event type:
   *        In case the ctrlKey is clicked, will deselect.
   *
   * @return {number} The number of selected pages (excludes removed pages).
   */
  selectAll(opt = 1) {
    let i = 0;

    if (opt instanceof Event) {
      if (opt.ctrlKey && opt.shiftKey)
        opt = -1;
      else if (opt.ctrlKey)
        opt = 0;
      else
        opt = 1;
    };
    
    let nodeList = this.viewport.childNodes;
    nodeList.forEach((page) => {
      if (page.removed)
        return;
      if (!opt)
        page.selectOff();
      else if (opt < 0) 
        page.selectToggle();
      else 
        page.selectOn();
      i++;
    });

    return i;
  };
  

  /**
   * Add a single page to the selection.
   *
   * @param {page} The PDFReorganizerPage object.
   */
  addSelect(page) {
    this.selected.add(page);
    this.button["select"]?.setAttribute('data-count',this.selected.size);
  }
  
  /**
   * Remove a single page from the selection.
   *
   * @param {page} The PDFReorganizerPage object.
   */
  delSelect(page) {
    this.selected.delete(page);
    this.button["select"]?.setAttribute('data-count',this.selected.size);
  }

  /**
   * Remove all pages from the selection,
   * except for one single page.
   *
   * @param {PDFReorganizerPage} page - Single page to be excluded from clearance.
   */
  delSelectAllExceptFor(page) {
    this.forEachSelected(function (page1) {
      if (page1 !== page)
        page1.selectOff();
    });
  }

  /**
   * Single page selected for key navigation.
   * 
   * @param {PDFReorganizerPage} page - Page to be excluded from selection.
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
   * Single page selected for key navigation.
   *
   * @return {PDFReorganizerPage} The cursor page.
   */
  get cursor () {
    return this._cursor;
  }
  

  /**
   * Set dropTarget for page moving.
   *
   * @param {PDFReorganizerPage} page - The target for drop actions.
   */
  set dropTarget (page) {
    if (this._dropTarget != null && this._dropTarget != page) {
      this._dropTarget.classList.remove('drag-left','drag-right');
    }
    this._dropTarget = page;
  }


  /**
   * Get dropTarget for page moving.
   *
   * @return {PDFReorganizerPage} The target for drop actions.
   */
  get dropTarget () {
    return this._dropTarget;
  }
  

  /**
   * Add splits before all pages in the selection.
   *
   * @return {number} The number of introduced page splits.
   */
  splitBefore() {
    if (this.selected.size == 0) {
      this.toggleMode("split-before");
      return 0;
    };
    
    let i = 0;
    this.forEachSelected(function (page) {
      i = page.splitBefore() ? i+1 : i;
    });
    return i;
  }

  /**
   * Calculate the number of splits in the document.
   *
   * @return {number} The number of splits in the document.
   *
   * @private
   */
  _calcSplitCount () {
    if (this.button["split-before"]) {
      const count = this.viewport.getElementsByClassName("split-before").length;
      this.button["split-before"].setAttribute("data-count",count);
    };
  }
  
  /**
   * Move all selected pages in front of a target page (aka dropping).
   *
   * @param {PDFReorganizerPage} page - The target page.
   */
  moveBefore(page) {
    page.before(...this._selectedSort())
  }

  /**
   * Move all selected behind a target page (aka dropping).
   *
   * @param {PDFReorganizerPage} page - The target page.
   */
  moveAfter(page) {
    page.after(...this._selectedSort())
  }

  /**
   * Helper function to iterate through all selected objects.
   *
   * @param {function} cb - Callback function.
   */
  forEachSelected(cb) {
    this.selected.forEach(cb);
  }

  /**
   * Load a PDF document.
   *
   * @param {string} url - URL or Int array representing the document.
   */
  loadDocument (url) {
    this.url = url;
    let instance = this;
    
    /* Clear possible data */
    this.selectAll(0);

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
      for (let i = 0; i < instance.numPages; i++) {
        page  = new PDFReorganizerPage(i+1, instance);
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
   * Get a page at a certain index position. Includes removed pages,
   * but respects order.
   *
   * @param {number} idx - The position of the page in the list.
   *
   * @return {PDFReorganizerPage} The page at the certain page index in the list.
   */
  getPage(idx) {
    return this.viewport.childNodes[idx];
  }
  
  /**
   * Create a JSON array representing the modified document(s)
   * to generate.
   * This dispatches a custom event `processed` on the PDFReorganizer
   * object that has a `detail` object containing a `docs`
   * array representing all rearranged documents and a `src`
   * array containing all associated filenames.
   *
   * @return {Object} The detail object.
   */
  process () {
    let nodeList = this.viewport.childNodes;
    let alldocs = new Array();
    let splitdocs = new Array();
    nodeList.forEach((page) => {

      // Skip removed pages
      if (page.removed)
        return;

      let val = page.num + "";

      // Normalize page rotation
      if (page.rotation != 0)
        val += '@' + page.rotation;

      if (page.comment)
        val += '#' + page.comment;
      
      if (page.splittedBefore && splitdocs.length > 0) {
        alldocs.push(splitdocs);
        splitdocs = new Array();
      };
      
      splitdocs.push(val);
    });
    alldocs.push(splitdocs);

    const detail = {
      "src": [this.url],
      "docs": alldocs
    };
    
    this.dispatchEvent(new CustomEvent("processed", {
      "detail": detail
    }));
    
    return detail;
  }

  /**
   * Embed CSS in shadow DOM.
   *
   * @private
   */
  _embedCSS() {
    let cssData = `
:host {
  --pdfro-main-color: #555;
  --pdfro-selected-bg-color: #07d;
  --pdfro-selected-color: #fff;
  --pdfro-split-marker-border-color: #696;
  --pdfro-split-marker-bg-color: #6b6;
  --pdfro-split-marker-counter-color: #fff;
  --pdfro-loader-color: var(--pdfro-selected-bg-color);
  --pdfro-removed-bg-color: #777;
  --pdfro-hover-bg-color: #aaa;
  --pdfro-dragged-color: #7bf;
  --pdfro-nav-color: var(--pdfro-main-color); 
  --pdfro-nav-bg-color: var(--pdfro-selected-color);
  --pdfro-comment-color: var(--pdfro-main-color); 
  --pdfro-comment-border-color: var(--pdfro-main-color);
  --pdfro-comment-bg-color: #ff0;
  --pdfro-viewport-height: 244px;
  --pdfro-viewport-width: 232px;
  display: block;
  position: relative;
  outline: none;
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
/* as above, + bottom padding (32px) */
  min-height: 264px;
  overflow-y: scroll;
  overflow-x: hidden;
  resize: both;
  height: var(--pdfro-viewport-height);
  width: var(--pdfro-viewport-width);
}

nav {
  position: absolute;
  z-index: 10;
  display: block;
  margin:4pt;
  width: 28px;
}

nav, dialog {
  border-radius: 5px;
  border: 1px solid var(--pdfro-nav-color);
  background-color: var(--pdfro-nav-bg-color);
  box-shadow: rgba(50, 50, 50, 0.5) 2px 2px 2px 1px;
}

nav > div {
  padding: 2pt;
  padding-bottom: 0;
  margin: 2pt;
}

nav > div, dialog button {
  display: inline-block;
  cursor: pointer;
  background-color: transparent;
  border-width: 0;
  color: var(--pdfro-nav-color);
  fill: var(--pdfro-nav-color);
  border-radius: 3px;
}

nav > div:hover,
nav > div.active,
dialog button:hover {
  background-color: var(--pdfro-selected-bg-color);
  color: var(--pdfro-selected-color);
  fill: var(--pdfro-selected-color);
}

nav > div::after {
  position: absolute;
  font-size: 8pt;
  background-color: var(--pdfro-selected-bg-color);
  color: var(--pdfro-selected-color);
  border-radius: 8pt;
  padding: 0 3pt;
  margin-top: -6pt;
  content: attr(data-count);
  cursor: default;
  pointer-events: none;
}

nav > div:where([data-count="0"],[data-count="1"])::after {
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
  padding-bottom: 32px;
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


pdf-page div.container {
  height: 100%;
}

pdf-page div.container::after {
  position: absolute;
  box-sizing: border-box;
  text-align: center;
  width: 100%;
  bottom: 0;
  left: 0;
  right: 0;
  font-size: 75%;
  content: "[" attr(data-num) "]";
  padding: 1px 1px 2px 1px;
  border-radius: 6px;
  border: 2px solid transparent;
/*
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
*/
}

pdf-page div.container[data-comment]:not([data-comment=""])::after {
  background-color: var(--pdfro-comment-bg-color);
  color: var(--pdfro-comment-color);
  content: "[" attr(data-num) "] " attr(data-comment);
  border-color: var(--pdfro-comment-border-color);
}

/* Don't show page number on magnify */
pdf-page.magnify div.container::after {
  content: none !important;
}

pdf-page::after {
  position: absolute;
  top: 0;
  width: 10px;
  height: 200px;
  margin-top: -100px;
  border-radius: 5px;
  background-color: var(--pdfro-dragged-color);
  border: 1px solid var(--pdfro-selected-color);
  top: 50%;
}

pdf-page.drag-left,
pdf-page.drag-right {
  z-index:5;
}

pdf-page.drag-left::after {
  content: "";
  left: 0;
  margin-left: -14px;
}

pdf-page.drag-right::after {
  content: "";
  right: 0;
  margin-right: -14px;
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
  border-top: 2px solid var(--pdfro-loader-color);
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

pdf-page.removed {
  background-color: var(--pdfro-removed-bg-color);
  border-color: var(--pdfro-removed-bg-color);
}

pdf-page:not(.removed):not(.selected):hover {
  background-color: var(--pdfro-hover-bg-color);
}

pdf-page.cursor.move {
  outline-offset: 1px;
  outline: 3px dashed var(--pdfro-hover-bg-color);
}

pdf-page.removed canvas {
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
  color: var(--pdfro-split-marker-counter-color);
  border: 1px solid var(--pdfro-split-marker-border-color);
  background-color: var(--pdfro-split-marker-bg-color);
  width: 16px;
  height: 16px;
  font-size: 9pt;
  border-radius: 10px;
  text-align: center;
  line-height: 11pt;
  text-shadow: var(--pdfro-split-marker-border-color) 1px 1px 4px;
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

nav > dialog {
  padding: 18pt 10pt 6pt 10pt;
}

dialog button.cancel {
  position: absolute;
  left: 2px;
  top: 2px;
  font-size: 9pt;
  margin: 3px;
}

dialog button.submit {
  position: relative;
  width: 100%;
  text-align: center;
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
   * Add item to navigation.
   *
   * @private
   */
  _addNavItem (type, symbol, desc) {

    if (this[type + '-button'])
      return document.getElementById(this[type + '-button']);
    
    const elem = document.createElement("div");
    elem.setAttribute("class",type);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", symbol);
    svg.appendChild(use);
    elem.appendChild(svg);
    elem.title = desc;
    this.navElem.appendChild(elem);

    return elem;
  };

  
  /**
   * Embed material design icons.
   *
   * @private
   */
  _svgSymbols() {
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
  <symbol viewBox="0 -960 960 960" id="add_comment">
    <path d="M440-400h80v-120h120v-80H520v-120h-80v120H320v80h120v120ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm126-240h594v-480H160v525l46-45Zm-46 0v-480 480Z"/>
  </symbol>`;
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('width',0);
    svg.setAttribute('height',0);
    svg.innerHTML = svgData;
    return svg;
  }
};


customElements.define('pdf-reorganizer', PDFReorganizer);
