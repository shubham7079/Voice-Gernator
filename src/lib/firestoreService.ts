import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { VoiceProfile, GeneratedAudioItem, QuotaData, ApiKeyItem } from '../types';

// ==========================================
// 1. Voices Subcollection: /users/{userId}/voices/{voiceId}
// ==========================================
export async function saveUserVoice(userId: string, voice: VoiceProfile): Promise<void> {
  const voiceRef = doc(db, 'users', userId, 'voices', voice.id);
  await setDoc(voiceRef, voice, { merge: true });
}

export async function deleteUserVoice(userId: string, voiceId: string): Promise<void> {
  const voiceRef = doc(db, 'users', userId, 'voices', voiceId);
  await deleteDoc(voiceRef);
}

export function subscribeUserVoices(
  userId: string,
  onUpdate: (voices: VoiceProfile[]) => void
): () => void {
  const voicesCol = collection(db, 'users', userId, 'voices');
  return onSnapshot(
    voicesCol,
    (snapshot) => {
      const voices: VoiceProfile[] = [];
      snapshot.forEach((docSnap) => {
        voices.push(docSnap.data() as VoiceProfile);
      });
      onUpdate(voices);
    },
    (err) => {
      console.warn('Error subscribing to user voices:', err);
    }
  );
}

// ==========================================
// 2. Audio History Subcollection: /users/{userId}/audioHistory/{audioId}
// ==========================================
export async function saveUserAudioItem(userId: string, item: GeneratedAudioItem): Promise<void> {
  const audioRef = doc(db, 'users', userId, 'audioHistory', item.id);
  await setDoc(audioRef, item, { merge: true });
}

export async function deleteUserAudioItem(userId: string, itemId: string): Promise<void> {
  const audioRef = doc(db, 'users', userId, 'audioHistory', itemId);
  await deleteDoc(audioRef);
}

export async function clearUserAudioHistory(userId: string): Promise<void> {
  const audioCol = collection(db, 'users', userId, 'audioHistory');
  const snap = await getDocs(audioCol);
  const batch = writeBatch(db);
  snap.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });
  await batch.commit();
}

export function subscribeUserAudioHistory(
  userId: string,
  onUpdate: (items: GeneratedAudioItem[]) => void
): () => void {
  const audioCol = collection(db, 'users', userId, 'audioHistory');
  const q = query(audioCol, orderBy('timestamp', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: GeneratedAudioItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as GeneratedAudioItem);
      });
      onUpdate(items);
    },
    (err) => {
      console.warn('Error subscribing to audio history:', err);
    }
  );
}

// ==========================================
// 3. User Quota: /users/{userId}/quota/daily
// ==========================================
export async function saveUserQuota(userId: string, quota: QuotaData): Promise<void> {
  const quotaRef = doc(db, 'users', userId, 'quota', 'daily');
  await setDoc(quotaRef, quota, { merge: true });
}

export function subscribeUserQuota(
  userId: string,
  onUpdate: (quota: QuotaData) => void
): () => void {
  const quotaRef = doc(db, 'users', userId, 'quota', 'daily');
  return onSnapshot(
    quotaRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as QuotaData);
      }
    },
    (err) => {
      console.warn('Error subscribing to user quota:', err);
    }
  );
}

// ==========================================
// 4. API Keys Subcollection: /users/{userId}/apiKeys/{keyId}
// ==========================================
export async function saveUserApiKey(userId: string, key: ApiKeyItem): Promise<void> {
  const keyRef = doc(db, 'users', userId, 'apiKeys', key.id);
  await setDoc(keyRef, key, { merge: true });
}

export async function deleteUserApiKey(userId: string, keyId: string): Promise<void> {
  const keyRef = doc(db, 'users', userId, 'apiKeys', keyId);
  await deleteDoc(keyRef);
}

export function subscribeUserApiKeys(
  userId: string,
  onUpdate: (keys: ApiKeyItem[]) => void
): () => void {
  const keysCol = collection(db, 'users', userId, 'apiKeys');
  return onSnapshot(
    keysCol,
    (snapshot) => {
      const keys: ApiKeyItem[] = [];
      snapshot.forEach((docSnap) => {
        keys.push(docSnap.data() as ApiKeyItem);
      });
      onUpdate(keys);
    },
    (err) => {
      console.warn('Error subscribing to user API keys:', err);
    }
  );
}
