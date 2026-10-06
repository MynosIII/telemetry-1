# Circuit articles and photographs

`circuit-stories.json` contains the source-backed opening history, Wikipedia page
and consulted revision. `circuit-articles.json` extends it with original Spanish
prose about the circuit's character, sporting legacy and each layout.

Layout text is keyed by the F1DB layout ID (`monza-7`, `kyalami-2`), not by the
position of a card. Keep these IDs aligned with `public/history/circuit-results.json`.
The first configuration means the first represented in the World Championship
archive, not necessarily the circuit's original construction. Explain intermediate
changes when an ID groups several revisions, and distinguish simultaneous variants
from chronological replacements. Do not infer a construction date from a race date
or a physical modification solely from a change in recorded length.

Sources: the Wikipedia revisions listed in `circuit-stories.json`, plus the
`additionalSources` entries for detailed layout chronology. Text is written as a
summary of historical facts; source paragraphs are not copied. Technical analysis,
results, weather estimates and present-day map geometry remain separate datasets.

`circuit-photos.json` is a reviewed manifest of Commons photos. Each photo must have
a verified file page, author, license, URL and Spanish caption. Captions identify
the scene and distinguish photos taken after the F1 period from historical views.
Do not substitute a track diagram, portrait, photo of another circuit, or an image
with an unverified license just to fill a gallery.

`node scripts/build-circuit-photos.mjs` writes research candidates to the ignored
`.vercel/circuit-photo-candidates.json`; it deliberately does not overwrite the
published manifest. Review file metadata and the image before selecting candidates.
Photos load from Wikimedia; failed loads retain a link to the original file page.

Run `npm run verify:circuits` and `npm run build` after editorial changes. Browser
checks should cover a circuit with several versions, one with a single version,
photo loading, timeline links and mobile layout. Current coverage: 77 articles,
159 layout explanations and 61 photographs across 59 circuit pages.
