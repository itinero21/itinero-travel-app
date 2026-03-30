# Database Setup Instructions

## Steps to Fix "Error loading data"

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project: `xftoctnuqlmiupwepvug`

2. **Run the SQL Setup**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"
   - Copy the contents of `supabase/setup.sql` and paste it into the editor
   - Click "Run" or press Cmd+Enter

3. **Verify the Table**
   - Click on "Table Editor" in the left sidebar
   - You should see a `travel_items` table with 4 sample destinations

4. **Refresh Your App**
   - Go back to http://localhost:3000
   - Refresh the page
   - You should now see the travel destinations displayed!

## What the SQL Does

- Creates a `travel_items` table with id, title, description, and created_at columns
- Enables Row Level Security for data protection
- Adds a policy to allow public read access
- Inserts 4 sample travel destinations to get you started

## Troubleshooting

If you still see errors:
- Check the browser console (F12) for detailed error messages
- Verify your Supabase URL and API key in `.env.local`
- Make sure the SQL ran successfully without errors
