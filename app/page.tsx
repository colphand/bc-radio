'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAlbums, Album } from '@/contexts/AlbumContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { Play, Search, Download } from 'lucide-react';
import { BandcampDataBlob } from '@/types/bandcamp';

interface PlaylistItem {
  username: string;
  playlistName: string;
  url: string;
  history: number;
}

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { albums } = useAlbums();
  const [username, setUsername] = useState('');
  const [history, setHistory] = useState('200');
  const [identityCookie, setIdentityCookie] = useState('');
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [showPlayer, setShowPlayer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingAll, setLoadingAll] = useState(false);
  const [collectionStats, setCollectionStats] = useState<{ total: number, loaded: number } | null>(null);

  // Check if we're loading from URL params
  useEffect(() => {
    const urlUsername = searchParams.get('username');
    const urlHistory = searchParams.get('history');
    const urlIdentity = searchParams.get('identity');

    if (urlUsername) {
      setUsername(urlUsername);
      setHistory(urlHistory || '200');
      setIdentityCookie(urlIdentity || '');
      setShowPlayer(true);
    }
  }, [searchParams]);

  // Check collection stats when albums are loaded
  useEffect(() => {
    const checkCollectionStats = async () => {
      const currentUsername = searchParams.get('username');
      const identityCookie = searchParams.get('identity');

      if (!currentUsername || albums.length === 0) return;

      try {
        let url = `/api/userdata/${currentUsername}`;
        if (identityCookie) {
          url += `?identity-cookie=${encodeURIComponent(identityCookie)}`;
        }

        const response = await fetch(url);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const pagedata = doc.getElementById('pagedata');
        const dataBlob = pagedata?.getAttribute('data-blob');

        if (dataBlob) {
          const data: BandcampDataBlob = JSON.parse(dataBlob);
          const totalItems = data.collection_data?.item_count || 0;
          const currentItems = Object.keys(data.tracklists.collection).length;

          setCollectionStats({ total: totalItems, loaded: currentItems });
        }
      } catch (error) {
        console.log('Could not fetch collection stats:', error);
      }
    };

    checkCollectionStats();
  }, [albums.length, searchParams]);

  useEffect(() => {
    // Load playlists
    fetch('/api/playlists')
      .then(res => res.text())
      .then(data => {
        if (!data) return;

        const items: PlaylistItem[] = [];
        const lines = data.split('\r\n');

        lines.forEach(line => {
          if (!line) return;
          const [user, name, hist, url] = line.split('|');
          items.push({
            username: user,
            playlistName: name,
            url,
            history: parseInt(hist),
          });
        });

        setPlaylists(items);
      })
      .catch(err => console.error('Failed to load playlists:', err));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      alert('Please enter a username');
      return;
    }

    const params = new URLSearchParams({
      username: username.trim(),
      history: history.trim(),
      identity: identityCookie.trim(),
    });

    router.push(`/?${params.toString()}`);
    setShowPlayer(true);
  };

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

    router.push(`/?${params.toString()}`);
    setShowPlayer(true);
  };

  const handlePlayAll = () => {
    // Navigate to homepage with all albums
    const params = new URLSearchParams({
      username: searchParams.get('username') || '',
      history: searchParams.get('history') || '200',
      identity: searchParams.get('identity') || '',
    });

    router.push(`/?${params.toString()}`);
    setShowPlayer(true);
  };

  const loadAllRemainingAlbums = async () => {
    const currentUsername = searchParams.get('username');
    const identityCookie = searchParams.get('identity');

    if (!currentUsername || loadingAll) return;

    setLoadingAll(true);
    console.log('🔄 Loading ALL remaining albums...');

    try {
      // Get current fan data to get the last token
      let url = `/api/userdata/${currentUsername}`;
      if (identityCookie) {
        url += `?identity-cookie=${encodeURIComponent(identityCookie)}`;
      }

      const response = await fetch(url);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const pagedata = doc.getElementById('pagedata');
      const dataBlob = pagedata?.getAttribute('data-blob');

      if (!dataBlob) {
        throw new Error('No data found');
      }

      const data: BandcampDataBlob = JSON.parse(dataBlob);
      const totalItems = data.collection_data?.item_count || 0;
      const currentItems = Object.keys(data.tracklists.collection).length;
      const remainingItems = totalItems - currentItems;

      setCollectionStats({ total: totalItems, loaded: currentItems });

      if (remainingItems <= 0) {
        console.log('✅ All albums already loaded!');
        return;
      }

      console.log(`📊 Loading ${remainingItems} remaining albums...`);

      // Load remaining albums in batches
      const lastToken = data.collection_data.last_token;
      const batchSize = Math.min(50, remainingItems); // Load up to 50 at a time

      // Make API call to load more data
      let moreUrl = `/api/moredata?fan-id=${data.fan_data.fan_id}&older-than-token=${lastToken}&count=${batchSize}`;
      if (identityCookie) {
        moreUrl += `&identity-cookie=${encodeURIComponent(identityCookie)}`;
      }

      console.log(`📥 Loading batch: ${batchSize} albums`);
      const moreResponse = await fetch(moreUrl);

      if (!moreResponse.ok) {
        throw new Error(`Failed to load more data: ${moreResponse.status}`);
      }

      console.log('✅ Additional albums loaded! Refreshing page...');

      // Refresh the page to reload the collection with new data
      // We increase the history parameter to ensure all data is loaded
      const newParams = new URLSearchParams({
        username: currentUsername,
        history: Math.max(200, totalItems).toString(),
        identity: identityCookie || '',
      });

      router.push(`/?${newParams.toString()}`);

    } catch (error) {
      console.error('❌ Error loading all albums:', error);
      alert('Failed to load additional albums. Please try again.');
    } finally {
      setLoadingAll(false);
    }
  };

  const playPlaylist = (user: string, name: string, url: string, hist: number) => {
    setUsername(user);
    setHistory(hist.toString());

    const params = new URLSearchParams({
      username: user,
      history: hist.toString(),
      identity: identityCookie.trim(),
      plname: name,
      pl: url,
    });

    router.push(`/?${params.toString()}`);
    setShowPlayer(true);
  };

  // Group playlists by username
  const groupedPlaylists: Record<string, PlaylistItem[]> = {};
  playlists.forEach(p => {
    if (!groupedPlaylists[p.username]) {
      groupedPlaylists[p.username] = [];
    }
    groupedPlaylists[p.username].push(p);
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Collection Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Bandcamp Collection Player</h1>
          <p className="text-muted-foreground">
            {albums.length > 0 ? (
              <>
                {filteredAlbums.length} album{filteredAlbums.length !== 1 ? 's' : ''}
                {searchQuery && ` matching "${searchQuery}"`}
                {collectionStats && (
                  <span className="ml-2 text-sm">
                    ({collectionStats.loaded} of {collectionStats.total} loaded)
                  </span>
                )}
              </>
            ) : (
              'Enter your username below to load your collection'
            )}
          </p>
        </div>

        {albums.length > 0 && (
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

            <Button onClick={handlePlayAll} className="shrink-0">
              <Play className="h-4 w-4 mr-2" />
              Play All
            </Button>

            {searchParams.get('identity') && (
              <Button
                onClick={loadAllRemainingAlbums}
                variant="outline"
                className="shrink-0"
                disabled={loadingAll}
              >
                <Download className="h-4 w-4 mr-2" />
                {loadingAll ? 'Loading...' : 'Load All Albums'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Username Input Form - Show when no albums loaded */}
      {albums.length === 0 && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Get Started</CardTitle>
            <CardDescription>
              <a
                href="https://github.com/ralphgonz/bcradio"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Help & source
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-name">Bandcamp username</Label>
                <Input
                  id="user-name"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your Bandcamp username"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="history">Load additional purchases</Label>
                <Input
                  id="history"
                  type="number"
                  value={history}
                  onChange={(e) => setHistory(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="identity-cookie">(Optional) &quot;identity&quot; cookie</Label>
                <Input
                  id="identity-cookie"
                  type="text"
                  value={identityCookie}
                  onChange={(e) => setIdentityCookie(e.target.value)}
                  placeholder="Paste your Bandcamp identity cookie"
                />
              </div>

              <Button type="submit" className="w-full">
                Get Started
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Albums Grid - Show when albums are loaded */}
      {albums.length > 0 && (
        <>
          {filteredAlbums.length === 0 ? (
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
                  className="group p-0 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
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
                      {album.trackCount && (
                        <p className="text-xs text-muted-foreground">
                          {album.trackCount} track{album.trackCount !== 1 ? 's' : ''}
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

      {/* Playlists Section - Show when no albums loaded */}
      {albums.length === 0 && Object.keys(groupedPlaylists).length > 0 && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Playlists</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(groupedPlaylists).map(([user, userPlaylists]) => (
                <div key={user}>
                  <h3 className="font-semibold mb-2">{user}</h3>
                  <ul className="space-y-1 ml-4">
                    {userPlaylists.map((p, i) => (
                      <li key={i}>
                        <button
                          onClick={() => playPlaylist(p.username, p.playlistName, p.url, p.history)}
                          className="text-primary hover:underline text-left"
                        >
                          {p.playlistName}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
