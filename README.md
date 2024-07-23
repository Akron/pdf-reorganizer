# pdf-reorganizer

PDF-Reorg is a web component to help rearrange and split PDFs.
It is heavily inspired by [PDF-Arranger](https://github.com/pdfarranger/pdfarranger)
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
| Delete |            | Remove page on cursor position (If no cursor exists, remove all selected) |
| Delete | Ctrl       | Remove all selected pages |
| Space  |            | Add page on cursor to the selection or remove from it |
| y      | Ctrl       | Add split before page  on cursor |
| +      | Ctrl       | Open magnified view on cursor |
| a      | Ctrl       | Select all pages |

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

# Planned Features
- Copy instead of moving
- Move/Copy without dragging and dropping
- Add files per drag and drop (if embedded in a service)

# Known issues
- When height and width of a page are switches after rotation,
  the magnified view has an empty offset at the bottom of a page.
