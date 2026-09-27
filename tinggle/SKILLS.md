# ⚡ Tinggle Agent Skills & Operational Playbook Catalog (SKILLS.md)

This catalog defines the domain skills, operational workflows, and specialized execution playbooks available to agents and engineers building and maintaining **Tinggle**.

---

## 📑 Index of Skills

1. [Skill: Incident Corroboration & Dynamic Trust Computation](#1-skill-incident-corroboration--dynamic-trust-computation)
2. [Skill: Emergency SOS Telemetry & Anti-Spam Shield](#2-skill-emergency-sos-telemetry--anti-spam-shield)
3. [Skill: GIS Spatial Mapping & Leaflet Radar Layering](#3-skill-gis-spatial-mapping--leaflet-radar-layering)
4. [Skill: Municipal Dispatch & Hoax Moderation Playbook](#4-skill-municipal-dispatch--hoax-moderation-playbook)
5. [Skill: Supabase Realtime Channel & Database Operations](#5-skill-supabase-realtime-channel--database-operations)
6. [Skill: Citizen Reputation Audit & Posting Privilege Enforcement](#6-skill-citizen-reputation-audit--posting-privilege-enforcement)
7. [Skill: Unified Search, Category Filtering & Proximity Sorting](#7-skill-unified-search-category-filtering--proximity-sorting)

---

## 1. Skill: Incident Corroboration & Dynamic Trust Computation

### Objective
Calculate and verify the real-time credibility of citizen reports based on proximity, eyewitness count, photographic proof, and official status.

### Source Files
- [`lib/credibility.lib.js`](file:///d:/Bit/and/Build_OD_Techbies/tinggle/lib/credibility.lib.js)
- [`hooks/useGeoLocation.js`](file:///d:/Bit/and/Build_OD_Techbies/tinggle/hooks/useGeoLocation.js)

### Execution Playbook
1. **Compute Trust Score**:
   ```javascript
   import { computeIncidentTrust } from "@/lib/credibility.lib";

   const trust = computeIncidentTrust({
     confirm_count: incident.confirm_count,
     dispute_count: incident.dispute_count,
     local_confirm_count: incident.local_confirm_count || 0,
     image_url: incident.image_url,
     status: incident.status,
   });
   // Returns: { score: 82, tier: "High Civic Trust · Corroborated", color: "text-emerald-400" }
   ```
2. **Proximity Check**:
   Eyewitness corroboration counts as *local* when the voter is within **`6.0 km`** of the reported incident coordinates (calculated via Haversine formula in `useGeoLocation.js`).
3. **Dispute Clamping**:
   Disputes subtract `20%` each up to a maximum penalty of `-60%`. If an admin flags the incident as a hoax, the score drops to `0%` immediately.

---

## 2. Skill: Emergency SOS Telemetry & Anti-Spam Shield

### Objective
Process zero-latency emergency SOS panic broadcasts while filtering automated bot spam, spoofed phone numbers, and rapid flood attacks.

### Source Files
- [`lib/phone-validation.lib.js`](file:///d:/Bit/and/Build_OD_Techbies/tinggle/lib/phone-validation.lib.js)
- [`components/emergency/EmergencySosModal.jsx`](file:///d:/Bit/and/Build_OD_Techbies/tinggle/components/emergency/EmergencySosModal.jsx)
- [`app/api/sos/broadcast/route.js`](file:///d:/Bit/and/Build_OD_Techbies/tinggle/app/api/sos/broadcast/route.js)

### Execution Playbook
1. **Phone Validation**:
   - Enforce E.164 formats (`validatePhoneNumber(phone)`).
   - Rejects repeating digits (`0000000000`), sequential patterns (`1234567890`), or strings with fewer than 4 unique characters.
2. **Honeypot Bot Trap**:
   - Validate that `phone_verification_honeypot` is strictly empty. If populated, silently drop or return `400 Bad Request`.
3. **Sliding Window Rate Limiter**:
   - Cache IP / contact hash for **`45 seconds`**. Return `429 Too Many Requests` if triggered repeatedly.
4. **Emergency Audio Synthesizer**:
   - The on-screen siren activates native Web Audio API oscillators alternating between `750 Hz` and `1050 Hz` every 350ms to draw attention on the scene.

---

## 3. Skill: GIS Spatial Mapping & Leaflet Radar Layering

### Objective
Render dynamic, interactive tactical maps with threat sectors, pulse markers, and proximity radars without SSR hydration failures or z-index collisions.

### Source Files
- [`components/citizen-portal/LiveIncidentMap.jsx`](file:///d:/Bit/and/Build_OD_Techbies/tinggle/components/citizen-portal/LiveIncidentMap.jsx)
- [`components/admin-command/ActiveThreatSectorMap.jsx`](file:///d:/Bit/and/Build_OD_Techbies/tinggle/components/admin-command/ActiveThreatSectorMap.jsx)

### Execution Playbook
1. **Dynamic Import Pattern**:
   Always load Leaflet components with Next.js dynamic import and SSR disabled:
   ```javascript
   import dynamic from "next/dynamic";
   const TacticalMap = dynamic(() => import("./TacticalMapInternal"), {
     ssr: false,
     loading: () => <MapSkeleton />,
   });
   ```
2. **Z-Index Layer Safety**:
   - Leaflet controls default to `z-index: 1000`.
   - Modals and Lightboxes MUST be declared with `z-[9999]` (SOS modal) or `z-[99999]` (Image fullscreen previews) to avoid map pins and zoom buttons piercing the overlay.
3. **Marker Styling**:
   Use category-themed Leaflet `divIcon` classes with glowing CSS pulse rings for active emergencies.

---

## 4. Skill: Municipal Dispatch & Hoax Moderation Playbook

### Objective
Handle emergency squad deployments, mark false alarms, and update citizen reputation across author and community voters.

### Source Files
- [`app/api/incidents/route.js`](file:///d:/Bit/and/Build_OD_Techbies/tinggle/app/api/incidents/route.js)
- [`components/admin-command/AdminDashboardClient.jsx`](file:///d:/Bit/and/Build_OD_Techbies/tinggle/components/admin-command/AdminDashboardClient.jsx)

### Execution Playbook
1. **Squad Deployment**:
   - Admin selects operational unit: *Fire & HazMat*, *Traffic Division*, *EMS Trauma*, or *Disaster Response*.
   - Status updates to `HELP EN ROUTE · DISPATCHED`.
   - Author receives **`+2 reputation points`**.
   - Community upvoters receive **`+1 to +3 points`** (scaled by category severity and proximity).
   - Citizen disputers lose **`-1 to -2 points`**.
2. **Debunking Hoaxes**:
   - Admin marks incident as `FLAGGED AS HOAX · DISINFORMATION`.
   - Incident trust score drops to `0%`.
   - Author loses **`-6 reputation points`**.
   - Disputers who correctly flagged the hoax receive **`+1 to +3 points`**.
   - Misled upvoters lose **`-1 to -2 points`**.

---

## 5. Skill: Supabase Realtime Channel & Database Operations

### Objective
Maintain live synchronization of incidents, corroboration votes, and comments across all active clients.

### Source Files
- [`lib/supabase-browser.lib.js`](file:///d:/Bit/and/Build_OD_Techbies/tinggle/lib/supabase-browser.lib.js)
- [`lib/db.lib.js`](file:///d:/Bit/and/Build_OD_Techbies/tinggle/lib/db.lib.js)

### Execution Playbook
1. **Channel Initialization**:
   ```javascript
   import { getBrowserSupabase } from "@/lib/supabase-browser.lib";

   const supabase = getBrowserSupabase();
   const channel = supabase
     .channel("live_incidents_feed")
     .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, (payload) => {
       handleIncidentChange(payload);
     })
     .subscribe();

   // Always clean up on unmount:
   return () => { supabase.removeChannel(channel); };
   ```
2. **Optimistic Updates**:
   Update local state immediately for user feedback (e.g. upvote count increment), then reconcile when the API response or realtime broadcast arrives.

---

## 6. Skill: Citizen Reputation Audit & Posting Privilege Enforcement

### Objective
Audit citizen credibility scores, calculate reputation tiers, and restrict bad actors from submitting false reports.

### Source Files
- [`lib/credibility.lib.js`](file:///d:/Bit/and/Build_OD_Techbies/tinggle/lib/credibility.lib.js)
- [`app/api/user/profile/route.js`](file:///d:/Bit/and/Build_OD_Techbies/tinggle/app/api/user/profile/route.js)

### Execution Playbook
1. **Check Posting Privilege**:
   ```javascript
   import { checkPostingPrivilege } from "@/lib/credibility.lib";

   const { canPost, reason } = checkPostingPrivilege(userReputation, recentIncidents);
   if (!canPost) {
     return NextResponse.json({ success: false, isRestricted: true, error: reason }, { status: 403 });
   }
   ```
2. **Suspension Criteria**:
   - User reputation is **`< 35 points`**, OR
   - User's **last 3 consecutive incident reports** were flagged as hoaxes.
3. **Rehabilitation**:
   Suspended citizens are restricted to voting. Accurate votes on genuine incidents earn points back until their score surpasses `35`.

---

## 7. Skill: Unified Search, Category Filtering & Proximity Sorting

### Objective
Provide fast, intuitive auto-complete and multi-dimensional search over current and archived civic incidents.

### Source Files
- [`app/(main)/search/page.js`](file:///d:/Bit/and/Build_OD_Techbies/tinggle/app/(main)/search/page.js)
- [`components/Header.jsx`](file:///d:/Bit/and/Build_OD_Techbies/tinggle/components/Header.jsx)

### Execution Playbook
1. **Header Auto-Complete**:
   - Filter incidents matching query in `title`, `category`, `location_text`, or ID.
   - Display top 5 matches with badges for `HELP DISPATCHED`, `RESOLVED`, or `HOAX`.
2. **Dedicated Search Radar (`/search`)**:
   - Category filtering: *All*, *Traffic*, *Fire*, *Utility*, *Safety*, *Medical*, *Disaster*.
   - Status filtering: *All*, *Active*, *Dispatched*, *Resolved*, *Hoax*.
   - Sorting options: *Relevance*, *Newest*, *Trust Score*, *Most Corroborated*.
   - Clear and Search buttons must remain visually distinct with collision-free flex layouts.
