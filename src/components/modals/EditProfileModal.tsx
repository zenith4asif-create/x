import React, { useState, useRef } from 'react';
import { UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { userService } from '../../services/userService';
import { uploadToCloudinary } from '../../cloudinary/cloudinaryService';
import { X, Camera, Loader2 } from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onProfileUpdated?: (updated: UserProfile) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdated
}) => {
  const { refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [location, setLocation] = useState(profile.location || '');
  const [website, setWebsite] = useState(profile.website || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [bannerUrl, setBannerUrl] = useState(profile.bannerUrl || '');

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [saving, setSaving] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const res = await uploadToCloudinary(file);
      setAvatarUrl(res.url);
      showToast('Avatar uploaded', 'success');
    } catch (err: any) {
      showToast(err.message || 'Avatar upload failed', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const res = await uploadToCloudinary(file);
      setBannerUrl(res.url);
      showToast('Cover photo uploaded', 'success');
    } catch (err: any) {
      showToast(err.message || 'Banner upload failed', 'error');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updates: Partial<UserProfile> = {
        displayName: displayName.trim() || profile.username,
        bio: bio.trim(),
        location: location.trim(),
        website: website.trim(),
        avatarUrl,
        bannerUrl
      };

      await userService.updateUserProfile(profile.uid, updates);
      await refreshProfile();
      showToast('Profile updated successfully', 'success');
      if (onProfileUpdated) {
        onProfileUpdated({ ...profile, ...updates });
      }
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4 animate-in fade-in select-none">
      <div className="relative w-full max-w-lg rounded-3xl bg-black border border-[#2f3336] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2f3336] bg-black">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 -ml-1.5 rounded-full text-[#e7e9ea] hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-base font-extrabold text-[#e7e9ea]">Edit Profile</h2>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || uploadingAvatar || uploadingBanner}
            className="px-5 py-1.5 rounded-full bg-white hover:bg-neutral-200 text-black font-extrabold text-xs disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Save</span>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="overflow-y-auto p-5 space-y-4 text-xs bg-black text-[#e7e9ea]">
          {/* Banner area */}
          <div className="relative h-32 rounded-2xl bg-neutral-900 overflow-hidden flex items-center justify-center border border-[#2f3336]">
            {bannerUrl ? (
              <img src={bannerUrl} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-[#16181c] via-[#202327] to-[#16181c]" />
            )}
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              onChange={handleBannerChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              disabled={uploadingBanner}
              className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white transition-colors"
            >
              {uploadingBanner ? (
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 border border-white/15 text-xs font-semibold">
                  <Camera className="w-4 h-4" />
                  <span>Change header</span>
                </div>
              )}
            </button>
          </div>

          {/* Avatar overlay */}
          <div className="relative -mt-12 ml-4 w-20 h-20 rounded-full border-4 border-black overflow-hidden bg-neutral-900 shrink-0 ring-1 ring-white/10">
            <img
              src={avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${profile.username}`}
              alt=""
              className="w-full h-full object-cover"
            />
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white transition-colors"
              title="Change profile picture"
            >
              {uploadingAvatar ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="block text-[#71767b] font-semibold mb-1.5">Name</label>
            <input
              type="text"
              required
              maxLength={50}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#2f3336] bg-black text-[#e7e9ea] placeholder-[#71767b] focus:border-[#1d9bf0] focus:outline-none"
            />
          </div>

          {/* Bio */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[#71767b] font-semibold">Bio</label>
              <span className="text-[#71767b] text-[10px] font-mono tabular-nums">{160 - bio.length}</span>
            </div>
            <textarea
              maxLength={160}
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Give your profile a voice..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#2f3336] bg-black text-[#e7e9ea] placeholder-[#71767b] focus:border-[#1d9bf0] focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-[#71767b] font-semibold mb-1.5">Location</label>
            <input
              type="text"
              maxLength={40}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#2f3336] bg-black text-[#e7e9ea] placeholder-[#71767b] focus:border-[#1d9bf0] focus:outline-none"
            />
          </div>

          {/* Website */}
          <div>
            <label className="block text-[#71767b] font-semibold mb-1.5">Website</label>
            <input
              type="url"
              maxLength={100}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#2f3336] bg-black text-[#e7e9ea] placeholder-[#71767b] focus:border-[#1d9bf0] focus:outline-none"
            />
          </div>
        </form>
      </div>
    </div>
  );
};
