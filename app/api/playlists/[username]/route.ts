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

function readPlaylists(): PlaylistEntry[] {
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }
  const data = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(data);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params;
    const playlists = readPlaylists();
    
    const userPlaylists = playlists.filter(p => p.username === username);
    
    const result = userPlaylists
      .sort((a, b) => a.playlist_name.localeCompare(b.playlist_name))
      .map(p => `${p.username}|${p.playlist_name}|${p.history}|${p.url}`)
      .join('\r\n');

    return new NextResponse(result, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error('Error fetching user playlists:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
