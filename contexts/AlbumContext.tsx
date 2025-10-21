"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Album {
    id: string;
    title: string;
    artist?: string;
    artId?: string;
    itemUrl?: string;
}

interface AlbumContextType {
    albums: Album[];
    setAlbums: (albums: Album[]) => void;
    currentUser: string;
    setCurrentUser: (user: string) => void;
}

const AlbumContext = createContext<AlbumContextType | undefined>(undefined);

export function AlbumProvider({ children }: { children: ReactNode }) {
    const [albums, setAlbums] = useState<Album[]>([]);
    const [currentUser, setCurrentUser] = useState<string>('');

    return (
        <AlbumContext.Provider value={{
            albums,
            setAlbums,
            currentUser,
            setCurrentUser
        }}>
            {children}
        </AlbumContext.Provider>
    );
}

export function useAlbums() {
    const context = useContext(AlbumContext);
    if (context === undefined) {
        throw new Error('useAlbums must be used within an AlbumProvider');
    }
    return context;
}

export type { Album };