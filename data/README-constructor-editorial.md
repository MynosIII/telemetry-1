# Constructor articles and emblems

`constructor-articles.json` contains original Spanish writing, with sources for each entry. It covers all 184 constructor IDs in the current archive. 132 entries describe the documented project's origin and evolution. The remaining 52 explicitly limit their account to F1DB race records and their context; they do not infer founders or dates of incorporation from a first race.

The constructor, the entrant, the engine supplier and the owner are separate roles. Original Team Lotus is distinct from Lotus Racing and Lotus F1; the two ATS projects are separate. Indianapolis builders are described in the context of the 1950–1960 World Championship inclusion of the 500, rather than as European factory teams. Existing lineage, car index, results and TelemetryOne analysis remain on each page.

Wikipedia references pin the consulted revision. Text is written independently; no extracts are shipped. Statistics stop at December 2025, even if references describe subsequent events.

`constructor-photos.json` contains photographs from Commons with author, source, license and contextual captions. Historic cars displayed at later exhibitions are identified as such. The image component provides a link to the original when an external image is unavailable.

`constructor-logo-sources.json` records authentic replacement emblems and whether they represent the team or its parent manufacturer. These marks represent identity, not every historical variant. Logos are trademarks; a simple or public-domain graphic license does not waive trademark rights.

The central `lib/team-logos.json` registry no longer assigns trees (Balsa), a church (Krakau), surname coats of arms (McGuire), race-car photos (Deidt, LEC, Rebaque, Shadow, Spirit) or group photos (Snowberger) as logos. Sponsor composites without a verified clean replacement use the existing name badge. Historic constructor names that themselves include a commercial identity, such as Iso-Marlboro or Benetton, are preserved.

Run `node scripts/verify-constructors.mjs` after editing. Add text only after checking that the reference concerns the actual constructor, not a surname, a modern namesake or a different entrant.
