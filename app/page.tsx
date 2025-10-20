'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Player from '@/components/player';

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
      <Player
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
    <div className="params-container">
      <div id="params">
        <h2 id="title1">Bandcamp Collection Player</h2>
        <p id="help1">
          <a href="https://github.com/ralphgonz/bcradio" target="_blank" rel="noopener noreferrer">
            Help & source
          </a>
        </p>

        <form id="params-form" onSubmit={handleSubmit}>
          <div>
            <label className="text-label" htmlFor="user-name">
              Bandcamp username:
            </label>
            <input
              id="user-name"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
            <br />
          </div>
          <div>
            <label className="text-label" htmlFor="history">
              Load additional purchases:
            </label>
            <input
              id="history"
              type="number"
              value={history}
              onChange={(e) => setHistory(e.target.value)}
            />
            <br />
          </div>
          <div>
            <label className="text-label" htmlFor="identity-cookie">
              (Optional) &quot;identity&quot; cookie:
            </label>
            <input
              id="identity-cookie"
              type="text"
              value={identityCookie}
              onChange={(e) => setIdentityCookie(e.target.value)}
            />
            <br />
          </div>
          <div>
            <input id="submit-button" type="submit" value="Get Started" />
          </div>
        </form>

        <h2 id="title2">Playlists</h2>
        <div id="playlists">
          {Object.keys(groupedPlaylists).length === 0 ? (
            <p>No playlists available</p>
          ) : (
            Object.entries(groupedPlaylists).map(([user, userPlaylists]) => (
              <div key={user}>
                <p>{user}</p>
                <ul>
                  {userPlaylists.map((p, i) => (
                    <li key={i}>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          playPlaylist(p.username, p.playlistName, p.url, p.history);
                        }}
                      >
                        {p.playlistName}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
