'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CollectionPlayer } from '@/components/collection-player';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PlaylistItem {
  username: string;
  playlistName: string;
  url: string;
  history: number;
}

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [history, setHistory] = useState('200');
  const [identityCookie, setIdentityCookie] = useState('');
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [showPlayer, setShowPlayer] = useState(false);

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

  if (showPlayer) {
    return (
      <CollectionPlayer
        username={username}
        numberToLoad={parseInt(history)}
        identityCookie={identityCookie}
        playlistName={searchParams.get('plname') || null}
        playlistFilterItems={searchParams.get('pl')?.split(',') || null}
      />
    );
  }

  // Group playlists by username
  const groupedPlaylists: Record<string, PlaylistItem[]> = {};
  playlists.forEach(p => {
    if (!groupedPlaylists[p.username]) {
      groupedPlaylists[p.username] = [];
    }
    groupedPlaylists[p.username].push(p);
  });

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Bandcamp Collection Player</CardTitle>
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

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-2xl">Playlists</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(groupedPlaylists).length === 0 ? (
              <p className="text-muted-foreground">No playlists available</p>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
