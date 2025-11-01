import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import ytdl from "@distube/ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import spotifyUrlInfo from "spotify-url-info";
import { GetListByKeyword } from "youtube-search-api";
import type { Song, RadioState } from "@shared/schema";
import { randomUUID } from "crypto";
import { PassThrough } from "stream";

// Set ffmpeg path
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

// Initialize Spotify URL info with fetch
const { getData: getSpotifyData } = spotifyUrlInfo(fetch);

// Active streams for each radio
const activeStreams = new Map<string, {
  stream: PassThrough;
  currentProcess: any;
  listeners: Set<Response>;
}>();

// WebSocket clients by radio
const radioClients = new Map<string, Set<WebSocket>>();

// All connected WebSocket clients (for global broadcasts)
const allClients = new Set<WebSocket>();

// Helper function to broadcast to all clients in a radio
function broadcastToRadio(radioName: string, message: any) {
  const clients = radioClients.get(radioName);
  if (clients) {
    const data = JSON.stringify(message);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }
}

// Helper function to broadcast to all connected clients
function broadcastToAll(message: any) {
  const data = JSON.stringify(message);
  allClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Helper function to extract YouTube video ID from URL
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}


// Get song info from YouTube (con fallback de mirrors Piped)
async function getSongFromYouTube(url: string): Promise<Song> {
  try {
    const videoId = extractYouTubeId(url);
    if (!videoId) {
      throw new Error("Invalid YouTube URL");
    }

    // 🔹 Lista de mirrors alternativos de Piped
    const pipedMirrors = [
      "https://pipedapi.namazso.eu",
      "https://pipedapi.syncpundit.io",
      "https://pipedapi.leptons.xyz",
      "https://pipedapi.adminforge.de",
      "https://pipedapi.kavin.rocks", // último por compatibilidad
    ];

    let response: globalThis.Response | undefined;
    for (const mirror of pipedMirrors) {
      try {
        response = await fetch(`${mirror}/streams/${videoId}`);
        if (response.ok) {
          console.log(`✅ Usando mirror: ${mirror}`);
          break;
        } else {
          console.warn(`⚠️ Mirror falló (${mirror}): ${response.status}`);
        }
      } catch (err) {
        console.warn(`⚠️ Error al conectar con mirror ${mirror}:`, err);
      }
    }


    if (!response || !response.ok) {
      throw new Error("❌ Ningún mirror Piped disponible");
    }

    const data = await response.json();

    // Selecciona el primer stream de audio disponible
    const audioStream = data.audioStreams?.[0];
    if (!audioStream) {
      throw new Error("No audio stream found for this video");
    }

    return {
      id: randomUUID(),
      title: data.title,
      artist: data.uploader || "Unknown",
      duration: Math.floor(data.duration / 1000),
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: data.thumbnailUrl,
      source: "youtube",
    };
  } catch (error) {
    console.error("Error fetching YouTube info:", error);
    throw new Error("Failed to fetch YouTube video information");
  }
}


// Get song from Spotify (search on YouTube)
async function getSongFromSpotify(url: string): Promise<Song> {
  try {
    const spotifyData = await getSpotifyData(url);
    const searchQuery = `${spotifyData.name} ${spotifyData.artists?.[0]?.name || ""}`;
    
    const searchResults = await GetListByKeyword(searchQuery, false, 1);
    
    if (!searchResults.items || searchResults.items.length === 0) {
      throw new Error("No YouTube results found for Spotify track");
    }

    const firstResult = searchResults.items[0];
    const youtubeUrl = `https://www.youtube.com/watch?v=${firstResult.id}`;
    
    return await getSongFromYouTube(youtubeUrl);
  } catch (error) {
    console.error("Error fetching Spotify info:", error);
    throw new Error("Failed to fetch Spotify track information");
  }
}

// Play next song in queue
async function playNextSong(radioName: string) {
  try {
    const radio = await storage.getRadio(radioName);
    if (!radio) return;

    const nextItem = await storage.getNextInQueue(radioName);
    
    if (nextItem) {
      await storage.updateRadioState(radioName, {
        currentSong: nextItem.song,
        isPlaying: true,
      });

      broadcastToRadio(radioName, {
        type: "now_playing",
        data: { song: nextItem.song },
      });

      broadcastToRadio(radioName, {
        type: "playback_state",
        data: { isPlaying: true },
      });

      // Start streaming the song
      await startStreaming(radioName, nextItem.song);
    } else {
      // No more songs in queue
      await storage.updateRadioState(radioName, {
        currentSong: null,
        isPlaying: false,
      });

      broadcastToRadio(radioName, {
        type: "now_playing",
        data: { song: null },
      });

      broadcastToRadio(radioName, {
        type: "playback_state",
        data: { isPlaying: false },
      });
    }

    // Broadcast updated queue
    const updatedRadio = await storage.getRadio(radioName);
    if (updatedRadio) {
      broadcastToRadio(radioName, {
        type: "queue_updated",
        data: { queue: updatedRadio.queue },
      });
    }
  } catch (error) {
    console.error(`Error playing next song for ${radioName}:`, error);
  }
}

// Start streaming a song
async function startStreaming(radioName: string, song: Song) {
  try {
    // Limpiar cualquier stream anterior
    const existing = activeStreams.get(radioName);
    if (existing?.currentProcess) {
      existing.currentProcess.kill();
    }

    const videoId = extractYouTubeId(song.url);
    if (!videoId) throw new Error("Invalid YouTube URL for streaming");

    // 🔹 Usamos la API Piped para obtener el stream directo
    const response = await fetch(`https://pipedapi.kavin.rocks/streams/${videoId}`);
    if (!response.ok) throw new Error(`Piped API error: ${response.status}`);
    const data = await response.json();

    const audioStreamUrl = data.audioStreams?.[0]?.url;
    if (!audioStreamUrl) throw new Error("No audio stream found from Piped");

    // 🔹 FFMPEG toma el audio directo desde el stream de Piped
    const passThrough = new PassThrough();
    const ffmpegProcess = ffmpeg(audioStreamUrl)
      .audioCodec("libmp3lame")
      .audioBitrate(128)
      .format("mp3")
      .on("error", (error) => {
        console.error(`FFmpeg error for ${radioName}:`, error);
        setTimeout(() => playNextSong(radioName), 1000);
      })
      .on("end", () => {
        console.log(`Song finished for ${radioName}, playing next`);
        setTimeout(() => playNextSong(radioName), 500);
      });

    ffmpegProcess.pipe(passThrough);

    activeStreams.set(radioName, {
      stream: passThrough,
      currentProcess: ffmpegProcess,
      listeners: existing?.listeners || new Set(),
    });

    const streamData = activeStreams.get(radioName);
    if (streamData) {
      streamData.listeners.forEach(res => {
        passThrough.pipe(res, { end: false });
      });
    }

  } catch (error) {
    console.error(`Error starting stream for ${radioName}:`, error);
    throw error;
  }
}



export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time communication
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Track currentRadio for each WebSocket
  const wsCurrentRadio = new Map<WebSocket, string | null>();

  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection');
    wsCurrentRadio.set(ws, null);
    
    // Add to global clients list
    allClients.add(ws);

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case "get_all_radios": {
            const radios = await storage.getAllRadioInfo();
            ws.send(JSON.stringify({
              type: "all_radios",
              data: { radios },
            }));
            break;
          }

          case "create_radio": {
            const { name } = message.data;
            
            try {
              if (!name || typeof name !== 'string' || name.trim().length === 0) {
                throw new Error("El nombre de la radio no puede estar vacío");
              }

              const radioName = name.trim().toLowerCase();
              
              if (await storage.radioExists(radioName)) {
                throw new Error(`La radio "${radioName}" ya existe`);
              }

              await storage.createRadio(radioName);
              
              // Broadcast to all clients
              const radios = await storage.getAllRadioInfo();
              broadcastToAll({
                type: "all_radios",
                data: { radios },
              });
              
              broadcastToAll({
                type: "radio_created",
                data: { name: radioName },
              });
            } catch (error: any) {
              ws.send(JSON.stringify({
                type: "error",
                data: { message: error.message || "Failed to create radio" },
              }));
            }
            break;
          }

          case "rename_radio": {
            const { oldName, newName } = message.data;
            
            try {
              if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
                throw new Error("El nuevo nombre no puede estar vacío");
              }

              const newRadioName = newName.trim().toLowerCase();
              
              if (oldName === newRadioName) {
                throw new Error("El nuevo nombre debe ser diferente");
              }

              if (await storage.radioExists(newRadioName)) {
                throw new Error(`La radio "${newRadioName}" ya existe`);
              }

              await storage.renameRadio(oldName, newRadioName);
              
              // Update active streams
              const streamData = activeStreams.get(oldName);
              if (streamData) {
                activeStreams.delete(oldName);
                activeStreams.set(newRadioName, streamData);
              }
              
              // Update client mappings and notify connected clients
              const clients = radioClients.get(oldName);
              if (clients) {
                radioClients.delete(oldName);
                radioClients.set(newRadioName, clients);
                
                // Update currentRadio for all connected WebSockets
                clients.forEach(client => {
                  wsCurrentRadio.set(client, newRadioName);
                  
                  // Notify client to rejoin with new name
                  if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                      type: "radio_renamed_rejoin",
                      data: { oldName, newName: newRadioName },
                    }));
                  }
                });
              }
              
              // Broadcast to all clients
              const radios = await storage.getAllRadioInfo();
              broadcastToAll({
                type: "all_radios",
                data: { radios },
              });
              
              broadcastToAll({
                type: "radio_renamed",
                data: { oldName, newName: newRadioName },
              });
            } catch (error: any) {
              ws.send(JSON.stringify({
                type: "error",
                data: { message: error.message || "Failed to rename radio" },
              }));
            }
            break;
          }

          case "delete_radio": {
            const { name } = message.data;
            
            try {
              if (!(await storage.radioExists(name))) {
                throw new Error(`La radio "${name}" no existe`);
              }

              await storage.deleteRadio(name);
              
              // Clean up active streams
              const streamData = activeStreams.get(name);
              if (streamData) {
                if (streamData.currentProcess) {
                  streamData.currentProcess.kill();
                }
                activeStreams.delete(name);
              }
              
              // Disconnect all clients from this radio
              const clients = radioClients.get(name);
              if (clients) {
                clients.forEach(client => {
                  if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                      type: "error",
                      data: { message: `La radio "${name}" ha sido eliminada` },
                    }));
                  }
                });
                radioClients.delete(name);
              }
              
              // Broadcast to all clients
              const radios = await storage.getAllRadioInfo();
              broadcastToAll({
                type: "all_radios",
                data: { radios },
              });
              
              broadcastToAll({
                type: "radio_deleted",
                data: { name },
              });
            } catch (error: any) {
              ws.send(JSON.stringify({
                type: "error",
                data: { message: error.message || "Failed to delete radio" },
              }));
            }
            break;
          }

          case "join_radio": {
            const { radioName } = message.data;
            const currentRadio = wsCurrentRadio.get(ws);
            
            // Remove from previous radio if any
            if (currentRadio) {
              const prevClients = radioClients.get(currentRadio);
              if (prevClients) {
                prevClients.delete(ws);
                if (prevClients.size === 0) {
                  radioClients.delete(currentRadio);
                }
              }
            }
            
            wsCurrentRadio.set(ws, radioName);

            // Add client to radio room
            if (!radioClients.has(radioName)) {
              radioClients.set(radioName, new Set());
            }
            radioClients.get(radioName)!.add(ws);

            // Get or create radio
            let radio = await storage.getRadio(radioName);
            if (!radio) {
              radio = await storage.createRadio(radioName);
            }

            // Send current state to client
            ws.send(JSON.stringify({
              type: "radio_state",
              data: radio,
            }));

            console.log(`Client joined radio: ${radioName}`);
            break;
          }

          case "add_song": {
            const { url, radioName } = message.data;
            
            try {
              let song: Song;

              if (url.includes("spotify.com")) {
                song = await getSongFromSpotify(url);
              } else if (url.includes("youtube.com") || url.includes("youtu.be")) {
                song = await getSongFromYouTube(url);
              } else {
                throw new Error("Unsupported URL. Please use YouTube or Spotify links.");
              }

              await storage.addToQueue(radioName, song);

              const radio = await storage.getRadio(radioName);
              if (radio) {
                // Broadcast updated queue
                broadcastToRadio(radioName, {
                  type: "queue_updated",
                  data: { queue: radio.queue },
                });

                // Broadcast song added notification
                broadcastToRadio(radioName, {
                  type: "song_added",
                  data: { song },
                });

                // If nothing is playing, start playing
                if (!radio.currentSong && !radio.isPlaying) {
                  await playNextSong(radioName);
                }
              }
            } catch (error: any) {
              ws.send(JSON.stringify({
                type: "error",
                data: { message: error.message || "Failed to add song" },
              }));
            }
            break;
          }

          case "play_pause": {
            const { radioName } = message.data;
            const radio = await storage.getRadio(radioName);
            
            if (radio) {
              const newPlayingState = !radio.isPlaying;
              await storage.updateRadioState(radioName, {
                isPlaying: newPlayingState,
              });

              if (newPlayingState && !radio.currentSong && radio.queue.length > 0) {
                // Start playing if there's a queue
                await playNextSong(radioName);
              } else {
                broadcastToRadio(radioName, {
                  type: "playback_state",
                  data: { isPlaying: newPlayingState },
                });
              }
            }
            break;
          }

          case "skip": {
            const { radioName } = message.data;
            await playNextSong(radioName);
            break;
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
        ws.send(JSON.stringify({
          type: "error",
          data: { message: "An error occurred processing your request" },
        }));
      }
    });

    ws.on('close', () => {
      // Remove from global clients
      allClients.delete(ws);
      
      const currentRadio = wsCurrentRadio.get(ws);
      if (currentRadio) {
        const clients = radioClients.get(currentRadio);
        if (clients) {
          clients.delete(ws);
          if (clients.size === 0) {
            radioClients.delete(currentRadio);
          }
        }
      }
      
      wsCurrentRadio.delete(ws);
      console.log('WebSocket connection closed');
    });
  });

  // Streaming endpoint
  app.get("/stream/:radioName", async (req: Request, res: Response) => {
    const { radioName } = req.params;

    try {
      const radio = await storage.getRadio(radioName);
      if (!radio) {
        return res.status(404).send("Radio not found");
      }

      // Set headers for MP3 streaming
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Transfer-Encoding", "chunked");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Cache-Control", "no-cache");

      // Get or create stream data
      let streamData = activeStreams.get(radioName);
      
      if (!streamData) {
        streamData = {
          stream: new PassThrough(),
          currentProcess: null,
          listeners: new Set(),
        };
        activeStreams.set(radioName, streamData);

        // Start playing if there's a current song
        if (radio.currentSong) {
          await startStreaming(radioName, radio.currentSong);
          streamData = activeStreams.get(radioName)!;
        } else if (radio.queue.length > 0) {
          // Start playing first song in queue
          await playNextSong(radioName);
          streamData = activeStreams.get(radioName)!;
        }
      }

      // Add this response to listeners
      streamData.listeners.add(res);

      // Pipe stream to response
      streamData.stream.pipe(res, { end: false });

      // Clean up on disconnect
      req.on("close", () => {
        const streamData = activeStreams.get(radioName);
        if (streamData) {
          streamData.listeners.delete(res);
          
          // If no more listeners and no WebSocket clients, clean up
          if (streamData.listeners.size === 0) {
            const clients = radioClients.get(radioName);
            if (!clients || clients.size === 0) {
              if (streamData.currentProcess) {
                streamData.currentProcess.kill();
              }
              activeStreams.delete(radioName);
            }
          }
        }
      });

    } catch (error) {
      console.error(`Error streaming ${radioName}:`, error);
      res.status(500).send("Streaming error");
    }
  });

  // API endpoint to get all radios
  app.get("/api/radios", async (_req: Request, res: Response) => {
    try {
      const radios = await storage.getAllRadios();
      res.json(radios);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch radios" });
    }
  });

  console.log("Servidor de radio en línea listo 🎶");

  return httpServer;
}
