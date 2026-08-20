/**
 * MixChat Offline Storage Service
 * Account-isolated, privacy-preserving client storage for:
 * 1. Post drafts
 * 2. Recent feed snapshot for offline reading
 * 3. Interrupted voice note recordings
 * 4. Automatic purge on logout or account switch
 */

export interface PostDraft {
  content: string;
  visibility?: string;
  locationTag?: string;
  backgroundTheme?: string;
  mediaKeys?: string[];
  updatedAt: number;
}

export interface VoiceNoteDraft {
  audioBase64: string;
  durationSeconds: number;
  conversationId?: string;
  savedAt: number;
}

export interface CachedFeedSnapshot<T extends object> {
  items: T[];
  savedAt: number;
}

const STORAGE_PREFIX = "mixchat_offline_";

function getUserKey(prefix: string, userId?: string | null): string {
  const uid = userId || "anonymous";
  return `${STORAGE_PREFIX}${prefix}_${uid}`;
}

export const offlineStorage = {
  /**
   * Save a post draft isolated to the specific user account
   */
  savePostDraft(userId: string, draft: PostDraft): void {
    if (typeof window === "undefined" || !userId) return;
    try {
      const key = getUserKey("draft_post", userId);
      localStorage.setItem(key, JSON.stringify(draft));
    } catch (err) {
      console.warn("[offlineStorage] Failed to save post draft", err);
    }
  },

  /**
   * Retrieve a post draft for the specific user account
   */
  getPostDraft(userId: string): PostDraft | null {
    if (typeof window === "undefined" || !userId) return null;
    try {
      const key = getUserKey("draft_post", userId);
      const data = localStorage.getItem(key);
      if (!data) return null;
      return JSON.parse(data) as PostDraft;
    } catch {
      return null;
    }
  },

  /**
   * Clear post draft for the user account
   */
  clearPostDraft(userId: string): void {
    if (typeof window === "undefined" || !userId) return;
    try {
      const key = getUserKey("draft_post", userId);
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },

  /**
   * Cache a safe snapshot of recent feed items (maximum 20 items, max 24 hours TTL)
   */
  saveFeedSnapshot<T extends object>(userId: string, items: T[]): void {
    if (typeof window === "undefined" || !userId || !items) return;
    try {
      const key = getUserKey("feed_snapshot", userId);
      const snapshot: CachedFeedSnapshot<T> = {
        items: items.slice(0, 20),
        savedAt: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(snapshot));
    } catch (err) {
      console.warn("[offlineStorage] Failed to save feed snapshot", err);
    }
  },

  /**
   * Get cached feed snapshot if not expired (TTL 24 hours)
   */
  getFeedSnapshot<T extends object>(userId: string): T[] | null {
    if (typeof window === "undefined" || !userId) return null;
    try {
      const key = getUserKey("feed_snapshot", userId);
      const data = localStorage.getItem(key);
      if (!data) return null;
      const snapshot = JSON.parse(data) as CachedFeedSnapshot<T>;
      if (!Array.isArray(snapshot.items) || typeof snapshot.savedAt !== "number") {
        return null;
      }
      // 24 hours TTL
      if (Date.now() - snapshot.savedAt > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(key);
        return null;
      }
      return snapshot.items;
    } catch {
      return null;
    }
  },

  /**
   * Save interrupted voice note draft
   */
  saveVoiceDraft(userId: string, draft: VoiceNoteDraft): void {
    if (typeof window === "undefined" || !userId) return;
    try {
      const key = getUserKey("voice_draft", userId);
      localStorage.setItem(key, JSON.stringify(draft));
    } catch (err) {
      console.warn("[offlineStorage] Failed to save voice note draft", err);
    }
  },

  /**
   * Get interrupted voice note draft
   */
  getVoiceDraft(userId: string): VoiceNoteDraft | null {
    if (typeof window === "undefined" || !userId) return null;
    try {
      const key = getUserKey("voice_draft", userId);
      const data = localStorage.getItem(key);
      if (!data) return null;
      return JSON.parse(data) as VoiceNoteDraft;
    } catch {
      return null;
    }
  },

  /**
   * Clear interrupted voice note draft
   */
  clearVoiceDraft(userId: string): void {
    if (typeof window === "undefined" || !userId) return;
    try {
      const key = getUserKey("voice_draft", userId);
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },

  /**
   * CRITICAL SECURITY & PRIVACY METHOD:
   * Clears ALL user-specific offline cached data on logout or account switch.
   * Ensures User B NEVER sees cached drafts, feed snapshots, or recordings of User A.
   */
  clearUserOfflineData(userId?: string | null): void {
    if (typeof window === "undefined") return;
    try {
      const keysToRemove: string[] = [];
      const uidSuffix = userId ? `_${userId}` : "";

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          if (!userId || key.endsWith(uidSuffix)) {
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (err) {
      console.warn("[offlineStorage] Failed to clear user offline data", err);
    }
  },
};
