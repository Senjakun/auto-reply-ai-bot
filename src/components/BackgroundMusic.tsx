import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

// Default music URL
const DEFAULT_MUSIC_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

export const BackgroundMusic = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);
  const [musicUrl, setMusicUrl] = useState(DEFAULT_MUSIC_URL);

  // Fetch custom music URL from site_settings
  useEffect(() => {
    const fetchMusicSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('setting_value')
          .eq('setting_key', 'music')
          .maybeSingle();

        if (!error && data?.setting_value) {
          const settingValue = data.setting_value as Record<string, unknown>;
          if (settingValue.music_url && typeof settingValue.music_url === 'string') {
            setMusicUrl(settingValue.music_url);
          }
        }
      } catch (err) {
        console.error('Error fetching music settings:', err);
      }
    };

    fetchMusicSettings();
  }, []);

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const startMusic = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      setShowPrompt(false);
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
  };

  return (
    <>
      <audio ref={audioRef} src={musicUrl} loop preload="auto" />
      
      {/* Initial prompt to start music (required due to browser autoplay restrictions) */}
      {showPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
              <Volume2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              🎵 Background Music
            </h3>
            <p className="text-muted-foreground mb-6">
              Ingin mendengarkan musik ambient saat menjelajahi website?
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={dismissPrompt}
                className="px-6"
              >
                Tidak
              </Button>
              <Button
                onClick={startMusic}
                className="px-6 bg-primary hover:bg-primary/90"
              >
                Ya, Mainkan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating music control button */}
      {!showPrompt && (
        <Button
          onClick={toggleMusic}
          size="icon"
          variant="outline"
          className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm border-border hover:bg-card shadow-lg animate-fade-in"
          title={isPlaying ? "Mute musik" : "Mainkan musik"}
        >
          {isPlaying ? (
            <Volume2 className="w-5 h-5 text-primary" />
          ) : (
            <VolumeX className="w-5 h-5 text-muted-foreground" />
          )}
        </Button>
      )}
    </>
  );
};
