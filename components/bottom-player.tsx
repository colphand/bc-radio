"use client"

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBandcampData } from '@/hooks/useBandcampData';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useTrackActions } from '@/hooks/useTrackActions';
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
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

    // Get parameters from URL or props
    const username = propUsername || searchParams.get('username') || '';
    const numberToLoad = propNumberToLoad || parseInt(searchParams.get('history') || '0');
    const identityCookie = propIdentityCookie || searchParams.get('identity') || '';
    const playlistFilterItems = propPlaylistFilterItems || (searchParams.get('pl')?.split(',') || null);

    // Custom hooks for different responsibilities
    const { loading } = useBandcampData({
        username,
        numberToLoad,
        identityCookie,
        playlistFilterItems
    });

    const { tracks, handleSkip, handleTogglePlaylist, handleTrackEnd } = useTrackActions();

    const {
        isPlaying,
        currentTime,
        duration,
        volume,
        currentTrack,
        audioRef,
        playTrack,
        handlePlayPause,
        handleNext,
        handlePrev,
        handleSeek,
        handleVolumeChange,
        formatTime
    } = useAudioPlayer({
        tracks,
        currentTrackIndex,
        setCurrentTrackIndex,
        onTrackEnd: () => handleTrackEnd(currentTrackIndex, setCurrentTrackIndex, playTrack)
    });

    // Handle track skip with confirmation
    const onSkip = () => {
        handleSkip(currentTrack, handleNext);
    };

    // Handle playlist toggle
    const onTogglePlaylist = () => {
        handleTogglePlaylist(currentTrack);
    };

    return (
        <>
            <audio ref={audioRef} />
            <div className="bg-sidebar/95 backdrop-blur supports-backdrop-filter:bg-sidebar/80 border-t border-border p-4 z-50 sticky bottom-0 left-0 right-0">
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
                                onClick={onSkip}
                                disabled={!currentTrack}
                                title="Skip album"
                            >
                                <X className="h-4 w-4" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={onTogglePlaylist}
                                disabled={!currentTrack}
                                title="Add to playlist"
                            >
                                <ListPlus className="h-4 w-4" />
                            </Button>

                            {tracks.length > 0 && (
                                <span className="text-xs text-muted-foreground ml-2">
                                    {tracks.length} tracks
                                </span>
                            )}
                        </div>                        {/* Progress Bar */}
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