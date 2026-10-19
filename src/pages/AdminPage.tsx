import React, { useState, useEffect } from 'react';
import { ReportItem, UserProfile } from '../types';
import { moderationService } from '../services/moderationService';
import { searchService } from '../services/searchService';
import { postService } from '../services/postService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  ShieldAlert,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Sliders,
  Trash2,
  Ban,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { VerifiedBadge } from '../components/brand/VerifiedBadge';

export const AdminPage: React.FC = () => {
  const { userProfile } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'settings'>('reports');
  const [stats, setStats] = useState({ totalUsers: 0, totalPosts: 0, totalReports: 0, pendingReports: 0 });
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  // User management
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Platform Config
  const [maxChars, setMaxChars] = useState(280);
  const [allowSignups, setAllowSignups] = useState(true);

  const isAdmin = userProfile?.role === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [platformStats, reportList] = await Promise.all([
        moderationService.getPlatformStats(),
        moderationService.getReports()
      ]);
      setStats(platformStats);
      setReports(reportList);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveReport = async (reportId: string, action?: 'delete_post' | 'suspend_user') => {
    try {
      const targetReport = reports.find((r) => r.id === reportId);
      if (action === 'delete_post' && targetReport?.targetType === 'post') {
        await postService.deletePost(targetReport.targetId, userProfile!.uid, true);
        showToast('Post removed by moderation', 'success');
      } else if (action === 'suspend_user' && targetReport) {
        const uid = targetReport.targetType === 'user' ? targetReport.targetId : targetReport.targetPost?.authorId;
        if (uid) {
          await moderationService.setUserAccountStatus(uid, 'suspended');
          showToast('Account suspended', 'success');
        }
      }

      await moderationService.updateReportStatus(reportId, 'resolved');
      setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: 'resolved' } : r)));
      showToast('Report marked as resolved', 'success');
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  const handleDismissReport = async (reportId: string) => {
    try {
      await moderationService.updateReportStatus(reportId, 'dismissed');
      setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: 'dismissed' } : r)));
      showToast('Report dismissed', 'info');
    } catch {
      showToast('Failed to dismiss report', 'error');
    }
  };

  const handleSearchUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim()) return;
    setSearchingUsers(true);
    try {
      const res = await searchService.searchUsers(userQuery);
      setUserResults(res);
    } finally {
      setSearchingUsers(false);
    }
  };

  const toggleVerification = async (u: UserProfile) => {
    const nextVal = !u.verified;
    try {
      await moderationService.setUserVerification(u.uid, nextVal);
      u.verified = nextVal;
      setUserResults([...userResults]);
      showToast(`Verification ${nextVal ? 'granted' : 'revoked'} for @${u.username}`, 'success');
    } catch {
      showToast('Action failed', 'error');
    }
  };

  const toggleSuspension = async (u: UserProfile) => {
    const nextStatus = u.accountStatus === 'suspended' ? 'active' : 'suspended';
    try {
      await moderationService.setUserAccountStatus(u.uid, nextStatus);
      u.accountStatus = nextStatus;
      setUserResults([...userResults]);
      showToast(`Account status updated to ${nextStatus}`, 'success');
    } catch {
      showToast('Action failed', 'error');
    }
  };

  if (!isAdmin) {
    return (
      <div className="py-24 text-center px-4">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-100">Restricted Administration Portal</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
          Access to moderation queues and system controls requires authorized administrator role credentials.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-indigo-400">
          <ShieldAlert className="w-5 h-5" />
          <h1 className="text-sm font-bold text-slate-100">ZOR Administrative & Moderation Console</h1>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 font-mono text-[11px] font-bold">
          ADMIN
        </span>
      </div>

      {/* KPI Stats Strip */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Users className="w-3.5 h-3.5" />
            <span>Total Accounts</span>
          </div>
          <p className="text-xl font-bold font-mono text-white tabular-nums">{stats.totalUsers}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <FileText className="w-3.5 h-3.5" />
            <span>Total Posts</span>
          </div>
          <p className="text-xl font-bold font-mono text-white tabular-nums">{stats.totalPosts}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Total Reports</span>
          </div>
          <p className="text-xl font-bold font-mono text-white tabular-nums">{stats.totalReports}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800">
          <div className="flex items-center gap-2 text-rose-400 text-xs mb-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Pending Review</span>
          </div>
          <p className="text-xl font-bold font-mono text-rose-400 tabular-nums">{stats.pendingReports}</p>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center border-b border-slate-800/80 px-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('reports')}
          className={`py-3 px-4 border-b-2 transition-colors ${
            activeTab === 'reports' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Moderation Queue ({stats.pendingReports})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`py-3 px-4 border-b-2 transition-colors ${
            activeTab === 'users' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          User & Verification Controls
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`py-3 px-4 border-b-2 transition-colors ${
            activeTab === 'settings' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Platform Settings
        </button>
      </div>

      {/* Tab 1: Reports Queue */}
      {activeTab === 'reports' && (
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="py-20 flex justify-center items-center text-slate-500">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
            </div>
          ) : reports.length === 0 ? (
            <div className="py-20 text-center text-xs text-slate-500">
              No reports currently in moderation queue.
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold uppercase tracking-wider text-[10px]">
                      {report.reason}
                    </span>
                    <span className="text-slate-400">Target: {report.targetType}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-500 font-mono">
                      {new Date(report.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                      report.status === 'pending'
                        ? 'bg-amber-500/20 text-amber-300'
                        : report.status === 'resolved'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {report.status}
                  </span>
                </div>

                {report.details && (
                  <p className="text-slate-300 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
                    "{report.details}"
                  </p>
                )}

                {report.targetPost && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-semibold text-slate-300">
                      Reported Post by @{report.targetPost.author?.username || 'user'}:
                    </span>
                    <p className="text-slate-400 mt-1">{report.targetPost.text}</p>
                  </div>
                )}

                {/* Moderation Actions */}
                {report.status === 'pending' && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => handleDismissReport(report.id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      Dismiss Report
                    </button>

                    {report.targetType === 'post' && (
                      <button
                        onClick={() => handleResolveReport(report.id, 'delete_post')}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Post</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleResolveReport(report.id, 'suspend_user')}
                      className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-semibold flex items-center gap-1"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Suspend User</span>
                    </button>

                    <button
                      onClick={() => handleResolveReport(report.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                    >
                      Mark Resolved
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: User Verification & Suspension Controls */}
      {activeTab === 'users' && (
        <div className="p-4 space-y-4">
          <form onSubmit={handleSearchUsers} className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-xs">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Search user to manage verification or status..."
                className="w-full bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={searchingUsers}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              {searchingUsers ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </form>

          <div className="space-y-3">
            {userResults.map((u) => (
              <div
                key={u.uid}
                className="p-3.5 rounded-2xl border border-slate-800 bg-slate-900/40 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={u.avatarUrl}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover bg-slate-800"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-100 truncate">{u.displayName}</span>
                      {u.verified && <VerifiedBadge size={14} />}
                    </div>
                    <p className="text-slate-400 truncate">@{u.username}</p>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Status: {u.accountStatus} · Role: {u.role}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleVerification(u)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1 ${
                      u.verified
                        ? 'bg-indigo-500/20 text-indigo-300 hover:bg-rose-500/20 hover:text-rose-300'
                        : 'bg-slate-800 text-slate-300 hover:bg-indigo-600 hover:text-white'
                    }`}
                  >
                    <VerifiedBadge size={14} />
                    <span>{u.verified ? 'Revoke Badge' : 'Assign Badge'}</span>
                  </button>

                  <button
                    onClick={() => toggleSuspension(u)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1 ${
                      u.accountStatus === 'suspended'
                        ? 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white'
                        : 'bg-rose-600/20 text-rose-300 hover:bg-rose-600 hover:text-white'
                    }`}
                  >
                    {u.accountStatus === 'suspended' ? <RotateCcw className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                    <span>{u.accountStatus === 'suspended' ? 'Restore' : 'Suspend'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Platform Settings */}
      {activeTab === 'settings' && (
        <div className="p-4 max-w-lg space-y-4 text-xs">
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Platform Global Parameters</span>
            </h3>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Max Post Characters</label>
              <select
                value={maxChars}
                onChange={(e) => {
                  setMaxChars(Number(e.target.value));
                  showToast('Character limit setting updated', 'success');
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 focus:outline-none"
              >
                <option value={280}>280 characters (Standard)</option>
                <option value={500}>500 characters (Expanded)</option>
                <option value={1000}>1000 characters (Long-form)</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="font-semibold text-slate-200">Public User Signups</p>
                <p className="text-[11px] text-slate-400">Allow new visitors to register accounts</p>
              </div>
              <input
                type="checkbox"
                checked={allowSignups}
                onChange={(e) => {
                  setAllowSignups(e.target.checked);
                  showToast(`Signups ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
                }}
                className="h-4 w-4 rounded text-indigo-600 focus:ring-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
