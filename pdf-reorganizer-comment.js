/**
 * PDFReorganizerComment is a tiny class
 * establishing a comment prompt for pages.
 *
 * @class
 * @classdesc PDFReorganizerComment represents a comment dialog.
 * @exports
 */
export default class PDFReorganizerComment {

  /**
   * @constructor
   *
   * @param {HTMLElement} parent - Parent element node to append the dialog.
   */
  constructor (parent) {
    const elt = document.createElement('dialog');
    this.elt = elt;

    const form = document.createElement('form')
    form.setAttribute('method','dialog');
    elt.appendChild(form);

    const inp = document.createElement('input');
    inp.setAttribute('type','text');
    inp.setAttribute('autofocus','');
    form.appendChild(inp);
    this.input = inp;

    const cl = document.createElement('button');
    cl.classList.add('close');
    cl.setAttribute('formmethod','dialog');
    cl.innerText = 'x';
    elt.appendChild(cl);

    const sm = document.createElement('button');
    sm.classList.add('submit');
    sm.setAttribute('formmethod','dialog');
    sm.innerText = 'OK';
    elt.appendChild(sm);

    inp.addEventListener("keydown", (ev) => {
      ev.stopPropagation();
    });

    // Cancel
    cl.addEventListener("click", (function(ev){
      this.cb(this.value);
      elt.close();
    }).bind(this));

    // Submit
    sm.addEventListener("click", (function(ev){
      this.cb(inp.value);
      elt.close();
    }).bind(this));

    form.addEventListener('submit', (function(ev){
      ev.preventDefault();
      this.cb(inp.value);
      elt.close();
    }).bind(this));

    parent.appendChild(elt);    
  }

  /**
   * Open prompt dialog for comments.
   *
   * @param {function} callback Callback method to receive the prompt value.
   * @param {string] value Default string value for the prompt.
   */
  prompt (callback, value) {
    this.cb = callback;

    this.value = value;
    this.input.value = value;

    const end = value.length;
    this.input.setSelectionRange(end, end);

    
    this.elt.showModal();
    this.input.focus();
  }
}
