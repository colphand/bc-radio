import { useState, useEffect, useRef, useCallback } from 'react';
import { Track } from '@/types/bandcamp';

interface UseAudioPlayerProps {
  tracks: Track[];
  currentTrackIndex: number;
  setCurrentTrackIndex: (index: number) => void;
  onTrackEnd?: () => void;
}

export function useAudioPlayer({
  tracks,
  currentTrackIndex,
  setCurrentTrackIndex,
  onTrackEnd
}: UseAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const currentTrack = tracks[currentTrackIndex];

  // Audio event handlers
  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    const updateTime = () => {
      if (!isNaN(audio.currentTime)) {
        setCurrentTime(audio.currentTime);
      }
    };

    const updateDuration = () => {
      if (!isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const handleLoadedData = () => {
      if (!isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onTrackEnd?.();
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrackIndex, onTrackEnd]);

  const playTrack = useCallback((index: number) => {
    if (audioRef.current && tracks[index]) {
      // Reset time and duration for new track
      setCurrentTime(0);
      setDuration(0);

      audioRef.current.src = tracks[index].songUrl;
      audioRef.current.load();
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(console.error);
    }
  }, [tracks]);

  const pauseTrack = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const resumeTrack = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(console.error);
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pauseTrack();
    } else if (currentTrack) {
      resumeTrack();
    } else if (tracks.length > 0) {
      setCurrentTrackIndex(0);
      playTrack(0);
    }
  }, [isPlaying, currentTrack, tracks.length, pauseTrack, resumeTrack, setCurrentTrackIndex, playTrack]);

  const handleNext = useCallback(() => {
    if (currentTrackIndex < tracks.length - 1) {
      const nextIndex = currentTrackIndex + 1;
      setCurrentTrackIndex(nextIndex);
      playTrack(nextIndex);
    }
  }, [currentTrackIndex, tracks.length, setCurrentTrackIndex, playTrack]);

  const handlePrev = useCallback(() => {
    if (currentTrackIndex > 0) {
      const prevIndex = currentTrackIndex - 1;
      setCurrentTrackIndex(prevIndex);
      playTrack(prevIndex);
    }
  }, [currentTrackIndex, setCurrentTrackIndex, playTrack]);

  const handleSeek = useCallback((value: number[]) => {
    seekTo(value[0]);
  }, [seekTo]);

  const handleVolumeChange = useCallback((value: number[]) => {
    setVolume(value[0]);
    if (audioRef.current) {
      audioRef.current.volume = value[0];
    }
  }, []);

  const formatTime = useCallback((time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    // State
    isPlaying,
    currentTime,
    duration,
    volume,
    currentTrack,
    audioRef,
    
    // Actions
    playTrack,
    pauseTrack,
    resumeTrack,
    seekTo,
    handlePlayPause,
    handleNext,
    handlePrev,
    handleSeek,
    handleVolumeChange,
    
    // Utilities
    formatTime
  };
}