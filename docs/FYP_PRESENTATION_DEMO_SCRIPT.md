# Nuogo 5-8 Minute FYP Demonstration Script

## 0:00-0:45 - Introduction

"Nuogo is an AI-powered smart travel planner. For this MVP, I focus only on Singapore. This keeps the destination data, route assumptions, testing scope, and budget references controlled enough for a final-year project. The system does not provide booking, payment, live weather, live traffic, or GPS navigation."

Show the landing page.

"The system supports Guest Mode, Registered Users, and a protected System Administrator role. Guest Mode is useful for trying the planner without creating an account. Registered Users can keep and manage their itineraries."

## 0:45-1:45 - Singapore POI Discovery

Choose **Continue as Guest**, continue into the planner, then open **Choose attractions**.

"POI means Point of Interest. These attraction cards come through Nuogo's Singapore discovery pipeline. In live mode, OpenTripMap is the canonical grounding provider. Today I am using deterministic demo fixtures, so the interface labels them as demo data rather than claiming live OpenTripMap verification."

Select two attractions and show their map markers.

"A selected attraction is a high-priority preference. It still has to satisfy schedule, route, density, grounding, and budget constraints. Nuogo does not invent a replacement silently."

## 1:45-2:45 - Travel Preferences

Return to the planner.

"The traveller enters dates, number of travellers, total SGD budget, interests, and preferred POIs. These inputs form the structured trip preferences stored with the trip."

Select one Travel Style.

"The traveller chooses one Travel Style before generation: Budget-Saving, Balanced, or Comfort-Focused. The style changes planning priorities, but every request generates only one itinerary and every style must remain within the same hard budget."

Enable Rainy-Day Backup.

"Rainy-Day Backup is optional. It adds an inactive, grounded contingency next to an outdoor activity. Nuogo does not monitor weather and does not replace the original activity automatically."

## 2:45-4:15 - Generation And Validation

Select **Generate ONE itinerary**.

"The configured live AI route is DeepSeek V3.1 through OpenRouter. The language model proposes a constrained itinerary draft, but it is not trusted to calculate authoritative routes, schedules, or costs."

Point to the validation summary.

"Nuogo deterministically checks the structured schema, grounded POIs, dates, chronology, route continuity, activity density, Travel Style, rainy-day contingency, and hard SGD budget. If a repairable problem exists, the system permits at most one controlled repair and validates again. It either returns a valid itinerary or a controlled error."

"This demonstration uses the deterministic demo AI and travel providers. Live OpenRouter, OpenTripMap, and MySQL checks were not executed because live credentials were unavailable, so I do not present the demo result as live-provider evidence."

## 4:15-5:30 - Itinerary Workspace

Show the selected style, days, activity details, meals, transport rows, map, source labels, and budget panel.

"This is one itinerary workspace backed by a structured itinerary run. Each day shows useful activities and meals. Transport rows show estimates between relevant points when the system has enough data. The browser receives an API response; it never queries database tables directly or shows raw JSON."

"The budget is recalculated from database-backed or demo cost references using SGD minor units. The successful estimated total must be less than or equal to the traveller's hard budget. The remaining budget and per-person estimate are derived values."

Point to the optional contingency.

"The rainy-day alternative is clearly inactive. Its unused cost is not added to the active itinerary total."

## 5:30-6:30 - Registered Itinerary Management

Use **Sign in to save**, register or log in, return to the workspace, and explicitly save the guest itinerary.

"Signing in alone does not transfer guest data. The traveller explicitly claims this one itinerary with a one-time server-verified token. Registered Users can then view it in My trips, rename or edit supported content, regenerate through the real planning pipeline, and delete it. Owner checks prevent another user from accessing the trip."

Open **My trips**, then demonstrate one safe management action.

## 6:30-7:30 - System Administrator

Sign in with the development-only System Administrator account and open `/admin`.

"The System Administrator is implemented through the same USER authentication model. The stored role value is `admin`, representing the logical System Administrator role; there is no separate administrator password table."

Show the three tabs.

"The supporting administration scope is deliberately small: Singapore destination status, canonical POI records, and cost-reference evidence. It does not include booking, payment, user surveillance, tour guides, or weather administration. Updated cost references affect subsequent deterministic planning in the active repository mode."

## 7:30-8:00 - Conclusion

"Nuogo demonstrates a complete Singapore planning workflow: grounded destination discovery, structured preferences, one selected Travel Style, one itinerary, deterministic validation, a hard SGD budget, an optional inactive rainy-day contingency, and secure itinerary management. The main contribution is not just generating text. It is controlling and explaining an AI-assisted itinerary through grounded data and deterministic constraints."
