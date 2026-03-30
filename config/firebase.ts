import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyA6PqbSdJhcAo0rcU1HaC7T7hDyUuoXQPU",
  authDomain: "shak2save.firebaseapp.com",
  projectId: "shak2save",
  storageBucket: "shak2save.firebasestorage.app",
  messagingSenderId: "888674001851",
  appId: "1:888674001851:web:1de441db82b9eb0dcd1a9e",
  measurementId: "G-T53ETRYL9B",
};

// Prevent duplicate app initialization (Expo Go hot reload)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Prevent duplicate auth initialization
let auth: ReturnType<typeof initializeAuth>;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  // Auth already initialized (happens on Expo Go fast refresh)
  auth = getAuth(app) as any;
}

export { auth };
export const db = getFirestore(app);
export default app;
