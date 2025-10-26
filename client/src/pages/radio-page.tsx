import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Play, Pause, SkipForward, Music, Copy, Check } from "lucide-react";
import type { RadioState, Song, QueueItem } from "@shared/schema";

export default function RadioPage() {
  const params = useParams<{ name: string }>();
  const radioName = params.name || "lofi";
  const { toast } = useToast();

  const [radioState, setRadioState] = useState<RadioState>({
    name: radioName,
    queue: [],
    currentSong: null,
    isPlaying: false,
  });
  const [url, setUrl] = useState("");
  const [isAddingToQueue, setIsAddingToQueue] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [streamUrlCopied, setStreamUrlCopied] = useState(false);

  // WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected");
      ws.send(JSON.stringify({ type: "join_radio", data: { radioName } }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case "radio_state":
            setRadioState(message.data);
            break;
          case "queue_updated":
            setRadioState(prev => ({ ...prev, queue: message.data.queue }));
            break;
          case "now_playing":
            setRadioState(prev => ({ ...prev, currentSong: message.data.song }));
            break;
          case "playback_state":
            setRadioState(prev => ({ ...prev, isPlaying: message.data.isPlaying }));
            break;
          case "song_added":
            toast({
              title: "Song added to queue",
              description: message.data.song.title,
            });
            break;
          case "error":
            toast({
              title: "Error",
              description: message.data.message,
              variant: "destructive",
            });
            break;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      toast({
        title: "Connection error",
        description: "Failed to connect to radio server",
        variant: "destructive",
      });
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [radioName]);

  const handleAddToQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !socket) return;

    setIsAddingToQueue(true);
    socket.send(JSON.stringify({
      type: "add_song",
      data: { url: url.trim(), radioName }
    }));
    setUrl("");
    setIsAddingToQueue(false);
  };

  const handlePlayPause = () => {
    if (socket) {
      socket.send(JSON.stringify({
        type: "play_pause",
        data: { radioName }
      }));
    }
  };

  const handleSkip = () => {
    if (socket) {
      socket.send(JSON.stringify({
        type: "skip",
        data: { radioName }
      }));
    }
  };

  const streamUrl = `${window.location.protocol}//${window.location.host}/stream/${radioName}`;

  const handleCopyStreamUrl = async () => {
    try {
      await navigator.clipboard.writeText(streamUrl);
      setStreamUrlCopied(true);
      toast({
        title: "Stream URL copied!",
        description: "You can now paste it in Simple Voice Chat Radio mod",
      });
      setTimeout(() => setStreamUrlCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the URL manually",
        variant: "destructive",
      });
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight capitalize">
                {radioName} Radio
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Live
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {radioState.queue.length} song{radioState.queue.length !== 1 ? "s" : ""} in queue
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleCopyStreamUrl}
              className="gap-2"
              data-testid="button-copy-stream-url"
            >
              {streamUrlCopied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Stream URL
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12 space-y-8 md:space-y-12">
        {/* Now Playing Card */}
        <Card className="p-6 md:p-8">
          <div className="md:grid md:grid-cols-[1fr_auto] gap-6">
            {/* Song Info */}
            <div className="flex gap-4 md:gap-6 items-start">
              {/* Album Art Placeholder */}
              <div className="shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                {radioState.currentSong?.thumbnail ? (
                  <img 
                    src={radioState.currentSong.thumbnail} 
                    alt={radioState.currentSong.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Music className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground" />
                )}
              </div>
              
              {/* Song Details */}
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                    Now Playing
                  </p>
                  <h2 className="text-2xl md:text-3xl font-semibold leading-tight truncate">
                    {radioState.currentSong?.title || "No song playing"}
                  </h2>
                  {radioState.currentSong?.artist && (
                    <p className="text-sm opacity-75 mt-1 truncate">
                      {radioState.currentSong.artist}
                    </p>
                  )}
                </div>
                {radioState.currentSong?.duration && (
                  <p className="text-xs font-mono text-muted-foreground">
                    Duration: {formatDuration(radioState.currentSong.duration)}
                  </p>
                )}
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center md:justify-end gap-4 mt-6 md:mt-0">
              <Button
                size="icon"
                variant="default"
                onClick={handlePlayPause}
                disabled={!radioState.currentSong && radioState.queue.length === 0}
                className="w-14 h-14 rounded-full"
                data-testid="button-play-pause"
              >
                {radioState.isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6 ml-0.5" />
                )}
              </Button>
              <Button
                size="icon"
                variant="secondary"
                onClick={handleSkip}
                disabled={radioState.queue.length === 0}
                className="w-10 h-10 rounded-full"
                data-testid="button-skip"
              >
                <SkipForward className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Add to Queue Form */}
        <Card className="p-6 md:p-8">
          <form onSubmit={handleAddToQueue} className="space-y-3">
            <label htmlFor="song-url" className="text-sm font-medium uppercase tracking-wide block">
              Add to Queue
            </label>
            <div className="flex flex-col md:flex-row gap-3">
              <Input
                id="song-url"
                type="url"
                placeholder="Paste YouTube or Spotify URL..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 h-12 md:h-14 px-4 md:px-6 rounded-xl"
                disabled={isAddingToQueue}
                data-testid="input-song-url"
              />
              <Button
                type="submit"
                disabled={!url.trim() || isAddingToQueue}
                className="h-12 md:h-14 px-6 md:px-8 rounded-xl gap-2"
                data-testid="button-add-to-queue"
              >
                <Music className="w-4 h-4" />
                {isAddingToQueue ? "Adding..." : "Add to Queue"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Supports YouTube and Spotify links. Spotify tracks will be searched on YouTube.
            </p>
          </form>
        </Card>

        {/* Queue List */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Queue</h3>
          
          {radioState.queue.length === 0 ? (
            <Card className="p-16 text-center">
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                  <Music className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-medium text-muted-foreground">No songs in queue</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Add your first song to get started
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-2 max-h-96 md:max-h-[500px] overflow-y-auto">
              {radioState.queue.map((item, index) => (
                <Card
                  key={item.id}
                  className="p-4 hover-elevate active-elevate-2 transition-transform cursor-pointer"
                  data-testid={`card-queue-item-${item.id}`}
                >
                  <div className="flex items-center gap-4">
                    {/* Position */}
                    <div className="w-8 text-center text-sm text-muted-foreground font-medium">
                      {index + 1}
                    </div>
                    
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded bg-muted shrink-0 overflow-hidden flex items-center justify-center">
                      {item.song.thumbnail ? (
                        <img 
                          src={item.song.thumbnail} 
                          alt={item.song.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Music className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    
                    {/* Song Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" data-testid={`text-song-title-${item.id}`}>
                        {item.song.title}
                      </p>
                      {item.song.artist && (
                        <p className="text-sm text-muted-foreground truncate">
                          {item.song.artist}
                        </p>
                      )}
                    </div>
                    
                    {/* Duration */}
                    {item.song.duration && (
                      <div className="text-sm font-mono text-muted-foreground shrink-0">
                        {formatDuration(item.song.duration)}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
