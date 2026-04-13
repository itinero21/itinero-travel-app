# Itinero — Full Project Summary
*Last updated: April 12, 2026*

---

## What Itinero Is

A Next.js 15 + Supabase travel itinerary platform where **experienced travellers** (creators) publish trip itineraries and **regular users** browse, save, follow, and review them. Creators can monetise via affiliate links with click tracking.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router |
| Database + Auth | Supabase (PostgreSQL + RLS + Auth) |
| Styling | Tailwind CSS |
| Deployment | Vercel (auto-deploy from `main`) |
| Language | TypeScript (strict mode) |
| Repo | github.com/itinero21/itinero-travel-app |

---

## Database Schema

### Original tables
| Table | Key columns |
|---|---|
| `user_profiles` | `id`, `username`, `bio`, `email`, `role` (explorer / experienced_traveller) |
| `itineraries` | `id`, `user_id`, `title`, `description`, `destination`, `budget`, `start_date`, `end_date`, `photos[]`, `links[]` (legacy), `recommendations`, `is_public` |
| `itinerary_days` | `id`, `itinerary_id`, `day_number`, `title`, `activities[]` |

### Tables added
| Table | Key columns | Purpose |
|---|---|---|
| `saved_itineraries` | `user_id`, `itinerary_id` | Wishlist / bookmarks |
| `follows` | `follower_id`, `following_id` | Creator follow relationships |
| `reviews` | `user_id`, `itinerary_id`, `rating` (1–5), `review_text` | Star ratings and text reviews |
| `itinerary_links` | `itinerary_id`, `url`, `label`, `category`, `click_count` | Rich affiliate links replacing the legacy `links[]` array |

### RPC functions
| Function | Purpose |
|---|---|
| `increment_link_click(link_id BIGINT)` | Atomically increments `click_count` by 1. `SECURITY DEFINER`, `search_path = public`, execute granted to `authenticated` + `anon` |

All new tables have RLS enabled with appropriate policies.

### SQL to re-run if rebuilding Supabase from scratch

```sql
-- Saved itineraries
CREATE TABLE saved_itineraries (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  itinerary_id BIGINT REFERENCES itineraries(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, itinerary_id)
);
ALTER TABLE saved_itineraries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own saves" ON saved_itineraries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view save counts" ON saved_itineraries FOR SELECT USING (true);

-- Follows
CREATE TABLE follows (
  id BIGSERIAL PRIMARY KEY,
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own follows" ON follows FOR ALL USING (auth.uid() = follower_id);
CREATE POLICY "Anyone can view follows" ON follows FOR SELECT USING (true);

-- Reviews
CREATE TABLE reviews (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  itinerary_id BIGINT REFERENCES itineraries(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, itinerary_id)
);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users manage their own reviews" ON reviews FOR ALL USING (auth.uid() = user_id);

-- Itinerary links
CREATE TABLE itinerary_links (
  id BIGSERIAL PRIMARY KEY,
  itinerary_id BIGINT REFERENCES itineraries(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  label TEXT,
  category TEXT CHECK (category IN ('hotel', 'flight', 'tour', 'transport', 'gear', 'restaurant', 'other')),
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE itinerary_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view links" ON itinerary_links FOR SELECT USING (true);
CREATE POLICY "Owners can manage their links" ON itinerary_links FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM itineraries WHERE id = itinerary_id));
CREATE POLICY "Anyone can increment click count" ON itinerary_links FOR UPDATE USING (true) WITH CHECK (true);

-- increment_link_click RPC
CREATE OR REPLACE FUNCTION increment_link_click(link_id BIGINT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE itinerary_links SET click_count = click_count + 1 WHERE id = link_id;
$$;
GRANT EXECUTE ON FUNCTION increment_link_click(BIGINT) TO authenticated, anon;
```

---

## Pages

### `/` — Home
- Landing page with hero
- Nav for logged-in users: Create Itinerary → Browse → Saved → Dashboard (creators only) → Profile → Sign Out
- Role-aware: Dashboard link only for `experienced_traveller`

### `/browse` — Browse Itineraries
- Search bar (title, destination, creator)
- Filters: Destination, Budget (budget / mid-range / luxury), Duration (Weekend / Week / Two weeks / Long)
- Sort: Newest First, Oldest First, Highest Rated, Most Reviewed
- Featured Creators horizontal strip
- Cards: photo, destination, creator, title, avg rating, description, dates, day preview
- Save button overlaid on card image

### `/saved` — Saved Itineraries
- Auth-gated (redirects to `/login`)
- All bookmarked itineraries in same card layout as browse

### `/dashboard` — Creator Dashboard
- Creator-only (`experienced_traveller` role)
- Stats: Trips published, Total trips, Destinations, Followers, Member since
- Incomplete profile warning if no username
- **My Itineraries:** thumbnail, title, destination, public/private, day count, save count, avg rating, total link clicks, View/Edit/Toggle public actions
- **Recent Reviews:** last 5 reviews — reviewer, stars, itinerary link, text snippet, date
- **Link Performance table:** sorted by clicks, category emoji, label, itinerary, click count (— for 0), show 10 / show all toggle, empty state
- Quick Actions: share profile URL, edit profile, following count

### `/creator/[username]` — Public Creator Profile
- Dynamic page title
- "Top creator ★" badge if in top 3 by score
- Follower count + Follow/Unfollow button
- Overall avg rating
- Grid of public itineraries with ratings

### `/itinerary/[id]` — Itinerary Detail
- Hero: cover photo + strip, title, location, dates, duration, budget pill, rating pill
- Actions: Edit (owner), Share, Save with count, Public/Private badge
- Creator card with View Profile button
- Recommendations (green panel)
- **Affiliate link card grid:** category emoji, label, domain, truncated URL, "Visit link →", hover lift, silent click tracking
- Falls back to legacy plain link list for old itineraries
- Day-by-Day plan
- **Reviews:** avg summary, 5-star breakdown bar chart, "Your review" pinned with Edit button, other reviews, ReviewForm for non-owners

### `/add-itinerary` — Create Itinerary
- Title, destination, description, dates, budget, recommendations, photos
- **Links section:**
  - Collapsible "How to earn with affiliate links" tip box (5 affiliate programs listed)
  - Each link: URL + label + category dropdown
  - URL validation on blur: auto-prepend https://, green ✓ / amber ⚠ feedback
  - Saves to `itinerary_links` table
  - Post-save nudge toast if 0 links added
- Day-by-Day plan builder

### `/profile` — Profile Settings
- Edit username and bio

### `/login` and `/signup` — Auth

---

## Components

| Component | Purpose |
|---|---|
| `SaveButton` | Bookmark toggle, optimistic UI, count display, redirects to login if unauthenticated |
| `FollowButton` | Follow/unfollow toggle, live follower count, hidden for self |
| `StarRating` | Star display (sm/md/lg sizes), interactive mode for review form |
| `ReviewForm` | Upsert review (star + textarea), hides for owner, pre-fills for edits |
| `ReviewsList` | Reviews with avg summary, 5-star bar chart, pinned "Your review" with Edit button |
| `TopCreators` | Scrollable strip of top 5 creators, 🏆 badge for top 3, hides if <3 exist |
| `Toast` | Success / error / info notifications with auto-dismiss |
| `ItineraryCardSkeleton` | Loading skeleton for cards |
| `ImageWithFallback` | Image with error fallback |

---

## Libraries / Utilities

| File | What it does |
|---|---|
| `lib/creatorScore.ts` | `calculateCreatorScore(trips, avgRating, followers)` = `trips×10 + avgRating×20 + followers×5`. `fetchTopCreators(limit)` fetches all experienced travellers + their itineraries/reviews/follows in 3 queries, aggregates in JS, returns top N |
| `lib/supabase.ts` | Supabase client singleton |
| `contexts/AuthContext.tsx` | Auth state + user profile context provider |

---

## Creator Score Formula

```
score = (trips × 10) + (avgRating × 20) + (followers × 5)
```

Used to rank creators in the Featured Creators strip and award the "Top creator ★" badge on profiles (top 3 only).

---

## Affiliate Link Categories

| Value | Label | Emoji |
|---|---|---|
| `hotel` | Hotel | 🏨 |
| `flight` | Flight | ✈️ |
| `tour` | Tour | 🎯 |
| `transport` | Transport | 🚌 |
| `gear` | Gear | 🎒 |
| `restaurant` | Restaurant | 🍽️ |
| `other` | Other | 🔗 |

Recommended affiliate programs shown in form tip box:
- Booking.com Partner Program
- GetYourGuide Affiliate
- Skyscanner Affiliate
- Amazon Associates (for gear)
- Viator Affiliate Program

---

## Git / Deployment

| | |
|---|---|
| **GitHub** | `itinero21/itinero-travel-app` — branch `main` |
| **Last commit** | `124a97b` — "Add Phase 2 & 3 features: social, reviews, affiliate links, and creator tools" |
| **Vercel** | Auto-deploys on every push to `main` — no manual steps needed |

---

## Key Patterns Used in the Codebase

- **`Promise.all`** for parallel Supabase queries (no waterfalls)
- **Optimistic UI with rollback** on SaveButton and FollowButton
- **Client-side aggregation** — avg/count maps built in JS from flat arrays
- **`refreshKey` pattern** — integer state increment triggers child component re-fetch
- **Fire-and-forget RPC** for click tracking (no `await`, silent `.catch`)
- **Rich/legacy fallback** — `itinerary_links` preferred, old `links[]` array shown for pre-existing itineraries
- **`as unknown as T[]`** cast for Supabase joined table type inference quirk
