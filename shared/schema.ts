import { z } from "zod";

// Song/Track schema
export const songSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist: z.string().optional(),
  duration: z.number().optional(), // in seconds
  url: z.string(),
  thumbnail: z.string().optional(),
  source: z.enum(["youtube", "spotify"]),
});

export type Song = z.infer<typeof songSchema>;

// Queue item schema
export const queueItemSchema = z.object({
  id: z.string(),
  song: songSchema,
  addedAt: z.number(), // timestamp
});

export type QueueItem = z.infer<typeof queueItemSchema>;

// Radio state schema
export const radioStateSchema = z.object({
  name: z.string(),
  queue: z.array(queueItemSchema),
  currentSong: songSchema.nullable(),
  isPlaying: z.boolean(),
  currentTime: z.number().optional(), // playback position in seconds
});

export type RadioState = z.infer<typeof radioStateSchema>;

// Add song request schema
export const addSongRequestSchema = z.object({
  url: z.string().url("Please enter a valid YouTube or Spotify URL"),
  radioName: z.string(),
});

export type AddSongRequest = z.infer<typeof addSongRequestSchema>;

// Socket.io event types
export type SocketEvents = {
  // Client to server
  join_radio: { radioName: string };
  add_song: { url: string; radioName: string };
  play_pause: { radioName: string };
  skip: { radioName: string };
  
  // Server to client
  radio_state: RadioState;
  queue_updated: { queue: QueueItem[] };
  now_playing: { song: Song | null };
  playback_state: { isPlaying: boolean };
  error: { message: string };
  song_added: { song: Song };
};
