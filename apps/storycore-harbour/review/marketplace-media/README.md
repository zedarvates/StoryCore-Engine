# StoryCore Harbour Marketplace media

## Logo candidate

- file: `storycore-harbour-logo-256.png`;
- source: `../../bundle/icon.svg`;
- format and dimensions: PNG, 256 x 256;
- size: 5,302 bytes, below Anna's visible 2MB maximum;
- SHA-256: `4a54e1955ac5ebe67eef8c82a260b1b1cdc351a7e87902f2bba2b15532cea7dd`.

The authenticated Anna Listing inspected on 2026-08-29 accepts PNG, JPG,
WebP, or GIF logos up to 2MB and states that they are cropped to 256 x 256.
This asset is generated from the committed SVG without changing the product
identity.

Reproduce and validate on Windows with Edge:

```powershell
$env:BROWSER_EXECUTABLE = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
npm run marketplace:logo
npm run marketplace:logo:check
```

The validator checks PNG signature, exact dimensions, maximum bytes, and
representative gold, white, red, and cyan pixels. Do not upload the file or
save Listing changes without explicit owner approval at action time.
