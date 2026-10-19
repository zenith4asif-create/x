import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { notificationService } from './services/notificationService';
import { seedService } from './services/seedService';
import { Post, UserProfile, PostMediaItem } from './types';

// Layout components
import { Sidebar } from './components/layout/Sidebar';
import { RightBar } from './components/layout/RightBar';
import { BottomNav } from './components/layout/BottomNav';
import { MobileHeader } from './components/layout/MobileHeader';

// Pages
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { SearchPage } from './pages/SearchPage';
import { PostDetailPage } from './pages/PostDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { MessagesPage } from './pages/MessagesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { BookmarksPage } from './pages/BookmarksPage';
import { CommunitiesPage } from './pages/CommunitiesPage';
import { AdminPage } from './pages/AdminPage';
import { SettingsPage } from './pages/SettingsPage';

// Modals
import { AuthModal } from './components/modals/AuthModal';
import { ComposeModal } from './components/modals/ComposeModal';
import { EditProfileModal } from './components/modals/EditProfileModal';
import { ReportModal } from './components/modals/ReportModal';
import { AnalyticsModal } from './components/modals/AnalyticsModal';
import { FollowListModal } from './components/modals/FollowListModal';
import { MediaViewer } from './components/feed/MediaViewer';

type ViewMode =
  | 'home'
  | 'explore'
  | 'search'
  | 'post'
  | 'profile'
  | 'messages'
  | 'notifications'
  | 'bookmarks'
  | 'communities'
  | 'admin'
  | 'settings';

function MainApp() {
  const { currentUser, userProfile, loading } = useAuth();
  const { showToast } = useToast();

  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [viewParam, setViewParam] = useState<string>('');
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'signup'>('login');
  const [composeModalOpen, setComposeModalOpen] = useState(false);
  const [replyTargetPost, setReplyTargetPost] = useState<Post | undefined>(undefined);
  const [quoteTargetPost, setQuoteTargetPost] = useState<Post | undefined>(undefined);

  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTargetPost, setReportTargetPost] = useState<Post | undefined>(undefined);
  const [reportTargetUser, setReportTargetUser] = useState<UserProfile | undefined>(undefined);

  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [analyticsTargetPost, setAnalyticsTargetPost] = useState<Post | undefined>(undefined);

  const [followListModalOpen, setFollowListModalOpen] = useState(false);
  const [followListUid, setFollowListUid] = useState<string>('');
  const [followListType, setFollowListType] = useState<'followers' | 'following'>('followers');

  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [viewerMediaList, setViewerMediaList] = useState<PostMediaItem[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Initialize seed posts if empty
  useEffect(() => {
    seedService.seedIfEmpty();
  }, []);

  // Listen to unread notifications count
  useEffect(() => {
    if (!currentUser) {
      setUnreadNotificationsCount(0);
      return;
    }
    const unsub = notificationService.subscribeToUnreadCount(
      currentUser.uid,
      setUnreadNotificationsCount
    );
    return unsub;
  }, [currentUser]);

  // Handle URL router sync
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const search = new URLSearchParams(window.location.search);

      if (path === '/' || path === '') {
        setCurrentView('home');
      } else if (path === '/explore') {
        setCurrentView('explore');
      } else if (path === '/search') {
        setCurrentView('search');
        setViewParam(search.get('q') || '');
      } else if (path.startsWith('/post/')) {
        setCurrentView('post');
        setViewParam(path.replace('/post/', ''));
      } else if (path.startsWith('/@')) {
        setCurrentView('profile');
        setViewParam(path.replace('/@', ''));
      } else if (path === '/messages') {
        setCurrentView('messages');
        setViewParam(search.get('user') || '');
      } else if (path === '/notifications') {
        setCurrentView('notifications');
      } else if (path === '/bookmarks') {
        setCurrentView('bookmarks');
      } else if (path === '/communities') {
        setCurrentView('communities');
      } else if (path === '/admin') {
        setCurrentView('admin');
      } else if (path === '/settings') {
        setCurrentView('settings');
      }
    };

    handlePopState();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (view: string, param?: string) => {
    if (view === 'auth') {
      setAuthInitialTab('login');
      setAuthModalOpen(true);
      return;
    }

    const nextView = view as ViewMode;
    setCurrentView(nextView);
    setViewParam(param || '');

    // Update browser URL
    let newPath = '/';
    if (nextView === 'explore') newPath = '/explore';
    else if (nextView === 'search') newPath = `/search?q=${encodeURIComponent(param || '')}`;
    else if (nextView === 'post') newPath = `/post/${param || ''}`;
    else if (nextView === 'profile') newPath = `/@${param || userProfile?.username || ''}`;
    else if (nextView === 'messages') newPath = param ? `/messages?user=${param}` : '/messages';
    else if (nextView === 'notifications') newPath = '/notifications';
    else if (nextView === 'bookmarks') newPath = '/bookmarks';
    else if (nextView === 'communities') newPath = '/communities';
    else if (nextView === 'admin') newPath = '/admin';
    else if (nextView === 'settings') newPath = '/settings';

    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath);
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCompose = (reply?: Post, quote?: Post) => {
    if (!currentUser) {
      showToast('Please sign in to publish posts', 'info');
      setAuthInitialTab('login');
      setAuthModalOpen(true);
      return;
    }
    setReplyTargetPost(reply);
    setQuoteTargetPost(quote);
    setComposeModalOpen(true);
  };

  const handleOpenReport = (post?: Post, user?: UserProfile) => {
    setReportTargetPost(post);
    setReportTargetUser(user);
    setReportModalOpen(true);
  };

  const handleOpenAnalytics = (post: Post) => {
    setAnalyticsTargetPost(post);
    setAnalyticsModalOpen(true);
  };

  const handleOpenFollowList = (uid: string, type: 'followers' | 'following') => {
    setFollowListUid(uid);
    setFollowListType(type);
    setFollowListModalOpen(true);
  };

  const handleOpenMedia = (mediaList: PostMediaItem[], index: number) => {
    setViewerMediaList(mediaList);
    setViewerIndex(index);
    setMediaViewerOpen(true);
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'home':
        return 'Home';
      case 'explore':
        return 'Explore';
      case 'search':
        return `Search: ${viewParam || ''}`;
      case 'post':
        return 'Post';
      case 'profile':
        return `@${viewParam || userProfile?.username || ''}`;
      case 'messages':
        return 'Direct Messages';
      case 'notifications':
        return 'Notifications';
      case 'bookmarks':
        return 'Bookmarks';
      case 'communities':
        return 'Communities';
      case 'admin':
        return 'Admin Panel';
      case 'settings':
        return 'Settings';
      default:
        return 'ZOR';
    }
  };

  return (
    <div className="min-h-screen bg-black text-[#e7e9ea] flex justify-center selection:bg-[#1d9bf0]/20 selection:text-white">
      <div className="flex w-full max-w-7xl justify-center">
        {/* Left Sidebar (Desktop) */}
        <Sidebar
          currentView={currentView}
          onNavigate={navigateTo}
          onOpenCompose={() => handleOpenCompose()}
          unreadNotificationsCount={unreadNotificationsCount}
        />

        {/* Center Main Content Container (True X Black) */}
        <main className="w-full max-w-2xl min-h-screen border-r border-[#2f3336] bg-black flex flex-col pb-20 md:pb-0">
          {/* Mobile Sticky Header */}
          <MobileHeader
            title={getViewTitle()}
            canGoBack={currentView !== 'home'}
            onBack={() => navigateTo('home')}
            onSearchClick={() => navigateTo('explore')}
            onAuthClick={() => {
              setAuthInitialTab('login');
              setAuthModalOpen(true);
            }}
          />

          {/* Active View Dispatcher */}
          <div className="flex-1">
            {currentView === 'home' && (
              <HomePage
                onPostClick={(id) => navigateTo('post', id)}
                onUserClick={(u) => navigateTo('profile', u)}
                onHashtagClick={(tag) => navigateTo('search', `#${tag}`)}
                onReplyClick={(p) => handleOpenCompose(p, undefined)}
                onQuoteClick={(p) => handleOpenCompose(undefined, p)}
                onAnalyticsClick={handleOpenAnalytics}
                onReportClick={(p) => handleOpenReport(p, undefined)}
                onMediaClick={handleOpenMedia}
                onNavigateExplore={() => navigateTo('explore')}
              />
            )}

            {currentView === 'explore' && (
              <ExplorePage
                onSearchSubmit={(q) => navigateTo('search', q)}
                onUserClick={(u) => navigateTo('profile', u)}
                onHashtagClick={(tag) => navigateTo('search', `#${tag}`)}
                onPostClick={(id) => navigateTo('post', id)}
              />
            )}

            {currentView === 'search' && (
              <SearchPage
                initialQuery={viewParam}
                onPostClick={(id) => navigateTo('post', id)}
                onUserClick={(u) => navigateTo('profile', u)}
                onHashtagClick={(tag) => navigateTo('search', `#${tag}`)}
                onCommunityClick={(cid) => navigateTo('communities')}
              />
            )}

            {currentView === 'post' && (
              <PostDetailPage
                postId={viewParam}
                onBack={() => navigateTo('home')}
                onPostClick={(id) => navigateTo('post', id)}
                onUserClick={(u) => navigateTo('profile', u)}
                onHashtagClick={(tag) => navigateTo('search', `#${tag}`)}
                onMediaClick={handleOpenMedia}
              />
            )}

            {currentView === 'profile' && (
              <ProfilePage
                username={viewParam || userProfile?.username || ''}
                onBack={() => navigateTo('home')}
                onPostClick={(id) => navigateTo('post', id)}
                onUserClick={(u) => navigateTo('profile', u)}
                onHashtagClick={(tag) => navigateTo('search', `#${tag}`)}
                onOpenEditProfile={() => setEditProfileModalOpen(true)}
                onOpenFollowList={handleOpenFollowList}
                onOpenMessageWithUser={(uid) => navigateTo('messages', uid)}
                onMediaClick={handleOpenMedia}
              />
            )}

            {currentView === 'messages' && (
              <MessagesPage
                initialRecipientUid={viewParam}
                onUserClick={(u) => navigateTo('profile', u)}
              />
            )}

            {currentView === 'notifications' && (
              <NotificationsPage
                onPostClick={(id) => navigateTo('post', id)}
                onUserClick={(u) => navigateTo('profile', u)}
              />
            )}

            {currentView === 'bookmarks' && (
              <BookmarksPage
                onPostClick={(id) => navigateTo('post', id)}
                onUserClick={(u) => navigateTo('profile', u)}
                onHashtagClick={(tag) => navigateTo('search', `#${tag}`)}
                onMediaClick={handleOpenMedia}
              />
            )}

            {currentView === 'communities' && (
              <CommunitiesPage
                onPostClick={(id) => navigateTo('post', id)}
                onUserClick={(u) => navigateTo('profile', u)}
                onHashtagClick={(tag) => navigateTo('search', `#${tag}`)}
                onMediaClick={handleOpenMedia}
              />
            )}

            {currentView === 'admin' && <AdminPage />}

            {currentView === 'settings' && (
              <SettingsPage onOpenEditProfile={() => setEditProfileModalOpen(true)} />
            )}
          </div>
        </main>

        {/* Right Column (Trends, Suggested Creators, Search - Desktop) */}
        <RightBar
          onSearchSubmit={(q) => navigateTo('search', q)}
          onUserClick={(u) => navigateTo('profile', u)}
          onHashtagClick={(tag) => navigateTo('search', `#${tag}`)}
          onNavigate={navigateTo}
        />
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentView={currentView}
        onNavigate={navigateTo}
        onOpenCompose={() => handleOpenCompose()}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      {/* Modals & Dialogs */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authInitialTab}
      />

      <ComposeModal
        isOpen={composeModalOpen}
        onClose={() => {
          setComposeModalOpen(false);
          setReplyTargetPost(undefined);
          setQuoteTargetPost(undefined);
        }}
        replyTo={replyTargetPost}
        quotePost={quoteTargetPost}
      />

      {userProfile && (
        <EditProfileModal
          isOpen={editProfileModalOpen}
          onClose={() => setEditProfileModalOpen(false)}
          profile={userProfile}
        />
      )}

      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        post={reportTargetPost}
        user={reportTargetUser}
      />

      {analyticsTargetPost && (
        <AnalyticsModal
          isOpen={analyticsModalOpen}
          onClose={() => {
            setAnalyticsModalOpen(false);
            setAnalyticsTargetPost(undefined);
          }}
          post={analyticsTargetPost}
        />
      )}

      <FollowListModal
        isOpen={followListModalOpen}
        onClose={() => setFollowListModalOpen(false)}
        uid={followListUid}
        type={followListType}
        onUserClick={(u) => navigateTo('profile', u)}
      />

      <MediaViewer
        isOpen={mediaViewerOpen}
        onClose={() => setMediaViewerOpen(false)}
        media={viewerMediaList}
        initialIndex={viewerIndex}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <MainApp />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
