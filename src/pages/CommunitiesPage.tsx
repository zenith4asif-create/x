import React, { useState, useEffect } from 'react';
import { Community, Post } from '../types';
import { communityService } from '../services/communityService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PostCard } from '../components/feed/PostCard';
import { Composer } from '../components/feed/Composer';
import { Users, Plus, Lock, Globe, ArrowLeft, X, Loader2 } from 'lucide-react';

interface CommunitiesPageProps {
  onPostClick: (postId: string) => void;
  onUserClick: (username: string) => void;
  onHashtagClick: (tag: string) => void;
  onMediaClick: (media: any[], index: number) => void;
}

export const CommunitiesPage: React.FC<CommunitiesPageProps> = ({
  onPostClick,
  onUserClick,
  onHashtagClick,
  onMediaClick
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [activeCommunity, setActiveCommunity] = useState<Community | null>(null);
  const [communityPosts, setCommunityPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'restricted' | 'private'>('public');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadCommunities();
  }, [currentUser]);

  const loadCommunities = async () => {
    setLoading(true);
    try {
      const list = await communityService.getCommunities(currentUser?.uid);
      setCommunities(list);
    } finally {
      setLoading(false);
    }
  };

  const openCommunityDetail = async (c: Community) => {
    setActiveCommunity(c);
    const posts = await communityService.getCommunityPosts(c.id, currentUser?.uid);
    setCommunityPosts(posts);
  };

  const handleJoinToggle = async (c: Community) => {
    if (!currentUser) {
      showToast('Please sign in to join communities', 'info');
      return;
    }

    try {
      if (c.isMember) {
        await communityService.leaveCommunity(c.id, currentUser.uid);
        showToast(`Left ${c.name}`, 'info');
        c.isMember = false;
        c.memberCount = Math.max(0, (c.memberCount || 1) - 1);
      } else {
        await communityService.joinCommunity(c.id, currentUser.uid);
        showToast(`Joined ${c.name}`, 'success');
        c.isMember = true;
        c.memberCount = (c.memberCount || 0) + 1;
      }
      setCommunities([...communities]);
      if (activeCommunity?.id === c.id) {
        setActiveCommunity({ ...c });
      }
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setCreating(true);

    try {
      const newComm = await communityService.createCommunity({
        name,
        description,
        privacy,
        ownerId: currentUser.uid
      });
      setCommunities((prev) => [newComm, ...prev]);
      setShowCreateModal(false);
      setName('');
      setDescription('');
      showToast(`Community "${newComm.name}" created!`, 'success');
      openCommunityDetail(newComm);
    } catch (err: any) {
      showToast(err.message || 'Failed to create community', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-[#e7e9ea] pb-16">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/85 backdrop-blur-md border-b border-[#2f3336] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {activeCommunity && (
            <button
              onClick={() => setActiveCommunity(null)}
              className="p-1.5 -ml-1.5 rounded-full text-[#71767b] hover:text-[#e7e9ea] hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-base font-black text-[#e7e9ea]">
            {activeCommunity ? activeCommunity.name : 'Communities'}
          </h2>
        </div>

        {!activeCommunity && currentUser && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-extrabold shadow-md transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-black" />
            <span>Create Community</span>
          </button>
        )}
      </div>

      {activeCommunity ? (
        <div>
          {/* Community Hero banner */}
          <div className="p-5 border-b border-[#2f3336] bg-[#16181c]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <img
                  src={activeCommunity.avatarUrl}
                  alt=""
                  className="w-14 h-14 rounded-2xl object-cover ring-1 ring-white/10 bg-neutral-900"
                />
                <div>
                  <h1 className="text-lg font-black text-[#e7e9ea]">{activeCommunity.name}</h1>
                  <p className="text-xs text-[#71767b] mt-0.5 max-w-md">{activeCommunity.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-[#71767b]">
                    <span className="font-mono tabular-nums">{activeCommunity.memberCount || 1} members</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize flex items-center gap-1">
                      {activeCommunity.privacy === 'public' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {activeCommunity.privacy}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleJoinToggle(activeCommunity)}
                className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all shadow-md ${
                  activeCommunity.isMember
                    ? 'bg-black border border-[#536471] text-[#e7e9ea] hover:text-rose-400 hover:border-rose-500/50 hover:bg-rose-500/10'
                    : 'bg-white text-black hover:bg-neutral-200'
                }`}
              >
                {activeCommunity.isMember ? 'Joined' : 'Join'}
              </button>
            </div>
          </div>

          {/* Composer inside community */}
          {activeCommunity.isMember && (
            <Composer
              communityId={activeCommunity.id}
              placeholder={`Post to ${activeCommunity.name}...`}
              onPostCreated={(p) => setCommunityPosts((prev) => [p, ...prev])}
            />
          )}

          {/* Community posts */}
          <div className="divide-y divide-[#2f3336]">
            {communityPosts.length === 0 ? (
              <div className="py-20 text-center text-xs text-[#71767b]">
                No posts in this community yet. Be the first to share!
              </div>
            ) : (
              communityPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onPostClick={onPostClick}
                  onUserClick={onUserClick}
                  onHashtagClick={onHashtagClick}
                  onMediaClick={onMediaClick}
                />
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="py-24 flex justify-center items-center text-[#71767b]">
              <Loader2 className="w-7 h-7 animate-spin text-[#1d9bf0]" />
            </div>
          ) : communities.length === 0 ? (
            <div className="py-20 text-center px-4">
              <Users className="w-10 h-10 text-[#71767b] mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#e7e9ea]">Discover Communities on ZOR</h3>
              <p className="text-xs text-[#71767b] max-w-sm mx-auto mt-1 mb-4">
                Communities bring together people interested in specific topics, hobbies, and ideas.
              </p>
              {currentUser && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-5 py-2.5 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-extrabold"
                >
                  Create First Community
                </button>
              )}
            </div>
          ) : (
            communities.map((c) => (
              <div
                key={c.id}
                onClick={() => openCommunityDetail(c)}
                className="p-4 rounded-3xl border border-[#2f3336] bg-[#16181c]/60 hover:bg-[#16181c] transition-colors flex items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={c.avatarUrl}
                    alt=""
                    className="w-12 h-12 rounded-2xl object-cover shrink-0 ring-1 ring-white/10 bg-neutral-900"
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#e7e9ea] truncate">{c.name}</h3>
                    <p className="text-xs text-[#71767b] line-clamp-1 mt-0.5">{c.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-[#71767b]">
                      <span className="font-mono tabular-nums">{c.memberCount || 1} members</span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">{c.privacy}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleJoinToggle(c);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-extrabold shrink-0 transition-all ${
                    c.isMember
                      ? 'bg-black border border-[#536471] text-[#e7e9ea] hover:text-rose-400'
                      : 'bg-white text-black hover:bg-neutral-200'
                  }`}
                >
                  {c.isMember ? 'Joined' : 'Join'}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Community Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in select-none">
          <div className="relative w-full max-w-md rounded-3xl bg-black border border-[#2f3336] shadow-2xl p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#e7e9ea]">Create a New Community</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[#71767b] hover:text-[#e7e9ea] p-1 rounded-full hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#e7e9ea] font-bold mb-1.5">Community Name</label>
                <input
                  type="text"
                  required
                  maxLength={40}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. AI Researchers & Engineers"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#2f3336] bg-[#16181c] text-[#e7e9ea] placeholder-[#71767b] focus:border-[#1d9bf0] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#e7e9ea] font-bold mb-1.5">Description</label>
                <textarea
                  required
                  maxLength={200}
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this community about? Share guidelines and topics..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#2f3336] bg-[#16181c] text-[#e7e9ea] placeholder-[#71767b] focus:border-[#1d9bf0] focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-[#e7e9ea] font-bold mb-1.5">Privacy Level</label>
                <select
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#2f3336] bg-[#16181c] text-[#e7e9ea] focus:border-[#1d9bf0] focus:outline-none"
                >
                  <option value="public">Public (Anyone can view and join)</option>
                  <option value="restricted">Restricted (Anyone can view, members must request)</option>
                  <option value="private">Private (Only members can view)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-2.5 rounded-full bg-white hover:bg-neutral-200 text-black font-extrabold transition-all shadow-md flex items-center justify-center gap-2"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin text-black" />}
                <span>Create Community</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
