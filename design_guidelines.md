# Design Guidelines: Multi-Radio Streaming Platform

## Design Approach

**Reference-Based Approach** drawing inspiration from Spotify, YouTube Music, and SoundCloud's interface patterns, adapted for a collaborative radio management experience. The design emphasizes immediate utility while maintaining the engaging visual language of modern streaming platforms.

---

## Core Design Principles

1. **Information Hierarchy**: Currently playing track takes visual priority, queue is secondary but clearly visible
2. **Real-Time Clarity**: Socket.io updates should feel instantaneous and smooth
3. **Collaborative Context**: Multiple users see the same state, so changes must be obvious
4. **Accessibility**: All controls keyboard-navigable, ARIA labels for screen readers

---

## Typography System

**Font Stack**: Google Fonts - Inter (primary) + JetBrains Mono (metadata/timestamps)

**Hierarchy**:
- Radio Name/Title: text-4xl md:text-5xl font-bold leading-tight
- Currently Playing Song: text-2xl md:text-3xl font-semibold
- Queue Items: text-base font-medium
- Artist/Channel Info: text-sm font-normal opacity-75
- Metadata (duration, position): text-xs font-mono
- Form Labels: text-sm font-medium uppercase tracking-wide
- Buttons: text-sm md:text-base font-semibold

---

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16 (p-2, p-4, p-6, p-8, p-12, p-16, etc.)

**Container Structure**:
- Max-width: max-w-4xl mx-auto for main content
- Padding: px-4 md:px-6 lg:px-8 (responsive)
- Section spacing: space-y-8 md:space-y-12

**Grid Layout for Multi-Radio Navigation** (if showing multiple radios):
- grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4

---

## Component Library

### 1. Radio Header
- Full-width section with radio name and metadata
- Includes breadcrumb navigation if implementing multi-radio switcher
- Layout: flex items-center justify-between
- Height: min-h-20 md:min-h-24
- Spacing: p-6 md:p-8

### 2. Now Playing Card
- Prominent card showing current track
- Layout: Two-column on desktop (md:grid md:grid-cols-[1fr_auto])
  - Left: Album art placeholder (if available) + song info
  - Right: Playback controls
- Spacing: p-6 md:p-8, gap-6
- Border radius: rounded-2xl
- Album art placeholder: w-20 h-20 md:w-24 md:h-24 rounded-lg
- Song info stack: space-y-2

### 3. Playback Controls
- Primary controls: Play/Pause, Next (Skip)
- Layout: flex items-center gap-4
- Button sizing: 
  - Primary (Play/Pause): w-14 h-14 rounded-full
  - Secondary (Next): w-10 h-10 rounded-full
- Icons: Use Heroicons (play, pause, forward)
- Include visual feedback for disabled states (when queue is empty)

### 4. Add to Queue Form
- Single-line input with inline button on desktop
- Layout: flex flex-col md:flex-row gap-3
- Input field:
  - Full width: w-full
  - Height: h-12 md:h-14
  - Padding: px-4 md:px-6
  - Border radius: rounded-xl
  - Placeholder: "Paste YouTube or Spotify URL..."
- Submit button:
  - Height matches input: h-12 md:h-14
  - Padding: px-6 md:px-8
  - Border radius: rounded-xl
  - Text: "Add to Queue"
  - Icon: plus icon from Heroicons

### 5. Queue List
- Scrollable container with max height
- Layout: space-y-2
- Max height: max-h-96 md:max-h-[500px] overflow-y-auto
- Custom scrollbar styling for better aesthetics

**Queue Item**:
- Layout: flex items-center gap-4 p-4 rounded-lg
- Hover state with slight transform
- Structure:
  - Position number: w-8 text-center (text-sm opacity-50)
  - Thumbnail placeholder: w-12 h-12 rounded
  - Song info: flex-1 min-w-0 (for text truncation)
    - Title: truncate
    - Artist/channel: truncate text-sm opacity-75
  - Duration: text-sm font-mono shrink-0
  - Remove button (X icon): w-8 h-8 rounded-full (only show on hover)

### 6. Empty States
- Centered messaging when queue is empty
- Layout: py-16 text-center space-y-4
- Icon: musical-note icon, large size (w-16 h-16)
- Message: "No songs in queue" with subtitle
- CTA: "Add your first song to get started"

### 7. Loading & Real-Time Indicators
- Subtle loading spinner when adding songs
- "Live" badge indicator showing real-time sync
- Pulse animation for active playback
- Toast notifications for queue updates from other users

### 8. Radio Selection (Multi-Radio UI)
If implementing navigation between multiple radios:
- Sidebar or top navigation bar
- Active radio highlighted
- Layout: flex md:flex-col gap-2
- Radio items: px-4 py-3 rounded-lg hover and active states
- Icons for each radio type (musical-note variants)

---

## Responsive Breakpoints

**Mobile (default)**:
- Single column layout
- Stacked controls
- Full-width form elements
- Simplified queue items (smaller thumbnails)

**Tablet (md: 768px+)**:
- Two-column now playing card
- Inline form (input + button horizontal)
- Larger touch targets

**Desktop (lg: 1024px+)**:
- Optional sidebar for radio selection
- Wider queue list with more metadata
- Hover interactions for queue items

---

## Animations

**Minimal & Purposeful Only**:
1. Queue item entrance: subtle fade-in when new song added (duration-200)
2. Now playing transition: crossfade between tracks (duration-300)
3. Button hover: scale-105 (transform transition-transform duration-150)
4. Loading states: animate-spin for spinners

**No Continuous Animations**: Avoid distracting autoplay animations or excessive motion

---

## Accessibility Implementation

- All interactive elements: min-h-11 (44px touch target)
- Form inputs: Proper labels with for/id relationships
- Playback controls: ARIA labels ("Play radio", "Skip to next song")
- Queue items: Semantic list markup (<ol> or <ul>)
- Keyboard navigation: Tab order follows visual hierarchy
- Focus indicators: ring-2 ring-offset-2 on focus-visible
- Screen reader announcements for real-time updates via ARIA live regions

---

## Images

**No Hero Image**: This is a utility application, not a marketing page. Focus on functional interface.

**Album Art/Thumbnails**: 
- Queue items and now playing card should show YouTube video thumbnails
- Fetched from YouTube thumbnail API
- Fallback to musical-note icon placeholder
- Consistent aspect ratio: square (1:1)
- Sizes: 48px × 48px (queue items), 80-96px × 80-96px (now playing on mobile), 96-128px × 96-128px (now playing on desktop)

---

## Special Considerations

**Socket.io Real-Time Updates**:
- Visual feedback when other users add songs (subtle highlight flash)
- Smooth transitions when queue reorders
- "Added by [User]" metadata if implementing user identification

**Multiple Radio Independence**:
- Clear visual distinction of which radio is active
- Prevent confusion with distinct radio identifiers (icons, badges)

**Minecraft Simple Voice Chat Integration**:
- Display stream URL prominently for easy copying
- Copy button with success feedback
- Stream status indicator (live/offline)