import * as pdfjsLib from 'pdfjs-dist';
import * as PdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs";

import PDFPage from './pdf-page.js';

// The workerSrc property shall be specified.
pdfjsLib.GlobalWorkerOptions.workerSrc = "pdfjs-dist/build/pdf.worker.mjs";


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
    this.numpages = undefined;
    this.pdfDoc = undefined;

    this.selected = new Set();
    this.pages = new Array(); // Todo: Probably unimportant
    
    this.shadow = this.attachShadow({ mode: "open" });
   
    let nav = document.createElement('nav');
    
    this.delElem = document.createElement("div");
    this.delElem.setAttribute("class","delete");
    this.delElem.innerText = 'remove';
    nav.appendChild(this.delElem);

    // These elements should only exist once and be appended to the page in focus!
    this.rotateLeftElem = document.createElement("div");
    this.rotateLeftElem.setAttribute("class","rotate-left");
    this.rotateLeftElem.innerText = 'left';
    nav.appendChild(this.rotateLeftElem);

    // These elements should only exist once and be appended to the page in focus!
    this.splitBeforeElem = document.createElement("div");
    this.splitBeforeElem.setAttribute("class","split-before");
    this.splitBeforeElem.innerText = 'split before';
    nav.appendChild(this.splitBeforeElem);

    this.processElem = document.createElement("div");
    this.processElem.setAttribute("class","process");
    this.processElem.innerText = 'process';
    nav.appendChild(this.processElem);
    
    this.viewport = document.createElement('div');
    this.viewport.setAttribute('id', 'pdf-viewport');

    // Magnifier
    
    this.shadow.appendChild(nav);
    this.shadow.appendChild(this.viewport);    
  }

  connectedCallback () {
    let instance = this;
    this.embedCSS();
    this.loadDocument(this.url);

    if (this.onprocess != null) {
      this.addEventListener("processed", eval(this.onprocess))
    };

    this.delElem.addEventListener('click', this.remove.bind(this));
    this.rotateLeftElem.addEventListener('click', this.rotateLeft.bind(this));
    this.splitBeforeElem.addEventListener('click', this.splitBefore.bind(this));

    this.processElem.addEventListener('click', (function() {
      this.process();
    }).bind(this));

    // Lazy loading
    this.observeViewport = new IntersectionObserver((entries,observer) => {
      entries.forEach(entry => {

        if (!entry.isIntersecting)
          return;
        
        var page = entry.target;

        // Render the page, when it intersects with the viewport
        instance.pdfDoc.getPage(page.num).then((pdfPage) => {
          instance.pages[pdfPage._pageIndex].render(pdfPage);
        });

        // Forget the page
        observer.unobserve(page);
      })
    }, {
      root: this.viewport,
      rootMargin: '10px 10px 10px 10px'
    });

    document.addEventListener("keydown", (function(ev) {
      var letter = String.fromCharCode(ev.which); 
      if (event.keyCode == 46){
        this.remove();
      };
    }).bind(this));
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
   * Removes all selected pages from the
   * PDF.
   *
   * @return {number} The number of deleted pages.
   */
  remove() {
    var i = 0;
    return this.forEachSelected((page) => {
      page.remove();
      i++;
    });
  }

  /**
   * Rotates all selected pages from the
   * PDF 90 degrees to the left.
   *
   * @return {number} The number of rotated pages.
   */
  rotateLeft() {
    var i = 0;
    return this.forEachSelected((page) => {
      page.rotateLeft();
      i++;
    });
  }

  /**
   * Add a single page to the selection.
   *
   * @param page The PDFPage object.
   */
  addSelect(page) {
    this.selected.add(page);
  }
  
  /**
   * Remove a single page from the selection.
   *
   * @param page The PDFPage object.
   */
  delSelect(page) {
    this.selected.delete(page);
  }

  /**
   * Remove all pages from the selection,
   * i.e. clear the selection.
   */
  delSelectAll() {
    this.forEachSelected(function (page) {
      page.selectOff();
    });
  }

  /**
   * Remove all pages from the selection,
   * except for one single page.
   *
   * @param page Single page to be excluded from clearance.
   */
  delSelectAllExceptFor(page) {
    this.forEachSelected(function (page1) {
      if (page1 !== page)
        page1.selectOff();
    });
  }

  /**
   * Add splits before all pages in the selection.
   */
  splitBefore() {
    this.forEachSelected(function (page) {
      page.splitBefore();
    });
  }

  /**
   * Move all selected pages in front of a target page.
   *
   * @param page The target page.
   */
  moveBefore(page) {
    page.before(...this._selectedSort())
  }

  /**
   * Move all selected behind a target page.
   *
   * @param page The target page.
   */
  moveAfter(page) {
    page.after(...this._selectedSort())
  }

  /**
   * Helper function to iterate through all selected objects.
   *
   * @param cb Callback function.
   */
  forEachSelected(cb) {
    this.selected.forEach(cb);
  }

  /**
   * Load CSS file and add it to the shadow dom.
   *
   * @param url URL of the CSS file.
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
   * @param url URL or Int array representing the document.
   */
  loadDocument (url) {
    let instance = this;

    // Asynchronous download of PDF
    var loadingTask = pdfjsLib.getDocument(this.url);

    loadingTask.promise.then(function(pdf) {

      // Initialize the document length
      instance.numPages = pdf.numPages;

      instance.pdfDoc = pdf;

      for (var i = 0; i < instance.numPages; i++) {
        var page  = new PDFPage(i+1, instance);
        instance.pages[i] = page;
        instance.viewport.appendChild(page);
        instance.observeViewport.observe(page);
      };
    }, function (reason) {

      // PDF loading error
      console.error(reason);
    });
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

      if (page.splittedBefore) {
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
    const cssData = `
:host {
  --dark-border-color: #555;
  --white: #ffffff;
  --deleted-color: #777;
  --hover-color: #aaa;  /* #49d; */
  --selected-bg-color: #07d;
  --selected-color: var(--white);
  --split-before-border-color: #696;
  --split-before-color: #6b6;
  --dragged-color: #7cd;
  --loader: var(--selected-bg-color);
  --viewport-width: 100%;
  --viewport-height: 200px;
}

pdf-reorganizer {
  display: block;
}

#pdf-viewport {
  display: flex;
  flex-wrap: wrap;
  align-items: start;
  align-content: start;
  border: 1px solid var(--dark-border-color);
  overflow-y: scroll;
  overflow-x: hidden;
  resize: both;
  width: var(--viewport-width);
  height: var(--viewport-height);
  min-width: 300px;
  min-height: 200px;
}

nav {
  display: block;
  width: 100%;
}

nav > div {
  display: inline-block;
  cursor: pointer;
}

nav > div:hover {
  background-color: var(--selected-bg-color);
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
  padding-bottom: 18pt;
  z-index: 1;
  color: var(--dark-border-color);
  /* Relevant for drag target */
  margin: 3px;
}

pdf-page canvas {
  position: relative;
}

pdf-page div.container::after {
  position: absolute;
  /*pointer-events: all;
  z-index: 5;*/
  text-align: center;
  width: 100%;
  bottom: 0;
  left: 0;
  font-size: 75%;
  content: "[" attr(data-num) "]";
}

pdf-page::after {
  position: absolute;
  top: 0;
  width: 10px;
  height:200px;
  margin-top:-100px;
  border-radius: 5px;
  background-color: var(--selected-bg-color);
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
  border-top: 2px solid var(--loader);
  border-right: 2px solid transparent;
  animation: rotation .6s linear infinite;
}

canvas {
  opacity: 1;
  box-shadow: rgba(50, 50, 93, 0.25) 0px 6px 12px -2px, rgba(0, 0, 0, 0.3) 0px 3px 7px -3px;
  border: 1px solid var(--dark-border-color);
  transition: transform .5s ease-out, opacity 1000ms ease;
  z-index: -1;
}

pdf-page.load canvas {
  opacity: 0;
}

pdf-page.deleted {
  background-color: var(--deleted-color);
  border-color: var(--deleted-color);
}

pdf-page:not(.deleted):not(.selected):hover {
  background-color: var(--hover-color);
}

pdf-page.deleted canvas {
  opacity: .2;
}

pdf-page.split-before div.container::before {
  position: absolute;
  content: '';
  top:0;
  left:0;
  border: 1px solid var(--split-before-border-color);
  transform: rotate(45deg);
  background-color: var(--split-before-color);
  width: 16px;
  height: 16px;
  border-radius: 10px;
}

pdf-page.selected {
  background-color: var(--selected-bg-color);
  color: var(--selected-color);
}

pdf-page.dragged {
  background-color: var(--dragged-color);
}
`;
    const css = new CSSStyleSheet();
    css.replace(cssData);
    this.shadow.adoptedStyleSheets = [css];
  }
};

customElements.define('pdf-reorganizer', PDFReorganizer);
