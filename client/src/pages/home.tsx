import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, Radio, ArrowRight } from "lucide-react";

export default function Home() {
  const radios = [
    {
      name: "lofi",
      description: "Chill beats and relaxing vibes",
      color: "from-purple-500 to-pink-500",
    },
    {
      name: "fiesta",
      description: "Party hits and dance music",
      color: "from-orange-500 to-red-500",
    },
    {
      name: "retro",
      description: "Classic hits from the past",
      color: "from-blue-500 to-cyan-500",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="border-b">
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center space-y-6 max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
              <Radio className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Multi-Radio Streaming Platform
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Create collaborative radio stations with real-time playback. Add songs from YouTube or Spotify
              and stream to Minecraft Simple Voice Chat Radio mod.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/radio/lofi">
                <Button size="lg" className="gap-2 h-12 md:h-14 px-6 md:px-8" data-testid="button-join-lofi">
                  <Music className="w-5 h-5" />
                  Join Lofi Radio
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="gap-2 h-12 md:h-14 px-6 md:px-8"
                asChild
              >
                <a href="#radios">
                  Browse All Radios
                  <ArrowRight className="w-5 h-5" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b">
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-6 md:p-8 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Radio className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Real-Time Sync</h3>
              <p className="text-muted-foreground">
                All connected users see the same queue and playback state in real-time using WebSockets.
              </p>
            </Card>

            <Card className="p-6 md:p-8 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Music className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">YouTube & Spotify</h3>
              <p className="text-muted-foreground">
                Add songs from YouTube or Spotify. Spotify tracks are automatically searched on YouTube.
              </p>
            </Card>

            <Card className="p-6 md:p-8 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <ArrowRight className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Stream Anywhere</h3>
              <p className="text-muted-foreground">
                Copy the stream URL and use it in Minecraft Simple Voice Chat Radio or any audio player.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Radio Stations */}
      <section id="radios" className="py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Available Radio Stations</h2>
            <p className="text-lg text-muted-foreground">
              Join an existing radio or create your own by visiting /radio/yourname
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {radios.map((radio) => (
              <Link key={radio.name} href={`/radio/${radio.name}`}>
                <Card className="p-6 hover-elevate active-elevate-2 transition-transform cursor-pointer h-full" data-testid={`card-radio-${radio.name}`}>
                  <div className="space-y-4">
                    <div className={`h-32 rounded-lg bg-gradient-to-br ${radio.color} flex items-center justify-center`}>
                      <Radio className="w-12 h-12 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold capitalize mb-2">{radio.name}</h3>
                      <p className="text-sm text-muted-foreground">{radio.description}</p>
                    </div>
                    <Button variant="outline" className="w-full gap-2" data-testid={`button-open-${radio.name}`}>
                      Open Radio
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
