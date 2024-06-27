// Support HiDPI-screens.
const outputScale = window.devicePixelRatio || 1;

const desiredWidth = 100;
const desiredHeight = 100;

var dropTarget = null;

// Requires a ref to _parent to inform the arranger on selected pages (for example).

// Todo:
// - on delete: No more selection (split can stay)

export class PDFPage extends HTMLElement {

  constructor(pagenum, parent) {
    super();
    this.num = pagenum;
    this.deleted = false;
    this.splittedBefore = false;
    this.rotation = 0;
    this._selected = false;
    this._ref = null;
    this._parent = parent;

    this.outer = document.createElement("div");
    this.outer.style.width = (desiredWidth*outputScale) + 'px';
    this.outer.style.height = (desiredWidth*outputScale) + 'px';
    this.outer.classList.add("outer","load");
    this.outer.setAttribute("draggable", true);
    // this.outer.innerText = this.num;

    this.outer.setAttribute("droppable", true);

    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute('droppable',false);


    this.outer.appendChild(this.canvas);

    this.appendChild(this.outer);

    
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
      
      // create drag image
      var newCanvas = document.createElement('canvas');
      var context = newCanvas.getContext('2d');

      // Setting img src
      // img.src = 'https://www.w3schools.com/css/paris.jpg'

      // set dimensions
      newCanvas.width = this.canvas.width * 0.5;
      newCanvas.height = this.canvas.height * 0.5;

      // apply the old canvas to the new one
      context.drawImage(this.canvas, 0, 0, newCanvas.width, newCanvas.height); 
      
      ev.dataTransfer.dropEffect = "move";
      ev.dataTransfer.setDragImage(newCanvas, -15, -15);
      console.log("start dragging");
    }).bind(this));

    this.outer.addEventListener("dragend", (function (ev) {     
      this._parent.forEachSelected(function (obj) {
        obj.outer.classList.remove("dragged");
      });
      if (dropTarget != null) {
        dropTarget.classList.remove('drag-left','drag-right');
        dropTarget = null;
      }
    }).bind(this));

    /*
    this.outer.addEventListener("dragenter",function (ev) {
      ev.preventDefault();
      ev.target.style.borderColor = "#00f";
      ev.target.style.backgroundColor = "#88f";
    });
*/

    this.outer.addEventListener("dragleave",function (ev) {
      ev.preventDefault();
/*
      var target = ev.target;

      if (target.tagName == "CANVAS")
        target = target.parentNode;

      if (target.tagName != "DIV")
        return;
*/
      if (dropTarget != null) {
        dropTarget.classList.remove('drag-left','drag-right');
        dropTarget = null;
      };

      this.classList.remove("drag-left","drag-right");
    });

    this.outer.addEventListener("dragover", function(ev) {
      ev.preventDefault();
      // Set the dropEffect to move
      ev.dataTransfer.dropEffect = "move";
     
      var rect = this.getBoundingClientRect();
      var x = ev.clientX - rect.left; //x position within the element.

      if (x < ((desiredWidth*outputScale) / 2)) {
        this.classList.add("drag-left");
        this.classList.remove("drag-right");
      } else {
        this.classList.remove("drag-left");
        this.classList.add("drag-right");
      };

      if (dropTarget != null && dropTarget != this) {
        dropTarget.classList.remove('drag-left','drag-right');
        dropTarget = null;
      };
      dropTarget = this
    });

    
    this.outer.addEventListener("drop", function (ev) {
      ev.preventDefault();
      // const data = ev.dataTransfer.getData("text/plain");
      // ev.target.appendChild(document.getElementById(data));

      if (dropTarget != null) {
        dropTarget.classList.remove('drag-left','drag-right');
        dropTarget = null;
      }

      this.classList.remove("drag-left","drag-right");

      console.log("drop");
    });
    

    this.outer.addEventListener('click', (function () {
      this.swapSelected();
    }).bind(this));
  };

  render(page) {

    // Page already rendered
    if (this._ref != null)
      return;
    
    this._ref = page;

    var viewportParam = {scale : 1};
    
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
      // Page rendered!
      // canvas.style.opacity = 1;
      canvas.parentNode.classList.remove("load");
    });
  };
  
  swapSelected() {
    if (this._selected) {
      this.selectOff();
    } else {
      this.selectOn();
    }
  };

  selectOn() {
    if (this.deleted) return;
    if (this._selected) return;
    this._selected = true;
    this.outer.classList.add('selected');
    this._parent.addSelect(this);
  };

  selectOff() {
    if (!this._selected) return;
    this._selected = false;
    this.outer.classList.remove('selected');
    this._parent.delSelect(this);
  };

  splitBefore() {
    if (this.splittedBefore) {
      this.splittedBefore = false;
      this.outer.classList.remove('split-before');
      this.selectOff();
    } else {
      this.splittedBefore = true;
      this.outer.classList.add('split-before');
      this.selectOff();      
    };
  };

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
  };
  
  rotateRight() {
    this.rotation += 90;
    this.canvas.style.transform = 'rotate(' + this.rotation + 'deg)';
  };
  
  rotateLeft() {
    this.rotation -= 90;
    this.canvas.style.transform = 'rotate(' + this.rotation + 'deg)';
  };
};

customElements.define('pdf-page', PDFPage);
