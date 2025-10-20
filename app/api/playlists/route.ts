import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// For now, use a simple file-based storage
// In production, replace with PostgreSQL
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

export async function GET() {
  try {
    const playlists = readPlaylists();
    
    // Format as pipe-delimited string to match original format
    const result = playlists
      .sort((a, b) => {
        if (a.username !== b.username) {
          return a.username.localeCompare(b.username);
        }
        return a.playlist_name.localeCompare(b.playlist_name);
      })
      .map(p => `${p.username}|${p.playlist_name}|${p.history}|${p.url}`)
      .join('\r\n');

    return new NextResponse(result, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
