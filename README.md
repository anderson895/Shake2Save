# SHAKE2SAVE 

Emergency alert app — shake your phone to instantly send your GPS location to an emergency response team.

---

## Requirements

- **Node.js** (v18 or higher)
- **Expo Go** app installed on your Android/iOS phone
- **Firebase project** (already configured — see Firebase Setup below)

---

## Getting Started

### 1. Install Dependencies

```bash
cd shake2save
npm install
npx expo install expo-av
```

### 2. Start the App

```bash
npx expo start
```

### 3. Open on Your Phone

Scan the QR code with **Expo Go** (Android) or the Camera app (iOS).

> If you encounter issues, try clearing the cache:
> ```bash
> npx expo start -c
> ```

---

## Firebase Setup (REQUIRED — Do This First!)

The app uses Firebase for authentication and database. The Firebase project is already configured in the code, but you need to set up **three things** in the Firebase Console:

### Step 1: Enable Email/Password Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/project/shak2save)
2. Click **Authentication** → **Sign-in method**
3. Enable **Email/Password**
4. Click **Save**

### Step 2: Set Firestore Security Rules

1. Go to **Firestore Database** → **Rules** tab
2. Replace everything with the contents of `firestore.rules` from this project
3. Click **Publish**

For quick testing, you can use this simpler rule instead (NOT for production):
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

### Step 3: Create Firestore Indexes (REQUIRED)

The app needs composite indexes to work. You have **3 options**:

**Option A — Firebase CLI (recommended, fastest)**

```bash
npm install -g firebase-tools
firebase login
firebase init firestore
# When asked, use the EXISTING firestore.rules and firestore.indexes.json
firebase deploy --only firestore
```

**Option B — Click the error link**

When you first run the app, you'll see an error in the terminal like:
```
The query requires an index. You can create it here: https://console.firebase.google.com/...
```
Click the link → it opens Firebase Console → click **Create Index**. Repeat for each error.

**Option C — Manually create in Firebase Console**

Go to **Firestore Database** → **Indexes** tab → **Add Index**:

| Collection | Field 1 | Field 2 |
|---|---|---|
| `emergencyAlerts` | `userId` (Ascending) | `createdAt` (Descending) |
| `emergencyAlerts` | `status` (Ascending) | `createdAt` (Descending) |

> Indexes take **2-5 minutes** to build. Wait until the status shows **Enabled**.

---

## How to Create Accounts

### For Regular Users (people who need help)

1. Open the app
2. Tap **Register**
3. Fill in: Full Name, Email, Password
4. Tap **Create Account**
5. You're now logged in as a regular user

### For Emergency Response Team (responders)

1. On the login screen, tap **"Emergency Responder? Sign in here"** at the bottom
2. Tap the **Register** tab
3. Fill in: Full Name, Email, Password
4. Enter the **Team Access Code**: **`SHAKE2SAVE`**
5. Tap **Create Responder Account**
6. You're now logged in as a responder

> **To change the team access code:** Edit `app/(auth)/responder-login.tsx` and change:
> ```ts
> const RESPONDER_CODE = "SHAKE2SAVE";
> ```

---

## How to Use — Regular User

### Sending an Emergency Alert

1. **Shake your phone** — or tap the big green **SHAKE** button on the Home screen
2. A **5-second countdown** starts — you can cancel if it was accidental
3. After countdown, the app:
   - Gets your **GPS location**
   - Sends an alert to the **Emergency Response Team**
   - Shows you a **live status tracker**

### What You'll See After Sending

The Home screen updates **in real-time**:

| Status | What You See |
|---|---|
| **Pending** | "ALERT SENT!" — orange hourglass — "Awaiting Response Team..." |
| **Acknowledged** | "HELP IS ON THE WAY!" — blue hospital icon — responder name appears |
| **Resolved** | "EMERGENCY RESOLVED" — green check — "Done — Back to Home" button |

You **don't need to refresh** or go to another screen — everything updates automatically.

### Other User Features

- **Contacts tab** — Add emergency contacts (name, phone, relationship). These contacts are included in your alert.
- **History tab** — View all your past alerts with status, location, and responder notes.
- **Profile tab** — View your account info and sign out.
- **Shake toggle** — Enable/disable shake detection on the Home screen.

---

## How to Use — Emergency Responder

### Receiving Alerts

1. Log in with your responder account
2. The **Emergency Response Portal** opens automatically
3. The dashboard shows a **LIVE** indicator — it's always listening
4. When a user sends an emergency:
   - Your phone **vibrates with an alarm pattern**
   - An **alarm sound plays** (800Hz/1000Hz beeping tone)
   - A red **"ALARM ACTIVE — Tap to stop"** banner appears
   - The alert card shows up with user info and location

### Responding to Alerts

| Action | What It Does |
|---|---|
| **Acknowledge** | Tells the user "Help is on the way" — user sees it instantly on their screen |
| **Resolve** | Marks the emergency as resolved — user sees "Emergency Resolved" |
| **Open Location in Maps** | Opens Google Maps with the user's GPS coordinates |

### Alert Card Information

Each alert card shows:
-  **EMERGENCY** or
- **ACKNOWLEDGED** badge
- User's **email/name**
- **GPS location** (tap to open in Google Maps)
- **Emergency contacts** that were listed
- **Responder name** (after acknowledging)
- **Timestamp**

### Dashboard Stats

- **Pending** — number of unacknowledged alerts (red)
- **In Progress** — number of acknowledged but unresolved alerts (blue)
- **LIVE** — real-time connection indicator

---

## Full Emergency Flow (Step by Step)

```
USER                              RESPONDER
─────                             ─────────
1. Shakes phone
2. 5-sec countdown starts
3. Alert sent with GPS             
                                   4. Alarm sound + vibration
                                   5. Alert card appears (PENDING)
                                   6. Taps "Open Location in Maps"
                                   7. Taps "Acknowledge"
8. Screen changes to                
   "HELP IS ON THE WAY!"           
   Responder name shown            
                                   9. Travels to location
                                   10. Taps "Resolve"
11. Screen changes to              
    "EMERGENCY RESOLVED"           
12. Taps "Done — Back to Home"
```

All status changes happen **instantly** — both user and responder see updates in real-time.

---

## Project Structure

```
app/
  index.tsx                  → Auth redirect (routes by user role)
  _layout.tsx                → Root layout with AuthProvider
  (auth)/
    _layout.tsx              → Auth stack layout
    login.tsx                → User login
    register.tsx             → User registration
    responder-login.tsx      → Responder login & registration (with team code)
  (tabs)/
    _layout.tsx              → Tab navigation layout
    index.tsx                → HOME — Shake button + real-time status tracker
    contacts.tsx             → Emergency contact management (CRUD)
    history.tsx              → Past alert history
    profile.tsx              → User profile + sign out
  (responder)/
    _layout.tsx              → Responder stack layout
    index.tsx                → Response Portal — real-time alerts + alarm sound
config/
  firebase.ts                → Firebase initialization
context/
  AuthContext.tsx             → Auth state provider with role detection
hooks/
  useShakeDetector.ts        → Accelerometer-based shake detection
  useLocation.ts             → GPS location hook
services/
  emergencyService.ts        → Firestore CRUD for alerts, contacts & user profiles
utils/
  alarmSound.ts              → Programmatic alarm tone generator (WAV)
firestore.rules              → Security rules (copy to Firebase Console)
firestore.indexes.json       → Composite indexes (deploy via Firebase CLI)
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `Unable to resolve "expo-av"` | Run `npx expo install expo-av` |
| `The query requires an index` | Click the URL in the error — auto-creates the index. Wait 2-5 min. |
| Responder not receiving alerts | Make sure Firestore indexes are built (status = Enabled) |
| "Access Denied" on responder login | That account is a regular user. Register a new one via the responder portal with team code. |
| No alarm sound on responder | Make sure phone is not on Do Not Disturb. The alarm plays even on silent mode. |
| Alerts not updating in real-time | Check internet connection on both devices |
| Location shows 0, 0 | Grant location permission when the app asks. Check GPS is enabled. |
| App stuck on loading | Clear cache: `npx expo start -c` |

---

## Notes

- The app uses **Expo Go** for development — no native build required
- Emergency alerts are stored in **Firebase Firestore**
- GPS location requires **location permission** — the app will ask on first use
- The alarm sound is generated programmatically — no external audio files needed
- Real-time updates use Firestore **onSnapshot** listeners
- The team access code (`SHAKE2SAVE`) is a simple verification — change it for your team
