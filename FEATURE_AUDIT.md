# Sasya Setu — Feature Audit (Stage 1)

> **Snapshot date:** 2026-09-25
> **Scope of this stage:** Login/auth flow, Farmer role, Buyer role.
> **Method:** Read-only investigation of `src/App.tsx`, `src/lib/*`, `src/components/*`, and `supabase/migrations/*`.
> No code, data, or configuration was modified.

---

## 1. Login / Auth Flow, Role Selection, Demo Verification

### 1.1 Role Selection Screen
- **Status:** Real (Supabase Auth) + Mock (UI flow)
- **What it does:** Shows 4 role cards (Farmer, Buyer, Storage Provider, Transport Provider). FPO is hidden from the login screen (`visibleRoles = allRoles.filter(r => r !== 'FPO')`). Tapping a role enters a 3-step login flow.
- **Key data:** `profiles` table (read), `user_roles` table (read), `claim_demo_role` RPC (write).
- **Known issues:** FPO role is hidden from the login screen but still exists in the `allRoles` array and has full translations. Voice assistant also blocks FPO login (`HIDDEN_ROLES = ['FPO']`).

### 1.2 Login Flow (3-step)
- **Status:** Mock (UI flow) → Real (Supabase Auth on submit)
- **What it does:** Three-step wizard: (1) Enter mobile number — any number accepted, no SMS sent. (2) Enter 6-digit OTP — any 6 digits accepted, no verification. (3) Role-specific verification screen. On final submit, calls `signInWithRole()` which uses real Supabase `signInWithPassword()` with hardcoded demo credentials (`demoEmails[role]` / `'Demo1234!'`), then calls `claim_demo_role` RPC to assign the selected role.
- **Key data:** `profiles` (read/write `buyer_category`, `language`), `user_roles` (read), `claim_demo_role` RPC.
- **Known issues:** OTP is cosmetic — any 6 digits passes. Mobile number is never stored or used. The "Demo Verified" badge and verification fields (farmer ID, FPO registration number, provider permit) are hardcoded strings, not fetched from any verification table.

### 1.3 Buyer Category Selection
- **Status:** Real (persists to profiles)
- **What it does:** Step 3 for Buyer role shows 4 category options (Normal Buyer, Bulk Buyer, Retail Buyer, Institutional Buyer). Selected category is written to `profiles.buyer_category` on sign-in.
- **Key data:** `profiles.buyer_category` (write).
- **Known issues:** None.

### 1.4 Farmer Verification Display
- **Status:** Mock (hardcoded display)
- **What it does:** Step 3 for Farmer shows verification fields (Farmer ID: `TG-WGL-1042`, Name: `Ramesh Kumar`, Category: `Land Owner`, Gov Verification: `Demo Verified`). All values come from a hardcoded `rameshVerificationData` constant.
- **Key data:** None read or written — display only.
- **Known issues:** Verification data is hardcoded to Ramesh Kumar. The `profiles` table has `farmer_verification_id` and `farmer_category` columns but they are not used in the login flow.

### 1.5 Session Management
- **Status:** Real
- **What it does:** `AuthProvider` subscribes to `supabase.auth.onAuthStateChange()`, loads profile + role on session change, exposes `{ session, profile, role, loading }` to the app. Sign-out calls `supabase.auth.signOut()`.
- **Key data:** `profiles` (read), `user_roles` (read), Supabase Auth session.
- **Known issues:** A `signingInRef` guard prevents double-loading during the sign-in flow. If the guard misfires, profile/role may not load until next session event.

### 1.6 Language Switching
- **Status:** Real (persists to profiles)
- **What it does:** Language picker (EN/TE/HI) in the UI calls `updateLanguage()` which writes `profiles.language`. The app immediately switches UI text.
- **Key data:** `profiles.language` (write).
- **Known issues:** None.

### 1.7 Notifications
- **Status:** Real (Supabase table) + Mock (demo seed)
- **What it does:** Bell icon on home screen opens a notifications panel. Fetches from `notifications` table, supports mark-as-read (single + bulk). On first load, `seedDemoNotificationsIfNeeded()` inserts 3 demo notifications (transport request, payment successful, shortage) if the table is empty.
- **Key data:** `notifications` (read, update, insert).
- **Known issues:** Demo seed notifications use translation keys as title/body (e.g. `'notifications.transportRequest'`), not literal text — so they render correctly in the current language but are static demo content, not real system events.

---

## 2. Farmer Role

### 2.1 My Crops — Upcoming Tab
- **Status:** Real
- **What it does:** Fetches the farmer's own crop listings from `crop_listings` where status = `Upcoming`. Displays as flip cards with crop photo, quantity, indicative price, harvest date, and FarmEye verification badge. Flip side shows specs (variety, quantity, booked quantity, remaining quantity, harvest date, market info) and action buttons: Edit, Mark Harvested, View Buyer Requests.
- **Key data:** `crop_listings` (read, via `fetchMyListings`), `crops` (joined).
- **Known issues:** When the DB returns no listings, a hardcoded "demo buffer card" is shown so the UI is never blank. Crop photos are from a hardcoded Pexels URL map (`cropPhotoFor`), not from farmer uploads.

### 2.2 My Crops — Harvested Tab
- **Status:** Real
- **What it does:** Same as Upcoming but filters for status = `Harvested` or `Sold`. Shows the Price Clock — a descending price computed client-side from `price_start_per_kg`, `price_floor_per_kg`, `step_drop_amount`, `step_interval_minutes`, and `price_drop_started_at` columns. Displays current price and "next drop in X minutes" countdown.
- **Key data:** `crop_listings` (read), price clock columns (read).
- **Known issues:** Price clock is computed in real-time on the client (`computeCurrentPrice`, `nextDropMinutes`). No server-side trigger updates a stored "current price" — it's always derived. If the browser clock is wrong, the displayed price will be wrong.

### 2.3 My Crops — Cluster Tab
- **Status:** Real
- **What it does:** Shows two sub-sections: (a) **Cluster Invites** — clusters matching the farmer's unclustered listings by crop name, location, and harvest window (±7 days). Each invite card shows crop, location, farmer count, contribution preview, payout preview, and Accept/Deny buttons. (b) **My Clusters** — clusters the farmer has already joined, showing contribution, payout share %, harvest window, and price clock for harvested clusters. Tapping a cluster opens a detail modal with member list, per-fmer earnings, and shared transport/storage costs.
- **Key data:** `crop_clusters` (read), `crop_cluster_members` (read), `dismissed_cluster_invites` (read/insert), `crop_listings` (read), `profiles` (read for names), `join_cluster` RPC (write).
- **Known issues:** Invite matching is done client-side (crop name + location + harvest window). The `estPricePerKg` used in payout calculations is hardcoded to ₹25 when no member listing price is available. Payout amounts shown are estimates, not actual settled amounts.

### 2.4 Market (Farmer view)
- **Status:** Partial
- **What it does:** Farmer-side market view shows: (a) **Market Compare** — a calculator comparing the farmer's price against mandi benchmark rates and distant market prices. Includes vehicle cost calculations and a "post demand" button (disabled). (b) **Public Listings** — real crop listings from all farmers via `fetchPublicListings`, displayed as `CropFlipCard` components. (c) **Clusters** — real cluster listings via `fetchClusters`.
- **Key data (real):** `crop_listings` (read via `fetchPublicListings`), `crop_clusters` (read via `fetchClusters`).
- **Key data (mock):** `todayPrices` array (hardcoded mandi benchmark prices per crop), `distantMarkets` array, `calcVehicles` array, `mandiOptions` array — all hardcoded in App.tsx.
- **Known issues:** Mandi benchmark prices, "vs last week" deltas, and demand signals are hardcoded. The "Post Demand" button is explicitly disabled (voice command `postDemand` marked `unavailable`). Truck dispatch confirmation is UI-only with no persistence. Translation key `market.sampleMarketData` says "Not Live Prices."

### 2.5 Harvest Calendar
- **Status:** Partial
- **What it does:** Monthly calendar grid showing harvest events. Fetches the farmer's real listings and overlays them on a hardcoded set of mock calendar events (`mockMonthEvents` — 12 months of fake harvest events for Tomato, Onion, Paddy, Chilli, Banana, Groundnut). Shows legend with stage icons (verified, harvested, transport, sold, paid).
- **Key data (real):** `crop_listings` (read via `fetchMyListings`).
- **Key data (mock):** `mockMonthEvents` in `CalendarDayCell.tsx` — 12 months of hardcoded fake events. `getMockMonthDays()` builds a 35-cell grid using hardcoded 2026 month offsets.
- **Known issues:** The calendar grid is entirely mock data with real listings overlaid. No `calendar` or `events` table exists. Month offsets are hardcoded for 2026 and will be wrong in 2027.

### 2.6 Transport
- **Status:** Mock
- **What it does:** Shows a list of transport markets with hardcoded provider names, vehicle types, sample distances (150 km), and price estimates. Booking a truck is local state only — no persistence. A "Demo" badge is shown.
- **Key data:** None. No transport tables are queried anywhere in the codebase.
- **Known issues:** Fully simulated. No transport provider, vehicle, or booking tables exist in the database. Translation key `transport.demoVerified` says "Demo Verified."

### 2.7 Storage
- **Status:** Mock
- **What it does:** Shows storage facility listings with hardcoded names, locations, capacity, and pricing. "Request Storage" button shows a notification but does not persist.
- **Key data:** None. No storage tables are queried.
- **Known issues:** Fully simulated. No storage facility, request, or approval tables exist in the frontend data layer. Translation key `storage.notLiveGps` indicates no live GPS.

### 2.8 FPO Network
- **Status:** Mock
- **What it does:** Shows two hardcoded FPO cards (Warangal Farmers FPO, Hanamkonda Growers FPO) with "View FPO" buttons that show a notification ("Connect request opened"). No FPO data is fetched or persisted.
- **Key data:** None. No FPO tables are queried.
- **Known issues:** Translation key `fpo.sampleProfile` = "Sample Profile." FPO role is hidden from login. The FPO tab is only visible to Farmer role.

### 2.9 Tutorials
- **Status:** Mock
- **What it does:** Static tutorial content page with text guidance. No video, no interactive content, no progress tracking.
- **Key data:** None.
- **Known issues:** Translation key `tutorials.guidanceOnly` = "Guidance Only." No tutorials table exists.

### 2.10 Help & Dispute
- **Status:** Mock
- **What it does:** Help page with three options: Talk to Support (shows a phone preview notification), Raise Dispute (opens dispute form), Open Guidance (opens tutorials). Dispute form has fields for order/crop, what happened, and preferred next step — but the submit button only shows a notification ("Dispute submitted in the prototype") and does not persist.
- **Key data:** None. No disputes or support tables are queried.
- **Known issues:** Translation key `dispute.submitted` = "Dispute submitted in the prototype." `help.talkToSupport.body` = "Phone support is mocked in this prototype."

### 2.11 Profile (Farmer)
- **Status:** Partial
- **What it does:** Shows farmer profile with display name and home location from `profiles` table. Farmer verification section shows category, gov verification (PM-Kisan), verification doc (Aadhaar linked), land ownership (3.2 hectares), crops cultivated (hardcoded "Tomato, Onion, Paddy"), quantity harvested (hardcoded). Language picker and sign-out button.
- **Key data (real):** `profiles.display_name`, `profiles.home_location`, `profiles.farmer_category`, `profiles.language`.
- **Key data (mock):** "Crops cultivated" = hardcoded string. "Quantity harvested" = `profile.sampleQuantity` translation key. "4.7 · Demo rating" = `profile.demoRating`. Land details = hardcoded "3.2 hectares."
- **Known issues:** Profile photo is a colored circle with initials, not a real photo. Rating is a demo string.

### 2.12 FarmEye Satellite Verification (detail view)
- **Status:** Real (DB columns) + Mock (satellite imagery)
- **What it does:** Detail view accessible from the FarmEye badge on crop cards. Shows verification status across 5 phases: (1) Listing verified, (2) Vegetation reading, (3) Harvest timing verified, (4) Harvest quantity verified, (5) Verified at timestamp. Data comes from real `crop_listings` columns: `listing_verified`, `listing_verified_at`, `listing_vegetation_reading`, `harvest_timing_verified`, `harvest_quantity_verified`, `harvest_verified_at`.
- **Key data:** `crop_listings` verification columns (read).
- **Known issues:** Satellite imagery is not real — no actual satellite API is called. The vegetation reading is a text string stored in the DB (e.g. "NDVI 0.72"), seeded by migrations. The "5 phases" are a UI presentation of DB columns, not a live satellite verification pipeline.

---

## 3. Buyer Role

### 3.1 Explore Crops (Market view — Buyer side)
- **Status:** Real
- **What it does:** Shows all public crop listings (`is_visible = true`) as flip cards (`CropFlipCard`). Front shows photo, status, quantity, current price. Back shows mandi benchmark rate, specs (quantity, harvest date, farmer name, mandi yard), and a "Buy Now" or "Book" button. Also shows cluster listings. Buyer can tap a card to open `BuyerCropDetail`.
- **Key data:** `crop_listings` (read via `fetchPublicListings`), `crop_clusters` (read via `fetchClusters`).
- **Known issues:** Farmer name on the flip card is `listing.owner_id.slice(0, 8)` (first 8 chars of UUID) — a pseudo-name, not the real display name. Farmer rating is hash-derived (`mockFarmerRatingFor`). Mandi yard defaults to `listing.location_area ?? 'Warangal, TS'`. The "FarmEye Verified" badge and "EXPORT QUALITY" label on flip cards are cosmetic.

### 3.2 Buyer Crop Detail
- **Status:** Partial
- **What it does:** Detail view for a selected crop listing. Shows crop photo, name, variety, quantity, price, harvest date, farmer name/rating, FarmEye verification status, and action buttons: "Buy Now" (instant purchase) and "Book with Token" / "Book Full Payment."
- **Key data (real):** `CropListing` object passed from market view (from `crop_listings` table).
- **Key data (mock):** Farmer name via `mockFarmerNameFor()` (hash-derived from owner_id). Farmer rating via `mockFarmerRatingFor()` (hash-derived, always 4.x).
- **Known issues:** Farmer name and rating are fake. No way to contact the farmer or view their other listings.

### 3.3 Buyer Payment / Booking Flow
- **Status:** Real (order persisted) + Mock (no payment gateway)
- **What it does:** Payment screen with two options: "Pay Token" (advance percentage) and "Pay Full Amount." On confirm, calls `bookListing(crop.id, paymentType)` RPC which creates an `orders` row, deducts quantity from `crop_listings.available_quantity_kg`, and returns order details. Shows success confirmation with order ID, quantity, unit price, total, and amount paid.
- **Key data:** `orders` (insert via `book_listing` RPC), `crop_listings.available_quantity_kg` (decremented by RPC).
- **Known issues:** No real payment gateway — "payment" is just a DB flag (`payment_type: 'token' | 'full'`, `amount_paid`, `token_percent`). Translation key `deals.notRealPayment` = "Not Real Payment · Prototype payment states only." No money actually moves.

### 3.4 Buy Now
- **Status:** Real
- **What it does:** Instant purchase button on crop cards. Calls `buyNow(listingId)` RPC which creates an order, marks the listing as `Sold`, and returns order details.
- **Key data:** `orders` (insert via `buy_now` RPC), `crop_listings.status` (set to `Sold`).
- **Known issues:** Same as booking — no real payment. The listing is immediately marked Sold, removing it from the market.

### 3.5 My Orders
- **Status:** Real
- **What it does:** Fetches all orders for the current buyer from `orders` table, joined with `crop_listings` and `crops`. Shows order cards with crop name, quantity, unit price, total amount, payment type, status, and booked-at date. Status badges show order state (Booked, Sold, etc.).
- **Key data:** `orders` (read via `fetchMyOrders`), `crop_listings` (joined), `crops` (joined).
- **Known issues:** "Pay Balance" button is explicitly disabled (voice command `payBalance` marked `unavailable`). "View Map" is also disabled (`openMap` unavailable). No way to cancel an order.

### 3.6 Deals
- **Status:** Mock
- **What it does:** Shows a single hardcoded payment card with a 3-state payment tracker (Initial Payment → Payment Pending → Payment Completed). "Pay Balance" button shows a notification but does not persist.
- **Key data:** None.
- **Known issues:** Not surfaced as a tab on the Buyer home screen (Buyer home shows: Explore Crops, My Orders, Tutorials, Help & Dispute). The `DealsView` component exists and the `deals` view type is in the union, but it is only reachable via voice navigation or direct view routing. Translation key `deals.notRealPayment` = "Not Real Payment · Prototype payment states only."

### 3.7 Tutorials (Buyer)
- **Status:** Mock
- **What it does:** Same static tutorial content as Farmer, with buyer-specific translation keys.
- **Key data:** None.
- **Known issues:** Same as Farmer tutorials — "Guidance Only," no table.

### 3.8 Help & Dispute (Buyer)
- **Status:** Mock
- **What it does:** Same Help/Dispute flow as Farmer. Dispute form does not persist.
- **Key data:** None.
- **Known issues:** Same as Farmer Help & Dispute.

### 3.9 Profile (Buyer)
- **Status:** Partial
- **What it does:** Shows buyer profile with hardcoded name ("Venkat Reddy"), location, buyer category (from `profiles.buyer_category`), mobile number (hardcoded "+91 98765 43210"), Google account (hardcoded "venkat@example.com"). Language picker and sign-out.
- **Key data (real):** `profiles.buyer_category`, `profiles.language`.
- **Key data (mock):** Name, mobile number, Google account — all hardcoded.
- **Known issues:** Profile name is hardcoded to "Venkat Reddy" regardless of the actual `profiles.display_name`.

---

## 4. Cross-Cutting Features (Farmer + Buyer)

### 4.1 Price Clock (Descending Price on Harvested Cards)
- **Status:** Real
- **What it does:** Dutch-auction style price decay on harvested crop listings and clusters. Current price computed client-side from `price_start_per_kg`, `price_floor_per_kg`, `step_drop_amount`, `step_interval_minutes`, and `price_drop_started_at`. Shows "next drop in X minutes" countdown. Stops at floor price.
- **Key data:** `crop_listings` price clock columns (read), `crop_clusters` price clock columns (read).
- **Known issues:** Computed entirely on the client from DB columns. No server-side trigger or scheduled job updates a stored "current price" — it's always derived from `price_drop_started_at` + elapsed time. If the browser clock is wrong, the price is wrong.

### 4.2 Crop Clusters (Matching, Invites, Payout, Cost Sharing)
- **Status:** Real
- **What it does:** Full cluster lifecycle: clusters form around matching crop listings (same crop, location, harvest window). Farmers receive invites, can accept (via `join_cluster` RPC) or deny (via `dismissed_cluster_invites` insert). Cluster detail shows member list, per-farmer payout shares, shared transport/storage costs. Harvested clusters show earnings summary.
- **Key data:** `crop_clusters` (read), `crop_cluster_members` (read), `dismissed_cluster_invites` (read/insert), `crop_listings` (read), `profiles` (read), `join_cluster` RPC (write).
- **Known issues:** Invite matching is client-side only. Payout estimates use a hardcoded ₹25/kg fallback when no listing price is available. No actual payout disbursement — amounts are calculated but not transferred.

### 4.3 FarmEye Satellite Verification
- **Status:** Real (DB columns) + Mock (no live satellite)
- **What it does:** 5-phase verification displayed on crop cards and detail view: (1) Listing verified, (2) Vegetation reading (NDVI), (3) Harvest timing verified, (4) Harvest quantity verified, (5) Verified-at timestamp. Verification status drives the "Verified" badge on crop cards.
- **Key data:** `crop_listings.listing_verified`, `listing_verified_at`, `listing_vegetation_reading`, `harvest_timing_verified`, `harvest_quantity_verified`, `harvest_verified_at` (all read).
- **Known issues:** No live satellite API is called. All verification data is seeded by migrations. The "satellite" icon and animation are cosmetic. No backend process updates verification status — it's static seed data.

### 4.4 Voice Assistant (Sarvam Integration)
- **Status:** Real (edge functions) + Partial (intent matching)
- **What it does:** Full voice assistant with turn-taking: microphone capture → Sarvam STT (edge function) → Gemini intent classification (edge function) → action routing → Sarvam TTS (edge function) → audio playback. Supports navigation, form filling, role selection, language switching, and screen narration. Local rule-based fallback parser if edge function fails.
- **Key data:** No direct DB access. Calls 3 edge functions: `sarvam-stt`, `voice-intent`, `sarvam-tts`.
- **Known issues:** `UNAVAILABLE_INTENTS` = { `post_demand`, `start_journey`, `open_map`, `pay_balance` } — these voice commands are explicitly disabled. `HIDDEN_ROLES = ['FPO']` — voice login as FPO is blocked. The `applyIntentResult` function recently fixed to use Gemini's `speechReply` when confidence ≥ 0.3 instead of falling through to "didn't understand."

### 4.5 Language Switching (EN/TE/HI)
- **Status:** Real
- **What it does:** Three-language support (English, Telugu, Hindi). Language picker in profile and login screen. All UI text uses translation keys via `makeT(lang)`. Language preference persisted to `profiles.language`.
- **Key data:** `profiles.language` (write).
- **Known issues:** Some translation keys may be missing in certain languages (hard to verify without full translation audit).

### 4.6 Notifications
- **Status:** Real (table) + Mock (demo seed)
- **What it does:** Bell icon on home screen. Fetches from `notifications` table. Supports mark-as-read (single and bulk). Seeds 3 demo notifications if table is empty.
- **Key data:** `notifications` (read, update, insert).
- **Known issues:** No real notification triggers exist — notifications are only the 3 demo seeds. No server-side process creates notifications from events (orders, cluster joins, etc.).

---

## Summary (Stage 1)

**Feature count so far:**
- Login/Auth: 7 features (5 real, 2 mock)
- Farmer: 12 features (5 real, 5 mock, 2 partial)
- Buyer: 9 features (4 real, 3 mock, 2 partial)
- Cross-cutting: 6 features (4 real, 2 partial)
- **Total: 34 features — 18 real, 10 mock, 6 partial**

**Real vs Mock ratio:** ~53% real, ~29% mock, ~18% partial.

**Biggest gap/risk for a demo:** The entire Transport, Storage, and FPO Network experience for the Farmer is fully mocked with hardcoded data and no database backing. If a demo attendee taps "Transport" or "Storage," they will see static sample content with "Demo" badges and no interactive functionality. The second-biggest risk is that "payment" is not real — booking and buy-now persist orders but no money moves, and the "Deals" tab (which shows payment states) is not even surfaced on the Buyer home screen.

---

## 5. FPO Role

> **Login status:** FPO is still hidden from the login screen. The `Login` component filters it out via `visibleRoles = allRoles.filter(r => r !== 'FPO')`, and the voice assistant blocks it via `HIDDEN_ROLES = ['FPO']`. However, the FPO role exists in `allRoles`, has full translations, a demo email (`demoEmails.FPO`), and a complete `RoleHome` feature grid. It is reachable only via voice navigation's `autoRouteToDestination` or by manually signing in with the FPO demo credentials. The login step 3 screen shows hardcoded FPO verification fields: FPO Name ("Warangal Farmers FPO"), Registration Number ("TG-FPO-2019-0452"), Org Verification ("Demo Verified").

### 5.1 Member Crops
- **Status:** Real
- **What it does:** Same `CropView` component as Farmer. Shows crop listings with Upcoming/Harvested/Cluster tabs. Since the FPO demo account owns listings in the DB (seeded by migrations), these tabs show real data — upcoming crops, harvested crops with price clock, and cluster invites/memberships.
- **Key data:** `crop_listings` (read via `fetchMyListings`), `crop_clusters` (read), `crop_cluster_members` (read), `dismissed_cluster_invites` (read/insert), `join_cluster` RPC.
- **Known issues:** The FPO role is subject to the same cluster membership restriction as farmers (`enforce_farmer_only_cluster_membership` migration). If the FPO demo account doesn't own listings, the tabs will be empty except for the demo buffer card. The FPO's own listings are seeded, but the cluster membership enforcement may prevent the FPO from joining clusters.

### 5.2 Market (FPO view)
- **Status:** Partial
- **What it does:** Same `MarketView` component as Farmer. Shows market compare calculator, public listings, and clusters. The FPO-specific translation key `feature.Market FPO.body` is used for the feature card description. The FPO also sees a transport provider card on the transport search page (`role === 'FPO'` check in `TransportOptions`).
- **Key data (real):** `crop_listings` (read via `fetchPublicListings`), `crop_clusters` (read via `fetchClusters`).
- **Key data (mock):** Same hardcoded mandi prices, distant markets, and vehicles as Farmer.
- **Known issues:** Same as Farmer Market — mandi benchmark prices are hardcoded. The FPO-specific transport provider card ("Warangal FPO Transport") on the transport search page is cosmetic.

### 5.3 Harvest Calendar (FPO view)
- **Status:** Partial
- **What it does:** Same `CalendarView` as Farmer. Shows the FPO's real listings overlaid on hardcoded mock calendar events. Uses `feature.Member Calendar.body` translation key.
- **Key data (real):** `crop_listings` (read via `fetchMyListings`).
- **Key data (mock):** `mockMonthEvents` in `CalendarDayCell.tsx`.
- **Known issues:** Same as Farmer calendar — mock events with hardcoded 2026 month offsets.

### 5.4 Transport Provider (FPO view)
- **Status:** Mock
- **What it does:** Same `TransportOptions` component as Farmer, but with an additional FPO-specific provider card shown on both the search and results screens. The card shows "Warangal FPO Transport" with an "Update Availability" button that only shows a notification. The FPO feature card label is `feature.Transport Provider` (not "Transport").
- **Key data:** None. No transport tables queried.
- **Known issues:** Fully simulated. The FPO transport provider card is cosmetic — "Update Availability" only shows a notification. The transport search, vehicle selection, and booking confirmation are all local state with no persistence.

### 5.5 Storage (FPO view)
- **Status:** Mock
- **What it does:** Same `StorageView` component as Farmer (the non-Storage-Provider branch). Shows the 3-step storage booking flow with hardcoded facilities. Uses `feature.Storage FPO.body` translation key.
- **Key data:** None for the FPO-specific path. The `fetchMyListings` call in step 2 fetches the FPO's real listings for crop selection, but the booking itself is not persisted.
- **Known issues:** Same as Farmer Storage — fully simulated booking with no persistence. "Demo reservation — no real booking made" disclaimer shown.

### 5.6 Tutorials (FPO)
- **Status:** Mock
- **What it does:** Same `TutorialsView` component, with FPO-specific tutorial data from `tutorialData['Farmer']` (the FPO tutorials role key maps to the Farmer tutorial set). Uses `feature.FPO Tutorials.body` translation key.
- **Key data:** None.
- **Known issues:** FPO tutorials reuse the Farmer tutorial content — no FPO-specific tutorial videos or guides. "Guidance Only" disclaimer.

### 5.7 Help & Dispute (FPO)
- **Status:** Mock
- **What it does:** Same `HelpView`/`DisputeView` as Farmer. Uses `feature.FPO Help.body` translation key.
- **Key data:** None.
- **Known issues:** Same as Farmer — dispute form does not persist. "Dispute submitted in the prototype."

### 5.8 Profile (FPO)
- **Status:** Partial
- **What it does:** Same `ProfileView` component. Shows profile with display name and home location from `profiles` table. The FPO-specific verification section would show FPO registration details, but these are hardcoded in the login flow, not in the profile view. Language picker and sign-out.
- **Key data (real):** `profiles.display_name`, `profiles.home_location`, `profiles.language`.
- **Key data (mock):** Same hardcoded profile details as Farmer (land ownership, crops cultivated, rating).
- **Known issues:** Profile view is shared across all roles — no FPO-specific fields (registration number, member count, crop focus) are displayed.

---

## 6. Storage Provider Role

### 6.1 Storage Requests
- **Status:** Mock
- **What it does:** The `StorageView` component branches on `role === 'Storage Provider'` to show a dedicated storage provider workspace. Displays a facility header ("Krishna Cold Storage, Warangal, Telangana" with WDRA License #WDRA-2026-AP09). Shows 4 hardcoded incoming storage requests (`spRequestsSeed`) from farmers and FPOs, each with crop photo, temperature regime (Chilled/Cool/Controlled Atmosphere), deposit window, farmer name, village, district, crop variety, packaging, batch count, quantity, and estimated revenue. Search bar filters by farmer/crop/village. Filter chips filter by temperature regime. "Review request" button opens a review modal (`SpReviewModal`) showing lot details (moisture, grade, arrival date, chamber temp/humidity), chamber allotment (3 chambers: CH-A1, CH-B2, CH-C3), and bay/rack assignment (hash-derived). Approve button shows "Gate Pass issued" notification; Decline shows "Capacity full" notification. Neither action persists.
- **Key data:** None. All 4 requests are hardcoded in `spRequestsSeed`. No `storage_requests` table is queried.
- **Known issues:** All requests are static seed data — no new requests ever appear. Approve/Decline are local state only with no DB persistence. Chamber allotment is cosmetic — selecting a chamber doesn't reserve it. Bay/rack assignments are hash-derived from the request ID, not from any real inventory system. The sub-tab navigation links to "My Approvals" but the Storage Requests tab has no badge for pending count beyond the seed array length.

### 6.2 My Approvals
- **Status:** Mock
- **What it does:** The `ApprovalsView` component shows two segments: Current (2 hardcoded "in-vault" approvals) and Previous (1 hardcoded "released" approval). Each approval card shows farmer name, crop, variety, deposit date, chamber/bay, cold-chain temp/humidity, gate pass number, e-NWR ID, and net weight. For released approvals, shows release date, final earnings, and gate exit pass. "e-Receipt / Gate Pass" button opens `SpEnwrModal` showing a full e-NWR receipt with WDRA accreditation, QR code placeholder, depositor details, commodity details, storage conditions, insurance & valuation, and print/download buttons (notifications only).
- **Key data:** None. All approvals are hardcoded in `spCurrentApprovals` (2 entries) and `spPreviousApprovals` (1 entry).
- **Known issues:** No `storage_approvals` or `eNWR` table exists. All data is static seed. Print and download buttons only show notifications — no actual PDF or print is generated. The e-NWR IDs, gate pass numbers, and chamber assignments are hardcoded strings. No way to release an in-vault approval or create a new approval from the Storage Requests tab (the approve action in Storage Requests only shows a notification, it doesn't move a request into the Current approvals list).

### 6.3 Storage Listings (Storage Provider view)
- **Status:** Mock
- **What it does:** The Storage Provider does NOT have a separate "Storage Listings" tab on their home screen. The Storage Provider home screen shows: Storage Requests, My Approvals, Tutorials, Help & Dispute. The `storageFacilities` array (3 facilities: Storage A/B/C) is used only in the Farmer/FPO/Buyer storage booking flow, not in the Storage Provider's own views.
- **Key data:** None.
- **Known issues:** The Storage Provider has no way to manage their own facility listings, capacity, pricing, or availability. The facility details shown in the Storage Requests header (Krishna Cold Storage, WDRA license) are hardcoded in the component, not editable.

### 6.4 Transport (Storage Provider view)
- **Status:** Mock
- **What it does:** The Storage Provider does NOT have a Transport tab on their home screen. The home screen shows only: Storage Requests, My Approvals, Tutorials, Help & Dispute. However, the `StorageView` step 3 (My Stored Produce) has a "Dispatch to APMC Mandi via Truck" button that opens the `journey` view, which is the same `JourneyView` used by the Transport Provider.
- **Key data:** None.
- **Known issues:** The dispatch button in step 3 is part of the Farmer/FPO storage booking flow, not the Storage Provider's own views. The Storage Provider has no transport management capability.

### 6.5 Tutorials (Storage Provider)
- **Status:** Mock
- **What it does:** Same `TutorialsView` component, with storage-specific tutorial data from `tutorialData['Storage Provider']`. Uses `feature.Storage Tutorials.body` translation key.
- **Key data:** None.
- **Known issues:** "Guidance Only" — no interactive content or progress tracking.

### 6.6 Help & Dispute (Storage Provider)
- **Status:** Mock
- **What it does:** Same `HelpView`/`DisputeView` as Farmer. Uses `feature.Provider Help.body` translation key.
- **Key data:** None.
- **Known issues:** Same as Farmer — dispute form does not persist.

### 6.7 Profile (Storage Provider)
- **Status:** Partial
- **What it does:** Same `ProfileView` component. Login step 3 shows hardcoded "Krishna Cold Storage" as provider name, "AP-CS-2021-0093" as permit number, "Demo Verified" as permit review.
- **Key data (real):** `profiles.display_name`, `profiles.language`.
- **Key data (mock):** Provider name, permit number, license — all hardcoded in login flow.
- **Known issues:** Profile view is shared — no Storage Provider-specific fields (WDRA license, facility capacity, chamber count) are displayed.

---

## 7. Transport Provider Role

### 7.1 Farmer Requests
- **Status:** Partial (real DB write on accept, mock seed data)
- **What it does:** The `FeatureView` component (view = `features`) is the Transport Provider's main workspace. Shows two sub-tabs: "Farmer Requests" and "My Orders." The Farmer Requests tab displays KPI cards (request count, total value, vehicle types) and a list of 3 hardcoded consignment requests (`tpFarmerRequestConsignmentsSeed`). Each request card (`TpRequestCard`) shows crop photo, status badge, LR number, farmer name, crop name, temperature requirement, vehicle type, packaging (crates/gunny sacks), weight, route (from → to with waypoint UI), driver pay (freight = baseFare + perKmRate × distanceKm), and an "Accept Haul" button. Tapping a request opens `TpConsignmentReviewModal` showing consignor details, vehicle assignment (from `tpFleet`), logistics details, freight payout, and an "Accept Trip" button. Accepting a trip calls `supabase.from('transport_bookings').insert(...)` to persist the booking, then moves the consignment from Farmer Requests to My Orders with status "In Transit."
- **Key data (real):** `transport_bookings` (insert on accept — `pickup_location`, `destination`, `quantity_kg`, `estimated_price`, `status: 'Accepted'`).
- **Key data (mock):** `tpFarmerRequestConsignmentsSeed` (3 hardcoded requests), `tpFleet` (4 hardcoded vehicles), `tpConsignorPhone` (hardcoded phone map).
- **Known issues:** The 3 farmer requests are static seed data — no new requests ever arrive. The `transport_bookings` table insert is the only real DB write, but the inserted row is never read back or displayed — the UI state is managed entirely in React `useState`. The `transport_bookings` table exists in the schema migration but has no RLS policies visible in the frontend code. Vehicle assignment is hardcoded per vehicle type, not based on availability or capacity. The `consignorType` field includes 'Cold Storage' as an option, but all 3 seed requests have `consignorType: 'Farmer'` — no Cold Storage consignor requests exist.

### 7.2 My Orders
- **Status:** Partial (mock seed data, no DB read)
- **What it does:** The My Orders sub-tab within `FeatureView` shows active and completed dispatches in a segmented control. Active dispatches show consignments with status "In Transit" or "Loading" using `TpActiveOrderCard` — displays crop photo, status, LR number, farmer/crop, temp requirement, vehicle type, packaging, weight, route, vehicle reg number, driver name, and an "Open Live Journey" button that opens `JourneyView`. Completed dispatches show consignments with status "Delivered" using `TpCompletedOrderCard` — displays freight amount, distance, completion timestamp (hash-derived), and a "View e-Waybill" button that generates mock e-Waybill and weighbridge slip numbers and shows a "downloaded (mock)" notification.
- **Key data:** None read from DB. `myOrderConsignments` initialized from `tpMyOrderConsignmentsSeed` (2 hardcoded orders). When a trip is accepted in Farmer Requests, it's prepended to this list in local state.
- **Known issues:** No DB read — the `transport_bookings` rows written on accept are never fetched back. The My Orders list is entirely local state initialized from seed data. Completed orders show hash-derived timestamps, not real delivery times. The e-Waybill and weighbridge slip numbers are hash-derived from the consignment ID — not real regulatory documents. "Mock documentation for demo purposes only" disclaimer shown.

### 7.3 Fleet Management
- **Status:** Mock
- **What it does:** The `tpFleet` array defines 4 vehicles with reg numbers, vehicle types (Open Body, Reefer, Mini Truck, Container), capacity (kg), driver name, and driver phone. The fleet is used implicitly in `tpVehicleForConsignment()` to match a vehicle to a consignment by vehicle type. There is no dedicated Fleet Management UI — no way to add, edit, or remove vehicles, and no way to view vehicle availability or maintenance status.
- **Key data:** None. `tpFleet` is a hardcoded constant.
- **Known issues:** No Fleet Management tab or view exists on the Transport Provider home screen. The home screen shows: Requests, Live Journey, Tutorials, Help & Dispute. Vehicle data is hardcoded and not editable. No `vehicles` or `fleet` table is queried.

### 7.4 Live Journey / GPS Telemetry
- **Status:** Mock
- **What it does:** The `JourneyView` component shows a full-screen journey tracker with a mock map (CSS animation with route lines and map markers), a start/started toggle, route label, estimated travel time, distance, journey status, and shipment info (temp requirement, weight/packaging, vehicle reg/type, driver name/phone, freight amount). A "Start Journey" button toggles the started state and shows a notification. A "Shipment Docs" button opens `TpShipmentDocsModal` showing mock weighbridge slip and e-Waybill. The journey is accessible from: (a) the Transport Provider home screen "Live Journey" feature card (opens with no consignment — shows default "Tomato 500kg" data), (b) the My Orders active dispatch "Open Live Journey" button (opens with the specific consignment).
- **Key data:** None. No `journeys` table is queried, despite the schema migration defining one.
- **Known issues:** No live GPS — the map is a CSS animation with "Not Live GPS" disclaimer. No real telemetry (speed, location, ETA) — travel time is a static calculation from distance. The "Start Journey" button only toggles local state; it doesn't persist to any `journeys` table. The `journeys` table exists in the schema but is never read or written by the frontend. Shipment docs are mock-generated from hash values.

### 7.5 Rate Card Calculator
- **Status:** Mock
- **What it does:** There is no dedicated Rate Card Calculator tab or view. The freight calculation (`tpFreightPayout`) is embedded in the consignment review modal and order cards — it computes `baseFare + perKmRate × distanceKm` from the consignment's hardcoded fields. The Transport Provider home screen does not include a Rate Card Calculator feature card.
- **Key data:** None.
- **Known issues:** No standalone rate card calculator exists. The freight formula is hardcoded per-consignment (`baseFare` and `perKmRate` are fields on `TpConsignment`). The Transport Provider cannot set or edit their own rates.

### 7.6 Cold Storage Requests (Removed)
- **Status:** Removed (confirmed clean)
- **What it does:** This feature was reportedly removed from the Transport Provider role. Investigation confirms: (a) The Transport Provider home screen shows only Requests, Live Journey, Tutorials, Help & Dispute — no Cold Storage Requests tab. (b) The `TpConsignment` interface still has `consignorType: 'Farmer' | 'Cold Storage'` and `daysCold: number` fields, but all seed data (`tpFarmerRequestConsignmentsSeed` and `tpMyOrderConsignmentsSeed`) uses `consignorType: 'Farmer'` and `daysCold: 0`. (c) The `TpConsignmentReviewModal` conditionally renders a "Cold Storage" detail row only when `c.daysCold > 0` — since all seeds have `daysCold: 0`, this row never appears. (d) The `loginFlowPhotos` map still has a `'Cold Storage Requests'` key pointing to a Pexels image URL, but this key is not referenced by any role's feature grid or view routing. (e) No `cold_storage_requests` table is queried anywhere in the frontend.
- **Key data:** None.
- **Known issues:** The removal is mostly clean — no dead UI references, no lingering storage data leaking into Transport's views. However, the `TpConsignment` type definition still carries the `consignorType: 'Cold Storage'` union member and `daysCold` field, which are dead code paths. The `loginFlowPhotos['Cold Storage Requests']` entry is also dead code. These are type-level remnants, not user-visible leaks.

### 7.7 Tutorials (Transport Provider)
- **Status:** Mock
- **What it does:** Same `TutorialsView` component, with transport-specific tutorial data from `tutorialData['Transport Provider']`. Uses `feature.Transport Tutorials.body` translation key.
- **Key data:** None.
- **Known issues:** "Guidance Only" — no interactive content or progress tracking.

### 7.8 Help & Dispute (Transport Provider)
- **Status:** Mock
- **What it does:** Same `HelpView`/`DisputeView` as Farmer. Uses `feature.Provider Help.body` translation key.
- **Key data:** None.
- **Known issues:** Same as Farmer — dispute form does not persist.

### 7.9 Profile (Transport Provider)
- **Status:** Partial
- **What it does:** Same `ProfileView` component. Login step 3 shows hardcoded "Suresh Transport Services" as provider name, "TG-TP-2018-1271" as permit number, "Demo Verified" as permit review.
- **Key data (real):** `profiles.display_name`, `profiles.language`.
- **Key data (mock):** Provider name, permit number — all hardcoded in login flow.
- **Known issues:** Profile view is shared — no Transport Provider-specific fields (vehicle fleet, route coverage, rate card) are displayed.

### 7.10 Orders (Transport Provider view)
- **Status:** Mock
- **What it does:** The `OrdersView` component has a `role === 'Transport Provider'` branch that shows a minimal page with just a "Open Live Journey" button (opens `journey` view). This is a separate entry point from the My Orders sub-tab within `FeatureView`. The Transport Provider home screen does not link to `orders` — it links to `features` (which contains the Farmer Requests / My Orders sub-tabs).
- **Key data:** None.
- **Known issues:** The `OrdersView` Transport Provider branch is likely a dead route — not reachable from the home screen. The home screen's "Requests" card opens `features`, not `orders`. The `orders` view is only reachable via voice navigation or direct view routing.

---

## Summary (Stage 2)

**Feature count for this stage:**
- FPO: 8 features (2 real, 5 mock, 1 partial)
- Storage Provider: 7 features (0 real, 6 mock, 1 partial)
- Transport Provider: 10 features (0 real, 7 mock, 3 partial)
- **Stage 2 total: 25 features — 2 real, 18 mock, 5 partial**

**Combined totals (Stage 1 + Stage 2):**
- **59 features total — 20 real, 28 mock, 11 partial**
- **Real: ~34%, Mock: ~47%, Partial: ~19%**

**Key findings for Stage 2:**

1. **FPO is still hidden from login** — confirmed. It exists in code with full translations and a demo account, but is filtered out of the login screen and blocked by the voice assistant. It's only reachable via voice navigation's `autoRouteToDestination` or by knowing the demo credentials.

2. **Storage Provider is entirely mock** — all 6 features are mock or partial. The Storage Requests workspace (4 seed requests, review modal, chamber allotment) and My Approvals (3 seed approvals, e-NWR receipts) are fully hardcoded with no DB backing. No `storage_requests` or `storage_approvals` tables are queried. The approve/decline actions only show notifications.

3. **Transport Provider has one real DB write but no DB read** — accepting a farmer request inserts into `transport_bookings`, but the My Orders list is entirely local state from seed data. The `transport_bookings` rows are never fetched back. The `journeys` table exists in the schema but is never read or written.

4. **Cold Storage Requests removal is clean** — no dead UI references or lingering storage data in Transport's views. The only remnants are type-level: `consignorType: 'Cold Storage'` in the `TpConsignment` interface and `daysCold: number` field (always 0 in seeds), plus an unused `loginFlowPhotos['Cold Storage Requests']` entry. These are dead code paths, not user-visible leaks.

5. **Biggest demo risk for these roles:** The Storage Provider and Transport Provider experiences are entirely static mockups. A demo attendee tapping through Storage Requests will see 4 hardcoded requests that never change, and approving one only shows a notification — the request doesn't move to My Approvals. For Transport Provider, accepting a trip moves it to My Orders in local state, but refreshing the page resets everything to seed data.
