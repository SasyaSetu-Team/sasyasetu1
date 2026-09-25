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

> Remaining roles (FPO, Storage Provider, Transport Provider) and cross-cutting features to be added in a follow-up pass.
