import { ref, push, get, set, update, query, limitToLast, orderByChild } from 'firebase/database';
import { rtdb } from '../firebase/config';
import { ReportItem, UserProfile, Post } from '../types';
import { userService } from './userService';
import { postService } from './postService';
import { sanitizeForFirebase } from '../utils/firebaseUtils';

export const moderationService = {
  /**
   * Submit a user report
   */
  async submitReport(params: {
    reporterId: string;
    targetType: 'post' | 'user' | 'community';
    targetId: string;
    reason: ReportItem['reason'];
    details?: string;
  }): Promise<string> {
    const rRef = push(ref(rtdb, 'reports'));
    const reportId = rRef.key || Date.now().toString();

    const item: ReportItem = {
      id: reportId,
      reporterId: params.reporterId,
      targetType: params.targetType,
      targetId: params.targetId,
      reason: params.reason,
      details: params.details?.trim() || undefined,
      createdAt: Date.now(),
      status: 'pending'
    };

    await set(rRef, sanitizeForFirebase(item));
    return reportId;
  },

  /**
   * Admin: Get all reports
   */
  async getReports(): Promise<ReportItem[]> {
    try {
      const snap = await get(ref(rtdb, 'reports'));
      if (!snap.exists()) return [];

      const list: ReportItem[] = [];
      const hydrationTasks: Promise<void>[] = [];

      snap.forEach((child) => {
        const r = child.val() as ReportItem;
        r.id = child.key || r.id;

        // Hydrate reporter & target
        hydrationTasks.push(
          userService.getUserProfile(r.reporterId).then((rep) => {
            r.reporter = rep || undefined;
          })
        );

        if (r.targetType === 'post') {
          hydrationTasks.push(
            postService.getPostById(r.targetId).then((p) => {
              r.targetPost = p || undefined;
            })
          );
        } else if (r.targetType === 'user') {
          hydrationTasks.push(
            userService.getUserProfile(r.targetId).then((u) => {
              r.targetUser = u || undefined;
            })
          );
        }

        list.push(r);
      });

      await Promise.all(hydrationTasks);
      list.sort((a, b) => b.createdAt - a.createdAt);
      return list;
    } catch (err) {
      console.error('Error fetching reports:', err);
      return [];
    }
  },

  /**
   * Admin: Resolve or dismiss report
   */
  async updateReportStatus(reportId: string, status: 'resolved' | 'dismissed'): Promise<void> {
    await update(ref(rtdb, `reports/${reportId}`), { status });
  },

  /**
   * Admin: Suspend or restore user
   */
  async setUserAccountStatus(uid: string, status: 'active' | 'suspended'): Promise<void> {
    await update(ref(rtdb, `users/${uid}`), { accountStatus: status });
  },

  /**
   * Admin: Set verified status
   */
  async setUserVerification(uid: string, verified: boolean): Promise<void> {
    await update(ref(rtdb, `users/${uid}`), { verified });
  },

  /**
   * Admin: Platform statistics overview
   */
  async getPlatformStats(): Promise<{
    totalUsers: number;
    totalPosts: number;
    totalReports: number;
    pendingReports: number;
  }> {
    try {
      const [usersSnap, postsSnap, reportsSnap] = await Promise.all([
        get(ref(rtdb, 'users')),
        get(ref(rtdb, 'posts')),
        get(ref(rtdb, 'reports'))
      ]);

      const totalUsers = usersSnap.exists() ? Object.keys(usersSnap.val()).length : 0;
      const totalPosts = postsSnap.exists() ? Object.keys(postsSnap.val()).length : 0;
      
      let totalReports = 0;
      let pendingReports = 0;
      if (reportsSnap.exists()) {
        const reps = reportsSnap.val();
        totalReports = Object.keys(reps).length;
        Object.values(reps).forEach((r: any) => {
          if (r.status === 'pending') pendingReports++;
        });
      }

      return { totalUsers, totalPosts, totalReports, pendingReports };
    } catch {
      return { totalUsers: 0, totalPosts: 0, totalReports: 0, pendingReports: 0 };
    }
  }
};
