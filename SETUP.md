# Shake2Save - Setup Guide

## Quick Start (Expo Go)

```bash
cd shake2save
npm install
npx expo start
```

Then scan the QR code with **Expo Go** app on your Android phone.

## Firebase Setup (REQUIRED before the app works)

### 1. Firestore Rules
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

### 2. Firestore Composite Indexes (Optional but recommended)
The app works without these (it falls back to client-side sorting), but for best performance:

Go to **Firebase Console** → Firestore Database → Indexes tab → Add Index:

**Index 1:** Collection `emergencyAlerts`
- Field: `userId` (Ascending) + `createdAt` (Descending)

**Index 2:** Collection `emergencyAlerts`
- Field: `status` (Ascending) + `createdAt` (Descending)

### 3. Enable Authentication
Go to **Firebase Console** → Authentication → Sign-in method.
Enable **Email/Password** provider.

## Testing Shake on Expo Go

- On a real phone: physically shake your device
- The app has a manual **tap to activate** button as well
- 5-second countdown gives time to cancel accidental triggers

## Project Structure

```
app/
  index.tsx              → Auth redirect (checks login state)
  _layout.tsx            → Root layout with AuthProvider
  (auth)/
    login.tsx            → Email/password login
    register.tsx         → New account registration
  (tabs)/
    index.tsx            → HOME - Shake activation + flow diagram
    contacts.tsx         → Emergency contact management (CRUD)
    history.tsx          → Past alert history
    profile.tsx          → User profile + logout
  (responder)/
    index.tsx            → Emergency Response Team dashboard

config/firebase.ts       → Firebase initialization
context/AuthContext.tsx   → Auth state provider
hooks/
  useShakeDetector.ts    → Accelerometer-based shake detection
  useLocation.ts         → GPS location hook
services/
  emergencyService.ts    → Firestore CRUD for alerts & contacts
```
