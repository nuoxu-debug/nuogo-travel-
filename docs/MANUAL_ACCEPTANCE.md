# Nuogo Manual Acceptance

Use this checklist before the final-year project presentation.

## Core Flow

- [ ] Landing page identifies Nuogo in the first viewport and all images load.
- [ ] Chinese is selected on first visit.
- [ ] Switching to Chinese translates the UI and persists after refresh.
- [ ] Registration, logout, login, and invalid-field feedback work.
- [ ] Planner offers supported mainland-China cities only and contains no open chat field.
- [ ] Daily budget reacts to duration and total budget changes.
- [ ] Conflicting preferences display a useful warning.
- [ ] Generation displays all six animated stages.
- [ ] Budget, food, and leisure variants all appear in comparison.
- [ ] Selecting a variant opens its editable workspace.

## Workspace

- [ ] Day tabs update timeline, guide, budget, and route together.
- [ ] Timeline cards can be added, edited, deleted, and dragged into a new order.
- [ ] One activity and one full day can be regenerated independently.
- [ ] A cheaper alternative lowers the displayed budget.
- [ ] Selecting a map marker highlights and scrolls to the matching activity.
- [ ] Cultural, food, crowd, and visit advice follows the selected activity.

## Collaboration and Archive

- [ ] Authenticated owner/editor/viewer memberships show only their permitted controls.
- [ ] Public view-only links hide mutation controls.
- [ ] Public voting links allow authenticated voting and prevent duplicate user votes without granting member access.
- [ ] Favorites can be added, listed, dragged, and removed.
- [ ] Archive filters draft, upcoming, and completed trips.
- [ ] Duplicate and reuse-preference actions preserve the original trip.

## Collaborative Trip And Split Expenses / 协作行程与费用分摊

- [ ] **EN:** The owner creates an editor invitation from the trip-members drawer.
  **中文：** 行程创建者可在“行程成员”抽屉中创建“可编辑”邀请。
- [ ] **EN:** A second account signs in through the invitation page, accepts, and opens the same trip as an editor.
  **中文：** 第二个账户通过邀请页面登录并接受邀请，随后以可编辑成员身份打开同一行程。
- [ ] **EN:** The editor changes one itinerary activity; after refresh, the owner sees that change and the newer trip revision.
  **中文：** 可编辑成员修改一项行程活动后，创建者刷新页面可看到修改内容与新的行程版本。
- [ ] **EN:** A viewer can read the itinerary and expenses but cannot add, edit, delete, reorder, or regenerate itinerary content.
  **中文：** 仅查看成员可查看行程与费用，但不能新增、编辑、删除、排序或重新生成行程内容。
- [ ] **EN:** The editor records a CNY 300.00 shared expense and initially includes all three travellers.
  **中文：** 可编辑成员记录一笔人民币 300.00 元的多人费用，并先勾选三位同行者。
- [ ] **EN:** After excluding the traveller who did not participate, the preview shows CNY 150.00 for each of the two included travellers.
  **中文：** 排除未参与该费用的同行者后，预览显示两位参与者每人分摊人民币 150.00 元。
- [ ] **EN:** Every participant share adds up to the expense total; member net balances and suggested settlements reconcile to zero.
  **中文：** 每笔费用的成员分摊总和等于费用总额，成员净结余与结清建议最终可核对为零。
- [ ] **EN:** A public share remains read-only and cannot open member management or group expenses.
  **中文：** 公开分享链接保持只读，不能进入成员管理或多人费用功能。
- [ ] **EN:** Expired and revoked invitation links show their correct terminal states and no acceptance action.
  **中文：** 已过期与已撤销的邀请链接显示正确终止状态，且不再提供接受操作。

## Quality

- [ ] Desktop `1440 x 900` has no overlap, clipped controls, or blank route surface.
- [ ] Mobile `390 x 844` keeps readable controls and horizontally safe content.
- [ ] Keyboard focus is visible and icon buttons have accessible names/tooltips.
- [ ] Reduced-motion mode reveals all content without nonessential movement.
- [ ] Browser console and API terminal contain no unhandled errors.
- [ ] `npm test` and `npm run build` both pass.

## Live Adapter Checks

- [ ] OpenRouter key remains server-side and generates schema-valid China plans.
- [ ] MySQL migration applies cleanly and data survives an API restart.
- [ ] Amap key is domain-restricted and markers align with timeline activities.

## Anhui Ingestion

- [ ] Huangshan ingestion completes without visiting a disallowed robots path.
- [ ] The local SQLite database contains attributed pending records.
- [ ] Imported records contain POI IDs, names, counts, source URLs, and remote thumbnails.
- [ ] `attractions:review` changes only the explicitly selected Huangshan records.
- [ ] The planner offers `Huangshan, Anhui` and `安徽黄山`.
- [ ] Huangshan generation returns three non-fallback variants.
- [ ] Every Huangshan activity references an active, approved local attraction.
- [ ] Editing a grounded activity displays its Mafengwo attribution link.
- [ ] Grounded activity cards show attraction images without resizing while loading.
- [ ] The first approved image request redirects to its recorded source and hydrates one bounded local copy.
- [ ] A later request serves the hydrated image from `server/storage/attractions/`.
- [ ] Invalid image hosts, non-image content, and files above 8 MiB are rejected.
- [ ] The selected attraction displays bilingual visit timing, ticket guidance, highlights, and popularity.
- [ ] Image load failures show the Nuogo fallback without breaking the itinerary.
- [ ] The language selector is readable on white workspace headers and dark landing headers.
- [ ] A second normal run uses the cache and creates no duplicate attractions.
- [ ] Disabled Anhui expansion regions reject ingestion until an approved source is configured.
- [ ] No user diary body, user review body, authenticated content, or full-resolution image library is stored.
