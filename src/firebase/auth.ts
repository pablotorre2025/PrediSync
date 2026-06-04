import { signInWithEmailAndPassword, signOut as fbSignOut, createUserWithEmailAndPassword, type User } from 'firebase/auth';
import { auth } from './config';
import { DEFAULT_USERS } from '@/constants';
import type { UserId } from '@/types';

/**
 * Login simplificado: el usuario solo ve botones (Pablo / Saida) + PIN.
 * Internamente esto se mapea a credenciales de Firebase Auth (email + pin).
 * Si la cuenta no existe en Firebase Auth (primer inicio), se crea automáticamente.
 */
export async function loginSimple(userId: UserId, pin: string): Promise<User> {
  if (!/^\d{4,8}$/.test(pin)) {
    throw new Error('El PIN debe tener entre 4 y 8 dígitos.');
  }
  const user = DEFAULT_USERS.find(u => u.id === userId);
  if (!user) throw new Error('Usuario desconocido.');
  const password = `${userId}-${pin}-smp`; // password derivado
  try {
    const cred = await signInWithEmailAndPassword(auth, user.email, password);
    return cred.user;
  } catch (e: any) {
    if (e?.code === 'auth/user-not-found' || e?.code === 'auth/invalid-credential' || e?.code === 'auth/invalid-login-credentials') {
      // Primer inicio: crear cuenta
      try {
        const cred = await createUserWithEmailAndPassword(auth, user.email, password);
        return cred.user;
      } catch (e2: any) {
        if (e2?.code === 'auth/email-already-in-use') {
          throw new Error('PIN incorrecto.');
        }
        throw new Error(e2?.message ?? 'No se pudo iniciar sesión.');
      }
    }
    if (e?.code === 'auth/wrong-password') throw new Error('PIN incorrecto.');
    if (e?.code === 'auth/network-request-failed') {
      // Modo offline: permitir acceso local
      return { uid: userId, email: user.email } as unknown as User;
    }
    throw new Error(e?.message ?? 'No se pudo iniciar sesión.');
  }
}

export async function signOut(): Promise<void> {
  try { await fbSignOut(auth); } catch { /* ignore */ }
}
