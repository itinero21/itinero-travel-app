# User Roles Setup Guide

## Overview

Your travel app now supports two types of users:
- **Travellers**: Browse and discover itineraries created by others
- **Experienced Travellers**: Create and share detailed itineraries with photos, recommendations, and links

## Step 1: Run the Database Migration

You need to create the user profiles table and update the itineraries table.

### Instructions:

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Roles Migration**
   - Copy the contents of `supabase/roles-setup.sql`
   - Paste into the SQL editor
   - Click "Run" or press Cmd+Enter

This will create:
- `user_profiles` table with user roles
- Updates to `itineraries` table (photos, recommendations, links, is_public)
- Row Level Security policies for role-based access

## Step 2: How It Works

### Login Flow:

1. **User logs in** → Receives magic link
2. **First time user** → Redirected to role selection page
3. **Chooses role** → Profile created in database
4. **Home page** → Shows features based on role

### Traveller Experience:

- **Browse Button**: Access public itineraries
- **View Content**: See photos, recommendations, and links
- **Discover**: Find inspiration from experienced travelers

### Experienced Traveller Experience:

- **Create Itinerary Button**: Add new trips
- **Upload Content**:
  - Add multiple photo URLs
  - Write detailed recommendations
  - Include useful links (hotels, restaurants, etc.)
- **Public/Private**: Choose to make itinerary visible to all

## Step 3: Using the App

### For Travellers:

1. Sign in and select "Traveller"
2. Click "Browse Trips" in the navigation
3. Explore public itineraries
4. Click on links to visit recommended places
5. View photos and read recommendations

### For Experienced Travellers:

1. Sign in and select "Experienced Traveller"
2. Click "Create Itinerary" in the navigation
3. Fill in trip details:
   - Trip name and destination
   - Description
   - Start and end dates
   - Recommendations for other travelers
   - Photo URLs (add multiple)
   - Useful links (hotels, restaurants, activities)
4. Check "Make this itinerary public" to share with travelers
5. Click "Create Trip"

## Features

### User Profiles

```typescript
{
  id: UUID (references auth.users)
  email: string
  role: 'traveller' | 'experienced_traveller'
  created_at: timestamp
}
```

### Itineraries

```typescript
{
  id: number
  user_id: UUID (creator)
  title: string
  description: string
  destination: string
  start_date: date
  end_date: date
  recommendations: string
  photos: string[] (array of URLs)
  links: string[] (array of URLs)
  is_public: boolean
  created_at: timestamp
}
```

### Row Level Security

- Travellers can view all public itineraries
- Experienced travellers can:
  - Create itineraries
  - View their own itineraries (public or private)
  - View all public itineraries
- Users can only edit/delete their own itineraries

## File Structure

```
app/
├── browse/page.tsx              # Browse page for travellers
├── select-role/page.tsx         # Role selection after first login
├── add-itinerary/page.tsx       # Create itinerary (experienced only)
├── login/page.tsx               # Login page
└── page.tsx                     # Home page (role-aware)

contexts/
└── AuthContext.tsx              # Auth + user profile management

supabase/
├── auth-setup.sql               # Initial auth tables
└── roles-setup.sql              # User roles and updated itineraries
```

## Testing

### Test as Traveller:

1. Create account with email A
2. Select "Traveller" role
3. Navigate to "Browse Trips"
4. Verify you can see public itineraries
5. Verify you don't see "Create Itinerary" button

### Test as Experienced Traveller:

1. Create account with email B
2. Select "Experienced Traveller" role
3. Click "Create Itinerary"
4. Fill form with:
   - Title: "Amazing Tokyo Trip"
   - Destination: "Tokyo, Japan"
   - Add photo URL: `https://images.unsplash.com/photo-1540959733332-eab4deabeeaf`
   - Add recommendation: "Visit Sensoji Temple early morning"
   - Add link: `https://www.japan-guide.com/e/e2058.html`
   - Check "Make this itinerary public"
5. Submit
6. Log out
7. Log in as Traveller (email A)
8. Browse trips - you should see the Tokyo itinerary!

## Troubleshooting

### Role selection not showing?

- Check that `user_profiles` table was created
- Verify RLS policies are enabled
- Check browser console for errors

### Can't see browse button?

- Verify user role in database:
  ```sql
  SELECT * FROM user_profiles WHERE email = 'your@email.com';
  ```

### Photos not displaying?

- Ensure photo URLs are valid and publicly accessible
- Use image hosting services like:
  - Unsplash (https://unsplash.com)
  - Imgur (https://imgur.com)
  - Cloudinary (https://cloudinary.com)

### Itinerary not appearing in browse?

- Check `is_public` is set to `true`
- Verify RLS policies allow SELECT for authenticated users
- Check browser console for errors

## Next Steps

You can enhance the app with:

- **Supabase Storage**: Upload photos directly instead of URLs
- **User Profiles**: Display creator information on itineraries
- **Favorites**: Let travellers save favorite itineraries
- **Comments**: Add comments/reviews on itineraries
- **Search/Filter**: Filter by destination, date, etc.
- **Map Integration**: Show destinations on a map
- **Ratings**: Let users rate itineraries
- **Categories**: Tag itineraries (adventure, relaxation, family, etc.)
