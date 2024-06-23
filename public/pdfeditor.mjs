// Loaded via <script> tag, create shortcut to access PDF.js exports.
var { pdfjsLib } = globalThis;

// Support HiDPI-screens.
var outputScale = window.devicePixelRatio || 1;

var desiredWidth = 200;
var desiredHeight = 200;

// The workerSrc property shall be specified.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'build/pdf.worker.mjs';

class PdfAugmentedPage {
  constructor(num, page) {
    this.page = num;
    this._deleted = false;
    this.rotation = 0;
    this.splitBefore = false;
    this.ref = page;
  }

  rotateRight() {
    this.rotation += 90;
  };
  
  rotateLeft() {
    this.rotation -= 90;
  };
};


class PdfAugmentedDocument {
  constructor(url) {
    this.url = url;
    this.page = 1;
    this._index = 0;
    this._numPages = 0;
  }

  set numPages(num) {
    this._numPages = num;
    this._array = new Array();
  };

  get numPages() {
    return this._numPages;
  };

  get currentPage() {
    return this._array[this._index];
  };

  set currentPage(page) {
    this._array[this._index] = new PdfAugmentedPage(this._index, page);
  }
};

class PdfEditor extends HTMLElement {

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
  
  // Class constructor
  constructor() {
    super(); // Always use that!

    const shadow = this.attachShadow({ mode: "open" });

    this.elem = document.createElement("div");

    this.outer = document.createElement("div");
    this.outer.style.width = (desiredWidth*outputScale) + 'px';
    this.outer.style.height = (desiredWidth*outputScale) + 'px';
    this.outer.style.backgroundColor = "grey";
    this.outer.style.padding = "2pt";
    
    this.canvas = document.createElement("canvas");
    this.outer.appendChild(this.canvas);

    this.elem.appendChild(this.outer);

    this.rotateLeftElem = document.createElement("div");
    this.rotateLeftElem.setAttribute("class","rotate-left");
    this.rotateLeftElem.innerText = 'left';
    this.elem.appendChild(this.rotateLeftElem);

    
    this.rotateRightElem = document.createElement("div");
    this.rotateRightElem.setAttribute("class","rotate-right");
    this.rotateRightElem.innerText = 'right';
    this.elem.appendChild(this.rotateRightElem);

    shadow.appendChild(this.elem);

  }

  connectedCallback () {
    let instance = this;

    this.pdfDoc = new PdfAugmentedDocument(this.url);

    this.loadDocument(this.documenturl);
    
    // instance.count++;
    // instance.elem.textContent = `Clicked ${this.count} times`;

    this.rotateRightElem.addEventListener('click', function () {
      var page = instance.pdfDoc.currentPage;
      page.rotateRight();     
      instance.renderPage({ rotation: page.rotation });
    });

    this.rotateLeftElem.addEventListener('click', function () {
      var page = instance.pdfDoc.currentPage;
      page.rotateLeft();     
      instance.renderPage({ rotation: page.rotation });
    });

  }

  loadDocument (url) {
    let instance = this;

    // Asynchronous download of PDF
    var loadingTask = pdfjsLib.getDocument(this.pdfDoc.url);

    loadingTask.promise.then(function(pdf) {

      // Initialize the document length
      instance.pdfDoc.numPages = pdf.numPages;

      // Fetch the first page
      var pageNumber = 1;
      pdf.getPage(pageNumber).then(function(page) {
        instance.pdfDoc.currentPage = page;

        // Render page
        instance.renderPage({});
      });
    }, function (reason) {

      // PDF loading error
      console.error(reason);
    });
  }

  // Render the page based on the current viewport parameters
  renderPage (viewportParam) {

    // The page is expected to be loaded already
    var page = this.pdfDoc.currentPage.ref;

    viewportParam['scale'] = 1;

    // Prepare canvas using PDF page dimensions
    var canvas = this.canvas;
    var context = canvas.getContext('2d');

    var viewport = page.getViewport(viewportParam);

    if (viewport.width > viewport.height) {
      viewportParam['scale'] = desiredWidth / viewport.width;
    } else {
      viewportParam['scale'] = desiredHeight / viewport.height;
    };

    viewport = page.getViewport(viewportParam);

    
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.width = Math.floor(viewport.width * outputScale);

    canvas.style.marginLeft = Math.floor(((desiredWidth*outputScale) - canvas.width) / 2) + "px";
    canvas.style.marginTop = Math.floor(((desiredHeight*outputScale) - canvas.height) / 2) + "px";
    
    var transform = outputScale !== 1
        ? [outputScale, 0, 0, outputScale, 0, 0]
        : null;
    
    // Render PDF page into canvas context
    var renderContext = {
      canvasContext: context,
      viewport: viewport,
      transform : transform,
      background: 'rgba(0,0,0,0)',
    };

    var renderTask = page.render(renderContext);
    renderTask.promise.then(function () {
      console.log('Page rendered');
    });
  }
};

customElements.define('pdf-editor', PdfEditor);
