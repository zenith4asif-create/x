import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import { analyticsService } from '../services/analyticsService';
import {
  User,
  Shield,
  Palette,
  Download,
  Trash2,
  Lock,
  Sun,
  Moon,
  Loader2,
  Check
} from 'lucide-react';

interface SettingsPageProps {
  onOpenEditProfile: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onOpenEditProfile }) => {
  const { currentUser, userProfile, refreshProfile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [isPrivate, setIsPrivate] = useState(Boolean(userProfile?.privacySettings?.isPrivate));
  const [showOnline, setShowOnline] = useState(userProfile?.privacySettings?.showOnlineStatus !== false);
  const [allowDMs, setAllowDMs] = useState(userProfile?.privacySettings?.allowDMsFromEveryone !== false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSavePrivacy = async () => {
    if (!currentUser) return;
    try {
      await userService.updateUserProfile(currentUser.uid, {
        privacySettings: {
          isPrivate,
          showOnlineStatus: showOnline,
          allowDMsFromEveryone: allowDMs
        }
      });
      await refreshProfile();
      showToast('Privacy preferences saved', 'success');
    } catch {
      showToast('Failed to save privacy settings', 'error');
    }
  };

  const handleExportData = async () => {
    if (!currentUser) return;
    setExporting(true);
    try {
      const dataStr = await analyticsService.exportUserData(currentUser.uid);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zor_user_archive_${userProfile?.username || 'user'}_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Account data archive exported successfully', 'success');
    } catch (err: any) {
      showToast('Failed to export data', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    const confirmed = prompt('Type "DELETE" to permanently erase your ZOR account:');
    if (confirmed !== 'DELETE') return;

    setDeleting(true);
    try {
      await authService.deleteAccount();
      showToast('Account deleted', 'info');
      window.location.reload();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete account', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <h2 className="text-sm font-bold text-slate-100">Settings & Privacy</h2>
      </div>

      <div className="p-4 max-w-xl space-y-6 text-xs">
        {/* Profile Card */}
        {userProfile && (
          <section className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" />
              <span>Account Credentials</span>
            </h3>

            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <div className="min-w-0">
                <p className="font-semibold text-slate-200 truncate">{userProfile.displayName}</p>
                <p className="text-slate-400 font-mono text-[11px]">@{userProfile.username}</p>
              </div>
              <button
                onClick={onOpenEditProfile}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
              >
                Edit Profile
              </button>
            </div>
          </section>
        )}

        {/* Display & Theme */}
        <section className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Palette className="w-4 h-4 text-indigo-400" />
            <span>Theme & Interface</span>
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTheme('dark')}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-semibold transition-all ${
                theme === 'dark'
                  ? 'border-indigo-500 bg-indigo-950/30 text-white'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Moon className="w-4 h-4 text-indigo-400" />
              <span>Dark Mode</span>
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-semibold transition-all ${
                theme === 'light'
                  ? 'border-indigo-500 bg-indigo-950/30 text-white'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Light Mode</span>
            </button>
          </div>
        </section>

        {/* Privacy & Safety */}
        <section className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>Privacy & Safety</span>
          </h3>

          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-semibold text-slate-200">Private Account</p>
                <p className="text-[11px] text-slate-400">Only approved followers can view your posts</p>
              </div>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="h-4 w-4 rounded text-indigo-600 focus:ring-0"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-semibold text-slate-200">Show Online Presence</p>
                <p className="text-[11px] text-slate-400">Allow followers to see when you are active</p>
              </div>
              <input
                type="checkbox"
                checked={showOnline}
                onChange={(e) => setShowOnline(e.target.checked)}
                className="h-4 w-4 rounded text-indigo-600 focus:ring-0"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-semibold text-slate-200">Direct Messages from Everyone</p>
                <p className="text-[11px] text-slate-400">Receive message requests from non-followers</p>
              </div>
              <input
                type="checkbox"
                checked={allowDMs}
                onChange={(e) => setAllowDMs(e.target.checked)}
                className="h-4 w-4 rounded text-indigo-600 focus:ring-0"
              />
            </label>
          </div>

          <button
            onClick={handleSavePrivacy}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
          >
            Save Privacy Settings
          </button>
        </section>

        {/* Data Portability (Section 46) */}
        <section className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Data Portability & Export</span>
          </h3>
          <p className="text-slate-400 leading-relaxed">
            Download an authoritative JSON archive of your personal profile, posts, replies, and liked content.
          </p>
          <button
            onClick={handleExportData}
            disabled={exporting}
            className="w-full py-2.5 rounded-xl border border-slate-700 hover:border-indigo-500 text-slate-200 font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : <Download className="w-4 h-4" />}
            <span>Export Account Data (JSON)</span>
          </button>
        </section>

        {/* Danger Zone: Delete Account */}
        <section className="p-4 rounded-2xl border border-rose-500/20 bg-rose-950/10 space-y-3">
          <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            <span>Danger Zone</span>
          </h3>
          <p className="text-slate-400 leading-relaxed">
            Permanently delete your user profile and all associated data from the ZOR Realtime Database.
          </p>
          <button
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-colors flex items-center gap-1.5"
          >
            {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Delete Account</span>
          </button>
        </section>
      </div>
    </div>
  );
};
