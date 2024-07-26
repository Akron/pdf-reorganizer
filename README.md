# pdf-reorganizer

![pdf-reorganizer](demo/pdf-reorganizer.png)

PDF-reorg is a web component to help rearrange and split PDFs.
It does not modify PDF documents itself, but creates a [processing instruction](processing-directives)
that can be implemented independent of PDF processing APIs or programming languages. 
PDF-reorg is heavily inspired by [PDF-Arranger](https://github.com/pdfarranger/pdfarranger)
and is based on [PDF.js](https://github.com/mozilla/pdf.js).

# Usage

```html

<html>
  <head>
    <script type="module">
      import 'pdf-reorganizer';
    </script>
  </head>
  <body>
    <pdf-reorganizer url="example.pdf"></pdf-reorganizer>
  </body>
</html>
```

# Key Bindings

In Reorganizer Viewport:

| Key    | Modifier   | Command |
|--------|------------|---------|
| right  |            | Move cursor to next page |
| left   |            | Move cursor to previous page |
| top    |            | Move cursor to page above in viewport |
| down   |            | Move cursor to page below in viewport |
| right  | Ctrl       | Rotate page on cursor position 90deg clockwise |
| left   | Ctrl       | Rotate page on cursor position 90deg counter clockwise |
| right  | Ctrl+Shift | Rotate selected pages 90deg clockwise |
| left   | Ctrl+Shift | Rotate selected pages 90deg counter clockwise |
| right  | Alt        | Choose preceding target to move selected pages (requires confirmation) |
| left   | Alt        | Choose following target to move selected pages (requires confirmation) |
| Delete |            | Remove page on cursor position (If no cursor exists, remove all selected) |
| Delete | Shift      | Remove all selected pages |
| Space  |            | Add page on cursor to the selection or remove from it |
| s      | Ctrl       | Add split before page on cursor (If no cursor exists, add split before selected pages) |
| s/S    | Ctrl+Shift | Add split before selected pages |
| +      | Ctrl       | Open magnified view on cursor |
| a      | Ctrl       | Select all pages |
| Enter  |            | Confirm moving selected pages |

In magnified view:

| Key    | Modifier   | Command |
|--------|------------|---------|
| right  |            | Move viewport right |
| left   |            | Move viewport left |
| top    |            | Move viewport up |
| down   |            | Move viewport down |
| right  | Ctrl       | Move viewport to the right |
| left   | Ctrl       | Move viewport to the left |
| top    | Ctrl       | Move viewport to up |
| down   | Ctrl       | Move viewport to bottom |
| Escape |            | Leave magnifier view |

# Observed attributes

| Key | Value |
|-----|-------|
| url | URL of the PDF file to be shown |

# Processing directives

After rearranging all pages into new documents, the `processed` custom event is dispatched.
This event can be listened on and contains a `docs` list and a `src` list in its `detail`
object.

```json
{
  "src" : [
    "mysimple.pdf"
  ],
  "docs" : [
    [1,2],
    [3,"5@90"]
  ]
}
```

The `docs` contains a list of documents resulting from the reorganization of the
source documents (listed in `src`). Each document is represented by a list of page
numbers. If pages where rotated (in 90 degree steps) this is appended to the pagenumber
separated by an `@` symbol.

In the future this format may allow merging PDFs. To allow for that,
page numbers can have a reference prefix refering to the PDF in the `src`
array (index starts with 0), e.g. `1:2` (Page 2 of file 2) or `3:5@270`
(Page 5 of file 4 rotated by 270 deg).

If no file prefix is given, the first file (0) is assumed.

# Planned Features
- Copy instead of moving
- Add files per drag and drop (if embedded in a service)
- Add select mode on long press (mousedown and touchstart)

# Known issues
- When height and width of a page are switches after rotation,
  the magnified view has an empty offset at the bottom of a page.
- hdpi doesn't properly work across browsers.

# License

This software bundles [Material Symbols](https://fonts.google.com/icons) from Google, published under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0.html).
