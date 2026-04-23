ARFA brand assets
-----------------

  navy/     Deep-blue bevel variant — used on light theme (best contrast
            against white/off-white backgrounds), favicon, and OG card.
  silver/   Chrome-silver bevel variant — used on dark theme (glows against
            dark backgrounds).

BrandMark component (client/src/components/BrandMark.tsx) switches between
these two finishes automatically via useTheme(). Pass `finish="navy"` or
`finish="silver"` to override.

Each folder contains five variants (same filenames, different finish):

  arfa-icon.png                  Triangle mark only, ~1:1
  arfa-wordmark-horizontal.png   Mark + ARFA wordmark compact row, ~3.2:1
  arfa-horizontal-tagline.png    Mark + ARFA + tagline row, ~3.8:1
  arfa-full-vertical.png         Stacked: mark / ARFA / tagline, ~0.86:1 portrait
  arfa-square-full.png           Square composition for social cards, 1:1

/client/public/favicon.png is a copy of navy/arfa-icon.png for broad
browser-tab compatibility.
