# BC Radio - Bandcamp Collection Player

A React/Next.js recreation of the original [bcradio](https://github.com/ralphgonz/bcradio) - a web app to shuffle-play your Bandcamp collection.

## Features

- **Play Your Bandcamp Library**: Enter your Bandcamp username to load and shuffle-play your entire collection
- **Optional Identity Cookie**: Provide your Bandcamp identity cookie to access all purchased tracks (not just featured tracks) and enable mp3-V0 quality
- **Music Player Controls**: Play, pause, next, previous, skip tracks
- **Album Management**: 
  - Mark albums to skip permanently (stored in browser localStorage)
  - Add albums to playlists
- **Sorting Options**: Shuffle or alphabetic sorting
- **Playlist Sharing**: Create and share playlists (file-based storage, can be upgraded to PostgreSQL)

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS + custom CSS (ported from original)
- **State Management**: React hooks with localStorage
- **API**: Next.js API routes (serverless functions)
- **Data Storage**: JSON file-based (easily upgradeable to PostgreSQL)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Playing Your Collection

1. Enter your Bandcamp username (found in Settings > Fan > Username on Bandcamp)
2. Set how many additional purchases to load (default: 200)
3. (Optional) Paste your Bandcamp identity cookie for full access
4. Click "Get Started"

### Finding Your Identity Cookie

1. Log into Bandcamp in your browser
2. Open Developer Tools (F12)
3. Go to Application > Storage > Cookies > bandcamp.com
4. Copy the value of the `identity` cookie

**Note**: The identity cookie enables:
- Access to all purchased tracks (not just featured tracks)
- Higher quality audio (mp3-V0 instead of mp3-128k)

### Controls

- **Play/Pause/Next/Previous**: Standard audio controls
- **X Icon**: Skip album permanently on this browser
- **Up Arrow**: Add album to playlist
- **Track List**: Click any track to jump to it
- **Shuffle/Alphabetic**: Sort your collection

## Architecture

### API Routes

The application uses Next.js API routes to proxy requests to Bandcamp:

- `/api/userdata/[username]` - Fetches user's collection data
- `/api/moredata` - Loads additional tracks beyond the initial 20
- `/api/playlists` - Gets all public playlists
- `/api/playlists/[username]` - Gets playlists for specific user
- `/api/publish/[username]/[playlistName]/[history]` - Publish/unpublish playlists

### Storage

- **Skip Items**: Stored in browser localStorage
- **Playlist Items**: Stored in browser localStorage  
- **Published Playlists**: Stored in `data/playlists.json` (can be upgraded to PostgreSQL)

## Security

- No passwords are collected
- Username and identity cookie are never stored on the server
- API routes act as simple proxies to Bandcamp
- All communications over HTTPS in production

## Limitations

- Not affiliated with Bandcamp
- Uses undocumented Bandcamp APIs that may break in the future
- Identity cookie feature may not work on all mobile devices

## Credits

Original bcradio by Ralph Gonzalez: https://github.com/ralphgonz/bcradio

This is a Next.js project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
