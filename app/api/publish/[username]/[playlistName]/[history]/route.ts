import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'playlists.json');

interface PlaylistEntry {
  username: string;
  playlist_name: string;
  history: number;
  url: string;
}

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readPlaylists(): PlaylistEntry[] {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }
  const data = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(data);
}

function writePlaylists(playlists: PlaylistEntry[]) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(playlists, null, 2));
}

export async function POST(
  request: NextRequest,
  { params }: { params: { username: string; playlistName: string; history: string } }
) {
  try {
    const { username, playlistName, history } = params;
    const url = await request.text();
    
    const decodedPlaylistName = decodeURIComponent(playlistName);
    
    const playlists = readPlaylists();
    
    // Check if user already has 8 playlists
    const userPlaylistCount = playlists.filter(p => p.username === username).length;
    if (userPlaylistCount >= 8) {
      const existingIndex = playlists.findIndex(
        p => p.username === username && p.playlist_name === decodedPlaylistName
      );
      if (existingIndex === -1) {
        return NextResponse.json(
          { error: 'Maximum 8 playlists per user' },
          { status: 400 }
        );
      }
    }
    
    // Remove existing playlist with same name if exists
    const filteredPlaylists = playlists.filter(
      p => !(p.username === username && p.playlist_name === decodedPlaylistName)
    );
    
    // Add new playlist
    filteredPlaylists.push({
      username,
      playlist_name: decodedPlaylistName,
      history: parseInt(history),
      url,
    });
    
    writePlaylists(filteredPlaylists);
    
    return new NextResponse('OK');
  } catch (error) {
    console.error('Error publishing playlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { username: string; playlistName: string } }
) {
  try {
    const { username, playlistName } = params;
    const decodedPlaylistName = decodeURIComponent(playlistName);
    
    const playlists = readPlaylists();
    
    const filteredPlaylists = playlists.filter(
      p => !(p.username === username && p.playlist_name === decodedPlaylistName)
    );
    
    writePlaylists(filteredPlaylists);
    
    return new NextResponse('OK');
  } catch (error) {
    console.error('Error unpublishing playlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
