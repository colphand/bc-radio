"use client"

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAlbums, Album } from '@/contexts/AlbumContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Play, Search } from 'lucide-react';

export default function CollectionPage() {
    const { albums } = useAlbums();
    const [searchQuery, setSearchQuery] = useState('');
    const searchParams = useSearchParams();

    // Filter albums based on search query
    const filteredAlbums = albums.filter((album: Album) =>
        album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (album.artist && album.artist.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleAlbumClick = (album: Album) => {
        // Navigate to homepage with album as playlist filter
        const params = new URLSearchParams({
            username: searchParams.get('username') || '',
            history: searchParams.get('history') || '200',
            identity: searchParams.get('identity') || '',
            plname: `${album.artist} - ${album.title}`,
            pl: album.id,
        });

        window.location.href = `/?${params.toString()}`;
    };

    const handlePlayAll = () => {
        // Navigate to homepage with all albums
        const params = new URLSearchParams({
            username: searchParams.get('username') || '',
            history: searchParams.get('history') || '200',
            identity: searchParams.get('identity') || '',
        });

        window.location.href = `/?${params.toString()}`;
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Your Collection</h1>
                    <p className="text-muted-foreground">
                        {filteredAlbums.length} album{filteredAlbums.length !== 1 ? 's' : ''}
                        {searchQuery && ` matching "${searchQuery}"`}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                            placeholder="Search albums..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 w-64"
                        />
                    </div>

                    {albums.length > 0 && (
                        <Button onClick={handlePlayAll} className="shrink-0">
                            <Play className="h-4 w-4 mr-2" />
                            Play All
                        </Button>
                    )}
                </div>
            </div>

            {/* Albums Grid */}
            {albums.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">
                        No albums loaded yet. Enter your Bandcamp username on the{' '}
                        <Link href="/" className="text-primary hover:underline">
                            homepage
                        </Link>{' '}
                        to load your collection.
                    </p>
                </div>
            ) : filteredAlbums.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">
                        No albums match your search &quot;{searchQuery}&quot;.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredAlbums.map((album: Album) => (
                        <Card
                            key={album.id}
                            className="group cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                            onClick={() => handleAlbumClick(album)}
                        >
                            <CardContent className="p-3">
                                <div className="relative aspect-square mb-3 bg-muted rounded-md overflow-hidden">
                                    {album.artId ? (
                                        <Image
                                            src={`https://f4.bcbits.com/img/a${album.artId}_1.jpg`}
                                            alt={`${album.title} artwork`}
                                            fill
                                            className="object-cover transition-transform group-hover:scale-110"
                                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-muted flex items-center justify-center">
                                            <Play className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                    )}

                                    {/* Play overlay */}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
                                        <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <h3 className="font-medium text-sm line-clamp-2 leading-tight">
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
        </div>
    );
}