# SlashChat - The Chaotic Group Chat 🔥

A real-time chaotic group chat application built with Firebase Firestore for persistent server-side storage.

## 🚀 Features

- **Real-time messaging** with Firebase Firestore
- **XP & Leveling system** (5 XP per message, 100 XP per level)
- **Live online users** display
- **Persistent data** - messages and user data never wipe
- **Chaotic visual effects** and animations
- **Responsive design** for all devices

## 🔧 Firebase Setup Required

To use this application, you need to set up Firebase:

### 1. Get Firebase Web Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `slashchat-62010`
3. Go to Project Settings (gear icon)
4. Scroll down to "Your apps" section
5. Click "Add app" → Web app
6. Register your app and copy the configuration

### 2. Update Firebase Configuration

Replace the placeholder values in `firebase-config.js`:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "slashchat-62010.firebaseapp.com",
    projectId: "slashchat-62010",
    storageBucket: "slashchat-62010.appspot.com",
    messagingSenderId: "113716583566641316479",
    appId: "YOUR_APP_ID_HERE"
};
```

### 3. Configure Firestore Security Rules

In Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to messages
    match /messages/{document} {
      allow read, write: if true;
    }
    
    // Allow read/write access to users
    match /users/{userId} {
      allow read, write: if true;
    }
    
    // Allow read/write access to online users
    match /onlineUsers/{userId} {
      allow read, write: if true;
    }
  }
}
```

## 📁 File Structure

```
SlashChat/
├── index.html          # Main HTML structure
├── style.css           # Styling and animations
├── script.js           # Main application logic
├── firebase-config.js  # Firebase configuration
└── README.md           # This file
```

## 🎮 How to Use

1. **Open `index.html`** in your web browser
2. **Sign up** with a new username and password
3. **Start chatting** and earn XP with every message
4. **Watch the chaos** unfold with real-time updates
5. **Level up** every 100 XP points

## 🔥 Data Storage

All data is now stored in Firebase Firestore:

- **Messages**: Stored in `messages` collection
- **Users**: Stored in `users` collection with XP and level data
- **Online Users**: Stored in `onlineUsers` collection for real-time presence

## ⚡ Real-time Features

- **Live message updates** - see messages as they're sent
- **Online user tracking** - see who's currently active
- **Persistent chat history** - messages never disappear
- **Cross-device sync** - login from any device

## 🎨 Visual Effects

- **Chaos emojis** floating around on message send
- **Level-up celebrations** with multiple effects
- **Smooth animations** and transitions
- **Modern glassmorphism** design

## 🔒 Security Note

The current security rules allow public read/write access. For production use, implement proper authentication and security rules.

## 🛠️ Development

The application uses:
- **Firebase Firestore** for real-time database
- **Vanilla JavaScript** for the frontend
- **CSS3** with modern features
- **Real-time listeners** for live updates

---

**Enjoy the chaos!** ⚡🔥✨
