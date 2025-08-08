# 🎧 Personal News Podcast App

> A sophisticated React + TypeScript podcast player with intelligent voice announcements and seamless OS integration.

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_App-blue?style=for-the-badge)](https://dustysnews.netlify.app/)
[![Backend Repo](https://img.shields.io/badge/🔗_Backend-View_Code-green?style=for-the-badge)](https://github.com/DustyBest/podcast-app-backend)

## ✨ Overview

This is a **production-quality podcast application** I built to showcase modern React development practices and advanced web APIs. The app provides an intelligent, hands-free listening experience with voice announcements and seamless OS media controls integration.

**🎯 Built for**: Personal use and portfolio demonstration  
**🚀 Deployed on**: Netlify (frontend) + Railway (backend)

## 🎪 Key Features

### 🗣️ **Intelligent Voice Announcements**

- **Smart Context**: Announces podcast name, day, and time when switching episodes
- **Continuation Detection**: Different announcements for resumed vs. new episodes
- **User-Friendly**: "That's all for today. See you next time!" when playlist ends
- **Voice Selection**: Prefers Google UK English Female voice when available

### 📱 **OS Media Integration**

- **Lock Screen Controls**: Full integration with iOS/Android lock screen players
- **Hardware Buttons**: Works with Bluetooth headphones, car controls, etc.
- **Media Metadata**: Rich metadata with artwork and episode information
- **Background Playback**: Continues playing when app is backgrounded

### 💾 **Smart Progress Persistence**

- **Auto-Save**: Saves listening position every 5 seconds to localStorage
- **Cross-Session**: Resume exactly where you left off, even after closing the app
- **Intelligent Cleanup**: Automatically removes completed episode progress

### 🎵 **Seamless Playback**

- **Auto-Progression**: Automatically plays next episode when current one ends
- **Skip Controls**: Previous/next episode navigation with instant feedback
- **Loading States**: Smooth loading animations and error handling

## 🏗️ Technical Architecture

### **Frontend Stack**

```
React 19.1.0 + TypeScript + Vite
├── 🎨 TailwindCSS - Utility-first styling
├── 🎵 react-h5-audio-player - Audio playback component
├── 📱 PWA Ready - Progressive Web App capabilities
└── 🔧 Modern Tooling - ESLint, PostCSS, TypeScript
```

### **Custom Hook Architecture**

The app follows a **modular hook-based architecture** for maximum reusability and testability:

```typescript
// 🗣️ Speech & Announcements
useSpeechAnnouncement()
├── Voice caching and selection
├── Contextual announcement generation
└── Promise-based speech completion

// 💾 Progress Management
useProgressPersistence()
├── Throttled auto-saving (5s intervals)
├── Cross-session state restoration
└── Automatic cleanup on completion

// 📱 OS Integration
useMediaSession()
├── Lock screen metadata
├── Hardware button handling
└── Background playback support
```

### **Backend Integration**

- **API Endpoint**: `https://podcast-app-backend-production.up.railway.app/api/episodes`
- **RSS Processing**: Backend handles RSS feed fetching and parsing
- **Episode Data**: `{ id, source, audioUrl, image, pubDate }`

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/podcast-app-frontend.git
cd podcast-app-frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production

```bash
# Create optimized build
npm run build

# Preview production build
npm run preview
```

## 🧪 Code Quality Features

- **📏 TypeScript**: Full type safety with strict configuration
- **🔍 ESLint**: Comprehensive linting with React-specific rules
- **🎯 Custom Hooks**: Modular, testable, and reusable logic
- **♻️ Clean Architecture**: Separation of concerns and single responsibility
- **📝 Self-Documenting**: Clear naming and comprehensive interfaces

## 🌐 Browser Compatibility

- ✅ **Chrome/Edge**: Full feature support
- ✅ **Safari**: Full feature support
- ✅ **Firefox**: Full feature support
- ✅ **Mobile Browsers**: Optimized for iOS Safari and Chrome Mobile

## 📊 Performance

- **⚡ Fast Loading**: Vite-powered development and optimized builds
- **📦 Small Bundle**: Tree-shaking and code splitting
- **🎵 Efficient Audio**: Proper audio resource management
- **💾 Smart Caching**: localStorage for user preferences and progress

## 📄 License

MIT License - feel free to use this code for your own projects!

---

**Built with ❤️ by Me**  
_Showcasing modern React development and advanced web API integration_
