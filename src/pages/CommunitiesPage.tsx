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
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {activeCommunity && (
            <button
              onClick={() => setActiveCommunity(null)}
              className="p-1.5 -ml-1.5 rounded-full text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-sm font-bold text-slate-100">
            {activeCommunity ? activeCommunity.name : 'Communities'}
          </h2>
        </div>

        {!activeCommunity && currentUser && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Community</span>
          </button>
        )}
      </div>

      {activeCommunity ? (
        <div>
          {/* Community Hero banner */}
          <div className="p-5 border-b border-slate-800/80 bg-gradient-to-r from-indigo-950/30 to-slate-900/50">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <img
                  src={activeCommunity.avatarUrl}
                  alt=""
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-500/30"
                />
                <div>
                  <h1 className="text-lg font-extrabold text-white">{activeCommunity.name}</h1>
                  <p className="text-xs text-slate-400 mt-0.5 max-w-md">{activeCommunity.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
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
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all shadow-md ${
                  activeCommunity.isMember
                    ? 'bg-slate-900 border border-slate-700 text-slate-200 hover:text-rose-400'
                    : 'bg-white text-slate-950 hover:bg-slate-200'
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
          <div className="divide-y divide-slate-800/80">
            {communityPosts.length === 0 ? (
              <div className="py-20 text-center text-xs text-slate-500">
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
            <div className="py-24 flex justify-center items-center text-slate-500">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
            </div>
          ) : communities.length === 0 ? (
            <div className="py-20 text-center px-4">
              <Users className="w-8 h-8 text-indigo-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-100">Discover Groups on ZOR</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                Communities bring together people interested in specific topics, hobbies, and ideas.
              </p>
              {currentUser && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
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
                className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 transition-colors flex items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={c.avatarUrl}
                    alt=""
                    className="w-12 h-12 rounded-2xl object-cover shrink-0 ring-1 ring-slate-800 bg-slate-800"
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-100 truncate">{c.name}</h3>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{c.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
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
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                    c.isMember
                      ? 'bg-slate-800 text-slate-300 hover:text-rose-400'
                      : 'bg-white text-slate-950 hover:bg-slate-200'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in select-none">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-100">Create a New Community</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Community Name</label>
                <input
                  type="text"
                  required
                  maxLength={40}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. AI Researchers & Engineers"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  required
                  maxLength={200}
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this community about? Share guidelines and topics..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Privacy Level</label>
                <select
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="public">Public (Anyone can view and join)</option>
                  <option value="restricted">Restricted (Anyone can view, members must request)</option>
                  <option value="private">Private (Only members can view)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md flex items-center justify-center gap-2"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Create Community</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
