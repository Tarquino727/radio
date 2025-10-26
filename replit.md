# Multi-Radio Streaming Platform

A real-time collaborative radio streaming application built with Node.js, Express, Socket.io, and React.

## Overview

This application allows users to create and manage multiple independent radio stations. Each radio has its own playlist queue, and all connected users see the same state in real-time. Songs can be added from YouTube or Spotify URLs, and the audio is streamed in MP3 format compatible with Minecraft Simple Voice Chat Radio mod.

## Features

- **Multiple Independent Radios**: Each radio station operates independently with its own queue and playback state
- **Dynamic Radio Management**: Create, rename, and delete radios with real-time updates across all connected clients
- **Real-Time Synchronization**: WebSocket-based real-time updates for all connected users
- **YouTube & Spotify Support**: Add songs from YouTube directly or search Spotify tracks on YouTube
- **Audio Streaming**: Continuous MP3 audio streaming via `/stream/:radioName` endpoints
- **Beautiful UI**: Modern, responsive interface built with React and TailwindCSS
- **Minecraft Integration**: Stream URLs compatible with Simple Voice Chat Radio mod

## Project Structure

### Frontend (`client/`)
- **React + TypeScript**: Modern React application with full TypeScript support
- **Wouter**: Lightweight routing
- **TanStack Query**: Data fetching and caching
- **Shadcn UI + TailwindCSS**: Beautiful, accessible components
- **WebSocket Client**: Real-time connection to backend

### Backend (`server/`)
- **Express**: HTTP server for API and streaming
- **Socket.io**: Real-time bidirectional communication
- **ytdl-core**: YouTube video/audio downloading
- **ffmpeg**: Audio processing and MP3 conversion
- **In-Memory Storage**: Fast, simple data persistence

### Shared (`shared/`)
- **TypeScript Schemas**: Shared type definitions between frontend and backend
- **Zod Validation**: Runtime validation for all data

## API Routes

- `GET /radio/:name` - Radio page (frontend)
- `GET /stream/:name` - Audio stream endpoint (MP3)
- `WebSocket /ws` - Real-time communication

## WebSocket Events

### Client → Server
- `join_radio`: Join a specific radio room
- `add_song`: Add a song to the queue
- `play_pause`: Toggle playback
- `skip`: Skip to next song

### Server → Client
- `radio_state`: Complete radio state update
- `queue_updated`: Queue changes
- `now_playing`: Current song update
- `playback_state`: Play/pause state
- `song_added`: New song added notification
- `all_radios`: List of all radios (sent on radio create/rename/delete)
- `radio_renamed_rejoin`: Notification that current radio was renamed (client must rejoin)
- `error`: Error message

## Default Radios

The application comes with a default "lofi" radio station. Additional radios are created automatically when users visit `/radio/:name` for the first time.

## Development

The application uses a horizontal batching development approach:
1. Schema & Frontend - All data models and UI components
2. Backend - API endpoints, streaming, and real-time sync
3. Integration & Testing - Connect frontend to backend and test features

## Recent Changes (October 26, 2025)

### Dynamic Radio Management
- **Home Page**: Displays all radios dynamically with action buttons (Enter, Copy URL, Rename, Delete)
- **Create Radio**: Form to create new radios with validation
- **Rename Radio**: Dialog to rename radios with real-time synchronization
  - Backend tracks WebSocket connections with `wsCurrentRadio` map
  - Sends `radio_renamed_rejoin` event to connected clients
  - Frontend updates state and rejoins with new name
  - All UI and commands use updated name from state (not URL param)
- **Delete Radio**: Confirmation dialog before deletion
- **Real-Time Updates**: All clients see radio list updates immediately

### Bug Fixes
- Fixed radio rename flow to maintain full client control after rename
- Changed all handlers and UI rendering to use `radioState.name` instead of URL param
- Stream URL copying uses updated radio name
- Replaced emojis with Lucide icons (Headphones, Clipboard) per design guidelines

### Architecture
- WebSocket-based state synchronization ensures all clients stay in sync
- In-memory storage for radio states and queues
- Responsive design following modern streaming platform patterns
