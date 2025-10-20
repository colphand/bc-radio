'use client';

import { useState, useEffect, useRef } from 'react';
import { BandcampDataBlob, MoreDataResponse, ItemInfo } from '@/types/bandcamp';
import { useTrackList } from '@/hooks/useTrackList';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import Image from 'next/image';

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
    const [isPlaying, setIsPlaying] = useState(false);
    const [sequencing, setSequencing] = useState<'shuffle' | 'alphabetic'>('shuffle');

    const audioRef = useRef<HTMLAudioElement>(null);

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

            // Extract tracks
            Object.entries(data.tracklists.collection).forEach(([albumKey, songs]) => {
                const itemId = albumKey.substring(1); // Remove 'a' prefix

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
            setIsPlaying(true);
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

    const handleTogglePause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.play();
                setIsPlaying(true);
            }
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
            <div id="loading">
                <div id="loading-image">Loading...</div>
            </div>
        );
    }

    const currentTrack = tracks[currentTrackIndex];
    const collectionTitle = playlistName || `${fanName}'s collection`;
    const cookieStatus = cookied === true ? ' (cookied)' : cookied === false ? ' (invalid cookie)' : '';

    return (
        <div id="player-container">
            <div id="player">
                <div id="art-container">
                    {currentTrack?.artId && (
                        <Image
                            id="album-art"
                            src={`https://f4.bcbits.com/img/a${currentTrack.artId}_10.jpg`}
                            alt="Album art"
                            width={800}
                            height={800}
                            priority
                            unoptimized
                        />
                    )}
                </div>

                <div id="not-art">
                    <div id="audio-controls">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            className="prev-next"
                            src="/images/prev-outline.png"
                            alt="prev"
                            width={30}
                            height={38}
                            onClick={handlePrev}
                        />
                        <audio
                            ref={audioRef}
                            id="current-song"
                            controls
                            preload="none"
                            onEnded={handleNext}
                        />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            className="prev-next"
                            src="/images/next-outline.png"
                            alt="next"
                            width={30}
                            height={38}
                            onClick={handleNext}
                        />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            className="prev-next"
                            src="/images/delete.png"
                            alt="skip"
                            width={30}
                            height={30}
                            onClick={handleSkip}
                        />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            className="prev-next"
                            src="/images/playlist.png"
                            alt="add to playlist"
                            width={30}
                            height={30}
                            onClick={handleTogglePlaylist}
                        />
                    </div>

                    <a href={currentTrack?.itemUrl} id="song-title" target="_blank" rel="noopener noreferrer">
                        {currentTrack && `${currentTrack.artist}: ${currentTrack.title}`}
                    </a>

                    <div id="list-title">
                        <span id="collection-title">
                            {collectionTitle}{cookieStatus}
                        </span>
                        <div id="sort-controls">
                            <input
                                type="radio"
                                id="radio-shuffle"
                                name="sequencing"
                                value="shuffle"
                                checked={sequencing === 'shuffle'}
                                onChange={() => {
                                    setSequencing('shuffle');
                                    resequence();
                                }}
                            />
                            <label className="sort-label" htmlFor="radio-shuffle">Shuffle</label>
                            <input
                                type="radio"
                                id="radio-alphabetic"
                                name="sequencing"
                                value="alphabetic"
                                checked={sequencing === 'alphabetic'}
                                onChange={() => {
                                    setSequencing('alphabetic');
                                    resequence();
                                }}
                            />
                            <label className="sort-label" htmlFor="radio-alphabetic">Alphabetic</label>
                        </div>
                    </div>

                    <select id="collection-list" size={3} value={currentTrackIndex} onChange={(e) => {
                        const index = parseInt(e.target.value);
                        setCurrentTrackIndex(index);
                        playTrack(index);
                    }}>
                        {tracks.map((track: any, index: number) => (
                            <option
                                key={index}
                                value={index}
                                className={track.isSkipped ? 'skippedTrack' : track.isPlayed ? 'playedTrack' : ''}
                            >
                                {track.isPlaylist && '✅ '}
                                {track.artist}: {track.title}
                            </option>
                        ))}
                    </select>

                    <p id="help2">
                        Bandcamp Collection Player.{' '}
                        <a href="https://github.com/ralphgonz/bcradio" target="_blank" rel="noopener noreferrer">
                            Help & source
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
