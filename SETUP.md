# Shake2Save - Setup Guide

## Quick Start (Expo Go)

```bash
cd shake2save
npm install
npx expo install expo-av
npx expo start
```

Then scan the QR code with **Expo Go** app on your Android phone.

## Firebase Setup (REQUIRED before the app works)

### 1. Enable Authentication

Go to **Firebase Console** → Authentication → Sign-in method.
Enable **Email/Password** provider.

### 2. Firestore Rules

Go to **Firebase Console** → Firestore Database → Rules tab.
Paste the contents of `firestore.rules` in this project, then **Publish**.

Alternatively, for quick testing, use this permissive rule (NOT for production):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. Firestore Composite Indexes (REQUIRED)

The app uses real-time queries that require composite indexes. **Without these, the responder dashboard will not work.**

#### Option A: Deploy via Firebase CLI (Recommended — fastest way)

This project includes a `firestore.indexes.json` file with all required indexes pre-configured.

```bash
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in the project (select Firestore only)
firebase init firestore
# When asked, use the EXISTING firestore.rules and firestore.indexes.json files

# Deploy indexes and rules in one command
firebase deploy --only firestore
```

This will automatically create all required indexes. Wait 2-5 minutes for them to build.

#### Option B: Auto-create from error links

When you run the app, Firebase will show an error in the console with a link like:
```
The query requires an index. You can create it here: https://console.firebase.google.com/...
```
**Click the link** — it opens Firebase Console and auto-creates the index. Do this for each error that appears.

#### Option C: Manually create in Firebase Console

Go to **Firebase Console** → Firestore Database → Indexes tab → Add Index:

**Index 1:** Collection `emergencyAlerts`
- Field: `userId` (Ascending) + `createdAt` (Descending)

**Index 2:** Collection `emergencyAlerts`
- Field: `status` (Ascending) + `createdAt` (Descending)

> Indexes take 2-5 minutes to build. Wait until the status shows **"Enabled"** before testing.

## Account System

### Regular Users (People who need help)
1. Open the app → tap **Register**
2. Fill in name, email, password
3. You'll be redirected to the Home screen where you can shake to send alerts

### Emergency Response Team (Responders)
1. On the login screen, tap **"Emergency Responder? Sign in here"** at the bottom
2. Tap the **Register** tab
3. Fill in name, email, password
4. Enter the **Team Access Code**: `SHAKE2SAVE`
5. Tap **Create Responder Account**

> **To change the team access code:** Edit `app/(auth)/responder-login.tsx` and change the value of `RESPONDER_CODE` on this line:
> ```ts
> const RESPONDER_CODE = "SHAKE2SAVE";
> ```

### How It Works
- **Users** shake their device → an emergency alert is created in Firestore with their GPS location
- **Responders** receive the alert **in real-time** on their dashboard (via Firestore `onSnapshot`)
- When a new alert arrives, the responder's device **vibrates with an alarm pattern**
- Responders can **Acknowledge** (user gets notified help is coming) or **Resolve** the alert
- Regular users **cannot** access the responder portal
- Responder accounts **cannot** access the regular user tabs

## Testing the Full Flow

1. **Create a responder account** on one device (use the team code `SHAKE2SAVE`)
2. **Create a regular user account** on another device
3. On the user device, **shake or tap the emergency button**
4. On the responder device, the alert should appear **instantly** with a vibration alarm
5. The responder can tap **Acknowledge** → user sees "Help is on the way"
6. The responder can tap **Resolve** → alert is cleared

## Testing Shake on Expo Go

- On a real phone: physically shake your device
- The app has a manual **tap to activate** button as well
- 5-second countdown gives time to cancel accidental triggers

## Project Structure

```
app/
  index.tsx                → Auth redirect (routes by role)
  _layout.tsx              → Root layout with AuthProvider
  (auth)/
    _layout.tsx            → Auth stack layout
    login.tsx              → User login (email/password)
    register.tsx           → User registration
    responder-login.tsx    → Responder login & registration (with team code)
  (tabs)/
    _layout.tsx            → Tab navigation layout
    index.tsx              → HOME - Shake activation + flow diagram
    contacts.tsx           → Emergency contact management (CRUD)
    history.tsx            → Past alert history
    profile.tsx            → User profile + logout
  (responder)/
    _layout.tsx            → Responder stack layout
    index.tsx              → Emergency Response Dashboard (real-time alerts + alarm)
config/
  firebase.ts              → Firebase initialization
context/
  AuthContext.tsx           → Auth state provider with role detection
hooks/
  useShakeDetector.ts      → Accelerometer-based shake detection
  useLocation.ts           → GPS location hook
services/
  emergencyService.ts      → Firestore CRUD for alerts, contacts & user profiles
firestore.rules            → Security rules (copy to Firebase Console)
```

## Troubleshooting

| Problem | Solution |
|---|---|
| `Unable to resolve "expo-av"` | Run `npx expo install expo-av` |
| `The query requires an index` | Click the URL in the error log — it opens Firebase Console to auto-create the index. Wait 2-5 min. |
| Responder not receiving alerts | Make sure the Firestore indexes are built (status = Enabled) |
| "Access Denied" on responder login | The account was registered as a regular user, not a responder. Register a new account through the responder portal with the team code. |
| Alerts not showing in real-time | Check internet connection on both devices. The `onSnapshot` listener requires an active connection. |
