"use client"

import { useState, useEffect } from 'react';
import { BandcampDataBlob, MoreDataResponse, ItemInfo, Track } from '@/types/bandcamp';
import { useTrackList } from '@/hooks/useTrackList';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAlbums } from '@/contexts/AlbumContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { Card, CardContent } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CollectionPlayerProps {
    username: string;
    numberToLoad: number;
    identityCookie: string;
    playlistName: string | null;
    playlistFilterItems: string[] | null;
}

export function CollectionPlayer({
    username,
    numberToLoad,
    identityCookie,
    playlistName,
    playlistFilterItems,
}: CollectionPlayerProps) {
    const [loading, setLoading] = useState(true);
    const [fanName, setFanName] = useState('');
    const [cookied, setCookied] = useState<boolean | null>(null);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [sequencing, setSequencing] = useState<'shuffle' | 'alphabetic'>('shuffle');

    const { setAlbums, setCurrentUser } = useAlbums();
    const { playTrack } = usePlayer();

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

    // Auto-play current track when it changes
    useEffect(() => {
        if (tracks.length > 0 && tracks[currentTrackIndex]) {
            playTrack(tracks[currentTrackIndex]);
        }
    }, [currentTrackIndex, tracks, playTrack]);

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
        }
    };

    const handleNext = () => {
        markPlayed(currentTrackIndex);
        const nextIndex = getNextUnplayedIndex(currentTrackIndex + 1);
        if (nextIndex !== null) {
            setCurrentTrackIndex(nextIndex);
        } else {
            // All tracks played, re-shuffle
            resequence();
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
            <div className="container mx-auto p-6 max-w-4xl space-y-6">
                <div className="text-center space-y-4">
                    <Skeleton className="h-8 w-64 mx-auto" />
                    <Skeleton className="h-4 w-48 mx-auto" />
                </div>

                <Card>
                    <CardContent className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-6 w-32" />
                            <div className="flex gap-2">
                                <Skeleton className="h-9 w-20" />
                                <Skeleton className="h-9 w-24" />
                            </div>
                        </div>
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    const currentTrack = tracks[currentTrackIndex];
    const collectionTitle = playlistName || `${fanName}'s collection`;
    const cookieStatus = cookied === true ? ' (cookied)' : cookied === false ? ' (invalid cookie)' : '';

    return (
        <div className="container mx-auto p-6 max-w-4xl space-y-6">
            {/* Collection Header */}
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold">
                    {collectionTitle}{cookieStatus}
                </h1>
                {currentTrack && (
                    <p className="text-lg text-muted-foreground">
                        Now Playing: <span className="font-medium">{currentTrack.artist} - {currentTrack.title}</span>
                    </p>
                )}
            </div>

            {/* Track Selection & Controls */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <h2 className="text-xl font-semibold">Track Selection</h2>
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
                                    }
                                }
                            }}
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

                    <p className="text-xs text-muted-foreground mt-4">
                        Music controls are available in the bottom player. {' '}
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
    );
}