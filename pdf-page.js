// Support HiDPI-screens.
const outputScale = window.devicePixelRatio || 1;

const desiredWidth = 100;
const desiredHeight = 100;

var dropTarget = null;


// - Change selectOn/selectOff to select(true) and select(false)

/**
 * A PDFPage represents a single page of a PDF file.
 *
 * @exports
 */
export default class PDFPage extends HTMLElement {

  /**
   * @constructor
   *
   * @param pagenum Number of the page.
   * @param parent PDFReorganizer that arranges this page.
   */
  constructor(pagenum, parent) {
    super();
    this.num = pagenum;
    this.deleted = false;
    this.selected = false;
    this.splittedBefore = false;
    this._rotation = 0;
    this._pdfjsref = null; // The PDF.js-page
    this._parent = parent; // The reorganizer
    this._translate = "";

    this.style.width = (desiredWidth*outputScale) + 'px';
    this.style.height = (desiredWidth*outputScale) + 'px';
    this.classList.add("load");
    this.setAttribute("draggable", true);
    this.setAttribute("droppable", true);
    
    // Canvas
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute('droppable',false);

    // container
    let container = document.createElement("div");
    container.classList.add('container');
    container.setAttribute('droppable',false);
    container.setAttribute('data-num', this.num);
    container.appendChild(this.canvas);
    this.appendChild(container);
    
    // Establish event listeners

    var instance = this;
    
    // Dragstart
    this.addEventListener("dragstart", (function (ev) {

      // TODO:
      // - Check if the object is selected
      // - Check, if multiple objects are selected.
      //   -> make all "dragged

      this.selectOn();

      this._parent.forEachSelected(function (obj) {
        obj.classList.add("dragged");
      });
      
      // create drag image
      let newCanvas = document.createElement('canvas');
      let context = newCanvas.getContext('2d');

      // set dimensions
      newCanvas.width = this.canvas.width * 0.5;
      newCanvas.height = this.canvas.height * 0.5;

      // apply the old canvas to the new one
      context.drawImage(
        this.canvas, 0, 0, newCanvas.width, newCanvas.height
      ); 
      
      ev.dataTransfer.dropEffect = "move";
      ev.dataTransfer.setDragImage(newCanvas, -15, -15);
    }).bind(this));

    // Dragend
    this.addEventListener("dragend", (function (ev) {     
      this._parent.forEachSelected(function (obj) {
        obj.classList.remove("dragged");
      });
      if (dropTarget != null) {
        dropTarget.classList.remove('drag-left','drag-right');
        dropTarget = null;
      }
    }).bind(this));

    // Dragleave
    this.addEventListener("dragleave", function (ev) {
      ev.preventDefault();
      if (dropTarget != null) {
        dropTarget.classList.remove('drag-left','drag-right');
        dropTarget = null;
      };

      this.classList.remove("drag-left","drag-right");
    });

    // Dragover
    this.addEventListener("dragover", function (ev) {
      ev.preventDefault();
      // Set the dropEffect to move
      ev.dataTransfer.dropEffect = "move";

      let cl = this.classList;
      if (_pointerBefore(this, ev)) {
        cl.add("drag-left");
        cl.remove("drag-right");
      } else {
        cl.remove("drag-left");
        cl.add("drag-right");
      };

      if (dropTarget != null && dropTarget != this) {
        dropTarget.classList.remove('drag-left','drag-right');
        dropTarget = null;
      };
      dropTarget = this
    });

    // Drop
    this.addEventListener("drop", function (ev) {
      ev.preventDefault();

      // Currently no "dataTransfer" is used

      if (dropTarget != null) {
        dropTarget.classList.remove('drag-left','drag-right');
        dropTarget = null;
      }

      this.classList.remove("drag-left","drag-right");

      var target = this;
      
      while (target.tagName != 'PDF-PAGE')
        target = target.parentNode;

      // TODO: Instance may not be required!
      if (_pointerBefore(this, ev)) {
        instance._parent.moveBefore(target);
      } else {
        instance._parent.moveAfter(target);
      };
    });
    
    // Click
    this.addEventListener('click', (function (ev) {
      if (!ev.ctrlKey) {
        this._parent.delSelectAllExceptFor(this);
      };
      // Remember this page as cursor
      if (!this.deleted && this._parent != null) {
        this._parent.cursor = this;
        this.classList.remove("cursor","move")
      };
      this.swapSelected();
    }).bind(this));
  };

  /**
   * Renders the referenced PDF page using PDF.js.
   *
   * @param {pdfpage} The PDF.js-page.
   * @param zf {number} the zoom factor.
   */
  render(pdfpage) {

    // Page already rendered
    if (this._pdfjsref != null)
      return;

    let zf = this._parent.zoomfactor;
    
    this._pdfjsref = pdfpage;
    
    let viewportParam = {scale : 1};

    // Prepare canvas using PDF page dimensions
    let canvas = this.canvas;
    let context = canvas.getContext('2d', { alpha: false });
    let viewport = pdfpage.getViewport(viewportParam);

    if (viewport.width > viewport.height) {
      viewportParam['scale'] = (desiredWidth*zf) / viewport.width;
    } else {
      viewportParam['scale'] = (desiredHeight*zf) / viewport.height;
    };

    // Reload viewport with new dimensions
    viewport = pdfpage.getViewport(viewportParam);

    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.width = Math.floor(viewport.width * outputScale);

    // Calculate translation when magnified after rotation
    const trans = parseInt((canvas.height - canvas.width) / 2);
    this._translate = `${trans}px ${-1 * trans}px`;

    canvas.style.marginLeft = Math.floor(((desiredWidth*outputScale) - (canvas.width)) / 2) + "px";
    canvas.style.marginTop = Math.floor(((desiredHeight*outputScale) - (canvas.height)) / 2) + "px";
    
    canvas.style.rotate = '0deg';
    canvas.style.scale = 1 / zf;
    
    let transform = outputScale !== 1
        ? [outputScale, 0, 0, outputScale, 0, 0]
        : null;

    // Render PDF page into canvas context
    let renderContext = {
      canvasContext: context,
      viewport: viewport,
      transform : transform,
      // background: 'rgba(0,0,0,0)',
    };
    
    let renderTask = pdfpage.render(renderContext);
    renderTask.promise.then((function () {

      // Page rendered!
      this.classList.remove("load");
    }).bind(this));
  };

  /**
   * Remove page from selection, if selected.
   * Otherwise select.
   */
  swapSelected() {
    if (this.selected) {
      this.selectOff();
    } else {
      this.selectOn();
    }
  };

  /**
   * Add page to selection.
   */
  selectOn() {
    if (this.deleted) {
      this.unremove();
      return;
    };
    if (this.selected) return;
    this.selected = true;
    this.classList.add('selected');
    if (this._parent)
      this._parent.addSelect(this);
  };

  /**
   * Remove page from selection.
   */
  selectOff() {
    if (!this.selected) return;
    this.selected = false;
    this.classList.remove('selected');
    if (this._parent)
      this._parent.delSelect(this);
  };

  /**
   * Mark page as a document splitter.
   */
  splitBefore() {
    if (this.deleted)
      return false;

    if (this.splittedBefore) {
      this.splittedBefore = false;
      this.classList.remove('split-before');
      this.selectOff();
      return false;
    };

    this.splittedBefore = true;
    this.classList.add('split-before');
    this.selectOff();
    return true;
  };

  /**
   * Mark page as removed from PDF.
   */
  remove() {
    this.unmagnify();
    this.deleted = true;
    this.classList.add('deleted');
    this.setAttribute('draggable', false);
    this.splittedBefore = false;
    this.classList.remove('split-before');
    this.selectOff();
  };

  /**
   * Unremove page.
   */
  unremove() {
    if (!this.deleted)
      return;
    this.deleted = false;
    this.classList.remove('deleted');
    this.setAttribute('draggable', true);
    this.selectOff();
  };
  
  /**
   * Rotate page to the right.
   */
  rotateRight() {
    if (this.deleted)
      return false;
    this._rotation += 90;
    this._setRotationStyle();
  };
  
  /**
   * Rotate page to the left.
   */
  rotateLeft() {
    if (this.deleted)
      return false;
    this._rotation -= 90;
    this._setRotationStyle();
  };

  _setRotationStyle () {
    this.canvas.style.rotate = this._rotation + 'deg';
  };

  _setScaleStyle (s) {
    this.canvas.style.scale = s;
  };

  get magnified() {
    return this.classList.contains('magnify');
  }
  
  magnify() {
    if (this.deleted)
      return false;

    // Fix the offset on rotation, when height and width are reversed
    if ((this.rotation % 180) != 0) {
      // this.canvas.style.clipPath = `rect(0 0 ${this.canvas.width}px ${this.canvas.height}px)`;
      this.canvas.style.translate = this._translate;
    }
    else
      this.canvas.style.translate = "0px 0px";
    
    this.classList.add('magnify');
    this._setScaleStyle(1);
    this.scrollLeft=0;
    this.scrollTop=0;
  }

  unmagnify() {
    if (!this.magnified)
      return;
    this.canvas.style.translate = "0px 0px";
    this.classList.remove('magnify');
    this._setScaleStyle(1 / this._parent.zoomfactor);
  }
  
  /**
   * Degree of rotation.
   */
  get rotation() {
    let deg = this._rotation % 360;

    if (deg > 0)
      return deg;

    switch (deg) {
    case -90:
      return 270;
    case -180:
      return 180;
    case -270:
      return 90;
    }

    return 0;
  }

  showInViewport() {

    // TODO: Only do this, if necessary!

    if (this.scrollIntoView) {
      this.scrollIntoView({
        behavior: "smooth",
        block: "end",
      inline: "nearest"
      });
    };
  }
};

/**
 * Check if the pointer is on the left (true)
 * side of an object.
 *
 * @param obj The reference object.
 * @param ev The pointer event.
 */
function _pointerBefore (obj, ev) {
  let rect = obj.getBoundingClientRect();
  let x = ev.clientX - rect.left; //x position within the element.
  
  if (x < ((desiredWidth*outputScale) / 2))
    return true;
  return false;
};

customElements.define('pdf-page', PDFPage);
