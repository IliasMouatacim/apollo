"use client";

import { useEffect, useState, useRef } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, Upload, Music, Plus, X, Image as ImageIcon, Search, Disc, Flame } from "lucide-react";
import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";

type Song = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  year: number | null;
  url: string;
  cover_url: string | null;
};

type JuiceTrack = {
  id: string;
  name: string;
  era?: string;
  state?: string;
  releaseDate?: string;
  producer?: string;
  coverUrl?: string;
};

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'my-library' | 'juicewrld'>('my-library');
  
  // Juice WRLD API state
  const [juiceTracks, setJuiceTracks] = useState<JuiceTrack[]>([]);
  const [juiceSearch, setJuiceSearch] = useState("");
  const [isSearchingJuice, setIsSearchingJuice] = useState(false);
  const [selectedJuiceTrack, setSelectedJuiceTrack] = useState<JuiceTrack | null>(null);

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchSongs();
    fetchJuiceTracks("Lucid Dreams");
  }, []);

  const fetchSongs = async () => {
    try {
      const { data, error } = await supabase.from('songs').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setSongs(data);
    } catch (e) {
      console.error("Failed to fetch songs", e);
    }
  };

  const fetchJuiceTracks = async (query: string = "") => {
    setIsSearchingJuice(true);
    try {
      const url = query.trim()
        ? `https://juicewrldapi.com/api/songs?search=${encodeURIComponent(query)}`
        : `https://juicewrldapi.com/api/songs?limit=20`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        // Juice WRLD API array parsing
        const list = Array.isArray(data) ? data : (data.songs || data.data || []);
        setJuiceTracks(list.map((item: any, i: number) => ({
          id: item.id || item._id || `jw-${i}`,
          name: item.title || item.name || item.songName || "Untitled Track",
          era: item.era || item.album || "999 Era",
          state: item.state || item.status || "Released",
          releaseDate: item.releaseDate || item.date || "",
          producer: item.producer || item.producers || "Juice WRLD",
          coverUrl: item.cover || item.image || item.art || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80"
        })));
      }
    } catch (e) {
      console.error("Failed to fetch from Juice WRLD API", e);
    } finally {
      setIsSearchingJuice(false);
    }
  };

  const playSong = (song: Song) => {
    if (currentSong?.id === song.id) {
      togglePlay();
      return;
    }
    setCurrentSong(song);
    setIsPlaying(true);
    if (audioRef.current) {
      audioRef.current.src = song.url;
      audioRef.current.play();
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentSong) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const nextSong = () => {
    if (!currentSong || songs.length === 0) return;
    const currentIndex = songs.findIndex((s) => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % songs.length;
    playSong(songs[nextIndex]);
  };

  const prevSong = () => {
    if (!currentSong || songs.length === 0) return;
    const currentIndex = songs.findIndex((s) => s.id === currentSong.id);
    const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    playSong(songs[prevIndex]);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const percentage = x / bounds.width;
    audioRef.current.currentTime = percentage * duration;
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleJuiceTrackUpload = (track: JuiceTrack) => {
    setSelectedJuiceTrack(track);
    setIsModalOpen(true);
  };

  return (
    <div className={styles.main}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <Music className="text-primary" size={28} />
          Apollo
        </div>

        <div className={styles.tabNav}>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'my-library' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('my-library')}
          >
            <Disc size={18} /> My Library ({songs.length})
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'juicewrld' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('juicewrld')}
          >
            <Flame size={18} color="#f59e0b" /> Juice WRLD Vault
          </button>
        </div>

        <button className="btn btn-primary" onClick={() => { setSelectedJuiceTrack(null); setIsModalOpen(true); }}>
          <Upload size={18} />
          Upload Music
        </button>
      </header>

      <div className={styles.content}>
        {activeTab === 'my-library' ? (
          songs.length === 0 ? (
            <div className={styles.emptyState}>
              <Music size={48} className="text-muted" style={{ opacity: 0.5 }} />
              <h2>Your library is empty</h2>
              <p>Upload some music or add from the Juice WRLD Vault!</p>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                  <Plus size={18} /> Add First Track
                </button>
                <button className="btn btn-secondary" onClick={() => setActiveTab('juicewrld')}>
                  <Flame size={18} color="#f59e0b" /> Explore Juice WRLD API
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.songGrid}>
              {songs.map((song) => (
                <div 
                  key={song.id} 
                  className={`${styles.songCard} ${currentSong?.id === song.id ? styles.songCardActive : ''}`}
                  onClick={() => playSong(song)}
                >
                  <div className={styles.coverContainer}>
                    {song.cover_url ? (
                      <img src={song.cover_url} alt={song.title} className={styles.coverImage} />
                    ) : (
                      <Music size={40} color="var(--text-muted)" />
                    )}
                    <div className={styles.playOverlay}>
                      <div className={styles.playIcon}>
                        {currentSong?.id === song.id && isPlaying ? <Pause size={24} /> : <Play size={24} fill="white" />}
                      </div>
                    </div>
                  </div>
                  <div className={styles.songTitle}>{song.title}</div>
                  <div className={styles.songArtist}>{song.artist}</div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div>
            <div className={styles.searchHeader}>
              <div className={styles.searchBar}>
                <Search size={20} color="var(--text-muted)" />
                <input 
                  type="text" 
                  placeholder="Search Juice WRLD songs, unreleased tracks, eras..." 
                  value={juiceSearch}
                  onChange={(e) => setJuiceSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchJuiceTracks(juiceSearch)}
                />
                <button className="btn btn-primary" onClick={() => fetchJuiceTracks(juiceSearch)}>
                  Search API
                </button>
              </div>
            </div>

            {isSearchingJuice ? (
              <div className={styles.emptyState}>
                <p>Searching Juice WRLD API database...</p>
              </div>
            ) : (
              <div className={styles.songGrid}>
                {juiceTracks.map((track) => (
                  <div key={track.id} className={styles.songCard}>
                    <div className={styles.coverContainer}>
                      <img 
                        src={track.coverUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80"} 
                        alt={track.name} 
                        className={styles.coverImage} 
                      />
                      <div className={styles.badge}>{track.state || 'Track'}</div>
                    </div>
                    <div className={styles.songTitle}>{track.name}</div>
                    <div className={styles.songArtist}>Juice WRLD • {track.era}</div>
                    
                    <button 
                      className="btn btn-secondary" 
                      style={{ width: '100%', marginTop: '0.75rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJuiceTrackUpload(track);
                      }}
                    >
                      <Upload size={14} /> Upload Audio File
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {currentSong && (
        <div className={styles.player}>
          <div className={styles.playerInfo}>
            <div className={styles.playerCover}>
              {currentSong.cover_url ? (
                <img src={currentSong.cover_url} alt="Cover" />
              ) : (
                <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)'}}>
                  <Music size={20} color="var(--text-muted)" />
                </div>
              )}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{currentSong.title}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{currentSong.artist}</div>
            </div>
          </div>

          <div className={styles.playerControls}>
            <div className={styles.controlsRow}>
              <button className={styles.controlBtn} onClick={prevSong}><SkipBack size={20} fill="currentColor" /></button>
              <button className={styles.playBtn} onClick={togglePlay}>
                {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" />}
              </button>
              <button className={styles.controlBtn} onClick={nextSong}><SkipForward size={20} fill="currentColor" /></button>
            </div>
            <div className={styles.progressBar}>
              <span>{formatTime(progress)}</span>
              <div className={styles.progressTrack} onClick={handleProgressClick}>
                <div className={styles.progressFill} style={{ width: `${(progress / duration) * 100}%` }}></div>
              </div>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className={styles.playerExtra}>
            <div className={styles.volumeControl}>
              <Volume2 size={18} color="var(--text-muted)" />
              <div className={styles.progressTrack} style={{ flex: 1 }} onClick={(e) => {
                if(!audioRef.current) return;
                const bounds = e.currentTarget.getBoundingClientRect();
                audioRef.current.volume = (e.clientX - bounds.left) / bounds.width;
              }}>
                <div className={styles.progressFill} style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <UploadModal 
          selectedTrack={selectedJuiceTrack}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedJuiceTrack(null);
          }} 
          onSuccess={() => {
            setIsModalOpen(false);
            setSelectedJuiceTrack(null);
            fetchSongs();
          }} 
        />
      )}

      <audio 
        ref={audioRef} 
        onTimeUpdate={handleTimeUpdate} 
        onEnded={nextSong}
      />
    </div>
  );
}

function UploadModal({ 
  selectedTrack, 
  onClose, 
  onSuccess 
}: { 
  selectedTrack?: JuiceTrack | null, 
  onClose: () => void, 
  onSuccess: () => void 
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  
  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return alert("Please select a music file (.mp3 / .wav)");
    
    // Capture FormData before any await calls, as e.currentTarget can become null later
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const artist = formData.get('artist') as string;
    const album = formData.get('album') as string;
    const year = formData.get('year') as string;

    setIsUploading(true);
    
    try {
      // 1. Upload Music File
      const musicPath = `music/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      const { data: musicData, error: musicError } = await supabase.storage
        .from('media')
        .upload(musicPath, file);
        
      if (musicError) throw musicError;
      
      const { data: { publicUrl: musicUrl } } = supabase.storage.from('media').getPublicUrl(musicPath);

      // 2. Upload Cover Art (if selected file or pre-filled URL)
      let coverUrl = selectedTrack?.coverUrl || null;
      if (cover) {
        const coverPath = `covers/${Date.now()}-${cover.name.replace(/\s+/g, '_')}`;
        const { error: coverError } = await supabase.storage
          .from('media')
          .upload(coverPath, cover);
          
        if (!coverError) {
          const { data: coverUrlData } = supabase.storage.from('media').getPublicUrl(coverPath);
          coverUrl = coverUrlData.publicUrl;
        }
      }

      // 3. Save to Database

      const { error: dbError } = await supabase.from('songs').insert({
        title,
        artist,
        album: album || null,
        year: year ? parseInt(year, 10) : null,
        url: musicUrl,
        cover_url: coverUrl,
      });

      if (dbError) throw dbError;

      onSuccess();
    } catch (err: any) {
      console.error("Upload error:", err);
      const msg = err?.message || err?.error_description || JSON.stringify(err);
      alert(`Upload failed: ${msg}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} glass-panel animate-fade-in`}>
        <div className={styles.modalHeader}>
          <h3>{selectedTrack ? `Upload Audio for "${selectedTrack.name}"` : "Upload Music"}</h3>
          <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleUpload}>
          <div className={styles.fileInputContainer} onClick={() => document.getElementById('musicFileInput')?.click()}>
            <Music size={32} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
            <div>{file ? file.name : "Click to select MP3/Audio file"}</div>
            <input 
              id="musicFileInput"
              type="file" 
              accept="audio/*" 
              className={styles.fileInput} 
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Cover Art (Optional)</label>
            <div className={styles.fileInputContainer} style={{ padding: '1rem' }} onClick={() => document.getElementById('coverFileInput')?.click()}>
              <ImageIcon size={24} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
              <div style={{ fontSize: '0.85rem' }}>
                {cover ? cover.name : selectedTrack?.coverUrl ? "Using Juice WRLD API Cover Art" : "Select Image"}
              </div>
              <input 
                id="coverFileInput"
                type="file" 
                accept="image/*" 
                className={styles.fileInput} 
                onChange={(e) => setCover(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Title</label>
            <input 
              name="title" 
              className="input-field" 
              placeholder="Song Title" 
              required 
              defaultValue={selectedTrack?.name || file?.name.replace(/\.[^/.]+$/, "") || ""} 
            />
          </div>
          
          <div className={styles.formGroup}>
            <label>Artist</label>
            <input 
              name="artist" 
              className="input-field" 
              placeholder="Artist Name" 
              required 
              defaultValue={selectedTrack ? "Juice WRLD" : ""} 
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label>Album / Era</label>
              <input 
                name="album" 
                className="input-field" 
                placeholder="Album Name" 
                defaultValue={selectedTrack?.era || ""} 
              />
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label>Year</label>
              <input 
                name="year" 
                type="number" 
                className="input-field" 
                placeholder="2024" 
                defaultValue={selectedTrack?.releaseDate ? new Date(selectedTrack.releaseDate).getFullYear() || "" : ""} 
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={isUploading}>
            {isUploading ? "Uploading Track..." : "Upload to Apollo"}
          </button>
        </form>
      </div>
    </div>
  );
}

