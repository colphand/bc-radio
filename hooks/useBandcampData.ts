import { useState, useEffect } from 'react';
import { BandcampDataBlob, MoreDataResponse, ItemInfo } from '@/types/bandcamp';
import { useTrackList } from './useTrackList';
import { useLocalStorage } from './useLocalStorage';
import { useAlbums } from '@/contexts/AlbumContext';

interface UseBandcampDataProps {
  username: string;
  numberToLoad: number;
  identityCookie: string;
  playlistFilterItems: string[] | null;
}

export function useBandcampData({
  username,
  numberToLoad,
  identityCookie,
  playlistFilterItems
}: UseBandcampDataProps) {
  const [loading, setLoading] = useState(false);
  const [collectionStats, setCollectionStats] = useState<{total: number, loaded: number} | null>(null);
  
  const { addTrack } = useTrackList();
  const { setAlbums, setCurrentUser } = useAlbums();
  const [skipItems] = useLocalStorage<string[]>('skipItems', []);
  const [playlistItems] = useLocalStorage<string[]>('playlistItems', []);

  const loadUserData = async () => {
    if (!username) return;

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
      console.log('🎵 Parsed Bandcamp data');
      console.log('👤 Fan name:', data.fan_data?.name);
      console.log('🔐 Identity data:', data.identities?.fan ? 'AUTHENTICATED' : 'NOT AUTHENTICATED');

      const collectionCount = Object.keys(data.item_cache.collection).length;
      const tracklistCount = Object.keys(data.tracklists.collection).length;
      console.log('📀 Collection items found:', collectionCount);
      console.log('🎵 Tracklists found:', tracklistCount);

      // Log collection pagination details
      console.log('📊 Collection pagination info:', {
        totalItems: data.collection_data?.item_count,
        batchSize: data.collection_data?.batch_size,
        lastToken: data.collection_data?.last_token,
        sequence: data.collection_data?.sequence,
        smallCollection: data.collection_data?.small_collection
      });

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

      // Extract albums with track counts
      const albumsMap = new Map<string, { id: string; title: string; artist?: string; artId?: string; itemUrl?: string; trackCount?: number }>();

      // Process tracklists
      Object.entries(data.tracklists.collection).forEach(([albumKey, songs]) => {
        const itemId = albumKey.substring(1); // Remove 'a' prefix

        if (playlistFilterItems && !playlistFilterItems.includes(itemId)) {
          return;
        }

        // Count valid tracks for this album
        const validTracks = songs.filter(track => {
          const file = track.file['mp3-v0'] || track.file['mp3-128'];
          return file && itemInfos[itemId];
        });

        // Create album entry
        if (songs.length > 0 && itemInfos[itemId] && !albumsMap.has(itemId)) {
          const firstTrack = songs[0];
          albumsMap.set(itemId, {
            id: itemId,
            title: firstTrack.artist || 'Unknown Album',
            artist: firstTrack.artist,
            artId: itemInfos[itemId].artId,
            itemUrl: itemInfos[itemId].itemUrl,
            trackCount: validTracks.length,
          });
        }

        // Add tracks
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

      // Load more data if needed
      if (numberToLoad > 0) {
        await loadMoreData(data.fan_data.fan_id, data.collection_data.last_token);
      }

      // Update context
      const finalAlbums = Array.from(albumsMap.values());
      console.log(`✅ Final album count: ${finalAlbums.length}`);
      setAlbums(finalAlbums);
      setCurrentUser(username);

      // Set collection stats
      const totalItems = data.collection_data?.item_count || 0;
      const currentItems = Object.keys(data.tracklists.collection).length;
      setCollectionStats({ total: totalItems, loaded: currentItems });

      // Log summary
      console.log(`📊 Collection summary:`, {
        currentlyLoaded: currentItems,
        totalAvailable: totalItems,
        hasMoreData: totalItems > currentItems,
        percentLoaded: Math.round((currentItems / totalItems) * 100) + '%'
      });

    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreData = async (fanId: number, olderThanToken: string, customCount?: number) => {
    try {
      const countToUse = customCount || numberToLoad;
      console.log(`🔄 Loading more data: ${countToUse} items for fanId:`, fanId);

      let url = `/api/moredata?fan-id=${fanId}&older-than-token=${olderThanToken}&count=${countToUse}`;
      if (identityCookie) {
        url += `&identity-cookie=${encodeURIComponent(identityCookie)}`;
      }

      const response = await fetch(url);
      console.log('📡 More data response status:', response.status);
      const data: MoreDataResponse = await response.json();
      console.log('📥 More data received:', {
        itemsCount: data.items?.length || 0,
        tracklistsCount: Object.keys(data.tracklists || {}).length
      });

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

  // Auto-load data when dependencies change
  useEffect(() => {
    if (username) {
      loadUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, numberToLoad, identityCookie]);

  return {
    loading,
    collectionStats,
    loadUserData,
    loadMoreData
  };
}