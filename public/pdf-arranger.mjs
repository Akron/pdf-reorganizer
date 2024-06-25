// Loaded via <script> tag, create shortcut to access PDF.js exports.
var { pdfjsLib } = globalThis;

import { PDFPage } from './pdf-page.mjs';


// The workerSrc property shall be specified.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'build/pdf.worker.mjs';


class PDFArranger extends HTMLElement {

  static get observedAttributes() {
    return ['url'];
  }

    // attribute change
  attributeChangedCallback(property, oldValue, newValue) {
    if (oldValue === newValue)
      return;

    // Overload attributes, e.g. from the element attribute list
    this[property] = newValue;
  }
  
  constructor(numpages) {
    super();
    this.url;
    this.numpages = undefined;
    this.pdfDoc = undefined;

    this.selected = new Set();
    this.pages = new Array();
    
    const shadow = this.attachShadow({ mode: "open" });

    var css = new CSSStyleSheet();
    fetch("main.css").then(
      response => response.text()
    ).then(
      data => {
        css.replace(data)
      }
    );
    shadow.adoptedStyleSheets = [css];
    
    this.elem = document.createElement('div');
    this.elem.setAttribute('id', 'pdf-arranger');
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

    this.viewport = document.createElement('div');
    this.viewport.setAttribute('id', 'pdf-viewport');

    this.elem.appendChild(nav);
    this.elem.appendChild(this.viewport);
    
    shadow.appendChild(this.elem);
  }

  connectedCallback () {
    let instance = this;
    this.loadDocument(this.url);

    this.delElem.addEventListener('click', this.remove.bind(this));
    this.rotateLeftElem.addEventListener('click', this.rotateLeft.bind(this));
    this.splitBeforeElem.addEventListener('click', this.splitBefore.bind(this));

    this.observeViewport = new IntersectionObserver((entries,observer) => {
      /*if (entries[0].intersectionRatio <= 0)
        return;
      */
      entries.forEach(function (entry) {

        if (!entry.isIntersecting)
          return;
        
        var page = entry.target;

        // Render the page, when it intersects with the viewport
        instance.pdfDoc.getPage(page.num).then(function(pdfPage) {
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

  remove() {
    this.forEachSelected(function (page) {
      page.remove();
    });
  }

  rotateLeft() {
    this.forEachSelected(function (page) {
      page.rotateLeft();
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

  
  forEachSelected(cb) {
    this.selected.forEach(cb);
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

};

customElements.define('pdf-arranger', PDFArranger);
