# Commit Criminals - Setup Instructions

## 🚀 Quick Start

### 1. Set Up Database Tables

Before using the application, you need to create the database tables in Supabase:

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/dqwavrjhwzbaiydgpdrt
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire contents of `setup-database.sql`
5. Click **Run** to execute the SQL

This will create:
- All necessary tables (forum_topics, projects, questions, lost_found_items, user_profiles)
- Row Level Security (RLS) policies for data protection
- Indexes for better performance
- Real-time subscriptions

### 2. Open the Application

Simply double-click `index.html` or open it in your browser:
```
file:///Users/divyeshkarthik/Desktop/Commit  Crimminals/index.html
```

**No server needed!** The application runs entirely in your browser.

---

## 📁 File Structure

```
Commit Crimminals/
├── index.html           # Main HTML file with all pages
├── styles.css           # All CSS styles
├── app.js              # JavaScript with Supabase integration
└── setup-database.sql  # SQL script to set up database
```

---

## ✨ Features

### Authentication
- ✅ Sign up with email/password
- ✅ Login/logout
- ✅ Session persistence
- ✅ User profiles with usernames

### Forum
- ✅ View all discussion topics
- ✅ Create new topics (authenticated users)
- ✅ Real-time updates when new topics are posted
- ✅ Shows author and timestamp

### Projects
- ✅ View all collaborative projects
- ✅ Create new projects (authenticated users)
- ✅ Real-time updates
- ✅ Shows author and timestamp

### Q&A
- ✅ View all questions
- ✅ Ask new questions (authenticated users)
- ✅ Real-time updates
- ✅ Shows author and timestamp

### Lost & Found
- ✅ View lost and found items
- ✅ Report lost/found items (authenticated users)
- ✅ Tab switching between lost and found
- ✅ Real-time updates
- ✅ Contact information

---

## 🔒 Security

The application uses Supabase Row Level Security (RLS) to protect data:

- **Anyone can view** all content (public read access)
- **Only authenticated users can create** content
- **Users can only edit/delete** their own content
- The anon key is safe to expose in client-side code

---

## 🛠️ Technologies Used

- **HTML5** - Structure
- **CSS3** - Styling with gradients, glassmorphism, animations
- **Vanilla JavaScript** - All functionality
- **Supabase** - Backend (authentication, database, real-time)

**Zero dependencies, zero build tools!**

---

## 📝 Usage

1. **Sign Up**: Click "Sign Up" in the navbar, create an account
2. **Login**: After verifying your email, log in
3. **Create Content**: Navigate to any section and click the "+ New" button
4. **Real-time**: Open the app in multiple tabs to see real-time updates!

---

## 🎨 Customization

All styles are in `styles.css` using CSS variables:
```css
:root {
    --bg-color: #0f0f13;
    --accent-primary: #6c5ce7;
    /* ... customize these! */
}
```

---

## 🐛 Troubleshooting

**Can't create content?**
- Make sure you're logged in
- Check that you ran the `setup-database.sql` script

**Not seeing real-time updates?**
- Make sure the database tables are set up correctly
- Check browser console for errors

**Authentication not working?**
- Verify your Supabase project is active
- Check that email confirmation is enabled in Supabase settings

---

## 📧 Support

For issues with Supabase setup, visit: https://supabase.com/docs
