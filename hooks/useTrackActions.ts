import { useCallback } from 'react';
import { Track } from '@/types/bandcamp';
import { useTrackList } from './useTrackList';
import { useLocalStorage } from './useLocalStorage';

export function useTrackActions() {
  const { tracks, skipTrack, togglePlaylistTrack, getNextUnplayedIndex, markPlayed } = useTrackList();
  const [skipItems, setSkipItems] = useLocalStorage<string[]>('skipItems', []);
  const [playlistItems, setPlaylistItems] = useLocalStorage<string[]>('playlistItems', []);

  const handleSkip = useCallback((track: Track, onNext?: () => void) => {
    if (!track) return;

    const isCurrentlySkipped = skipItems.includes(track.itemId);

    if (isCurrentlySkipped) {
      setSkipItems(skipItems.filter((id: string) => id !== track.itemId));
      skipTrack(track.itemId, false);
    } else {
      if (confirm(`Permanently skip this album by ${track.artist} on this browser?`)) {
        setSkipItems([...skipItems, track.itemId]);
        skipTrack(track.itemId, true);
        onNext?.();
      }
    }
  }, [skipItems, setSkipItems, skipTrack]);

  const handleTogglePlaylist = useCallback((track: Track) => {
    if (!track) return;

    const isInPlaylist = playlistItems.includes(track.itemId);

    if (isInPlaylist) {
      setPlaylistItems(playlistItems.filter((id: string) => id !== track.itemId));
      togglePlaylistTrack(track.itemId, false);
    } else {
      setPlaylistItems([...playlistItems, track.itemId]);
      togglePlaylistTrack(track.itemId, true);
    }
  }, [playlistItems, setPlaylistItems, togglePlaylistTrack]);

  const handleTrackEnd = useCallback((currentTrackIndex: number, setCurrentTrackIndex: (index: number) => void, playTrack: (index: number) => void) => {
    markPlayed(currentTrackIndex);
    const nextIndex = getNextUnplayedIndex(currentTrackIndex + 1);
    if (nextIndex !== null) {
      setCurrentTrackIndex(nextIndex);
      playTrack(nextIndex);
    }
  }, [markPlayed, getNextUnplayedIndex]);

  return {
    tracks,
    skipItems,
    playlistItems,
    handleSkip,
    handleTogglePlaylist,
    handleTrackEnd
  };
}