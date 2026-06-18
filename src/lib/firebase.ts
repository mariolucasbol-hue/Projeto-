import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, linkWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-5abbb9a1-402b-4daa-9c61-84c9b0aa495f');
export const auth = getAuth(app);
export const storage = getStorage(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.metadata.readonly');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignInWithScopes = async () => {
  try {
    isSigningIn = true;
    let result;
    if (auth.currentUser) {
       try {
         result = await linkWithPopup(auth.currentUser, provider);
       } catch (err: any) {
         if (err.code === 'auth/credential-already-in-use') {
           // The account already exists and is tied to this Google credential, so just sign in
           result = await signInWithPopup(auth, provider);
         } else {
           throw err;
         }
       }
    } else {
      result = await signInWithPopup(auth, provider);
    }
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    if (error.code === 'auth/popup-blocked') {
      throw new Error('O navegador bloqueou a janela de login. Por favor, permita pop-ups e tente novamente, ou abra o app em uma nova aba.');
    } else if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
      throw new Error('Login com Google cancelado. Tente novamente.');
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};
