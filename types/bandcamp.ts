// TypeScript types for Bandcamp data structures

export interface Track {
  artist: string;
  title: string;
  songUrl: string;
  isPlayed: boolean;
  isSkipped: boolean;
  isPlaylist: boolean;
  recent: number;
  artId: string | null;
  itemUrl: string;
  itemId: string;
}

export interface ItemInfo {
  artId: string;
  itemUrl: string;
}

export interface BandcampTrack {
  artist: string;
  title: string;
  file: {
    'mp3-v0'?: string;
    'mp3-128'?: string;
  };
}

export interface BandcampItem {
  item_id?: string;
  item_art_id?: string;
  item_url?: string;
  album_id?: string;
  featured_track?: unknown;
}

export interface BandcampDataBlob {
  fan_data: {
    fan_id: number;
    name: string;
  };
  identities: {
    fan?: boolean;
  };
  item_cache: {
    collection: Record<string, BandcampItem>;
  };
  tracklists: {
    collection: Record<string, BandcampTrack[]>;
  };
  collection_data: {
    last_token: string;
  };
}

export interface MoreDataResponse {
  items: BandcampItem[];
  tracklists: Record<string, BandcampTrack[]>;
}

export interface PlaylistData {
  username: string;
  playlist_name: string;
  history: number;
  url: string;
}

export interface PlayerState {
  username: string;
  numberToLoad: number;
  identityCookie: string;
  playlistName: string | null;
  playlistFilterItems: Set<string> | null;
  cookied: boolean | null;
}
