/**
 * Type declarations for pdf-reorganizer.
 *
 * This single file describes the whole public surface of the package:
 * the `PDFReorganizer` web component (the default export of the package),
 * the `PDFReorganizerPage` and `PDFReorganizerComment` classes it uses
 * internally, and the shape of the `processed` custom event payload.
 */

export interface PDFReorganizerProcessedPageMap {
  /** The page number. */
  p: number;
  /** Optional clockwise rotation in degrees (90, 180 or 270). */
  r?: number;
  /** Optional comment on the page. */
  c?: string;
  /** Optional index into the `src` list of source documents. Defaults to 0. */
  s?: number;
}

export type PDFReorganizerProcessedPage = number | PDFReorganizerProcessedPageMap;

export type PDFReorganizerProcessedDoc = PDFReorganizerProcessedPage[];

export interface PDFReorganizerProcessedDetail {
  /** Filenames of the source documents. */
  src: string[];
  /** One list of pages per resulting document. */
  docs: PDFReorganizerProcessedDoc[];
}

/**
 * A PDFReorganizerPage represents a single page of a PDF file
 * (`<pdf-page>`).
 */
declare class PDFReorganizerPage extends HTMLElement {
  constructor(pagenum: number, parent: PDFReorganizer | null);

  num: number;
  removed: boolean;
  selected: boolean;
  splittedBefore: boolean;
  canvas: HTMLCanvasElement;
  _parent: PDFReorganizer | null;
  _pdfjsref: unknown;

  get rotation(): number;
  get magnified(): boolean;
  get comment(): string;
  set comment(text: string);

  render(pdfpage: unknown): void;
  selectToggle(): void;
  selectOn(): void;
  selectOff(): void;
  splitBefore(): boolean;
  remove(): void;
  unremove(): void;
  rotateRight(): boolean;
  rotateLeft(): boolean;
  magnify(): boolean;
  unmagnify(): boolean;
  showInViewport(): void;
  destroy(): void;
}

/**
 * PDFReorganizerComment is a tiny class establishing
 * a comment prompt for pages.
 */
declare class PDFReorganizerComment {
  constructor(parent: HTMLElement | null);

  input: HTMLInputElement;
  value: string;
  cb?: (value: string) => void;

  prompt(callback: (value: string) => void, value: string): void;
}

/**
 * PDFReorganizer is a web component to reorganize PDF documents
 * (`<pdf-reorganizer>`).
 */
export default class PDFReorganizer extends HTMLElement {
  static readonly observedAttributes: string[];

  constructor();

  url?: string | ArrayLike<number> | ArrayBuffer | ArrayBufferView;
  filename?: string;
  numPages: number;
  pdfDoc: unknown;
  mode?: string;
  zoomfactor: number;
  scrollstep: number;
  selected: Set<PDFReorganizerPage>;
  navElem: HTMLElement;
  viewport: HTMLElement;
  button: Record<string, HTMLElement | undefined>;
  commentDialog: PDFReorganizerComment;
  observeViewport?: IntersectionObserver;

  init(): this;
  connectedCallback(): void;
  disconnectedCallback(): void;
  attributeChangedCallback(property: string, oldValue: string | null, newValue: string | null): void;
  loadDocument(url: string | ArrayLike<number> | ArrayBuffer | ArrayBufferView, filename?: string): Promise<number>;
  process(): PDFReorganizerProcessedDetail;
  getPage(idx: number): PDFReorganizerPage | undefined;
  remove(): number;
  rotateLeft(): number;
  rotateRight(): number;
  selectAll(opt?: number | Event): number;
  addSelect(page: PDFReorganizerPage): void;
  delSelect(page: PDFReorganizerPage): void;
  delSelectAllExceptFor(page: PDFReorganizerPage): void;
  cursor: PDFReorganizerPage | null;
  dropTarget: PDFReorganizerPage | null;
  splitBefore(): number;
  moveBefore(page: PDFReorganizerPage): void;
  moveAfter(page: PDFReorganizerPage): void;
  forEachSelected(cb: (page: PDFReorganizerPage) => void): void;
}

declare global {
  interface HTMLElementTagNameMap {
    'pdf-reorganizer': PDFReorganizer;
    'pdf-page': PDFReorganizerPage;
  }
}