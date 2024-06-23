// Support HiDPI-screens.
var outputScale = window.devicePixelRatio || 1;

var desiredWidth = 100;
var desiredHeight = 100;

// Requires a ref to _parent to inform the arranger on selected pages (for example).

// Todo:
// - on delete: No more selection (split can stay)

export class NewPDFAugmentedPage {
  constructor(pagenum, parent) {
    this.num = pagenum;
    this.deleted = false;
    this.splittedBefore = false;
    this.rotation = 0;
    this._selected = false;
    this._ref = null;
    this._parent = parent;

    this.target = document.createElement("div");
    // this.target.setAttribute("droppable", true);
    this.target.classList.add("droppable"); 

    this.elem = document.createElement("div");
    this.elem.appendChild(this.target)

    this.outer = document.createElement("div");
    this.outer.style.width = (desiredWidth*outputScale) + 'px';
    this.outer.style.height = (desiredWidth*outputScale) + 'px';
    this.outer.style.padding = "2pt";
    this.outer.classList.add("outer");
    this.outer.setAttribute("draggable", true);
    // this.outer.innerText = this.num;

    // May be multiple canvases!
    // Currently this is the current element
    this.canvas = document.createElement("canvas");
    /*
    this.canvasContainer = document.createElement("div");
    this.canvasContainer.classList.add('canvas-container');   
    
    this.canvasContainer.appendChild(this.canvas);
*/
    this.outer.appendChild(this.canvas);

    this.elem.appendChild(this.outer);

/*
    
    // These elements should only exist once and be appended to the page in focus!
    this.rotateLeftElem = document.createElement("div");
    this.rotateLeftElem.setAttribute("class","rotate-left");
    this.rotateLeftElem.innerText = 'left';
    this.elem.appendChild(this.rotateLeftElem);
    
    this.rotateRightElem = document.createElement("div");
    this.rotateRightElem.setAttribute("class","rotate-right");
    this.rotateRightElem.innerText = 'right';
    this.elem.appendChild(this.rotateRightElem);

    this.splitElem = document.createElement("div");
    this.splitElem.setAttribute("class","split-before");
    this.splitElem.innerText = 'split';
    this.elem.appendChild(this.splitElem);

    this.delElem = document.createElement("div");
    this.delElem.setAttribute("class","delete");
    this.delElem.innerText = 'remove';
    this.elem.appendChild(this.delElem);

    this.rotateRightElem.addEventListener('click', this.rotateRight.bind(this));
    this.rotateLeftElem.addEventListener('click', this.rotateLeft.bind(this));
    this.splitElem.addEventListener('click', this.splitBefore.bind(this));
    this.delElem.addEventListener('click', this.remove.bind(this));
*/
    
    // Drag events
    this.outer.addEventListener("dragstart", (function (ev) {
      // ev.preventDefault();

      // TODO:
      // - Check if the object is selected
      // - Check, if multiple objects are selected. -> make all "dragged

      this.selectOn();

      this._parent.forEachSelected(function (obj) {
        obj.outer.classList.add("dragged");
      });
      
      ev.dataTransfer.dropEffect = "move";
      console.log("start dragging");
    }).bind(this));

    this.outer.addEventListener("dragend", (function (ev) {     
      this._parent.forEachSelected(function (obj) {
        obj.outer.classList.remove("dragged");
      });
    }).bind(this));

    this.target.addEventListener("dragenter",function (ev) {
      ev.preventDefault();
      ev.target.style.backgroundColor = "blue";
    });

    this.target.addEventListener("dragleave",function (ev) {
      ev.preventDefault();
      ev.target.style.backgroundColor = "grey";
    });

   
    
    this.target.addEventListener("drop", function (ev) {
      ev.preventDefault();
      // const data = ev.dataTransfer.getData("text/plain");
      // ev.target.appendChild(document.getElementById(data));
      // this.backgroundColor = "yellow";
      console.log("drop");
    });

    this.outer.addEventListener('click', (function () {
      this.swapSelected();
    }).bind(this));
  }

  render(page) {
    this._ref = page;

    var viewportParam = {scale : 1};
    
    // viewportParam['scale'] = 1;

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
  
  swapSelected() {
    if (this._selected) {
      this.selectOff();
    } else {
      this.selectOn();
    }
  }

  selectOn() {
    if (this.deleted) return;
    if (this._selected) return;
    this._selected = true;
    this.outer.classList.add('selected');
    this._parent.addSelect(this);
  }

  selectOff() {
    if (!this._selected) return;
    this._selected = false;
    this.outer.classList.remove('selected');
    this._parent.delSelect(this);
  }

  splitBefore() {
    if (this.splittedBefore) {
      this.splittedBefore = false;
      this.outer.classList.remove('split-before');
    } else {
      this.splittedBefore = true;
      this.outer.classList.add('split-before');
    };
  }

  remove() {
    if (this.deleted) {
      this.deleted = false;
      this.outer.classList.remove('deleted');
      this.outer.setAttribute('draggable', true);
    } else {
      this.deleted = true;
      this.outer.classList.add('deleted');
      this.outer.setAttribute('draggable', false);
      this.selectOff();
    };
  }
  
  rotateRight() {
    this.rotation += 90;
    this.canvas.style.transform = 'rotate(' + this.rotation + 'deg)';
  };
  
  rotateLeft() {
    this.rotation -= 90;
    this.canvas.style.transform = 'rotate(' + this.rotation + 'deg)';
  };

  
  // Load the page in the canvas
  load () {
  };
}

// customElements.define('pdf-page', NewPDFAugmentedPage);
