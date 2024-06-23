// Loaded via <script> tag, create shortcut to access PDF.js exports.
var { pdfjsLib } = globalThis;

import { NewPDFAugmentedPage } from './pdf-page.mjs';


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

    this.selected = new Set();
    this.pages = new Array();
    
    const shadow = this.attachShadow({ mode: "open" });

    // Not optimal to have that in the shadow
    var style = document.createElement('style');
    style.innerHTML = `
    #pdf-arranger {
      display: flex;
      flex-wrap: wrap;
align-items: center;
    }

    div.droppable {
      display: inline-block;
      height: 20%;
      width: 5px;
      background-color: grey;
    }
    div.outer {
      display: inline-block;
      margin: 2pt;
      background-color: transparent;
      border: 5px solid transparent;
      cursor: pointer;
    }
canvas {
      transition: transform .5s ease-out;
//       box-shadow: rgba(50, 50, 93, 0.25) 0px 6px 12px -2px, rgba(0, 0, 0, 0.3) 0px 3px 7px -3px;
}

    div.outer.deleted {
      cursor: default !important;
      background-color: grey;
      border-color: grey;
    }
    div.outer.split-before {
      border-left-style: solid !important;
      border-left-color: red !important;
    }
    div.outer.dragged {
      background-color: white;
opacity: 0.5;
    }
    div.outer.selected {
      border-style: dashed;
      border-color: blue;
    }

div.delete, div.rotate-left {
display: block;
width: 100%;
}
`;

    this.elem = document.createElement('div');
    this.elem.setAttribute('id', 'pdf-arranger');
    this.elem.appendChild(style);
    
    this.delElem = document.createElement("div");
    this.delElem.setAttribute("class","delete");
    this.delElem.innerText = 'remove';
    this.elem.appendChild(this.delElem);

    // These elements should only exist once and be appended to the page in focus!
    this.rotateLeftElem = document.createElement("div");
    this.rotateLeftElem.setAttribute("class","rotate-left");
    this.rotateLeftElem.innerText = 'left';
    this.elem.appendChild(this.rotateLeftElem);
    
    
    shadow.appendChild(this.elem);

    /*
    this.newElem = document.createElement("div");
    this.newElem.innerText = 'new';
*/
  }

  connectedCallback () {
    let instance = this;
    this.loadDocument(this.url);

    this.delElem.addEventListener('click', this.remove.bind(this));
    this.rotateLeftElem.addEventListener('click', this.rotateLeft.bind(this));
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
    console.log(this.selected);
  }
  
  delSelect(obj) {
    this.selected.delete(obj);
    console.log(this.selected);
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

      // Fetch the first page
      //  pageNumber = 1;
      /*
      pdf.getPage(pageNumber).then(function(page) {
        instance.pdfDoc.currentPage = page;

        // Render page
        instance.renderPage({});
      });
      */
      for (var i = 0; i < instance.numPages; i++) {
        var page  = new NewPDFAugmentedPage(i+1, instance);
        instance.pages[i] = page;
        instance.elem.append(page.elem);

        pdf.getPage(i+1).then(function(pdfPage) {
          instance.pages[pdfPage._pageIndex].render(pdfPage);
        });
      };
    }, function (reason) {

      // PDF loading error
      console.error(reason);
    });
  }

};

customElements.define('pdf-arranger', PDFArranger);
