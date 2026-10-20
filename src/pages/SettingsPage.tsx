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
  Check,
  LogOut,
  Code2
} from 'lucide-react';
import { VerifiedBadge } from '../components/brand/VerifiedBadge';

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
    <div className="min-h-screen bg-black text-[#e7e9ea] pb-16">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/85 backdrop-blur-md border-b border-[#2f3336] px-4 py-3">
        <h2 className="text-base font-black text-[#e7e9ea]">Settings</h2>
      </div>

      <div className="p-4 max-w-xl space-y-5 text-xs">
        {/* Developer Attribution Card */}
        <section className="p-4 rounded-3xl border border-[#2f3336] bg-[#16181c] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-black border border-[#2f3336] text-[#1d9bf0]">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-[#71767b] uppercase font-bold tracking-wider">Engine Architect</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-black text-[#e7e9ea]">ASIF ANSARI</span>
                <VerifiedBadge size={15} />
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#1d9bf0]/15 text-[#1d9bf0] font-bold">
            LEAD DEV
          </span>
        </section>

        {/* Profile Card */}
        {userProfile && (
          <section className="p-4 rounded-3xl border border-[#2f3336] bg-[#16181c] space-y-3">
            <h3 className="text-sm font-bold text-[#e7e9ea] flex items-center gap-2">
              <User className="w-4 h-4 text-[#1d9bf0]" />
              <span>Your Account</span>
            </h3>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-black border border-[#2f3336]">
              <div className="min-w-0">
                <p className="font-bold text-[#e7e9ea] truncate">{userProfile.displayName}</p>
                <p className="text-[#71767b] font-mono text-[11px]">@{userProfile.username}</p>
              </div>
              <button
                onClick={onOpenEditProfile}
                className="px-4 py-1.5 rounded-full bg-white hover:bg-neutral-200 text-black font-extrabold text-xs transition-colors"
              >
                Edit Profile
              </button>
            </div>

            {/* Direct Logout Button */}
            <button
              onClick={() => signOut()}
              className="w-full py-2.5 rounded-full border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition-colors mt-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out of @{userProfile.username}</span>
            </button>
          </section>
        )}

        {/* Privacy & Safety */}
        <section className="p-4 rounded-3xl border border-[#2f3336] bg-[#16181c] space-y-4">
          <h3 className="text-sm font-bold text-[#e7e9ea] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#1d9bf0]" />
            <span>Privacy & Safety</span>
          </h3>

          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-bold text-[#e7e9ea]">Private Account</p>
                <p className="text-[11px] text-[#71767b]">Only approved followers can view your posts</p>
              </div>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="h-4 w-4 rounded accent-[#1d9bf0] cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-bold text-[#e7e9ea]">Show Online Presence</p>
                <p className="text-[11px] text-[#71767b]">Allow followers to see when you are active</p>
              </div>
              <input
                type="checkbox"
                checked={showOnline}
                onChange={(e) => setShowOnline(e.target.checked)}
                className="h-4 w-4 rounded accent-[#1d9bf0] cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-bold text-[#e7e9ea]">Direct Messages from Everyone</p>
                <p className="text-[11px] text-[#71767b]">Receive message requests from non-followers</p>
              </div>
              <input
                type="checkbox"
                checked={allowDMs}
                onChange={(e) => setAllowDMs(e.target.checked)}
                className="h-4 w-4 rounded accent-[#1d9bf0] cursor-pointer"
              />
            </label>
          </div>

          <button
            onClick={handleSavePrivacy}
            className="w-full py-2.5 rounded-full bg-white hover:bg-neutral-200 text-black font-extrabold text-xs transition-colors"
          >
            Save Privacy Settings
          </button>
        </section>

        {/* Data Portability */}
        <section className="p-4 rounded-3xl border border-[#2f3336] bg-[#16181c] space-y-3">
          <h3 className="text-sm font-bold text-[#e7e9ea] flex items-center gap-2">
            <Download className="w-4 h-4 text-[#1d9bf0]" />
            <span>Data Portability & Export</span>
          </h3>
          <p className="text-[#71767b] leading-relaxed">
            Download an authoritative JSON archive of your personal profile, posts, replies, and liked content.
          </p>
          <button
            onClick={handleExportData}
            disabled={exporting}
            className="w-full py-2.5 rounded-full border border-[#2f3336] hover:bg-white/5 text-[#e7e9ea] font-bold flex items-center justify-center gap-2 transition-colors"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin text-[#1d9bf0]" /> : <Download className="w-4 h-4" />}
            <span>Export Account Data (JSON)</span>
          </button>
        </section>

        {/* Danger Zone: Delete Account */}
        <section className="p-4 rounded-3xl border border-rose-500/30 bg-rose-950/20 space-y-3">
          <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            <span>Danger Zone</span>
          </h3>
          <p className="text-[#71767b] leading-relaxed">
            Permanently delete your user profile and all associated data from the ZOR Realtime Database.
          </p>
          <button
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs transition-colors flex items-center gap-1.5"
          >
            {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Delete Account</span>
          </button>
        </section>
      </div>
    </div>
  );
};
