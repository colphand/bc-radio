"use client"

import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { Track } from '@/types/bandcamp';

interface PlayerState {
    currentTrack: Track | null;
    isPlaying: boolean;
    isLoading: boolean;
    currentTime: number;
    duration: number;
    volume: number;
}

interface PlayerContextType {
    playerState: PlayerState;
    setPlayerState: (state: Partial<PlayerState>) => void;
    audioRef: React.RefObject<HTMLAudioElement | null>;
    playTrack: (track: Track) => void;
    pauseTrack: () => void;
    resumeTrack: () => void;
    setVolume: (volume: number) => void;
    seekTo: (time: number) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
    const [playerState, setPlayerStateInternal] = useState<PlayerState>({
        currentTrack: null,
        isPlaying: false,
        isLoading: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
    });

    const audioRef = useRef<HTMLAudioElement>(null);

    const setPlayerState = (newState: Partial<PlayerState>) => {
        setPlayerStateInternal(prev => ({ ...prev, ...newState }));
    };

    const playTrack = (track: Track) => {
        if (audioRef.current) {
            setPlayerState({ currentTrack: track, isLoading: true });
            audioRef.current.src = track.songUrl;
            audioRef.current.load();
            audioRef.current.play().then(() => {
                setPlayerState({ isPlaying: true, isLoading: false });
            }).catch(() => {
                setPlayerState({ isLoading: false });
            });
        }
    };

    const pauseTrack = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            setPlayerState({ isPlaying: false });
        }
    };

    const resumeTrack = () => {
        if (audioRef.current) {
            audioRef.current.play().then(() => {
                setPlayerState({ isPlaying: true });
            });
        }
    };

    const setVolume = (volume: number) => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
            setPlayerState({ volume });
        }
    };

    const seekTo = (time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setPlayerState({ currentTime: time });
        }
    };

    return (
        <PlayerContext.Provider value={{
            playerState,
            setPlayerState,
            audioRef,
            playTrack,
            pauseTrack,
            resumeTrack,
            setVolume,
            seekTo,
        }}>
            {children}
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    const context = useContext(PlayerContext);
    if (context === undefined) {
        throw new Error('usePlayer must be used within a PlayerProvider');
    }
    return context;
}