import React, { useState, useEffect, useRef } from 'react';
import { Conversation, Message, UserProfile, PostMediaItem } from '../types';
import { messageService } from '../services/messageService';
import { userService } from '../services/userService';
import { searchService } from '../services/searchService';
import { uploadToCloudinary } from '../cloudinary/cloudinaryService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatRelativeTime } from '../utils/formatters';
import {
  Send,
  Image,
  Trash2,
  Search,
  ArrowLeft,
  X,
  Loader2,
  Plus
} from 'lucide-react';
import { VerifiedBadge } from '../components/brand/VerifiedBadge';

interface MessagesPageProps {
  initialRecipientUid?: string;
  onUserClick: (username: string) => void;
}

export const MessagesPage: React.FC<MessagesPageProps> = ({
  initialRecipientUid,
  onUserClick
}) => {
  const { currentUser, userProfile } = useAuth();
  const { showToast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [loadingConv, setLoadingConv] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaAttachment, setMediaAttachment] = useState<PostMediaItem | null>(null);

  // New Chat Modal
  const [showNewChat, setShowNewChat] = useState(false);
  const [userSearchText, setUserSearchText] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<UserProfile[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load conversations
  useEffect(() => {
    if (!currentUser) return;
    setLoadingConv(true);
    messageService.getConversations(currentUser.uid).then((list) => {
      setConversations(list);
      setLoadingConv(false);

      if (initialRecipientUid) {
        userService.getUserProfile(initialRecipientUid).then((u) => {
          if (u) selectUserToMessage(u);
        });
      } else if (list.length > 0 && !activeConversationId) {
        // default to first conversation on desktop
        if (window.innerWidth >= 768) {
          selectConversation(list[0]);
        }
      }
    });
  }, [currentUser, initialRecipientUid]);

  // Realtime listeners for active conversation
  useEffect(() => {
    if (!activeConversationId || !currentUser) return;

    // Listen to messages
    const unsubscribeMsgs = messageService.subscribeToMessages(
      activeConversationId,
      (msgs) => {
        setMessages(msgs);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    );

    // Listen to typing status
    const unsubscribeTyping = messageService.subscribeToTyping(
      activeConversationId,
      currentUser.uid,
      setIsOtherTyping
    );

    // Mark seen
    messageService.markSeen(activeConversationId, currentUser.uid);

    return () => {
      unsubscribeMsgs();
      unsubscribeTyping();
    };
  }, [activeConversationId, currentUser]);

  // Online presence of active recipient
  useEffect(() => {
    if (!recipient) return;
    const unsubPresence = messageService.subscribeToUserPresence(recipient.uid, (p) => {
      setIsOnline(Boolean(p.online));
    });
    return unsubPresence;
  }, [recipient]);

  const selectConversation = (conv: Conversation) => {
    setActiveConversationId(conv.id);
    if (conv.otherUser) {
      setRecipient(conv.otherUser);
    }
  };

  const selectUserToMessage = (user: UserProfile) => {
    if (!currentUser) return;
    const convId = messageService.getConversationId(currentUser.uid, user.uid);
    setActiveConversationId(convId);
    setRecipient(user);
    setShowNewChat(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (activeConversationId && currentUser) {
      messageService.setTyping(activeConversationId, currentUser.uid, e.target.value.length > 0);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    try {
      const res = await uploadToCloudinary(file);
      setMediaAttachment({
        id: res.id,
        type: res.type,
        cloudinaryUrl: res.url,
        thumbnailUrl: res.thumbnailUrl
      });
      showToast('Media attached', 'success');
    } catch (err: any) {
      showToast(err.message || 'Media upload failed', 'error');
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !recipient) return;

    const trimmed = inputText.trim();
    if (!trimmed && !mediaAttachment) return;

    setSending(true);
    try {
      await messageService.sendMessage({
        senderId: currentUser.uid,
        recipientId: recipient.uid,
        text: trimmed,
        media: mediaAttachment ? [mediaAttachment] : undefined
      });

      setInputText('');
      setMediaAttachment(null);
      if (activeConversationId) {
        messageService.setTyping(activeConversationId, currentUser.uid, false);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!activeConversationId || !currentUser) return;
    try {
      await messageService.deleteMessage(activeConversationId, msgId, currentUser.uid);
      showToast('Message deleted', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete message', 'error');
    }
  };

  // Search users for new chat
  useEffect(() => {
    if (!userSearchText.trim()) {
      setSearchedUsers([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchService.searchUsers(userSearchText);
      setSearchedUsers(results.filter((u) => u.uid !== currentUser?.uid));
    }, 250);
    return () => clearTimeout(timer);
  }, [userSearchText, currentUser]);

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-slate-950">
      {/* Conversation List Column */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-slate-800/80 flex flex-col h-full bg-slate-950/60 shrink-0 ${
          activeConversationId ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">Direct Messages</h2>
          <button
            onClick={() => setShowNewChat(true)}
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            title="Start new conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
          {loadingConv ? (
            <div className="py-16 flex justify-center items-center text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="py-20 text-center px-6">
              <p className="text-xs text-slate-400 mb-3">No conversations yet.</p>
              <button
                onClick={() => setShowNewChat(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
              >
                Start a message
              </button>
            </div>
          ) : (
            conversations.map((c) => {
              const other = c.otherUser;
              const isActive = activeConversationId === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => selectConversation(c)}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                    isActive ? 'bg-indigo-600/15' : 'hover:bg-slate-900/50'
                  }`}
                >
                  <img
                    src={other?.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${c.id}`}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-full object-cover shrink-0 ring-1 ring-slate-800 bg-slate-800"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-100 truncate">
                        {other?.displayName || 'User'}
                      </span>
                      {c.lastMessage && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatRelativeTime(c.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {c.lastMessage?.text || 'Attachment'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Active Chat Conversation Area */}
      <div
        className={`flex-1 flex flex-col h-full bg-slate-950 min-w-0 ${
          activeConversationId ? 'flex' : 'hidden md:flex'
        }`}
      >
        {activeConversationId && recipient ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-slate-800/80 px-4 flex items-center justify-between bg-slate-950/80 backdrop-blur-md">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setActiveConversationId(null)}
                  className="md:hidden p-1.5 -ml-1.5 rounded-full text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div
                  onClick={() => onUserClick(recipient.username)}
                  className="flex items-center gap-2.5 cursor-pointer min-w-0"
                >
                  <div className="relative">
                    <img
                      src={recipient.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${recipient.username}`}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-800 bg-slate-800"
                    />
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-100 truncate">
                        {recipient.displayName}
                      </span>
                      {recipient.verified && (
                        <VerifiedBadge size={14} />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 truncate">
                      {isOnline ? 'Online' : `@${recipient.username}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => {
                const isMe = msg.senderId === currentUser?.uid;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 max-w-[80%]">
                      {isMe && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                          title="Delete message"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <div
                        className={`rounded-2xl px-4 py-2.5 text-xs ${
                          isMe
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                        }`}
                      >
                        {/* Attached media */}
                        {msg.media && msg.media.length > 0 && (
                          <div className="mb-2 rounded-xl overflow-hidden">
                            {msg.media[0].type === 'video' ? (
                              <video src={msg.media[0].cloudinaryUrl} controls className="max-h-48 rounded-lg" />
                            ) : (
                              <img
                                src={msg.media[0].cloudinaryUrl}
                                alt="Attachment"
                                className="max-h-56 rounded-lg object-cover"
                              />
                            )}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-500 mt-1 font-mono px-1">
                      {formatRelativeTime(msg.createdAt)}
                    </span>
                  </div>
                );
              })}

              {isOtherTyping && (
                <div className="flex items-center gap-2 text-xs text-indigo-400 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  <span>@{recipient.username} is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer */}
            <div className="p-3 border-t border-slate-800/80 bg-slate-950/80">
              {/* Media preview */}
              {mediaAttachment && (
                <div className="relative inline-block mb-2 rounded-xl overflow-hidden border border-slate-700">
                  <img src={mediaAttachment.thumbnailUrl || mediaAttachment.cloudinaryUrl} alt="" className="h-16 w-16 object-cover" />
                  <button
                    onClick={() => setMediaAttachment(null)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-rose-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingMedia}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-slate-900 transition-colors disabled:opacity-50"
                  title="Attach Photo or Video"
                >
                  {uploadingMedia ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : <Image className="w-4 h-4" />}
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  placeholder={`Message @${recipient.username}...`}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />

                <button
                  type="submit"
                  disabled={sending || (!inputText.trim() && !mediaAttachment)}
                  className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-40"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <h3 className="text-base font-bold text-slate-300">Select a conversation</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Choose an existing chat or start a new direct message conversation on ZOR.
            </p>
            <button
              onClick={() => setShowNewChat(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
            >
              Start New Message
            </button>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in select-none">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-5 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100">New Direct Message</h3>
              <button onClick={() => setShowNewChat(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                autoFocus
                value={userSearchText}
                onChange={(e) => setUserSearchText(e.target.value)}
                placeholder="Search username or display name..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto mt-3 space-y-2">
              {searchedUsers.map((u) => (
                <div
                  key={u.uid}
                  onClick={() => selectUserToMessage(u)}
                  className="p-2.5 rounded-xl hover:bg-slate-800/80 cursor-pointer flex items-center gap-3 transition-colors"
                >
                  <img
                    src={u.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${u.username}`}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full object-cover bg-slate-800"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-100 truncate block">{u.displayName}</span>
                    <span className="text-[11px] text-slate-400 truncate block">@{u.username}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
