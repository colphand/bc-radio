'use client';

import { useState, useEffect, useRef } from 'react';
import { BandcampDataBlob, MoreDataResponse, ItemInfo, Track } from '@/types/bandcamp';
import { useTrackList } from '@/hooks/useTrackList';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAlbums } from '@/contexts/AlbumContext';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SkipBack, SkipForward, X, ListPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayerProps {
    username: string;
    numberToLoad: number;
    identityCookie: string;
    playlistName: string | null;
    playlistFilterItems: string[] | null;
}

export default function Player({
    username,
    numberToLoad,
    identityCookie,
    playlistName,
    playlistFilterItems,
}: PlayerProps) {
    const [loading, setLoading] = useState(true);
    const [fanName, setFanName] = useState('');
    const [cookied, setCookied] = useState<boolean | null>(null);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [sequencing, setSequencing] = useState<'shuffle' | 'alphabetic'>('shuffle');

    const audioRef = useRef<HTMLAudioElement>(null);
    const { setAlbums, setCurrentUser } = useAlbums();

    const {
        tracks,
        addTrack,
        sortTracks,
        skipTrack,
        togglePlaylistTrack,
        getNextUnplayedIndex,
        markPlayed,
    } = useTrackList();

    const [skipItems, setSkipItems] = useLocalStorage<string[]>('skipItems', []);
    const [playlistItems, setPlaylistItems] = useLocalStorage<string[]>('playlistItems', []);

    // Load user data
    useEffect(() => {
        loadUserData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

            setFanName(data.fan_data.name);

            if (identityCookie) {
                setCookied(!!data.identities.fan);
            }

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

            // Update context with albums and user
            setAlbums(Array.from(albumsMap.values()));
            setCurrentUser(username);

            // Load more data
            if (numberToLoad > 0) {
                await loadMoreData(data.fan_data.fan_id, data.collection_data.last_token);
            }

            setLoading(false);

            // Start playing
            resequence();
        } catch (error) {
            console.error('Error loading user data:', error);
            alert('Failed to load user data');
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

    const resequence = () => {
        sortTracks(sequencing);
        const nextIndex = getNextUnplayedIndex(0);
        if (nextIndex !== null) {
            setCurrentTrackIndex(nextIndex);
            playTrack(nextIndex);
        }
    };

    const playTrack = (index: number) => {
        if (audioRef.current && tracks[index]) {
            audioRef.current.src = tracks[index].songUrl;
            audioRef.current.load();
            audioRef.current.play();
        }
    };

    const handleNext = () => {
        markPlayed(currentTrackIndex);
        const nextIndex = getNextUnplayedIndex(currentTrackIndex + 1);
        if (nextIndex !== null) {
            setCurrentTrackIndex(nextIndex);
            playTrack(nextIndex);
        } else {
            // All tracks played, re-shuffle
            resequence();
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

    if (loading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="text-2xl font-semibold">Loading...</div>
                </div>
            </div>
        );
    }

    const currentTrack = tracks[currentTrackIndex];
    const collectionTitle = playlistName || `${fanName}'s collection`;
    const cookieStatus = cookied === true ? ' (cookied)' : cookied === false ? ' (invalid cookie)' : '';

    return (
        <div className="h-screen flex flex-col lg:flex-row">
            {/* Album Art */}
            <div className="shrink-0 lg:w-1/2 bg-black flex items-center justify-center">
                {currentTrack?.artId && (
                    <Image
                        src={`https://f4.bcbits.com/img/a${currentTrack.artId}_10.jpg`}
                        alt="Album art"
                        width={800}
                        height={800}
                        priority
                        unoptimized
                        className="w-full h-auto object-contain"
                    />
                )}
            </div>

            {/* Player Controls */}
            <div className="flex-1 flex flex-col p-6 space-y-4 overflow-hidden lg:min-w-[450px]">
                {/* Audio Controls */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handlePrev}
                        disabled={currentTrackIndex === 0}
                    >
                        <SkipBack className="h-4 w-4" />
                    </Button>
                    <audio
                        ref={audioRef}
                        controls
                        preload="none"
                        onEnded={handleNext}
                        className="flex-1"
                    />
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleNext}
                    >
                        <SkipForward className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleSkip}
                        title="Skip album"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleTogglePlaylist}
                        title="Add to playlist"
                    >
                        <ListPlus className="h-4 w-4" />
                    </Button>
                </div>

                {/* Song Title */}
                <a
                    href={currentTrack?.itemUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xl font-semibold text-center truncate hover:underline"
                >
                    {currentTrack && `${currentTrack.artist}: ${currentTrack.title}`}
                </a>

                {/* Collection Title & Sort Controls */}
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                            <span className="text-sm font-medium truncate">
                                {collectionTitle}{cookieStatus}
                            </span>
                            <ToggleGroup
                                type="single"
                                value={sequencing}
                                onValueChange={(value) => {
                                    if (value) {
                                        setSequencing(value as 'shuffle' | 'alphabetic');
                                        sortTracks(value as 'shuffle' | 'alphabetic');
                                        const nextIndex = getNextUnplayedIndex(0);
                                        if (nextIndex !== null) {
                                            setCurrentTrackIndex(nextIndex);
                                            playTrack(nextIndex);
                                        }
                                    }
                                }}
                                className="shrink-0"
                            >
                                <ToggleGroupItem value="shuffle" aria-label="Shuffle">
                                    Shuffle
                                </ToggleGroupItem>
                                <ToggleGroupItem value="alphabetic" aria-label="Alphabetic">
                                    Alphabetic
                                </ToggleGroupItem>
                            </ToggleGroup>
                        </div>

                        {/* Track List */}
                        <Select
                            value={currentTrackIndex.toString()}
                            onValueChange={(value) => {
                                const index = parseInt(value);
                                setCurrentTrackIndex(index);
                                playTrack(index);
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {tracks.map((track: Track, index: number) => (
                                    <SelectItem
                                        key={index}
                                        value={index.toString()}
                                        className={cn(
                                            track.isSkipped && "bg-yellow-100 dark:bg-yellow-900",
                                            track.isPlayed && !track.isSkipped && "bg-gray-100 dark:bg-gray-800"
                                        )}
                                    >
                                        {track.isPlaylist && '✅ '}
                                        {track.artist}: {track.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <p className="text-xs text-muted-foreground mt-3">
                            Bandcamp Collection Player.{' '}
                            <a
                                href="https://github.com/ralphgonz/bcradio"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                            >
                                Help & source
                            </a>
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
