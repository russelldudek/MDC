# Campaign Audit

## Campaign identity

- Role: Chief Operating Officer - AI Adoption
- Recruiting channel: MDC Executive Search
- Hiring company: confidential / not disclosed in the supplied posting
- Candidate: Russell Dudek
- Candidate-vision URL: `https://russelldudek.github.io/MDC/`
- Job posting: supplied in chat; no public posting URL supplied

## Material correction

- The standalone founder decision-rights route, PDF, links, manifest entries, generated-document references, and readable source language were removed.
- Decision-rights work remains inside the 120-day plan as an operating mechanism rather than a separate candidate artifact.
- The executive questions were rebuilt as five semantic editorial rows with separated numeric markers, controlled measure, and responsive composition.
- Screen documents now render as fluid editorial surfaces instead of scaled Letter sheets. Print styles remain isolated and retain exact page geometry.
- Resume and cover-letter toolbars now use direct cross-document actions and remove self-links.
- The Operating Attractor Field now runs a continuous role-derived cycle: volatile demand enters, operating controls stabilize it, the stable state remains readable, and the field reopens for the next demand wave.
- The loop pauses offscreen. `prefers-reduced-motion` receives a static settled composition.

## Fresh verification record

- Test-first regression failed against the prior source on the retired route/PDF, stale wording, missing semantic question rows, missing screen styles, missing cross-document labels, and missing loop phases.
- Static correction regression passed against the corrected campaign package.
- `app.js` and `operating-attractor.js` passed `node --check`.
- Browser QA passed 6 routes × 5 viewports = 30 route/viewport combinations at 1440×900, 1280×800, 768×1024, 390×844, and 320×800 with zero horizontal overflow and zero browser errors.
- The executive questions rendered as five semantic rows at every tested viewport; desktop uses a separate marker column and mobile reflows to a compact rail.
- Browser document surfaces expand to the editorial container, remove Letter minimum height, and preserve responsive typography.
- Motion runtime observed `stabilizing → holding → releasing → stabilizing`.
- Reduced motion remained in the settled `holding` state with zero measured pixel drift.
- PDF pagination: resume 2 pages; cover letter 1 page; interview thesis 3 pages; 120-day plan 2 pages; role alignment 1 page.
- Corrected cover-letter and 120-day-plan PDFs were rendered and visually inspected for clipping, overlap, and broken glyphs.

## Publication status

- Corrected source, styles, scripts, regenerated PDFs, and integrity records are published to public `main`.
- Material correction invalidates earlier live proof.
- Independent exact GitHub Pages byte verification remains pending because this environment could not resolve the Pages host during the deployment check.
