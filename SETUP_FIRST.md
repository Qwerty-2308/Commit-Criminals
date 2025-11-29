# 🚨 IMPORTANT: Database Setup Required!

## You're seeing an error because the database tables don't exist yet.

### Follow these steps to fix it:

1. **Go to your Supabase SQL Editor**
   - Visit: https://supabase.com/dashboard/project/dqwavrjhwzbaiydgpdrt/sql/new
   - Or navigate to: Dashboard → SQL Editor → New Query

2. **Copy the entire `setup-database.sql` file**
   - Open `setup-database.sql` in your project folder
   - Select ALL the content (Cmd+A / Ctrl+A)
   - Copy it (Cmd+C / Ctrl+C)

3. **Paste and Run in Supabase**
   - Paste the SQL into the Supabase SQL Editor
   - Click the **RUN** button (or press Cmd+Enter / Ctrl+Enter)
   - Wait for it to complete (should take 2-3 seconds)
   - You should see: "Database setup completed successfully!"

4. **Refresh your application**
   - Go back to your application
   - Refresh the page (F5 or Cmd+R)
   - The chat should now work!

---

## What the script creates:

✅ `chat_messages` table - For the community chat  
✅ `projects` table - For collaborative projects  
✅ `questions` table - For Q&A section  
✅ `lost_found_items` table - For lost & found items  
✅ `user_profiles` table - For user information  
✅ Row Level Security policies - To protect data  
✅ Real-time subscriptions - For live updates  
✅ Automatic triggers - For user profile creation  

---

## Troubleshooting

**If you see "permission denied" errors:**
- Make sure you're logged into the correct Supabase project
- Check that you have admin access to the project

**If tables already exist:**
- The script is safe to run multiple times (idempotent)
- It will update existing tables without losing data

**Still having issues?**
- Check the browser console (F12) for detailed error messages
- Make sure your Supabase project is active and not paused

---

## After Setup

Once the database is set up, you can:
- 💬 Send messages in the chat (anyone can send, no login required!)
- 🔐 Sign up for an account to create projects, ask questions, and report lost items
- 🔄 See real-time updates when others post content
- 🎨 Enjoy the beautiful gradient UI!

---

**Need help?** Check the README.md file for more information.
