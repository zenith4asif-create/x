import { ref, get, set } from 'firebase/database';
import { rtdb } from '../firebase/config';

export const seedService = {
  /**
   * Only real users can post. Removes legacy demo accounts and posts.
   */
  async seedIfEmpty(): Promise<void> {
    try {
      const snap = await get(ref(rtdb, 'posts'));
      if (!snap.exists()) return;

      // Clean up legacy demo posts from 'system_zor'
      const updates: Record<string, any> = {};
      let hasDemo = false;
      snap.forEach((child) => {
        const val = child.val();
        if (val && (val.authorId === 'system_zor' || val.authorId === 'demo')) {
          updates[`posts/${child.key}`] = null;
          hasDemo = true;
        }
      });

      if (hasDemo) {
        for (const [path, val] of Object.entries(updates)) {
          await set(ref(rtdb, path), val).catch(() => {});
        }
      }
    } catch {
      // Ignore
    }
  }
};
