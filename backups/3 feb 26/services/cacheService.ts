import { db } from './firebaseConfig';
import { collection, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

const CACHE_COLLECTION = 'ai_cache';
const CACHE_TTL_DAYS = 7; // Cache is valid for 7 days

export interface CacheEntry {
        hash: string;
        params: any;
        response: any;
        timestamp: number;
        model: string;
}

/**
 * Create a simple deterministic hash from the input parameters.
 * We prioritize speed over cryptographic security here.
 */
const calculateHash = async (data: any): Promise<string> => {
        const jsonString = JSON.stringify(data, Object.keys(data).sort());
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(jsonString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Retrieve a cached response if it exists and hasn't expired.
 */
export const getCachedResponse = async (params: any): Promise<any | null> => {
        try {
                const hash = await calculateHash(params);
                const docRef = doc(db, CACHE_COLLECTION, hash);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                        const data = docSnap.data() as CacheEntry;

                        // Check for expiration
                        const now = Date.now();
                        const ageInMs = now - data.timestamp;
                        const ttlInMs = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

                        if (ageInMs < ttlInMs) {
                                console.log(`✅ [Cache] Hit for hash: ${hash.substring(0, 8)}`);
                                return data.response;
                        } else {
                                console.log(`⚠️ [Cache] Expired entry found for hash: ${hash.substring(0, 8)}`);
                        }
                }
        } catch (error) {
                console.warn("⚠️ [Cache] Read failed:", error);
        }
        return null;
};

/**
 * Save an AI response to the cache.
 */
export const cacheResponse = async (params: any, response: any, modelName: string) => {
        try {
                const hash = await calculateHash(params);
                const docRef = doc(db, CACHE_COLLECTION, hash);

                const entry: CacheEntry = {
                        hash,
                        params, // Store original params for debugging/verification
                        response,
                        timestamp: Date.now(),
                        model: modelName
                };

                await setDoc(docRef, entry);
                console.log(`💾 [Cache] Saved hash: ${hash.substring(0, 8)}`);
        } catch (error) {
                console.warn("⚠️ [Cache] Write failed:", error);
        }
};
