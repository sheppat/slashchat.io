// Firebase Configuration for SlashChat
// This is the public configuration for client-side Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBrHBGsylvFveL9E2kuxBJfCbMLUCyz20I", // You'll need to get this from Firebase Console
    authDomain: "slashchat-62010.firebaseapp.com",
    projectId: "slashchat-62010",
    storageBucket: "slashchat-62010.appspot.com",
    messagingSenderId: "113716583566641316479",
    appId: "1:32705265337:web:48851c2a30529fb4f42568" // You'll need to get this from Firebase Console
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore and Auth
const db = firebase.firestore();
const auth = firebase.auth();
