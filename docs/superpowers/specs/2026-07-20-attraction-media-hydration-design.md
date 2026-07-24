# Nuogo Attraction Media Hydration Design

## Goal

Make grounded Huangshan itineraries visually useful without delaying itinerary
generation. Activities show an approved source image immediately, Nuogo caches
that image locally in the background, and future requests use the local copy.
The same change enriches attraction details and fixes the unreadable language
selector on light headers.

## Current Problem

The Anhui ingestion catalogue stores a Mafengwo thumbnail URL and popularity
counts for each approved attraction, but generated activities do not carry
image metadata. The shared activity contract and persistence layer have no
image fields, and the workspace card has no image region. Catalogue
descriptions are also null, so the demo provider emits generic copy.

`LanguageToggle` always uses white inactive text and a white border because it
was designed for the dark landing-page header. Those styles become invisible
on the white workspace header.

## Architecture

### Attraction catalogue

Approved attraction records expose:

- Source thumbnail URL
- Local media URL when hydration has completed
- Image attribution and source provider
- Bilingual summary
- Suggested visit duration
- Best visit period
- Opening-hours guidance
- Ticket guidance
- Popularity counts
- Bilingual practical highlights

The eight approved Huangshan attractions receive curated bilingual detail data.
Factual details that can change are phrased as guidance and direct users to
confirm current rules at the attributed source.

### URL-first image hydration

Generated activities receive a stable Nuogo media URL associated with the
approved attraction plus the original image attribution. The browser requests
that URL normally.

The media endpoint:

1. Looks up the attraction and image URL in the approved local catalogue.
2. Serves an existing local file when present.
3. On a cache miss, downloads only the database-listed URL from an approved
   Mafengwo image host.
4. Accepts only successful image responses with a supported MIME type and a
   bounded file size.
5. Saves the file under `server/storage/attractions/` using an opaque,
   server-generated filename.
6. Updates `attraction_images.local_path` and serves the saved file.
7. Returns a visual placeholder when hydration fails without breaking the
   itinerary.

The endpoint never accepts a caller-supplied URL or filesystem path. This
prevents the image cache from becoming an SSRF or arbitrary-file primitive.
Concurrent requests for the same attraction share one in-flight hydration
operation.

### Activity contract and persistence

Grounded activities add optional media and detail fields:

- `imageUrl`
- `imageAttribution`
- `visitDetails`

`visitDetails` contains bilingual or locale-neutral values for duration, best
time, opening guidance, ticket guidance, popularity, and highlights.

The demo and OpenRouter paths both receive these fields from the approved
catalogue. Grounding overwrites model-supplied media and details with catalogue
values, just as it currently does for source provenance and verified
coordinates. MySQL receives JSON columns for the structured detail object and
columns for the image URL and attribution.

### Frontend

Activity cards become a stable three-column layout on wide card widths:
time rail, image thumbnail, and content. On narrow widths the image becomes a
full-width strip within the content region. Images use fixed aspect ratios,
lazy loading, `object-fit: cover`, and a branded fallback.

The selected-attraction guide panel gains a larger image followed by scannable
visit facts and the existing cultural, food, crowd, and visit guidance.
Anime.js fades and slightly scales the selected image and staggers the facts
when the selected activity changes. Reduced-motion preferences continue to
disable meaningful motion.

Image attribution remains visible in the detail view and the existing source
link remains available in the activity editor.

### Language selector

`LanguageToggle` accepts a `tone` property:

- `dark`: translucent dark-header treatment with white inactive text
- `light`: ink border and inactive text with a jade active segment

`AppShell` selects the tone from its existing `dark` property. The mobile menu
uses the light treatment on its white surface. Both options retain
`aria-pressed`, visible focus styles, and readable contrast.

## Error Handling

- Missing image metadata renders the branded fallback.
- Hydration timeout, invalid content type, excessive content length, or remote
  failure returns the fallback and records no local path.
- A failed image never fails itinerary generation or trip retrieval.
- Broken browser image loads switch to the fallback without layout shift.
- Unsupported or ungrounded destinations continue to work without media
  fields.

## Testing

Server tests cover:

- Approved catalogue media and detail mapping
- URL-first activity generation
- Grounding replacement of model-supplied image metadata
- Cache hit and cache miss behavior
- Host, MIME type, size, and path protections
- MySQL activity persistence mappings

Client tests cover:

- Grounded activity image rendering
- Image fallback behavior
- Rich selected-attraction details
- Light and dark language-toggle contrast classes
- Existing editing, source attribution, and language persistence behavior

Final verification includes the complete test suite, production build, live
health checks, and desktop/mobile screenshots of a generated Huangshan trip.

