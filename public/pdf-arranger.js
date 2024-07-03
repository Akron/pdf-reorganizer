// Loaded via <script> tag, create shortcut to access PDF.js exports.
var { pdfjsLib } = globalThis;

import PDFPage from './pdf-page.js';


// The workerSrc property shall be specified.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'build/pdf.worker.mjs';


/**
 * @class PDFArranger extends an HTMLElement
 * that allows to rearrange, split, and
 * modify PDFs.
 *
 * @exports
 */
export default class PDFArranger extends HTMLElement {

  /**
   * @constructor
   */
  constructor() {
    super();
    this.url;
    this.css;
    this.numpages = undefined;
    this.pdfDoc = undefined;

    this.selected = new Set();
    this.pages = new Array(); // Todo: Probably unimportant
    
    this.shadow = this.attachShadow({ mode: "open" });
   
    let elem = document.createElement('div');
    elem.setAttribute('id', 'pdf-arranger');
    // this.elem.appendChild(style);

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

    elem.appendChild(nav);
    elem.appendChild(this.viewport);
    
    this.shadow.appendChild(elem);
  }

  connectedCallback () {
    let instance = this;
    this.loadCSS(this.css);
    this.loadDocument(this.url);

    this.delElem.addEventListener('click', this.remove.bind(this));
    this.rotateLeftElem.addEventListener('click', this.rotateLeft.bind(this));
    this.splitBeforeElem.addEventListener('click', this.splitBefore.bind(this));

    this.processElem.addEventListener('click', (function() {
      window.alert(this.process());
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
  };

  disconnectedCallback() {
    this.observeViewport.disconnect();
  };
  
  static get observedAttributes() {
    return ['url','css'];
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
  
  addSelect(obj) {
    this.selected.add(obj);
  }
  
  delSelect(obj) {
    this.selected.delete(obj);
  }

  splitBefore() {
    this.forEachSelected(function (page) {
      page.splitBefore();
    });
  }

  /**
   * Move all selected pages in front of a target page.
   */
  moveBefore(obj) {    
    obj.before(...this._selectedSort())
  }

  /**
   * Move all selected behind of a target page.
   */
  moveAfter(obj) {
    obj.after(...this._selectedSort())
  }

  /**
   * Helper function to iterate through all selected objects.
   */
  forEachSelected(cb) {
    this.selected.forEach(cb);
  }

  /**
   * Load CSS file and add it to the shadow dom.
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

        // TODO: Remove elem and extend the page for simplicy for HTMLElement

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
   */
  process () {
    let nodeList = this.viewport.childNodes;
    let x = new Array();
    nodeList.forEach((page) => {

      // Skip deleted pages
      if (page.deleted)
        return;

      let val = page.num + "";

      // Normalize page rotation
      if (page.rotation != 0)
        val += '@' + page.rotation;
        
      x.push(val);
    });
    return x.join(',');
  }
};

customElements.define('pdf-arranger', PDFArranger);
