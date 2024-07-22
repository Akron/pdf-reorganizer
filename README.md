# pdf-reorganizer

Web Component for PDF arrangements

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


# Planned Features
- Copy instead of moving
- Move/Copy without dragging and dropping
- Add files per drag and drop

# Known issues
- When height and width of a page are switches after rotation,
  the magnified view has an empty offset at the bottom of a page.
