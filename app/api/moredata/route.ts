import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fanId = searchParams.get('fan-id');
    const olderThanToken = searchParams.get('older-than-token');
    const count = searchParams.get('count');
    const identityCookie = searchParams.get('identity-cookie');

    if (!fanId || !olderThanToken || !count) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const uri = 'https://bandcamp.com/api/fancollection/1/collection_items';
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (identityCookie) {
      headers['Cookie'] = `identity=${encodeURIComponent(identityCookie)}`;
    }

    const body = JSON.stringify({
      fan_id: parseInt(fanId),
      older_than_token: olderThanToken,
      count: parseInt(count),
    });

    const response = await fetch(uri, {
      method: 'POST',
      headers,
      body,
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch more data' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching more data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
