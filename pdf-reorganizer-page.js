// Support HiDPI-screens.
const outputScale = window.devicePixelRatio || 1;

const desiredWidth = 100;
const desiredHeight = 100;

// - Change selectOn/selectOff to select(true) and select(false)

/**
 * A PDFReorganizerPage represents a single page of a PDF file.
 *
 * @class
 * @classdesc PDFReorganizerPage represents a single page of a PDF file.
 * @exports
 */
export default class PDFReorganizerPage extends HTMLElement {

  /**
   * @constructor
   *
   * @param {number} pagenum - Number of the page.
   * @param {PDFReorganizer} parent - Parant reorganizer that orchestrates this page.
   */
  constructor(pagenum, parent) {
    super();
    this.num = pagenum;
    this.removed = false;
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
    const container = document.createElement("div");
    container.classList.add('container');
    container.setAttribute('droppable',false);
    container.setAttribute('data-num', this.num);
    container.appendChild(this.canvas);
    this.appendChild(container);
    
    // Establish event listeners
    this.addEventListener("dragstart", this._dragStartHandler.bind(this));
    this.addEventListener("dragend", this._dragEndHandler.bind(this));
    this.addEventListener("dragleave", this._dragLeaveHandler);
    this.addEventListener("dragover", this._dragOverHandler);
    this.addEventListener("drop", this._dropHandler);
    
    // Click
    this.addEventListener('click', this._clickHandler.bind(this));
  }

  /**
   * Event handler triggered on drag start.
   *
   * @param {DragEvent} ev - The drag event.
   * @private
   */
  _dragStartHandler (ev) {

    // TODO:
    // - Check if the object is selected
    // - Check, if multiple objects are selected.
    //   -> make all "dragged

    this.selectOn();

    this._parent?.forEachSelected(function (obj) {
      obj.classList.add("dragged");
    });
      
    // create drag image
    let newCanvas = document.createElement('canvas');
    let context = newCanvas.getContext('2d');

    if (context) {
      // set dimensions
      newCanvas.width = this.canvas.width * 0.5;
      newCanvas.height = this.canvas.height * 0.5;

      // apply the old canvas to the new one
      context.drawImage(
        this.canvas, 0, 0, newCanvas.width, newCanvas.height
      );
    };

    ev.dataTransfer.setDragImage(newCanvas, -15, -15);
    ev.dataTransfer.dropEffect = "move";
  }

  /**
   * Event handler triggered on drag end.
   *
   * @param {DragEvent} ev - The drag event.
   * @private
   */
  _dragEndHandler (ev) {     
    if (!this._parent)
      return;
    this._parent.forEachSelected(function (obj) {
      obj.classList.remove("dragged");
    });
    this._parent.dropTarget = null;
  }

  /**
   * Event handler triggered on drag leave.
   *
   * @param {DragEvent} ev - The drag event.
   * @private
   */
  _dragLeaveHandler (ev) {
    ev.preventDefault();
    if (this._parent)
      this._parent.dropTarget = null;
    
    this.classList.remove("drag-left","drag-right");
  }

  /**
   * Event handler triggered on drag over.
   *
   * @param {DragEvent} ev - The drag event.
   * @private
   */
  _dragOverHandler (ev) {
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
    
    if (this._parent)
      this._parent.dropTarget = this;
  }

  /**
   * Event handler triggered on drop.
   *
   * @param {DragEvent} ev - The drag event.
   * @private
   */
  _dropHandler (ev) {
    ev.preventDefault();

    // Currently no "dataTransfer" is used

    if (this._parent)
      this._parent.dropTarget = null;

    this.classList.remove("drag-left","drag-right");

    let target = this;
    
    while (target.tagName != 'PDF-PAGE')
      target = target.parentNode;

    if (_pointerBefore(this, ev)) {
      this._parent.moveBefore(target);
    } else {
      this._parent.moveAfter(target);
    };
  };

  /**
   * Event handler triggered on mouse click.
   *
   * @param {MouseEvent} ev - The click event.
   * @private
   */
  _clickHandler (ev) {
    if (this._parent &&
        !ev.ctrlKey &&
        !this._parent.mode) {
      this._parent.delSelectAllExceptFor(this);
    };

    // Remember this page as cursor
    if (!this.removed && this._parent != null) {
      this._parent.cursor = this;
      this.classList.remove("cursor","move");

      // Magnifier mode is active
      switch (this._parent.mode) {
      case "magnify":
        this.magnify();
        this._parent.toggleMode("magnify");
        return;

      // Splitter mode is active
      case "split-before":
        this.splitBefore();
        this._parent.toggleMode("split-before");
        return;

        // Rotate-left mode is active
      case "rotate-left":
        this.rotateLeft();
        this._parent.toggleMode("rotate-left");
        return;

        // Rotate-right mode is active
      case "rotate-right":
        this.rotateRight();
        this._parent.toggleMode("rotate-right");
        return;

        // Remove mode is active
      case "remove":
        this.remove();
        this._parent.toggleMode("remove");
        return;
      };
    };

    this.showInViewport();
    this.selectToggle();
  }
  
  /**
   * Renders the referenced PDF page using PDF.js.
   *
   * @param {PDFPageProxy} pdfpage - The PDF.js-page.
   * @param {number} zf - The zoom factor.
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
  }

  /**
   * Remove page from selection, if selected.
   * Otherwise select.
   */
  selectToggle() {
    if (this.selected) {
      this.selectOff();
    } else {
      this.selectOn();
    }
  }

  /**
   * Add page to selection.
   */
  selectOn() {
    if (this.removed) {
      this.unremove();
      return;
    };
    if (this.selected) return;
    this.selected = true;
    this.classList.add('selected');
    if (this._parent)
      this._parent.addSelect(this);
  }

  /**
   * Remove page from selection.
   */
  selectOff() {
    if (!this.selected) return;
    this.selected = false;
    this.classList.remove('selected','dragged');
    if (this._parent)
      this._parent.delSelect(this);
  }

  /**
   * Mark page as a document splitter.
   */
  splitBefore() {
    if (this.removed)
      return false;

    if (this.splittedBefore) {
      this.splittedBefore = false;
      this.classList.remove('split-before');
      this._parent?._calcSplitCount();
      this.selectOff();
      return false;
    };

    this.splittedBefore = true;
    this.classList.add('split-before');
    this._parent?._calcSplitCount();
    this.selectOff();
    return true;
  }

  /**
   * Mark page as removed from PDF.
   */
  remove() {
    this.unmagnify();
    this.removed = true;
    this.classList.add('removed');
    this.setAttribute('draggable', false);
    this.splittedBefore = false;
    this.classList.remove('split-before');
    this.selectOff();
  }

  /**
   * Set comment to page.
   *
   * @param {string} text The comment associated to the page.
   */
  set comment(text) {
    this.firstChild.setAttribute('data-comment', text);
  }

  /**
   * Get comment from page.
   *
   * @return {string} The comment associated to the page.
   */
  get comment () {
    return this.firstChild.getAttribute('data-comment') || '';
  }
  
  /**
   * Unremove page.
   */
  unremove() {
    if (!this.removed)
      return;
    this.removed = false;
    this.classList.remove('removed');
    this.setAttribute('draggable', true);
    this.selectOff();
  }
  
  /**
   * Rotate page to the right (clockwise).
   */
  rotateRight() {
    if (this.removed)
      return false;
    this._rotation += 90;
    this._setRotationStyle();
  };
  
  /**
   * Rotate page to the left (counter-clockwise).
   */
  rotateLeft() {
    if (this.removed)
      return false;
    this._rotation -= 90;
    this._setRotationStyle();
  };

  /**
   * Set rotation on style.
   *
   * @private
   */
  _setRotationStyle () {
    this.canvas.style.rotate = this._rotation + 'deg';
  };

  /**
   * Set scale on style.
   *
   * @param {number} s - The scale.
   *
   * @private
   */
  _setScaleStyle (s) {
    this.canvas.style.scale = s;
  };

  /**
   * Indicator if the page is shown magnified.
   *
   * @readonly
   */
  get magnified() {
    return this.classList.contains('magnify');
  }

  /**
   * Show the page magnified.
   */
  magnify() {
    if (this.removed)
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
    this.scrollLeft = 0;
    this.scrollTop = 0;
    return true;
  }

  /**
   * Show the page unmagnified.
   */
  unmagnify() {
    if (!this.magnified)
      return false;
    this.canvas.style.translate = "0px 0px";
    this.classList.remove('magnify');
    if (this._parent)
      this._setScaleStyle(1 / this._parent.zoomfactor);
    return true;
  }
  
  /**
   * Get the degree of rotation.
   *
   * @return {number] The degree of rotation normalized to 360 degree.
   *
   * @readonly
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

  /**
   * Move the viewport to make the page visible.
   */
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
 * @param {HTMLElement} obj - The reference object.
 * @param {MouseEvent} ev - The pointer event.
 *
 * @return {boolean} True, if the ponter is left of the object.
 *
 * @private
 */
function _pointerBefore (obj, ev) {
  let rect = obj.getBoundingClientRect();
  let x = ev.clientX - rect.left; //x position within the element.
  
  if (x < ((desiredWidth*outputScale) / 2))
    return true;
  return false;
};

customElements.define('pdf-page', PDFReorganizerPage);
