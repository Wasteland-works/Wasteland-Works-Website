# Wasteland Works

The Wasteland Works website with Firebase Authentication, Firestore member profiles and project data, and Firebase Storage uploads.

## Authentication

The site supports account creation, sign-in, email verification, password resets, profile editing, persistent login, dynamic navigation, and founder-only admin routing.

Before publishing:

1. Deploy `firestore.rules` to Cloud Firestore.
2. Deploy `storage.rules` to Firebase Storage.
3. Add `wasteland-works.com` and `www.wasteland-works.com` to Firebase Authentication's **Authorized domains**.
4. Enable the Email/Password sign-in provider.
5. Create your account through the site, then change its Firestore `role` from `user` to `founder` in the Firebase console.

## Administrator tools

Founder accounts can open `admin.html` to create projects and open the project editor. Project titles, descriptions, write-ups, notes, and file metadata are stored in Firestore. Uploaded files are stored in Firebase Storage.

Supabase is no longer used. Existing Supabase records and uploads are not transferred automatically.

Serve the site through a web server; Firebase modules and shared page layouts do not work when HTML files are opened directly from the filesystem.
