"use client"

import { useEffect } from 'react';
import { usePlayer } from '@/contexts/PlayerContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import Image from 'next/image';

export function BottomPlayer() {
    const {
        playerState,
        setPlayerState,
        audioRef,
        pauseTrack,
        resumeTrack,
        setVolume,
        seekTo
    } = usePlayer();

    const { currentTrack, isPlaying, isLoading, currentTime, duration, volume } = playerState;

    useEffect(() => {
        if (!audioRef.current) return;

        const audio = audioRef.current;

        const updateTime = () => setPlayerState({ currentTime: audio.currentTime });
        const updateDuration = () => setPlayerState({ duration: audio.duration });
        const handleEnded = () => setPlayerState({ isPlaying: false });

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [audioRef, setPlayerState]);

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
        }
    };

    const handleSeek = (value: number[]) => {
        seekTo(value[0]);
    };

    const handleVolumeChange = (value: number[]) => {
        setVolume(value[0]);
    };

    if (!currentTrack) {
        return null;
    }

    return (
        <>
            <audio ref={audioRef} />
            <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-t border-border/40 p-4 z-50">
                <div className="flex items-center gap-4 max-w-screen-2xl mx-auto">
                    {/* Album Art & Track Info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative w-12 h-12 bg-muted rounded-md overflow-hidden shrink-0">
                            {isLoading ? (
                                <Skeleton className="w-full h-full" />
                            ) : currentTrack.artId ? (
                                <Image
                                    src={`https://f4.bcbits.com/img/a${currentTrack.artId}_1.jpg`}
                                    alt="Album art"
                                    fill
                                    className="object-cover"
                                    sizes="48px"
                                />
                            ) : (
                                <div className="w-full h-full bg-muted flex items-center justify-center">
                                    <Play className="w-4 h-4 text-muted-foreground" />
                                </div>
                            )}
                        </div>

                        <div className="min-w-0 flex-1">
                            {isLoading ? (
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="h-3 w-32" />
                                </div>
                            ) : (
                                <div className="min-w-0">
                                    <div className="font-medium text-sm truncate">
                                        {currentTrack.title}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                        {currentTrack.artist}
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
                                disabled={isLoading}
                            >
                                <SkipBack className="h-4 w-4" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10"
                                onClick={handlePlayPause}
                                disabled={isLoading}
                            >
                                {isLoading ? (
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
                                disabled={isLoading}
                            >
                                <SkipForward className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Progress Bar */}
                        <div className="flex items-center gap-2 w-full">
                            <span className="text-xs text-muted-foreground w-10 text-right">
                                {formatTime(currentTime)}
                            </span>
                            <Slider
                                value={[currentTime]}
                                max={duration || 100}
                                step={1}
                                onValueChange={handleSeek}
                                className="flex-1"
                                disabled={isLoading || !duration}
                            />
                            <span className="text-xs text-muted-foreground w-10">
                                {formatTime(duration)}
                            </span>
                        </div>
                    </div>

                    {/* Volume Control */}
                    <div className="flex items-center gap-2 min-w-0 w-32">
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