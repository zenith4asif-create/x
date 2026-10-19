import { ref, get } from 'firebase/database';
import { rtdb } from '../firebase/config';
import { postService } from './postService';

export const seedService = {
  /**
   * If database has 0 posts, seeds initial welcome posts introducing ZOR
   */
  async seedIfEmpty(): Promise<void> {
    try {
      const snap = await get(ref(rtdb, 'posts'));
      if (snap.exists() && Object.keys(snap.val()).length > 0) {
        return; // Already populated
      }

      // Seed initial posts
      await postService.createPost({
        authorId: 'system_zor',
        text: 'Welcome to ZOR — the next-generation decentralized social network. Built with real-time sync, Cloudinary media optimization, and algorithmic discovery. What are your thoughts on modern social architectures? #ZORPlatform #Tech #WebDev',
        poll: {
          question: 'What matters most to you in a social platform?',
          options: ['Fast Real-Time Feeds', 'Clean Anti-Slop Design', 'Algorithmic Personalization', 'Private Direct Messaging'],
          durationHours: 72
        }
      });

      await postService.createPost({
        authorId: 'system_zor',
        text: 'Zero-slop interface design, instant media CDN delivery via Cloudinary, and high-performance real-time interactions. Experience the speed of ZOR. #DesignSystems #Architecture'
      });
    } catch (err) {
      console.warn('Seed skipped:', err);
    }
  }
};
