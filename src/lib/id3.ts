export type ParsedAudioMetadata = {
  title: string;
  artist: string;
  album: string;
  year: number | null;
  coverBlob: Blob | null;
  coverPreviewUrl: string | null;
};

export const extractAudioMetadata = async (file: File): Promise<ParsedAudioMetadata> => {
  const fallbackTitle = file.name.replace(/\.[^/.]+$/, "").replace(/^[0-9\s._-]+/, "");
  
  try {
    // Read first 512KB for ID3 header
    const sliceSize = Math.min(file.size, 512 * 1024);
    const buffer = await file.slice(0, sliceSize).arrayBuffer();
    const view = new DataView(buffer);

    // Check "ID3" header signature
    if (view.getUint8(0) !== 0x49 || view.getUint8(1) !== 0x44 || view.getUint8(2) !== 0x33) {
      return { title: fallbackTitle, artist: "", album: "", year: null, coverBlob: null, coverPreviewUrl: null };
    }

    const version = view.getUint8(3);
    const tagSize = (view.getUint8(6) << 21) | (view.getUint8(7) << 14) | (view.getUint8(8) << 7) | view.getUint8(9);

    let offset = 10;
    let title = "";
    let artist = "";
    let album = "";
    let year: number | null = null;
    let coverBlob: Blob | null = null;
    let coverPreviewUrl: string | null = null;

    const utf8Decoder = new TextDecoder("utf-8");
    const latinDecoder = new TextDecoder("iso-8859-1");

    while (offset < tagSize + 10 && offset + 10 < buffer.byteLength) {
      let frameId = "";
      for (let i = 0; i < 4; i++) {
        const charCode = view.getUint8(offset + i);
        if (charCode >= 32 && charCode <= 126) frameId += String.fromCharCode(charCode);
      }

      if (frameId.length < 4) break;

      const frameSize = version === 4
        ? ((view.getUint8(offset + 4) << 21) | (view.getUint8(offset + 5) << 14) | (view.getUint8(offset + 6) << 7) | view.getUint8(offset + 7))
        : ((view.getUint8(offset + 4) << 24) | (view.getUint8(offset + 5) << 16) | (view.getUint8(offset + 6) << 8) | view.getUint8(offset + 7));

      if (frameSize <= 0 || offset + 10 + frameSize > buffer.byteLength) break;

      const frameDataOffset = offset + 10;
      const frameData = new Uint8Array(buffer, frameDataOffset, frameSize);

      if (frameId === "TIT2") {
        title = decodeText(frameData, utf8Decoder, latinDecoder);
      } else if (frameId === "TPE1") {
        artist = decodeText(frameData, utf8Decoder, latinDecoder);
      } else if (frameId === "TALB") {
        album = decodeText(frameData, utf8Decoder, latinDecoder);
      } else if (frameId === "TYER" || frameId === "TDRC") {
        const parsedY = parseInt(decodeText(frameData, utf8Decoder, latinDecoder), 10);
        if (!isNaN(parsedY)) year = parsedY;
      } else if (frameId === "APIC") {
        // Attached Picture
        const encoding = frameData[0];
        let mimeEnd = 1;
        while (mimeEnd < frameData.length && frameData[mimeEnd] !== 0) mimeEnd++;
        let mimeType = new TextDecoder("ascii").decode(frameData.subarray(1, mimeEnd)) || "image/jpeg";
        if (mimeType.includes("png")) mimeType = "image/png";
        else if (mimeType.includes("jpeg") || mimeType.includes("jpg")) mimeType = "image/jpeg";

        let picOffset = mimeEnd + 2; // Skip MIME null byte + picture type byte
        if (encoding === 1 || encoding === 2) {
          while (picOffset < frameData.length - 1 && !(frameData[picOffset] === 0 && frameData[picOffset + 1] === 0)) picOffset += 2;
          picOffset += 2;
        } else {
          while (picOffset < frameData.length && frameData[picOffset] !== 0) picOffset++;
          picOffset += 1;
        }

        if (picOffset < frameData.length) {
          const imageBytes = frameData.subarray(picOffset);
          coverBlob = new Blob([imageBytes], { type: mimeType });
          coverPreviewUrl = URL.createObjectURL(coverBlob);
        }
      }

      offset += 10 + frameSize;
    }

    return {
      title: title.trim() || fallbackTitle,
      artist: artist.trim(),
      album: album.trim(),
      year,
      coverBlob,
      coverPreviewUrl
    };
  } catch (err) {
    console.warn("Pure ID3 parser fallback for", file.name, err);
    return {
      title: fallbackTitle,
      artist: "",
      album: "",
      year: null,
      coverBlob: null,
      coverPreviewUrl: null
    };
  }
};

function decodeText(data: Uint8Array, utf8Decoder: TextDecoder, latinDecoder: TextDecoder): string {
  if (data.length <= 1) return "";
  const encoding = data[0];
  const payload = data.subarray(1);
  try {
    if (encoding === 3 || encoding === 0) {
      const text = (encoding === 3 ? utf8Decoder : latinDecoder).decode(payload);
      return text.replace(/\0/g, "");
    } else if (encoding === 1 || encoding === 2) {
      const text = new TextDecoder(encoding === 1 ? "utf-16" : "utf-16be").decode(payload);
      return text.replace(/\0/g, "");
    }
    return utf8Decoder.decode(payload).replace(/\0/g, "");
  } catch (e) {
    return "";
  }
}
