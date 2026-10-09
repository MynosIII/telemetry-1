# Grand Prix articles

`grand-prix-articles.json` contains original Spanish prose for the 53 Grand Prix identities in the archive. Citations pin the consulted Wikipedia revision, with additional official or specialist references for Italy, France, Spain and Detroit. Wikipedia extracts are not shipped.

`public/history/grand-prix-editions.json` contains every World Championship race through December 2025, grouped by the actual Grand Prix ID from the race files. Each race links to its existing report and retains shared winners, the winning constructors, grid P1, qualifying time where available, fastest-lap drivers and the availability of TelemetryOne observations. There are no model estimates for historical antecedents.

The separate historical records are transcribed as facts from the cited winner tables. Row spans are expanded before extraction. Year footnote marks do not discard editions, and canceled, replaced and no-winner rows do not become winners or venues. The 1928 Australian race and 1913 RACE event retain their historical context. French city-to-city races retrospectively numbered as Grands Prix are excluded from the official editions table beginning in 1906.

Historical coverage includes editions before 1950 and documented non-championship/other-category editions before or between the World Championship years, up to the final archived World Championship year. It is not an inventory of every later race held under a similar name. Japanese, Moroccan, Malaysian and Pescara category labels are retained where the table provides them. Pacific antecedents in the US are explicitly homonyms. The European honorary title is a separate designation of another race, never an extra calendar round. Brazilian and São Paulo World Championship years are not mislabeled as non-championship editions when the event changed title.

`grand-prix-venues.json` contains circuit references from F1DB and historical locations from the cited source pages. Coordinates of towns, parks or other reference points are labeled, not claimed as the historical starting line. Montichiari's point is the locality, while its further-information link leads to the historic course. The 1906 Le Mans course is not merged with the later Bugatti circuit.

`grand-prix-venue-photos.json` contains licensed illustrations of historical venues. Existing modern circuit photographs retain their own credits. Maps or images from another period are identified in captions; no illustrative aircraft or athletics tracks are used. A venue with no verified illustration keeps its source link and dates rather than substituting an unrelated photo.

Run `npm run build:grand-prix` after refreshing the underlying race dossiers or model. It rebuilds the World Championship rows and preserves the curated historical side and citations. The cutoff stays explicit in the snapshot metadata.

Run `npm run verify:grand-prix` after editing; CI runs it too. It checks complete World Championship coverage, source/category separation, the alternative Italian venues, the first Australian/Spanish/French/Indianapolis records, honorary and renamed events, valid circuit links and photo attribution.
