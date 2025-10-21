"use client"

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { BandcampDataBlob, MoreDataResponse, ItemInfo } from '@/types/bandcamp';
import { useTrackList } from '@/hooks/useTrackList';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAlbums } from '@/contexts/AlbumContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, Volume2, X, ListPlus } from 'lucide-react';
import Image from 'next/image';

interface BottomPlayerProps {
    username?: string;
    numberToLoad?: number;
    identityCookie?: string;
    playlistName?: string | null;
    playlistFilterItems?: string[] | null;
}

export function BottomPlayer({
    username: propUsername = '',
    numberToLoad: propNumberToLoad = 0,
    identityCookie: propIdentityCookie = '',
    playlistName: propPlaylistName = null,
    playlistFilterItems: propPlaylistFilterItems = null,
}: BottomPlayerProps = {}) {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);

    const audioRef = useRef<HTMLAudioElement>(null);

    // Get parameters from URL or props
    const username = propUsername || searchParams.get('username') || '';
    const numberToLoad = propNumberToLoad || parseInt(searchParams.get('history') || '0');
    const identityCookie = propIdentityCookie || searchParams.get('identity') || '';
    const playlistName = propPlaylistName || searchParams.get('plname');
    const playlistFilterItems = propPlaylistFilterItems || (searchParams.get('pl')?.split(',') || null);

    const {
        tracks,
        addTrack,
        sortTracks,
        skipTrack,
        togglePlaylistTrack,
        getNextUnplayedIndex,
        markPlayed,
    } = useTrackList();

    const { setAlbums, setCurrentUser } = useAlbums();

    const [skipItems, setSkipItems] = useLocalStorage<string[]>('skipItems', []);
    const [playlistItems, setPlaylistItems] = useLocalStorage<string[]>('playlistItems', []);

    const currentTrack = tracks[currentTrackIndex];

    const loadUserData = async () => {
        try {
            setLoading(true);

            let url = `/api/userdata/${username}`;
            if (identityCookie) {
                url += `?identity-cookie=${encodeURIComponent(identityCookie)}`;
            }

            const response = await fetch(url);
            const html = await response.text();

            // Parse the HTML to extract the data-blob
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const pagedata = doc.getElementById('pagedata');
            const dataBlob = pagedata?.getAttribute('data-blob');

            if (!dataBlob) {
                throw new Error('No data found');
            }

            const data: BandcampDataBlob = JSON.parse(dataBlob);

            // Extract track info
            const itemInfos: Record<string, ItemInfo> = {};
            Object.values(data.item_cache.collection).forEach(item => {
                if (item.item_id) {
                    itemInfos[item.item_id] = {
                        artId: item.item_art_id || '',
                        itemUrl: item.item_url || '',
                    };
                }
            });

            // Extract albums with better title/artist info from tracks
            const albumsMap = new Map<string, { id: string; title: string; artist?: string; artId?: string; itemUrl?: string }>();

            // Extract tracks
            Object.entries(data.tracklists.collection).forEach(([albumKey, songs]) => {
                const itemId = albumKey.substring(1); // Remove 'a' prefix

                if (playlistFilterItems && !playlistFilterItems.includes(itemId)) {
                    return;
                }

                // Get first track for album info
                if (songs.length > 0 && itemInfos[itemId] && !albumsMap.has(itemId)) {
                    const firstTrack = songs[0];
                    albumsMap.set(itemId, {
                        id: itemId,
                        title: firstTrack.artist || 'Unknown Album',
                        artist: firstTrack.artist,
                        artId: itemInfos[itemId].artId,
                        itemUrl: itemInfos[itemId].itemUrl,
                    });
                }

                songs.forEach((track, index) => {
                    const file = track.file['mp3-v0'] || track.file['mp3-128'];
                    if (file && itemInfos[itemId]) {
                        addTrack({
                            artist: track.artist,
                            title: track.title,
                            songUrl: file,
                            isPlayed: skipItems.includes(itemId),
                            isSkipped: skipItems.includes(itemId),
                            isPlaylist: playlistItems.includes(itemId),
                            recent: index,
                            artId: itemInfos[itemId].artId,
                            itemUrl: itemInfos[itemId].itemUrl,
                            itemId,
                        });
                    }
                });
            });

            // Load more data
            if (numberToLoad > 0) {
                await loadMoreData(data.fan_data.fan_id, data.collection_data.last_token);
            }

            // Update context with albums and user
            setAlbums(Array.from(albumsMap.values()));
            setCurrentUser(username);

            setLoading(false);

            // Start playing first track
            if (tracks.length > 0) {
                sortTracks('shuffle');
                const nextIndex = getNextUnplayedIndex(0);
                if (nextIndex !== null) {
                    setCurrentTrackIndex(nextIndex);
                    setTimeout(() => playTrack(nextIndex), 100); // Slight delay to ensure state is updated
                }
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            setLoading(false);
        }
    };

    const loadMoreData = async (fanId: number, olderThanToken: string) => {
        try {
            let url = `/api/moredata?fan-id=${fanId}&older-than-token=${olderThanToken}&count=${numberToLoad}`;
            if (identityCookie) {
                url += `&identity-cookie=${encodeURIComponent(identityCookie)}`;
            }

            const response = await fetch(url);
            const data: MoreDataResponse = await response.json();

            const itemInfos: Record<string, ItemInfo> = {};
            data.items.forEach(item => {
                if (item.item_id) {
                    itemInfos[item.item_id] = {
                        artId: item.item_art_id || '',
                        itemUrl: item.item_url || '',
                    };
                }
            });

            Object.entries(data.tracklists).forEach(([albumKey, songs]) => {
                const itemId = albumKey.substring(1);

                if (playlistFilterItems && !playlistFilterItems.includes(itemId)) {
                    return;
                }

                songs.forEach((track, index) => {
                    const file = track.file['mp3-v0'] || track.file['mp3-128'];
                    if (file && itemInfos[itemId]) {
                        addTrack({
                            artist: track.artist,
                            title: track.title,
                            songUrl: file,
                            isPlayed: skipItems.includes(itemId),
                            isSkipped: skipItems.includes(itemId),
                            isPlaylist: playlistItems.includes(itemId),
                            recent: index,
                            artId: itemInfos[itemId].artId,
                            itemUrl: itemInfos[itemId].itemUrl,
                            itemId,
                        });
                    }
                });
            });
        } catch (error) {
            console.error('Error loading more data:', error);
        }
    };

    // Load user data when parameters are available
    useEffect(() => {
        if (username) {
            loadUserData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [username, numberToLoad, identityCookie]);

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
                console.log('Duration updated:', audio.duration);
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
            handleNext();
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentTrackIndex]);

    const playTrack = (index: number) => {
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
    };

    const pauseTrack = () => {
        if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    };

    const resumeTrack = () => {
        if (audioRef.current && audioRef.current.paused) {
            audioRef.current.play().then(() => {
                setIsPlaying(true);
            }).catch(console.error);
        }
    };

    const seekTo = (time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const handleNext = () => {
        if (tracks.length === 0) return;
        markPlayed(currentTrackIndex);
        const nextIndex = getNextUnplayedIndex(currentTrackIndex + 1);
        if (nextIndex !== null) {
            setCurrentTrackIndex(nextIndex);
            playTrack(nextIndex);
        }
    };

    const handlePrev = () => {
        if (currentTrackIndex > 0) {
            const prevIndex = currentTrackIndex - 1;
            setCurrentTrackIndex(prevIndex);
            playTrack(prevIndex);
        }
    };

    const handleSkip = () => {
        const track = tracks[currentTrackIndex];
        if (!track) return;

        const isCurrentlySkipped = skipItems.includes(track.itemId);

        if (isCurrentlySkipped) {
            setSkipItems(skipItems.filter((id: string) => id !== track.itemId));
            skipTrack(track.itemId, false);
        } else {
            if (confirm(`Permanently skip this album by ${track.artist} on this browser?`)) {
                setSkipItems([...skipItems, track.itemId]);
                skipTrack(track.itemId, true);
                handleNext();
            }
        }
    };

    const handleTogglePlaylist = () => {
        const track = tracks[currentTrackIndex];
        if (!track) return;

        const isInPlaylist = playlistItems.includes(track.itemId);

        if (isInPlaylist) {
            setPlaylistItems(playlistItems.filter((id: string) => id !== track.itemId));
            togglePlaylistTrack(track.itemId, false);
        } else {
            setPlaylistItems([...playlistItems, track.itemId]);
            togglePlaylistTrack(track.itemId, true);
        }
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handlePlayPause = () => {
        if (isPlaying) {
            pauseTrack();
        } else if (currentTrack) {
            resumeTrack();
        } else if (tracks.length > 0) {
            setCurrentTrackIndex(0);
            playTrack(0);
        }
    };

    const handleSeek = (value: number[]) => {
        seekTo(value[0]);
    };

    const handleVolumeChange = (value: number[]) => {
        setVolume(value[0]);
        if (audioRef.current) {
            audioRef.current.volume = value[0];
        }
    };

    return (
        <>
            <audio ref={audioRef} />
            <div className="bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-t border-border/40 p-4 z-50 sticky bottom-0 left-0 right-0">
                {/* <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-t border-border/40 p-4 z-50"> */}
                <div className="grid grid-cols-3 items-center gap-4 max-w-screen-2xl mx-auto">
                    {/* Album Art & Track Info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative w-12 h-12 bg-muted rounded-md overflow-hidden shrink-0">
                            {loading ? (
                                <Skeleton className="w-full h-full" />
                            ) : currentTrack?.artId ? (
                                <Image
                                    src={`https://f4.bcbits.com/img/a${currentTrack.artId}_1.jpg`}
                                    alt="Album art"
                                    fill
                                    className="object-cover"
                                    sizes="48px"
                                    unoptimized
                                />
                            ) : (
                                <div className="w-full h-full bg-muted flex items-center justify-center">
                                    <Play className="w-4 h-4 text-muted-foreground" />
                                </div>
                            )}
                        </div>

                        <div className="min-w-0 flex-1">
                            {loading ? (
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="h-3 w-32" />
                                </div>
                            ) : currentTrack ? (
                                <div className="min-w-0">
                                    <div className="font-medium text-sm truncate">
                                        {currentTrack.title}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                        {currentTrack.artist}
                                    </div>
                                </div>
                            ) : (
                                <div className="min-w-0">
                                    <div className="font-medium text-sm truncate">
                                        No track selected
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                        Choose a song to start playing
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Player Controls */}
                    <div className="flex flex-col items-center gap-2 min-w-0 flex-1 max-w-md">
                        {/* Control Buttons */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handlePrev}
                                disabled={loading || currentTrackIndex <= 0}
                            >
                                <SkipBack className="h-4 w-4" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10"
                                onClick={handlePlayPause}
                                disabled={loading}
                            >
                                {loading ? (
                                    <Skeleton className="h-4 w-4 rounded" />
                                ) : isPlaying ? (
                                    <Pause className="h-5 w-5" />
                                ) : (
                                    <Play className="h-5 w-5" />
                                )}
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handleNext}
                                disabled={loading || tracks.length === 0}
                            >
                                <SkipForward className="h-4 w-4" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handleSkip}
                                disabled={!currentTrack}
                                title="Skip album"
                            >
                                <X className="h-4 w-4" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handleTogglePlaylist}
                                disabled={!currentTrack}
                                title="Add to playlist"
                            >
                                <ListPlus className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Progress Bar */}
                        <div className="flex items-center gap-2 w-full">
                            <span className="text-xs text-muted-foreground w-10 text-right">
                                {currentTrack ? formatTime(currentTime) : '0:00'}
                            </span>
                            <Slider
                                value={[currentTrack ? Math.floor(currentTime) : 0]}
                                max={currentTrack && duration > 0 ? Math.floor(duration) : 100}
                                step={1}
                                onValueChange={handleSeek}
                                className="flex-1"
                                disabled={loading || !currentTrack || !duration}
                            />
                            <span className="text-xs text-muted-foreground w-10">
                                {currentTrack ? formatTime(duration) : '0:00'}
                            </span>
                        </div>
                    </div>

                    {/* Volume Control */}
                    <div className="flex self-center place-self-end items-center gap-2 min-w-0 w-32">
                        <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Slider
                            value={[volume]}
                            max={1}
                            step={0.01}
                            onValueChange={handleVolumeChange}
                            className="flex-1"
                        />
                    </div>
                </div>
            </div>
        </>
    );
}