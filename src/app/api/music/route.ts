import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const songs = await db.song.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(songs);
  } catch (error) {
    console.error("Failed to fetch songs:", error);
    return NextResponse.json({ error: "Failed to fetch songs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.formData();
    const file: File | null = data.get('file') as unknown as File;
    const cover: File | null = data.get('cover') as unknown as File;
    const title = data.get('title') as string;
    const artist = data.get('artist') as string;
    const album = data.get('album') as string;
    const year = data.get('year') as string;

    if (!file || !title || !artist) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Save music file
    const uniqueFileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const filePath = join(process.cwd(), 'public/music', uniqueFileName);
    await writeFile(filePath, buffer);

    let coverUrl = null;
    if (cover && cover.name) {
      const coverBytes = await cover.arrayBuffer();
      const coverBuffer = Buffer.from(coverBytes);
      const uniqueCoverName = `${Date.now()}-${cover.name.replace(/\s+/g, '_')}`;
      const coverPath = join(process.cwd(), 'public/covers', uniqueCoverName);
      await writeFile(coverPath, coverBuffer);
      coverUrl = `/covers/${uniqueCoverName}`;
    }

    // Save metadata
    const song = await db.song.create({
      data: {
        title,
        artist,
        album: album || null,
        year: year ? parseInt(year, 10) : null,
        url: `/music/${uniqueFileName}`,
        coverUrl,
      }
    });

    return NextResponse.json(song);
  } catch (error) {
    console.error("Failed to upload song:", error);
    return NextResponse.json({ error: "Failed to upload song" }, { status: 500 });
  }
}
