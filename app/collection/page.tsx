"use client"

import { useState } from 'react';
import { useAlbums } from '@/contexts/AlbumContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BCSidebar } from '@/components/bc-sidebar';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import Image from 'next/image';
import Link from 'next/link';
import { Search } from 'lucide-react';

interface Album {
    id: string;
    title: string;
    artist?: string;
    artId?: string;
    itemUrl?: string;
}

export default function CollectionPage() {
    const { albums, currentUser } = useAlbums();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredAlbums = albums.filter(album =>
        album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (album.artist && album.artist.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleAlbumClick = (album: Album) => {
        if (album.itemUrl) {
            window.open(album.itemUrl, '_blank');
        }
    };

    return (
        <>
            <BCSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b">
                    <SidebarTrigger className="-ml-1" />
                    <div className="flex flex-1 items-center gap-2">
                        <h1 className="text-lg font-semibold">Collection</h1>
                        {currentUser && (
                            <span className="text-sm text-muted-foreground">({currentUser})</span>
                        )}
                    </div>
                </header>

                <div className="flex-1 space-y-4 p-4 pt-6">
                    {albums.length === 0 ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center space-y-2">
                                <h2 className="text-xl font-semibold text-muted-foreground">No Collection Loaded</h2>
                                <p className="text-sm text-muted-foreground">
                                    <Link href="/" className="text-primary hover:underline">
                                        Go to the homepage
                                    </Link> and load a Bandcamp collection to see albums here.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold">
                                        {currentUser ? `${currentUser}'s Collection` : 'Your Collection'}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        {filteredAlbums.length} of {albums.length} album{albums.length !== 1 ? 's' : ''}
                                    </p>
                                </div>

                                <div className="relative max-w-md">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Search albums and artists..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            {filteredAlbums.length === 0 && searchQuery ? (
                                <div className="col-span-full flex items-center justify-center py-12">
                                    <div className="text-center space-y-2">
                                        <h3 className="text-lg font-medium text-muted-foreground">No albums found</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Try adjusting your search terms
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                                    {filteredAlbums.map((album) => (
                                        <Card
                                            key={album.id}
                                            className="group cursor-pointer hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5 transition-all duration-200 border-border/50"
                                            onClick={() => handleAlbumClick(album)}
                                        >
                                            <CardContent className="p-3">
                                                <div className="aspect-square relative overflow-hidden rounded-lg bg-muted/50 mb-3">
                                                    {album.artId ? (
                                                        <Image
                                                            src={`https://f4.bcbits.com/img/a${album.artId}_1.jpg`}
                                                            alt={album.title}
                                                            fill
                                                            className="object-cover transition-transform group-hover:scale-[1.02] duration-300"
                                                            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, (max-width: 1536px) 20vw, 16.666vw"
                                                        />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                                            <svg
                                                                className="h-8 w-8"
                                                                fill="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-1">
                                                    <h3 className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                                                        {album.title}
                                                    </h3>
                                                    {album.artist && (
                                                        <p className="text-xs text-muted-foreground line-clamp-1">
                                                            {album.artist}
                                                        </p>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </SidebarInset>
        </>
    );
}
