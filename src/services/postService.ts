import { ref, push, get, set, update, query, limitToLast, orderByChild, equalTo, onValue, off } from 'firebase/database';
import { rtdb } from '../firebase/config';
import { Post, PostMediaItem, PollData, DraftItem, UserProfile } from '../types';
import { userService } from './userService';
import { notificationService } from './notificationService';
import { sanitizeForFirebase } from '../utils/firebaseUtils';

// Session set of viewed posts to avoid duplicate view counting per session
const viewedPostsInSession = new Set<string>();

export const postService = {
  /**
   * Parse text for #hashtags and @mentions
   */
  parseContent(text: string): { hashtags: string[]; mentions: string[] } {
    const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;

    const hashtags: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = hashtagRegex.exec(text)) !== null) {
      const tag = match[1].toLowerCase();
      if (!hashtags.includes(tag)) hashtags.push(tag);
    }

    const mentions: string[] = [];
    while ((match = mentionRegex.exec(text)) !== null) {
      const u = match[1].toLowerCase();
      if (!mentions.includes(u)) mentions.push(u);
    }

    return { hashtags, mentions };
  },

  /**
   * Create a new post / reply / quote post
   */
  async createPost(params: {
    authorId: string;
    text: string;
    media?: PostMediaItem[];
    replyTo?: string;
    quotePostId?: string;
    repostOf?: string;
    poll?: { question: string; options: string[]; durationHours: number };
    contentWarning?: string;
    communityId?: string;
    visibility?: 'public' | 'followers' | 'community';
  }): Promise<Post> {
    const { authorId, text, media, replyTo, quotePostId, repostOf, poll, contentWarning, communityId, visibility } = params;
    const now = Date.now();

    const postRef = push(ref(rtdb, 'posts'));
    const postId = postRef.key;
    if (!postId) throw new Error('Failed to generate post key');

    const { hashtags, mentions } = this.parseContent(text || '');

    let pollData: PollData | undefined = undefined;
    if (poll && poll.options && poll.options.length >= 2) {
      pollData = {
        question: poll.question.trim(),
        options: poll.options.map((opt, idx) => ({
          id: `opt_${idx}`,
          text: opt.trim(),
          votes: 0
        })),
        expiresAt: now + (poll.durationHours || 24) * 60 * 60 * 1000,
        totalVotes: 0,
        voters: {}
      };
    }

    const newPost: Post = {
      id: postId,
      authorId,
      text: text ? text.trim() : '',
      media: media && media.length > 0 ? media : undefined,
      replyTo: replyTo || undefined,
      quotePostId: quotePostId || undefined,
      repostOf: repostOf || undefined,
      createdAt: now,
      updatedAt: now,
      visibility: visibility || 'public',
      communityId: communityId || undefined,
      language: 'en',
      hashtags: hashtags.length > 0 ? hashtags : undefined,
      mentions: mentions.length > 0 ? mentions : undefined,
      contentWarning: contentWarning ? contentWarning.trim() : undefined,
      poll: pollData,
      likeCount: 0,
      replyCount: 0,
      repostCount: 0,
      quoteCount: 0,
      viewCount: 0,
      bookmarkCount: 0,
      status: 'active'
    };

    const sanitizedPost = sanitizeForFirebase(newPost);
    const updates: Record<string, any> = {};
    updates[`posts/${postId}`] = sanitizedPost;

    // Index hashtags
    for (const tag of hashtags) {
      updates[`hashtags/${tag}/${postId}`] = now;
    }

    // Index replies if replyTo exists
    if (replyTo) {
      updates[`replies/${replyTo}/${postId}`] = now;
    }

    // Index user posts
    updates[`user_posts/${authorId}/${postId}`] = now;

    // Author post count increment
    const authorProfile = await userService.getUserProfile(authorId);
    if (authorProfile) {
      updates[`users/${authorId}/postsCount`] = (authorProfile.postsCount || 0) + 1;
    }

    await update(ref(rtdb), sanitizeForFirebase(updates));

    // If reply, increment parent's replyCount and send notification
    if (replyTo) {
      this.incrementReplyCount(replyTo, authorId, text, postId).catch(console.warn);
    }

    // If quote, increment quoteCount and notify
    if (quotePostId) {
      this.incrementQuoteCount(quotePostId, authorId, text, postId).catch(console.warn);
    }

    // Send mention notifications
    if (mentions.length > 0) {
      this.notifyMentions(mentions, authorId, postId, text).catch(console.warn);
    }

    newPost.author = authorProfile || undefined;
    return newPost;
  },

  async incrementReplyCount(parentPostId: string, replyAuthorId: string, replyText: string, newReplyId: string) {
    try {
      const snap = await get(ref(rtdb, `posts/${parentPostId}`));
      if (!snap.exists()) return;
      const parent = snap.val() as Post;
      await update(ref(rtdb, `posts/${parentPostId}`), {
        replyCount: (parent.replyCount || 0) + 1
      });

      if (parent.authorId !== replyAuthorId) {
        await notificationService.sendNotification({
          type: 'reply',
          actorId: replyAuthorId,
          postId: parentPostId,
          postText: replyText.slice(0, 100),
          createdAt: Date.now(),
          read: false
        }, parent.authorId);
      }
    } catch (e) {
      console.warn('Error handling reply count:', e);
    }
  },

  async incrementQuoteCount(quotePostId: string, authorId: string, quoteText: string, newPostId: string) {
    try {
      const snap = await get(ref(rtdb, `posts/${quotePostId}`));
      if (!snap.exists()) return;
      const parent = snap.val() as Post;
      await update(ref(rtdb, `posts/${quotePostId}`), {
        quoteCount: (parent.quoteCount || 0) + 1
      });

      if (parent.authorId !== authorId) {
        await notificationService.sendNotification({
          type: 'quote',
          actorId: authorId,
          postId: newPostId,
          postText: quoteText.slice(0, 100),
          createdAt: Date.now(),
          read: false
        }, parent.authorId);
      }
    } catch (e) {
      console.warn('Error handling quote count:', e);
    }
  },

  async notifyMentions(mentions: string[], authorId: string, postId: string, text: string) {
    for (const username of mentions) {
      const targetUser = await userService.getUserByUsername(username);
      if (targetUser && targetUser.uid !== authorId) {
        await notificationService.sendNotification({
          type: 'mention',
          actorId: authorId,
          postId,
          postText: text.slice(0, 100),
          createdAt: Date.now(),
          read: false
        }, targetUser.uid);
      }
    }
  },

  /**
   * Delete post (author can delete their own post)
   */
  async deletePost(postId: string, currentUid: string, isAdmin: boolean = false): Promise<void> {
    if (!postId || !currentUid) throw new Error('Not authorized to delete this post');
    const postSnap = await get(ref(rtdb, `posts/${postId}`));
    if (!postSnap.exists()) return;
    const post = postSnap.val() as Post;

    if (post.authorId !== currentUid && !isAdmin) {
      throw new Error('You can only delete your own posts');
    }

    try {
      await update(ref(rtdb, `posts/${postId}`), { status: 'removed' });
    } catch {
      await set(ref(rtdb, `posts/${postId}/status`), 'removed');
    }

    // Clean up auxiliary index paths
    set(ref(rtdb, `user_posts/${post.authorId}/${postId}`), null).catch(() => {});
    if (post.hashtags && Array.isArray(post.hashtags)) {
      for (const tag of post.hashtags) {
        set(ref(rtdb, `hashtags/${tag}/${postId}`), null).catch(() => {});
      }
    }

    const authorProfile = await userService.getUserProfile(post.authorId);
    if (authorProfile && (authorProfile.postsCount || 0) > 0) {
      update(ref(rtdb, `users/${post.authorId}`), {
        postsCount: Math.max(0, authorProfile.postsCount - 1)
      }).catch(() => {});
    }
  },

  /**
   * Fetch a single post by ID and hydrate
   */
  async getPostById(postId: string, currentUid?: string): Promise<Post | null> {
    if (!postId) return null;
    try {
      const snap = await get(ref(rtdb, `posts/${postId}`));
      if (!snap.exists()) return null;
      const post = snap.val() as Post;
      post.id = postId;

      if (post.status === 'removed') return null;

      return this.hydratePost(post, currentUid);
    } catch (err) {
      console.error(`Error fetching post ${postId}:`, err);
      return null;
    }
  },

  /**
   * Hydrate post with author profile, interaction states (liked, reposted, bookmarked), and quotePost
   */
  async hydratePost(post: Post, currentUid?: string): Promise<Post> {
    const [author, quotePost] = await Promise.all([
      userService.getUserProfile(post.authorId),
      post.quotePostId ? this.getQuotePreview(post.quotePostId) : Promise.resolve(undefined)
    ]);

    post.author = author || undefined;
    post.quotePost = quotePost || undefined;

    if (currentUid) {
      const [likeSnap, repostSnap, bookmarkSnap] = await Promise.all([
        get(ref(rtdb, `likes/${post.id}/${currentUid}`)),
        get(ref(rtdb, `reposts/${post.id}/${currentUid}`)),
        get(ref(rtdb, `bookmarks/${currentUid}/${post.id}`))
      ]);

      post.userLiked = likeSnap.exists();
      post.userReposted = repostSnap.exists();
      post.userBookmarked = bookmarkSnap.exists();

      if (post.poll && post.poll.voters && post.poll.voters[currentUid]) {
        post.userVotedOptionId = post.poll.voters[currentUid];
      }
    }

    return post;
  },

  async getQuotePreview(quotePostId: string): Promise<Post | undefined> {
    try {
      const snap = await get(ref(rtdb, `posts/${quotePostId}`));
      if (!snap.exists()) return undefined;
      const q = snap.val() as Post;
      q.id = quotePostId;
      if (q.status === 'removed') return undefined;
      q.author = (await userService.getUserProfile(q.authorId)) || undefined;
      return q;
    } catch {
      return undefined;
    }
  },

  /**
   * Toggle Like
   */
  async toggleLike(postId: string, currentUid: string): Promise<{ liked: boolean; newCount: number }> {
    if (!currentUid) throw new Error('Must be logged in to like');

    const likeRef = ref(rtdb, `likes/${postId}/${currentUid}`);
    const likeSnap = await get(likeRef);
    const postSnap = await get(ref(rtdb, `posts/${postId}`));
    if (!postSnap.exists()) throw new Error('Post not found');

    const post = postSnap.val() as Post;
    const isCurrentlyLiked = likeSnap.exists();
    const newLiked = !isCurrentlyLiked;
    const newCount = Math.max(0, (post.likeCount || 0) + (newLiked ? 1 : -1));

    const updates: Record<string, any> = {};
    updates[`likes/${postId}/${currentUid}`] = newLiked ? Date.now() : null;
    updates[`user_likes/${currentUid}/${postId}`] = newLiked ? Date.now() : null;
    updates[`posts/${postId}/likeCount`] = newCount;

    await update(ref(rtdb), updates);

    // Notification if liked
    if (newLiked && post.authorId !== currentUid) {
      notificationService.sendNotification({
        type: 'like',
        actorId: currentUid,
        postId,
        postText: post.text ? post.text.slice(0, 100) : 'a post',
        createdAt: Date.now(),
        read: false
      }, post.authorId).catch(console.warn);
    }

    return { liked: newLiked, newCount };
  },

  /**
   * Toggle Repost
   */
  async toggleRepost(postId: string, currentUid: string): Promise<{ reposted: boolean; newCount: number }> {
    if (!currentUid) throw new Error('Must be logged in to repost');

    const repostRef = ref(rtdb, `reposts/${postId}/${currentUid}`);
    const repostSnap = await get(repostRef);
    const postSnap = await get(ref(rtdb, `posts/${postId}`));
    if (!postSnap.exists()) throw new Error('Post not found');

    const post = postSnap.val() as Post;
    const isCurrentlyReposted = repostSnap.exists();
    const newReposted = !isCurrentlyReposted;
    const newCount = Math.max(0, (post.repostCount || 0) + (newReposted ? 1 : -1));

    const updates: Record<string, any> = {};
    updates[`reposts/${postId}/${currentUid}`] = newReposted ? Date.now() : null;
    updates[`user_reposts/${currentUid}/${postId}`] = newReposted ? Date.now() : null;
    updates[`posts/${postId}/repostCount`] = newCount;

    await update(ref(rtdb), updates);

    if (newReposted && post.authorId !== currentUid) {
      notificationService.sendNotification({
        type: 'repost',
        actorId: currentUid,
        postId,
        postText: post.text ? post.text.slice(0, 100) : 'a post',
        createdAt: Date.now(),
        read: false
      }, post.authorId).catch(console.warn);
    }

    return { reposted: newReposted, newCount };
  },

  /**
   * Toggle Bookmark
   */
  async toggleBookmark(postId: string, currentUid: string): Promise<{ bookmarked: boolean; newCount: number }> {
    if (!currentUid) throw new Error('Must be logged in to bookmark');

    const bookmarkRef = ref(rtdb, `bookmarks/${currentUid}/${postId}`);
    const bookmarkSnap = await get(bookmarkRef);
    const postSnap = await get(ref(rtdb, `posts/${postId}`));
    if (!postSnap.exists()) throw new Error('Post not found');

    const post = postSnap.val() as Post;
    const isCurrentlyBookmarked = bookmarkSnap.exists();
    const newBookmarked = !isCurrentlyBookmarked;
    const newCount = Math.max(0, (post.bookmarkCount || 0) + (newBookmarked ? 1 : -1));

    const updates: Record<string, any> = {};
    updates[`bookmarks/${currentUid}/${postId}`] = newBookmarked ? Date.now() : null;
    updates[`posts/${postId}/bookmarkCount`] = newCount;

    await update(ref(rtdb), updates);

    return { bookmarked: newBookmarked, newCount };
  },

  /**
   * Vote on a poll
   */
  async votePoll(postId: string, optionId: string, currentUid: string): Promise<PollData> {
    if (!currentUid) throw new Error('Must be logged in to vote');

    const postRef = ref(rtdb, `posts/${postId}`);
    const snap = await get(postRef);
    if (!snap.exists()) throw new Error('Post not found');

    const post = snap.val() as Post;
    if (!post.poll) throw new Error('Post does not contain a poll');
    if (Date.now() > post.poll.expiresAt) throw new Error('This poll has ended');

    const voters = post.poll.voters || {};
    if (voters[currentUid]) {
      throw new Error('You have already voted on this poll');
    }

    voters[currentUid] = optionId;
    let optionFound = false;

    const newOptions = post.poll.options.map((opt) => {
      if (opt.id === optionId) {
        optionFound = true;
        return { ...opt, votes: (opt.votes || 0) + 1 };
      }
      return opt;
    });

    if (!optionFound) throw new Error('Selected poll option not found');

    const updatedPoll: PollData = {
      ...post.poll,
      options: newOptions,
      totalVotes: (post.poll.totalVotes || 0) + 1,
      voters
    };

    await update(ref(rtdb, `posts/${postId}`), { poll: updatedPoll });
    return updatedPoll;
  },

  /**
   * Increment view count (once per session per post)
   */
  async incrementViewCount(postId: string): Promise<void> {
    if (!postId || viewedPostsInSession.has(postId)) return;
    viewedPostsInSession.add(postId);

    try {
      const snap = await get(ref(rtdb, `posts/${postId}/viewCount`));
      const current = snap.exists() ? (snap.val() as number) : 0;
      await update(ref(rtdb, `posts/${postId}`), { viewCount: current + 1 });
    } catch {
      // Ignore background view counter errors
    }
  },

  /**
   * Fetch replies for a post
   */
  async getRepliesForPost(postId: string, currentUid?: string): Promise<Post[]> {
    try {
      const snap = await get(ref(rtdb, `replies/${postId}`));
      if (!snap.exists()) return [];

      const replyIds = Object.keys(snap.val());
      const posts = await Promise.all(
        replyIds.map(async (id) => this.getPostById(id, currentUid))
      );

      return posts.filter((p): p is Post => p !== null && p.status === 'active');
    } catch (err) {
      console.error(`Error getting replies for ${postId}:`, err);
      return [];
    }
  },

  /**
   * Fetch posts by a specific user (including reposts made by user)
   */
  async getUserPosts(uid: string, currentUid?: string): Promise<Post[]> {
    if (!uid) return [];
    try {
      const [postsSnap, repostsSnap] = await Promise.all([
        get(ref(rtdb, 'posts')),
        get(ref(rtdb, 'reposts'))
      ]);

      if (!postsSnap.exists()) return [];

      const repostsData = repostsSnap.exists() ? (repostsSnap.val() as Record<string, Record<string, any>>) : {};
      const posts: Post[] = [];

      postsSnap.forEach((child) => {
        const val = child.val() as Post;
        val.id = child.key || val.id;
        if (val.status === 'removed') return;

        // User's own non-reply post
        if (val.authorId === uid && !val.replyTo) {
          posts.push(val);
        } else if (repostsData[val.id] && repostsData[val.id][uid]) {
          // Post reposted by this user
          posts.push({
            ...val,
            repostedByUid: uid
          } as any);
        }
      });

      posts.sort((a, b) => b.createdAt - a.createdAt);
      return Promise.all(posts.map((p) => this.hydratePost(p, currentUid)));
    } catch (err) {
      console.error(`Error fetching posts for user ${uid}:`, err);
      return [];
    }
  },

  /**
   * Fetch replies made by a user
   */
  async getUserReplies(uid: string, currentUid?: string): Promise<Post[]> {
    if (!uid) return [];
    try {
      const postsSnap = await get(ref(rtdb, 'posts'));
      if (!postsSnap.exists()) return [];

      const replies: Post[] = [];
      postsSnap.forEach((child) => {
        const val = child.val() as Post;
        val.id = child.key || val.id;
        if (val.authorId === uid && val.status !== 'removed' && Boolean(val.replyTo)) {
          replies.push(val);
        }
      });

      replies.sort((a, b) => b.createdAt - a.createdAt);
      return Promise.all(replies.map((p) => this.hydratePost(p, currentUid)));
    } catch (err) {
      console.error(`Error fetching replies for user ${uid}:`, err);
      return [];
    }
  },

  /**
   * Fetch reposts made by a user
   */
  async getUserReposts(uid: string, currentUid?: string): Promise<Post[]> {
    if (!uid) return [];
    try {
      const [postsSnap, repostsSnap] = await Promise.all([
        get(ref(rtdb, 'posts')),
        get(ref(rtdb, 'reposts'))
      ]);

      if (!postsSnap.exists() || !repostsSnap.exists()) return [];

      const repostsData = repostsSnap.val() as Record<string, Record<string, any>>;
      const repostedPosts: Post[] = [];

      postsSnap.forEach((child) => {
        const p = child.val() as Post;
        p.id = child.key || p.id;
        if (p.status !== 'removed' && repostsData[p.id] && repostsData[p.id][uid]) {
          repostedPosts.push({
            ...p,
            repostedByUid: uid
          } as any);
        }
      });

      repostedPosts.sort((a, b) => b.createdAt - a.createdAt);
      return Promise.all(repostedPosts.map((p) => this.hydratePost(p, currentUid)));
    } catch (err) {
      console.error(`Error fetching reposts for user ${uid}:`, err);
      return [];
    }
  },

  /**
   * Fetch posts with media created by a user
   */
  async getUserMedia(uid: string, currentUid?: string): Promise<Post[]> {
    if (!uid) return [];
    try {
      const postsSnap = await get(ref(rtdb, 'posts'));
      if (!postsSnap.exists()) return [];

      const mediaPosts: Post[] = [];
      postsSnap.forEach((child) => {
        const val = child.val() as Post;
        val.id = child.key || val.id;
        if (val.authorId === uid && val.status !== 'removed' && val.media && val.media.length > 0) {
          mediaPosts.push(val);
        }
      });

      mediaPosts.sort((a, b) => b.createdAt - a.createdAt);
      return Promise.all(mediaPosts.map((p) => this.hydratePost(p, currentUid)));
    } catch (err) {
      console.error(`Error fetching media for user ${uid}:`, err);
      return [];
    }
  },

  /**
   * Fetch posts liked by a user
   */
  async getUserLikes(uid: string, currentUid?: string): Promise<Post[]> {
    if (!uid) return [];
    try {
      const [postsSnap, likesSnap] = await Promise.all([
        get(ref(rtdb, 'posts')),
        get(ref(rtdb, 'likes'))
      ]);

      if (!postsSnap.exists() || !likesSnap.exists()) return [];

      const likesData = likesSnap.val() as Record<string, Record<string, any>>;
      const likedPosts: Post[] = [];

      postsSnap.forEach((child) => {
        const p = child.val() as Post;
        p.id = child.key || p.id;
        if (p.status !== 'removed' && likesData[p.id] && likesData[p.id][uid]) {
          likedPosts.push(p);
        }
      });

      likedPosts.sort((a, b) => b.createdAt - a.createdAt);
      return Promise.all(likedPosts.map((p) => this.hydratePost(p, currentUid)));
    } catch (err) {
      console.error(`Error fetching likes for user ${uid}:`, err);
      return [];
    }
  },

  /**
   * Drafts management
   */
  async saveDraft(uid: string, draft: Omit<DraftItem, 'id' | 'updatedAt'>): Promise<string> {
    const draftRef = push(ref(rtdb, `drafts/${uid}`));
    const draftId = draftRef.key || Date.now().toString();
    const item: DraftItem = {
      ...draft,
      id: draftId,
      updatedAt: Date.now()
    };
    await set(draftRef, sanitizeForFirebase(item));
    return draftId;
  },

  async getDrafts(uid: string): Promise<DraftItem[]> {
    try {
      const snap = await get(ref(rtdb, `drafts/${uid}`));
      if (!snap.exists()) return [];
      const list: DraftItem[] = [];
      snap.forEach((child) => {
        list.push({ ...child.val(), id: child.key });
      });
      list.sort((a, b) => b.updatedAt - a.updatedAt);
      return list;
    } catch {
      return [];
    }
  },

  async deleteDraft(uid: string, draftId: string): Promise<void> {
    await set(ref(rtdb, `drafts/${uid}/${draftId}`), null);
  }
};
