# Firebase Setup Instructions

## Step 1: Deploy Firestore Security Rules

1. Install Firebase CLI (if not already installed):
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase in your project:
```bash
cd travel-planner-pro
firebase init
```

Select:
- **Firestore**: Configure security rules and indexes files
- Use existing project: `travelplannerai-ffc6d`
- Firestore rules file: `firestore.rules` (already created)
- Firestore indexes file: `firestore.indexes.json` (accept default)

4. Deploy the security rules:
```bash
firebase deploy --only firestore:rules
```

## Step 2: Verify Security Rules in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `travelplannerai-ffc6d`
3. Go to **Firestore Database** → **Rules** tab
4. Verify the rules show:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/trips/{tripId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Step 3: Test the Application

1. Make sure your `.env.local` file has all required variables:
```bash
# Check if file exists and has content
cat .env.local
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

4. Test the authentication flow:
   - Click "התחבר עם Google"
   - Sign in with your Google account
   - Verify you see your profile picture/name
   - Create or modify a trip
   - Refresh the page - data should persist
   - Sign out and sign in again - data should still be there

## Step 4: Verify Data in Firestore

1. Go to Firebase Console → **Firestore Database** → **Data** tab
2. You should see structure:
```
users/
  └── {your-uid}/
      └── trips/
          └── {trip-id}/
              - name: "Trip Name"
              - destination: "Bangkok"
              - updatedAt: timestamp
              - ... (all trip data)
```

## Security Notes

- Firebase API keys are safe to expose in client-side code
- Security is enforced by Firestore rules, not by hiding the API key
- The rules ensure users can ONLY access their own data (users/{userId}/trips)
- Never commit `.env.local` to Git (already in .gitignore)

## Troubleshooting

### Error: "VITE_GEMINI_API_KEY not configured"
- Check that `.env.local` exists in the project root
- Verify the variable name is exactly `VITE_GEMINI_API_KEY`
- Restart the dev server after changing env files

### Error: "Firebase initialization error"
- Verify all `VITE_FIREBASE_*` variables are set in `.env.local`
- Check that Firebase project exists and is active
- Verify the values match your Firebase project settings

### Error: "Permission denied" when saving trips
- Deploy Firestore security rules (Step 1)
- Verify you're signed in (check for user avatar in header)
- Check browser console for detailed error messages

### Data not persisting after refresh
- Check browser console for Firestore errors
- Verify you're signed in
- Check Firestore rules are deployed correctly
- Verify network tab shows successful Firestore requests
