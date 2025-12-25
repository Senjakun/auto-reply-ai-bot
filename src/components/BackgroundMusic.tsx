import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_MUSIC_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

export const BackgroundMusic = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [musicUrl, setMusicUrl] = useState(DEFAULT_MUSIC_URL);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Fetch music settings from admin
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
          if (typeof settingValue.music_enabled === 'boolean') {
            setMusicEnabled(settingValue.music_enabled);
          }
        }
      } catch (err) {
        console.error('Error fetching music settings:', err);
      }
    };

    fetchMusicSettings();
  }, []);

  // Auto-play when user interacts with the page (browser requirement)
  useEffect(() => {
    if (!musicEnabled || hasInteracted) return;

    const handleInteraction = () => {
      if (audioRef.current && musicEnabled) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(console.error);
      }
      setHasInteracted(true);
    };

    document.addEventListener('click', handleInteraction, { once: true });
    document.addEventListener('keydown', handleInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, [musicEnabled, hasInteracted]);

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

  // Don't render anything if music is disabled by admin
  if (!musicEnabled) return null;

  return (
    <>
      <audio ref={audioRef} src={musicUrl} loop preload="auto" />
      
      {/* Floating music control button */}
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
    </>
  );
};
