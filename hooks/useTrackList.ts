import { useState, useCallback } from 'react';
import { Track } from '@/types/bandcamp';

export function useTrackList() {
  const [tracks, setTracks] = useState<Track[]>([]);

  const addTrack = useCallback((track: Track) => {
    setTracks(prev => [...prev, track]);
  }, []);

  const sortTracks = useCallback((mode: 'shuffle' | 'alphabetic' | 'recent') => {
    setTracks(prev => {
      const copy = [...prev];
      
      switch (mode) {
        case 'shuffle':
          // Fisher-Yates shuffle
          for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
          }
          break;
        case 'alphabetic':
          copy.sort((a, b) =>
            a.artist.localeCompare(b.artist, 'en', { sensitivity: 'base' }) ||
            a.title.localeCompare(b.title, 'en', { sensitivity: 'base' })
          );
          break;
        case 'recent':
          copy.sort((a, b) => a.recent - b.recent);
          break;
      }
      
      return copy;
    });
  }, []);

  const skipTrack = useCallback((itemId: string, skip: boolean) => {
    setTracks(prev =>
      prev.map(track =>
        track.itemId === itemId
          ? { ...track, isSkipped: skip, isPlayed: skip }
          : track
      )
    );
  }, []);

  const togglePlaylistTrack = useCallback((itemId: string, inPlaylist: boolean) => {
    setTracks(prev =>
      prev.map(track =>
        track.itemId === itemId
          ? { ...track, isPlaylist: inPlaylist }
          : track
      )
    );
  }, []);

  const markPlayed = useCallback((index: number) => {
    setTracks(prev =>
      prev.map((track, i) =>
        i === index ? { ...track, isPlayed: true } : track
      )
    );
  }, []);

  const getNextUnplayedIndex = useCallback((startFrom: number): number | null => {
    for (let i = startFrom; i < tracks.length; i++) {
      if (!tracks[i].isPlayed) {
        return i;
      }
    }
    
    // No unplayed tracks, reset all
    setTracks(prev =>
      prev.map(track => ({ ...track, isPlayed: track.isSkipped }))
    );
    
    return null;
  }, [tracks]);

  return {
    tracks,
    addTrack,
    sortTracks,
    skipTrack,
    togglePlaylistTrack,
    markPlayed,
    getNextUnplayedIndex,
  };
}
