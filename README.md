# Wasteland Works

The Wasteland Works website with Firebase Authentication and Firestore member profiles.

## Authentication

The site supports account creation, sign-in, email verification, password resets, profile editing, persistent login, dynamic navigation, and founder-only admin routing.

Before publishing, deploy `firestore.rules` to the `test-auth-6b1c6` Firebase project and add your website domain to Firebase Authentication's **Authorized domains** list.

The projects and admin content still use the site's existing Supabase data layer. Firebase protects which interface is shown, but Supabase Row Level Security must separately protect project creation, editing, uploads, and deletion.

Serve the site through a web server; Firebase modules and shared page layouts do not work when HTML files are opened directly from the filesystem.
