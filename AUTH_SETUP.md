# Authentication Setup Guide

## Step 1: Run the Database Migration

You need to create the `itineraries` table in your Supabase database.

### Instructions:

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project: `xftoctnuqlmiupwepvug`

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Migration**
   - Copy the contents of `supabase/auth-setup.sql`
   - Paste into the SQL editor
   - Click "Run" or press Cmd+Enter

This will create:
- `itineraries` table with user_id column
- Row Level Security (RLS) policies so users can only see/edit their own itineraries

## Step 2: Configure Email Settings (Optional but Recommended)

For magic link authentication to work properly:

1. **Go to Authentication Settings**
   - In Supabase Dashboard, click "Authentication" → "URL Configuration"

2. **Set Site URL**
   - Set to: `http://localhost:3000` (for development)
   - For production, use your deployed URL

3. **Set Redirect URLs**
   - Add: `http://localhost:3000/**`

## Step 3: Test the Authentication Flow

### Testing Login:

1. Start your dev server: `npm run dev`
2. Go to http://localhost:3000
3. Click the "Login" button
4. Enter your email address
5. Check your email for the magic link
6. Click the link to log in

### Testing Protected Route:

1. When logged in, you'll see:
   - Your email displayed
   - "Add Itinerary" button
   - "Logout" button

2. Click "Add Itinerary"
3. Fill out the form and create an itinerary
4. The itinerary will be saved with your user_id

5. Try logging out and accessing `/add-itinerary` directly
   - You'll be redirected to the login page

## How It Works

### Authentication Flow:

1. **Login** → User enters email → Supabase sends magic link
2. **Click Link** → User is authenticated → Session stored in browser
3. **Access App** → Auth context detects user → Shows user info
4. **Protected Routes** → Page checks if user exists → Redirects if not logged in
5. **Create Itinerary** → Saves with user_id → Only that user can see it

### File Structure:

```
app/
├── login/page.tsx          # Login page with magic link
├── add-itinerary/page.tsx  # Protected page for adding itineraries
├── page.tsx                # Home page with auth status
└── layout.tsx              # Wraps app with AuthProvider

contexts/
└── AuthContext.tsx         # Manages user authentication state

lib/
└── supabase.ts            # Supabase client configuration

supabase/
└── auth-setup.sql         # Database migration for itineraries table
```

### Key Features Implemented:

✅ Email magic link authentication
✅ User session management
✅ Login/Logout functionality
✅ Protected routes (redirect to login if not authenticated)
✅ User-specific data (itineraries tied to user_id)
✅ Row Level Security (users only see their own data)

## Troubleshooting

### Magic Link Not Arriving?

1. Check your spam folder
2. Verify email settings in Supabase Dashboard → Authentication → Email Templates
3. For development, Supabase rate-limits emails (3 per hour per email)

### Redirect Not Working?

1. Check that redirect URLs are configured in Supabase
2. Make sure your `.env.local` has correct Supabase URL and key

### Can't Create Itinerary?

1. Make sure you ran the `auth-setup.sql` migration
2. Check browser console for errors
3. Verify RLS policies are enabled in Supabase Table Editor

## Next Steps

Now that authentication is working, you can:

- Display user's itineraries on the home page
- Add edit/delete functionality for itineraries
- Add more fields (budget, activities, notes)
- Add image uploads
- Share itineraries with other users
