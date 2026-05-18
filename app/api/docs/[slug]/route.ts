import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    // For now, return placeholder - connect to Vercel Blob later
    return NextResponse.json({
      name: slug,
      content: `# ${slug}\n\nDocument content will be loaded from Vercel Blob.`,
      url: `https://vercel.blob/docs/${slug}.md`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}
