# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server on localhost:3000
npm run build        # Production build
npm run test:run     # Run all tests once
npm test             # Run tests in watch mode
npm run lint         # ESLint with auto-fix
npm run format       # Prettier formatting
```

Run a single test file:
```bash
npx vitest run src/utils/__tests__/mediaExtractor.test.ts
```

## Architecture

This is a TikTok-style Reddit media viewer built with Vue 3 Composition API. It displays images, videos, galleries, and Redgifs from subreddits in a fullscreen vertical swipe interface.

### Data Flow

1. **URL Parsing** (`App.vue`): Extracts subreddit(s), sort, and time filter from URL path `/r/pics/top?t=week`
2. **Fetching** (`useRedditFetcher.js`): Fetches posts from Reddit JSON API via proxy, extracts media using `mediaExtractor.ts`
3. **Rendering** (`MediaViewer.vue` → `MediaSlide.vue`): Renders appropriate slide component based on media type

### Key Components

- **MediaViewer**: Virtual scroller that renders 3 slides at a time (prev/current/next) and handles swipe navigation
- **MediaSlide**: Routes to correct slide type (ImageSlide, VideoSlide, GallerySlide, RedgifSlide)
- **Controls**: Bottom overlay with post info, navigation, sort selector

### API Proxying

Vite dev server proxies `/api/reddit/*` → `reddit.com` and `/api/redgifs/*` → `api.redgifs.com`. Production uses nginx (see `nginx.conf`).

### Services

- **redgifsAuth.ts**: Singleton token manager with 23-hour caching and request deduplication
- **storage.ts**: Storage adapter abstraction (localStorage with memory fallback)

### Media Extraction

`mediaExtractor.ts` handles Reddit's various media formats:
- Native Reddit images/videos
- Reddit galleries (multiple images)
- Imgur (direct links, gifv→mp4 conversion)
- Redgifs (extracts ID for API lookup)
- Preview images as fallback

### Error Handling

- `retry.ts`: Exponential backoff with jitter for API calls
- `ErrorBoundary.vue`: Catches Vue component errors
- `useRedditFetcher.js`: 15s timeout, stale request cancellation, sliding window (max 500 posts)

### Settings

`useSettings.js` is a singleton that persists to localStorage with 500ms debounce. Settings control auto-next behavior, video playback, NSFW filtering, and navigation.
