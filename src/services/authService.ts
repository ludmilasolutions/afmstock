import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth';
import { auth } from './firebase/config';

export function onAuthUserChange(
  callback: (user: User | null) => void,
  authInstance: Auth = auth
) {
  return onAuthStateChanged(authInstance, callback);
}

export async function loginWithEmail(
  email: string,
  pass: string,
  authInstance: Auth = auth
): Promise<User> {
  const cred = await signInWithEmailAndPassword(authInstance, email, pass);
  return cred.user;
}

export async function registerWithEmail(
  email: string,
  pass: string,
  authInstance: Auth = auth
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(authInstance, email, pass);
  return cred.user;
}

export async function logoutUser(authInstance: Auth = auth): Promise<void> {
  await firebaseSignOut(authInstance);
}

