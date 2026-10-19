import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { postService } from '../../services/postService';
import { uploadToCloudinary } from '../../cloudinary/cloudinaryService';
import { Post, PostMediaItem, DraftItem } from '../../types';
import {
  Image,
  Video,
  BarChart2,
  AlertTriangle,
  FileText,
  X,
  Loader2,
  Plus,
  Trash2,
  Check
} from 'lucide-react';

interface ComposerProps {
  replyTo?: Post;
  quotePost?: Post;
  communityId?: string;
  onPostCreated?: (post: Post) => void;
  placeholder?: string;
  isModal?: boolean;
}

export const Composer: React.FC<ComposerProps> = ({
  replyTo,
  quotePost,
  communityId,
  onPostCreated,
  placeholder = "What's happening?",
  isModal = false
}) => {
  const { currentUser, userProfile } = useAuth();
  const { showToast } = useToast();

  const [text, setText] = useState('');
  const [mediaList, setMediaList] = useState<PostMediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Poll state
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollDurationHours, setPollDurationHours] = useState(24);

  // Content warning state
  const [showCw, setShowCw] = useState(false);
  const [contentWarning, setContentWarning] = useState('');

  // Drafts state
  const [showDraftsList, setShowDraftsList] = useState(false);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const LOCAL_DRAFT_KEY = 'zor_composer_modal_draft';
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  // Restore draft from localStorage on mount (for modal composer)
  React.useEffect(() => {
    if (!isModal || replyTo || quotePost) return;
    try {
      const saved = localStorage.getItem(LOCAL_DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.text || (parsed.mediaList && parsed.mediaList.length > 0)) {
          setText(parsed.text || '');
          if (parsed.mediaList) setMediaList(parsed.mediaList);
          if (parsed.showPoll) {
            setShowPoll(true);
            setPollQuestion(parsed.pollQuestion || '');
            if (parsed.pollOptions) setPollOptions(parsed.pollOptions);
          }
          if (parsed.showCw) {
            setShowCw(true);
            setContentWarning(parsed.contentWarning || '');
          }
          setHasRestoredDraft(true);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [isModal, replyTo, quotePost]);

  // Auto-save draft to local storage on content change
  React.useEffect(() => {
    if (!isModal || replyTo || quotePost) return;
    const hasContent = text.trim().length > 0 || mediaList.length > 0 || (showPoll && pollQuestion.trim().length > 0);
    if (hasContent) {
      const draftObj = {
        text,
        mediaList,
        showPoll,
        pollQuestion,
        pollOptions,
        pollDurationHours,
        showCw,
        contentWarning,
        updatedAt: Date.now()
      };
      localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(draftObj));
    } else {
      localStorage.removeItem(LOCAL_DRAFT_KEY);
    }
  }, [text, mediaList, showPoll, pollQuestion, pollOptions, pollDurationHours, showCw, contentWarning, isModal, replyTo, quotePost]);

  const clearLocalDraft = () => {
    localStorage.removeItem(LOCAL_DRAFT_KEY);
    setText('');
    setMediaList([]);
    setShowPoll(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    setShowCw(false);
    setContentWarning('');
    setHasRestoredDraft(false);
    showToast('Draft discarded', 'info');
  };

  const MAX_CHARS = 280;
  const remainingChars = MAX_CHARS - text.length;
  const isOverLimit = remainingChars < 0;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-expand textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (mediaList.length + files.length > 4) {
      showToast('Maximum 4 media attachments per post', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 50 * 1024 * 1024) {
          showToast(`File "${file.name}" exceeds 50MB limit`, 'error');
          continue;
        }

        const uploaded = await uploadToCloudinary(file, (p) => {
          setUploadProgress(p);
        });

        const mediaItem: PostMediaItem = {
          id: uploaded.id,
          type: uploaded.type,
          cloudinaryUrl: uploaded.url,
          thumbnailUrl: uploaded.thumbnailUrl,
          width: uploaded.width || 800,
          height: uploaded.height || 600,
          publicId: uploaded.publicId || uploaded.id
        };
        if (typeof uploaded.duration === 'number') {
          mediaItem.duration = uploaded.duration;
        }

        setMediaList((prev) => [...prev, mediaItem]);
      }
      showToast('Media uploaded successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload media', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeMedia = (index: number) => {
    setMediaList((prev) => prev.filter((_, i) => i !== index));
  };

  const addPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removePollOption = (idx: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== idx));
    }
  };

  const updatePollOption = (idx: number, val: string) => {
    const next = [...pollOptions];
    next[idx] = val;
    setPollOptions(next);
  };

  // Drafts
  const handleSaveDraft = async () => {
    if (!currentUser) {
      showToast('Sign in to save drafts', 'info');
      return;
    }
    if (!text.trim() && mediaList.length === 0) {
      showToast('Draft is empty', 'info');
      return;
    }

    try {
      await postService.saveDraft(currentUser.uid, {
        text,
        media: mediaList,
        pollQuestion: showPoll ? pollQuestion : undefined,
        pollOptions: showPoll ? pollOptions : undefined,
        contentWarning: showCw ? contentWarning : undefined,
        replyTo: replyTo?.id
      });
      showToast('Draft saved', 'success');
    } catch {
      showToast('Failed to save draft', 'error');
    }
  };

  const openDrafts = async () => {
    if (!currentUser) return;
    setLoadingDrafts(true);
    setShowDraftsList(true);
    try {
      const list = await postService.getDrafts(currentUser.uid);
      setDrafts(list);
    } finally {
      setLoadingDrafts(false);
    }
  };

  const applyDraft = (draft: DraftItem) => {
    setText(draft.text || '');
    setMediaList(draft.media || []);
    if (draft.contentWarning) {
      setShowCw(true);
      setContentWarning(draft.contentWarning);
    }
    if (draft.pollOptions && draft.pollOptions.length >= 2) {
      setShowPoll(true);
      setPollQuestion(draft.pollQuestion || '');
      setPollOptions(draft.pollOptions);
    }
    setShowDraftsList(false);
  };

  const deleteDraftItem = async (e: React.MouseEvent, draftId: string) => {
    e.stopPropagation();
    if (!currentUser) return;
    try {
      await postService.deleteDraft(currentUser.uid, draftId);
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
      showToast('Draft deleted', 'success');
    } catch {
      showToast('Failed to delete draft', 'error');
    }
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      showToast('Please sign in to publish posts', 'info');
      return;
    }

    if (isOverLimit) {
      showToast('Post exceeds maximum character limit', 'error');
      return;
    }

    const trimmed = text.trim();
    if (!trimmed && mediaList.length === 0 && !showPoll) {
      showToast('Post cannot be empty', 'error');
      return;
    }

    let pollPayload: { question: string; options: string[]; durationHours: number } | undefined;
    if (showPoll) {
      const validOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (validOptions.length < 2) {
        showToast('Poll must have at least 2 non-empty options', 'error');
        return;
      }
      pollPayload = {
        question: pollQuestion.trim() || trimmed || 'Poll',
        options: validOptions,
        durationHours: pollDurationHours
      };
    }

    setIsSubmitting(true);
    try {
      const newPost = await postService.createPost({
        authorId: currentUser.uid,
        text: trimmed,
        media: mediaList,
        replyTo: replyTo?.id,
        quotePostId: quotePost?.id,
        poll: pollPayload,
        contentWarning: showCw ? contentWarning : undefined,
        communityId
      });

      // Clear composer state
      localStorage.removeItem(LOCAL_DRAFT_KEY);
      setHasRestoredDraft(false);
      setText('');
      setMediaList([]);
      setShowPoll(false);
      setPollOptions(['', '']);
      setPollQuestion('');
      setShowCw(false);
      setContentWarning('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';

      showToast(replyTo ? 'Reply posted' : 'Post published to ZOR', 'success');
      if (onPostCreated) onPostCreated(newPost);
    } catch (err: any) {
      showToast(err.message || 'Failed to publish post', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`p-4 ${isModal ? 'bg-black' : 'border-b border-[#2f3336] bg-black'}`}>
      {/* Restored Draft Notice */}
      {hasRestoredDraft && (
        <div className="mb-3 px-3.5 py-2 rounded-xl bg-[#1d9bf0]/10 border border-[#1d9bf0]/30 flex items-center justify-between text-xs text-[#1d9bf0]">
          <span className="font-medium">Restored your unsaved draft</span>
          <button
            onClick={clearLocalDraft}
            className="text-xs font-bold hover:underline text-[#1d9bf0]"
          >
            Discard draft
          </button>
        </div>
      )}

      {/* Quoting / Replying Notice */}
      {replyTo && (
        <div className="mb-2.5 flex items-center gap-2 text-xs text-[#71767b]">
          <span>Replying to</span>
          <span className="font-semibold text-[#1d9bf0]">@{replyTo.author?.username || 'user'}</span>
        </div>
      )}

      <div className="flex gap-3">
        {/* User avatar */}
        <img
          src={userProfile?.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${currentUser?.uid || 'guest'}`}
          alt="My avatar"
          referrerPolicy="no-referrer"
          className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-slate-800 bg-slate-800"
        />

        <div className="flex-1 min-w-0">
          {/* Content Warning Input */}
          {showCw && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/20 px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <input
                type="text"
                value={contentWarning}
                onChange={(e) => setContentWarning(e.target.value)}
                placeholder="Content warning label (e.g. spoilers, sensitive)"
                className="w-full bg-transparent text-xs text-amber-100 placeholder-amber-400/60 focus:outline-none"
              />
              <button onClick={() => setShowCw(false)} className="text-amber-400 hover:text-amber-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Main Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            placeholder={replyTo ? 'Post your reply' : placeholder}
            rows={isModal ? 4 : 3}
            className="w-full resize-none bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none leading-relaxed"
          />

          {/* Media Attachments Preview Grid */}
          {mediaList.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl overflow-hidden">
              {mediaList.map((m, idx) => (
                <div key={m.id || idx} className="relative h-32 bg-slate-900 rounded-lg overflow-hidden group">
                  {m.type === 'video' ? (
                    <video src={m.cloudinaryUrl} className="w-full h-full object-cover" />
                  ) : (
                    <img src={m.thumbnailUrl || m.cloudinaryUrl} alt="Upload" className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={() => removeMedia(idx)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-rose-600 text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Progress Bar */}
          {uploading && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  Uploading to Cloudinary CDN...
                </span>
                <span className="font-mono tabular-nums">{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Poll Builder View */}
          {showPoll && (
            <div className="mt-3 p-3 rounded-xl border border-indigo-500/30 bg-slate-900/60 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-indigo-300">Poll Options</span>
                <button onClick={() => setShowPoll(false)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {pollOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updatePollOption(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    maxLength={30}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                  {pollOptions.length > 2 && (
                    <button onClick={() => removePollOption(idx)} className="text-slate-400 hover:text-rose-400 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              <div className="flex items-center justify-between pt-1">
                {pollOptions.length < 4 ? (
                  <button
                    onClick={addPollOption}
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add option</span>
                  </button>
                ) : <div />}

                <select
                  value={pollDurationHours}
                  onChange={(e) => setPollDurationHours(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-700 text-xs text-slate-300 rounded-lg px-2 py-1 focus:outline-none"
                >
                  <option value={1}>1 hour</option>
                  <option value={6}>6 hours</option>
                  <option value={24}>1 day</option>
                  <option value={72}>3 days</option>
                  <option value={168}>7 days</option>
                </select>
              </div>
            </div>
          )}

          {/* Quoted Post Preview */}
          {quotePost && (
            <div className="mt-3 p-2.5 rounded-xl border border-slate-800 bg-slate-900/40 text-xs text-slate-300">
              <span className="font-semibold text-slate-200">Quoting @{quotePost.author?.username}:</span>{' '}
              <span className="line-clamp-2">{quotePost.text}</span>
            </div>
          )}

          {/* Bottom Controls Bar */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
            {/* Attachment Affordances */}
            <div className="flex items-center gap-1 text-indigo-400">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || mediaList.length >= 4}
                className="p-2 rounded-full hover:bg-indigo-500/10 transition-colors disabled:opacity-40"
                title="Add Photos / Video via Cloudinary"
              >
                <Image className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowPoll(!showPoll)}
                className={`p-2 rounded-full hover:bg-indigo-500/10 transition-colors ${
                  showPoll ? 'bg-indigo-500/20 text-indigo-300' : ''
                }`}
                title="Create Poll"
              >
                <BarChart2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowCw(!showCw)}
                className={`p-2 rounded-full hover:bg-amber-500/10 transition-colors ${
                  showCw ? 'bg-amber-500/20 text-amber-300' : ''
                }`}
                title="Content Warning"
              >
                <AlertTriangle className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={openDrafts}
                className="p-2 rounded-full hover:bg-indigo-500/10 transition-colors text-slate-400 hover:text-indigo-400"
                title="Saved Drafts"
              >
                <FileText className="w-4 h-4" />
              </button>
            </div>

            {/* Right: Character count & Post Button */}
            <div className="flex items-center gap-3">
              {text.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums">
                  <span className={isOverLimit ? 'text-rose-500 font-bold' : remainingChars <= 20 ? 'text-amber-400' : 'text-slate-400'}>
                    {remainingChars}
                  </span>
                </div>
              )}

              {text.trim().length > 0 && (
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="hidden sm:inline-block text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Save draft
                </button>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || uploading || isOverLimit || (!text.trim() && mediaList.length === 0 && !showPoll)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Posting...</span>
                  </>
                ) : (
                  <span>{replyTo ? 'Reply' : 'Post'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Drafts Modal */}
      {showDraftsList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-100 text-sm">Saved Drafts</h3>
              <button onClick={() => setShowDraftsList(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingDrafts ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading drafts...</div>
            ) : drafts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No saved drafts yet.</div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2">
                {drafts.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => applyDraft(d)}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-indigo-500/50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="text-slate-200 truncate font-medium">{d.text || '[Media Draft]'}</p>
                      <span className="text-slate-400 text-[10px]">
                        {new Date(d.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={(e) => deleteDraftItem(e, d.id)}
                      className="text-slate-400 hover:text-rose-400 p-1.5"
                      title="Delete draft"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
