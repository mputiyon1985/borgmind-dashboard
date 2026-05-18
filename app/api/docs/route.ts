import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return unauthorizedResponse();
  }

  try {
    const { blobs } = await list({
      prefix: 'docs/',
    });
    
    const docs = blobs.map(blob => ({
      name: blob.pathname.replace('docs/', '').replace('.md', ''),
      url: blob.url,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
    }));
    
    return NextResponse.json({ docs });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch docs from Vercel Blob' },
      { status: 500 }
    );
  }
}
