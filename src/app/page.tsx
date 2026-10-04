"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, Upload, Music, Plus, X, 
  Image as ImageIcon, Search, Disc, Flame, Sparkles, Maximize2, Zap, 
  Radio, Heart, List, Grid, Clock, BarChart3, Bookmark, Compass, ShieldCheck
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { extractAudioMetadata } from "@/lib/id3";
import styles from "./page.module.css";

type Song = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  year: number | null;
  url: string;
  cover_url: string | null;
  is_liked?: boolean;
  plays?: number;
  created_at?: string;
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
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'my-library' | 'juicewrld' | 'favorites'>('my-library');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [likedSongIds, setLikedSongIds] = useState<string[]>([]);
  
  // Juice WRLD API state
  const [juiceTracks, setJuiceTracks] = useState<JuiceTrack[]>([]);
  const [juiceSearch, setJuiceSearch] = useState("");
  const [isSearchingJuice, setIsSearchingJuice] = useState(false);
  const [selectedJuiceTrack, setSelectedJuiceTrack] = useState<JuiceTrack | null>(null);
  const [importingAlbumTitle, setImportingAlbumTitle] = useState<string | null>(null);

  // Iconic Juice WRLD Full Discography Presets for 1-Click Batch Import
  const JUICE_WRLD_ALBUMS = [
    {
      title: "Goodbye & Good Riddance",
      artist: "Juice WRLD",
      year: 2018,
      badge: "PLATINUM CLASSIC",
      coverUrl: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&q=80",
      tracks: [
        { title: "Intro", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
        { title: "All Girls Are the Same", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
        { title: "Lucid Dreams", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
        { title: "Lean Wit Me", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
        { title: "Wasted (feat. Lil Uzi Vert)", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
        { title: "I'm Still", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" },
        { title: "Candles", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3" },
        { title: "Scared of Love", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
        { title: "Used To", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3" },
        { title: "Hurt Me", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3" },
        { title: "Black & White", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3" },
        { title: "Long Gone", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3" },
        { title: "End of the Road", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3" },
        { title: "734", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3" }
      ]
    },
    {
      title: "Legends Never Die",
      artist: "Juice WRLD",
      year: 2020,
      badge: "POSTHUMOUS MASTERPIECE",
      coverUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80",
      tracks: [
        { title: "Anxiety - Intro", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
        { title: "Conversations", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
        { title: "Titanic", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
        { title: "Bad Energy", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
        { title: "Right Right", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
        { title: "Blood On My Jeans", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" },
        { title: "Smile (with The Weeknd)", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3" },
        { title: "Life's a Mess (feat. Halsey)", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
        { title: "Come & Go (with Marshmello)", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3" },
        { title: "Wishing Well", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3" },
        { title: "Screw Juice", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3" },
        { title: "Up Up and Away", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3" },
        { title: "Man of the Year", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3" }
      ]
    },
    {
      title: "Death Race for Love",
      artist: "Juice WRLD",
      year: 2019,
      badge: "CHART TOPPER",
      coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80",
      tracks: [
        { title: "Empty", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
        { title: "Maze", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
        { title: "Robbery", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
        { title: "Fast", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
        { title: "Hear Me Calling", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
        { title: "Flaws and Sins", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" },
        { title: "Feeling", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3" },
        { title: "Syphilis", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
        { title: "Who Shot Cupid?", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3" },
        { title: "Ring Ring (feat. Clever)", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3" },
        { title: "Desire", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3" },
        { title: "Make Believe", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3" }
      ]
    },
    {
      title: "Vault 999 Grails (Unreleased)",
      artist: "Juice WRLD",
      year: 2026,
      badge: "UNRELEASED GRAILS",
      coverUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&q=80",
      tracks: [
        { title: "Rental (Vault Edit)", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
        { title: "Off The Rip (Gamble)", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
        { title: "Cavalier", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
        { title: "Biscotti in the Air", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
        { title: "KTM Drip", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
        { title: "Iron On Me", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" },
        { title: "Double Date", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3" },
        { title: "Red Moonlight", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" }
      ]
    }
  ];

  const handleBatchImportAlbum = async (albumPreset: typeof JUICE_WRLD_ALBUMS[0]) => {
    setImportingAlbumTitle(albumPreset.title);
    try {
      const payload = albumPreset.tracks.map(t => ({
        title: t.title,
        artist: albumPreset.artist,
        album: albumPreset.title,
        year: albumPreset.year,
        url: t.url,
        cover_url: albumPreset.coverUrl,
        is_liked: false,
        plays: 0
      }));

      const { error } = await supabase.from('songs').insert(payload);
      if (error) throw error;

      await fetchSongs();
      alert(`⚡ Successfully imported full album "${albumPreset.title}" (${albumPreset.tracks.length} tracks) to your Apollo Library!`);
      setActiveTab('my-library');
    } catch (err: any) {
      console.error("Batch album import error:", err);
      alert(`Failed to import album: ${err?.message || JSON.stringify(err)}`);
    } finally {
      setImportingAlbumTitle(null);
    }
  };

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [isDraggingOverPage, setIsDraggingOverPage] = useState(false);

  useEffect(() => {
    fetchSongs();
    fetchJuiceTracks("Lucid Dreams");
  }, []);

  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer?.types?.includes('Files')) {
        setIsDraggingOverPage(true);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        setIsDraggingOverPage(false);
        dragCounter = 0;
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingOverPage(false);
      dragCounter = 0;

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const audioFiles = Array.from(e.dataTransfer.files).filter(file => 
          file.type.startsWith('audio/') || /\.(mp3|wav|flac|m4a|ogg|aac)$/i.test(file.name)
        );

        if (audioFiles.length > 0) {
          setDroppedFiles(audioFiles);
          setSelectedJuiceTrack(null);
          setIsModalOpen(true);
        } else {
          alert("Please drop valid audio files (.mp3, .wav, .flac, .m4a)");
        }
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  const fetchSongs = async () => {
    try {
      const { data, error } = await supabase.from('songs').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        setSongs(data);
        // Hydrate liked songs directly from Supabase Database (cross-platform sync)
        const likedIds = data.filter((s: Song) => s.is_liked).map((s: Song) => s.id);
        setLikedSongIds(likedIds);
      }
    } catch (e) {
      console.error("Failed to fetch songs from Supabase", e);
    }
  };

  const fetchJuiceTracks = async (query: string = "") => {
    setIsSearchingJuice(true);
    try {
      const url = query.trim()
        ? `https://juicewrldapi.com/api/songs?search=${encodeURIComponent(query)}`
        : `https://juicewrldapi.com/api/songs?limit=24`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.songs || data.data || []);
        setJuiceTracks(list.map((item: any, i: number) => ({
          id: item.id || item._id || `jw-${i}`,
          name: item.title || item.name || item.songName || "Untitled Track",
          era: item.era || item.album || "999 Era",
          state: item.state || item.status || "Vault Track",
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

  const toggleLike = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isCurrentlyLiked = likedSongIds.includes(id);
    const newLikedState = !isCurrentlyLiked;

    // Optimistic state update
    setLikedSongIds(prev =>
      newLikedState ? [...prev, id] : prev.filter(item => item !== id)
    );
    setSongs(prev =>
      prev.map(s => s.id === id ? { ...s, is_liked: newLikedState } : s)
    );

    // Save to Supabase Cloud Database (syncs on all devices & accounts!)
    try {
      await supabase.from('songs').update({ is_liked: newLikedState }).eq('id', id);
    } catch (err) {
      console.error("Failed to update like status in Supabase", err);
    }
  };

  const playSong = async (song: Song) => {
    if (currentSong?.id === song.id) {
      togglePlay();
      return;
    }
    setCurrentSong(song);
    setIsPlaying(true);

    const updatedPlays = (song.plays || 0) + 1;

    // Optimistic state update
    setSongs(prev =>
      prev.map(s => s.id === song.id ? { ...s, plays: updatedPlays } : s)
    );

    // Save stream play count to Supabase Cloud Database
    try {
      await supabase.from('songs').update({ plays: updatedPlays }).eq('id', song.id);
    } catch (err) {
      console.error("Failed to update play count in Supabase", err);
    }

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

  const activeFeaturedSong = currentSong || (songs.length > 0 ? songs[0] : null);
  const displayedSongs = activeTab === 'favorites' 
    ? songs.filter(s => likedSongIds.includes(s.id))
    : songs;

  // Real-time Supabase Database Account Metrics (Cross-Platform Persistence)
  const totalLikesCount = songs.filter(s => s.is_liked || likedSongIds.includes(s.id)).length;
  const totalTracksCount = songs.length;
  const totalStreamsCount = songs.reduce((sum, s) => sum + (s.plays || 0), 0);

  return (
    <>
      {/* Full-Page Cyber Drag & Drop Overlay */}
      {isDraggingOverPage && (
        <div className={styles.fullPageDragOverlay}>
          <div className={styles.dragOverlayContent}>
            <div className={styles.dragPulseIcon}>
              <Upload size={54} style={{ color: 'var(--neon-cyan)' }} />
            </div>
            <h2 className="gradient-text-flashy" style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>
              DROP AUDIO FILES TO IMPORT
            </h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', margin: 0 }}>
              Drop single tracks or full album folders directly into Apollo Audio Engine
            </p>
          </div>
        </div>
      )}

      {/* Dynamic Aurora Ambient Background */}
      <div className="aurora-bg">
        <div className="aurora-blob aurora-blob-1"></div>
        <div className="aurora-blob aurora-blob-2"></div>
        <div className="aurora-blob aurora-blob-3"></div>
      </div>
      <div className="noise-overlay"></div>

      <div className={styles.mainApp}>
        {/* MELO Structured Cyber Dock Sidebar */}
        <aside className={styles.cyberDock}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className={styles.brandWrap}>
              <div className={`${styles.brandText} gradient-text-flashy`}>APOLLO</div>
            </div>

            {/* MAIN NAVIGATION */}
            <nav className={styles.navSection}>
              <div className={styles.navLabel}>MAIN</div>
              <button 
                className={`${styles.navItem} ${activeTab === 'my-library' ? styles.navItemActive : ''}`}
                onClick={() => setActiveTab('my-library')}
              >
                <Disc size={18} /> Feed & Library
                <span className={styles.dockBadge}>{songs.length}</span>
              </button>

              <button 
                className={`${styles.navItem} ${activeTab === 'juicewrld' ? styles.navItemActive : ''}`}
                onClick={() => setActiveTab('juicewrld')}
              >
                <Flame size={18} style={{ color: 'var(--neon-pink)' }} /> Juice Vault
                <span className={styles.dockBadge} style={{ background: 'rgba(255,0,127,0.15)', color: 'var(--neon-pink)', borderColor: 'rgba(255,0,127,0.3)' }}>999</span>
              </button>

              <button 
                className={styles.navItem}
                onClick={() => setIsVisualizerOpen(true)}
              >
                <BarChart3 size={18} style={{ color: 'var(--neon-cyan)' }} /> Visualizer Studio
              </button>
            </nav>

            {/* YOUR MUSIC */}
            <nav className={styles.navSection}>
              <div className={styles.navLabel}>YOUR MUSIC</div>
              <button 
                className={`${styles.navItem} ${activeTab === 'favorites' ? styles.navItemActive : ''}`}
                onClick={() => setActiveTab('favorites')}
              >
                <Heart size={18} style={{ color: 'var(--neon-pink)' }} /> Favourites
                <span className={styles.dockBadge}>{totalLikesCount}</span>
              </button>

              <button className={styles.navItem} onClick={() => setActiveTab('my-library')}>
                <Clock size={18} /> Recently Played
              </button>
            </nav>

            {/* VIBE TAGS */}
            <div className={styles.navSection}>
              <div className={styles.navLabel}>GENRES & PLAYLISTS</div>
              <div className={styles.vibeTag}>
                <span className={styles.vibeDot} style={{ color: '#ff007f' }}></span> Unreleased 999
              </div>
              <div className={styles.vibeTag}>
                <span className={styles.vibeDot} style={{ color: '#00f0ff' }}></span> Synthwave & Cyber
              </div>
              <div className={styles.vibeTag}>
                <span className={styles.vibeDot} style={{ color: '#ffaa00' }}></span> Trap & Hip-Hop
              </div>
              <div className={styles.vibeTag}>
                <span className={styles.vibeDot} style={{ color: '#00ffaa' }}></span> Chill & Relax
              </div>
            </div>
          </div>

          <div className={styles.dockFooter}>
            <div className={styles.dockStatus}>
              <span className={styles.statusDot}></span>
              <span>Audio Engine Live</span>
            </div>
            <button 
              className="btn-neon" 
              style={{ width: '100%', marginTop: '1rem', fontSize: '0.8rem', padding: '0.6rem 1rem' }} 
              onClick={() => { setSelectedJuiceTrack(null); setIsModalOpen(true); }}
            >
              <Upload size={16} /> Upload Track
            </button>
          </div>
        </aside>

        {/* Main Center Content View */}
        <main className={styles.contentArea}>
          {/* Top Search Bar */}
          <header className={styles.topBar}>
            <div className={styles.searchBox}>
              <Search size={18} style={{ color: 'var(--neon-cyan)' }} />
              <input 
                type="text" 
                placeholder="Search by artists, songs, or vault albums..." 
                value={activeTab === 'juicewrld' ? juiceSearch : ''}
                onChange={(e) => {
                  if (activeTab === 'juicewrld') {
                    setJuiceSearch(e.target.value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && activeTab === 'juicewrld') {
                    fetchJuiceTracks(juiceSearch);
                  }
                }}
              />
              {activeTab === 'juicewrld' && (
                <button className="btn-cyber-outline" style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem' }} onClick={() => fetchJuiceTracks(juiceSearch)}>
                  Search Vault
                </button>
              )}
            </div>

            <div className={styles.topActions}>
              <button className="btn-cyber-outline" onClick={() => setIsVisualizerOpen(true)}>
                <Sparkles size={16} style={{ color: 'var(--neon-pink)' }} /> FX Studio
              </button>
              <button className="btn-neon" onClick={() => { setSelectedJuiceTrack(null); setIsModalOpen(true); }}>
                <Plus size={16} /> Add Track
              </button>
            </div>
          </header>

          {/* MELO-INSPIRED HERO ROW (SPLIT CARDS) */}
          <section className={styles.heroRowSplit}>
            {/* Left Card: Playlist of the Day */}
            <div className={styles.heroCardLeft}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  {songs.length} tracks • Hi-Res Quality
                </div>
                <h3 className="gradient-text-flashy" style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                  Playlist of the day
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '1rem 0' }}>
                <img 
                  src={activeFeaturedSong?.cover_url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80"} 
                  alt="Spotlight" 
                  style={{ width: '130px', height: '130px', borderRadius: '16px', objectFit: 'cover', boxShadow: '0 12px 30px rgba(0,0,0,0.6)', transform: 'rotate(-4deg)' }} 
                />
              </div>

              {activeFeaturedSong && (
                <button className="btn-cyber-outline" style={{ width: '100%', fontSize: '0.8rem' }} onClick={() => playSong(activeFeaturedSong)}>
                  <Play size={14} fill="currentColor" /> Play Spotlight
                </button>
              )}
            </div>

            {/* Right Card: Featured Banner Deck */}
            <div className={styles.heroCardRight}>
              <div className={styles.watermarkText}>
                {activeFeaturedSong ? activeFeaturedSong.title : "APOLLO 999"}
              </div>

              <div style={{ position: 'relative', zIndex: 2 }}>
                <div className={styles.heroTag}>
                  <Flame size={14} /> Featured Stream
                </div>
                <h1 className={styles.heroTitle}>
                  {activeFeaturedSong ? activeFeaturedSong.title : "Between Death and Dreams"}
                </h1>
                <p className={styles.heroSub}>
                  {activeFeaturedSong ? `${activeFeaturedSong.artist} • ${activeFeaturedSong.album || 'Juice WRLD Era'}` : "Brand of Sacrifice • April 2026"}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
                {activeFeaturedSong && (
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button className="btn-neon" onClick={() => playSong(activeFeaturedSong)}>
                      {currentSong?.id === activeFeaturedSong.id && isPlaying ? <Pause size={18} /> : <Play size={18} fill="white" />}
                      {currentSong?.id === activeFeaturedSong.id && isPlaying ? "Pause Track" : "Play Stream"}
                    </button>
                    <button 
                      className="btn-cyber-outline" 
                      onClick={() => toggleLike(activeFeaturedSong.id)}
                      style={{ color: likedSongIds.includes(activeFeaturedSong.id) ? 'var(--neon-pink)' : 'inherit' }}
                    >
                      <Heart size={16} fill={likedSongIds.includes(activeFeaturedSong.id) ? "var(--neon-pink)" : "none"} />
                    </button>
                  </div>
                )}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'Space Grotesk' }}>
                  {formatTime(progress)} / {formatTime(duration)}
                </div>
              </div>
            </div>
          </section>

          {/* STUDIO STATS & PROMO ROW */}
          <section style={{ margin: '0 2.5rem 1rem 2.5rem' }}>
            <div className={styles.statsRow}>
              <div className={styles.statBox}>
                <span className={styles.statLbl}>LIKES</span>
                <span className={styles.statVal}>{totalLikesCount}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLbl}>TRACKS</span>
                <span className={styles.statVal}>{totalTracksCount}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLbl}>TOTAL STREAMS</span>
                <span className={styles.statVal}>{totalStreamsCount.toLocaleString()}</span>
              </div>
            </div>

            <div className={styles.promoBanner}>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '0.2rem' }}>Check the power of Apollo 999</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Enjoy uninterrupted music streaming & Juice WRLD Vault integration.</p>
              </div>
              <button className="btn-neon" style={{ fontSize: '0.78rem', padding: '0.5rem 1.2rem' }} onClick={() => setIsVisualizerOpen(true)}>
                <Zap size={14} /> Open Studio
              </button>
            </div>
          </section>

          {/* Content Track Section */}
          <section className={styles.gridSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                {activeTab === 'my-library' && <Disc style={{ color: 'var(--neon-cyan)' }} />}
                {activeTab === 'juicewrld' && <Flame style={{ color: 'var(--neon-pink)' }} />}
                {activeTab === 'favorites' && <Heart style={{ color: 'var(--neon-pink)' }} />}
                {activeTab === 'my-library' ? "Your Music Collection" : activeTab === 'juicewrld' ? "Juice WRLD Vault 999" : "Your Favorites"}
              </h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className={styles.viewToggler}>
                  <button 
                    className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
                    onClick={() => setViewMode('list')}
                    title="List View"
                  >
                    <List size={16} />
                  </button>
                  <button 
                    className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
                    onClick={() => setViewMode('grid')}
                    title="Grid View"
                  >
                    <Grid size={16} />
                  </button>
                </div>
              </div>
            </div>

            {activeTab === 'my-library' || activeTab === 'favorites' ? (
              displayedSongs.length === 0 ? (
                <div className="cyber-panel" style={{ padding: '3rem', textAlign: 'center', margin: '2rem 0' }}>
                  <Music size={48} style={{ color: 'var(--neon-pink)', margin: '0 auto 1rem' }} />
                  <h3 className="gradient-text-flashy" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                    {activeTab === 'favorites' ? "No Favorites Saved Yet" : "No Songs Uploaded Yet"}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    {activeTab === 'favorites' ? "Click the heart icon on any song to add it to your favorites." : "Upload your local audio files or explore the Juice WRLD Vault."}
                  </p>
                  <button className="btn-neon" onClick={() => setIsModalOpen(true)}>
                    <Upload size={16} /> Upload Audio File
                  </button>
                </div>
              ) : viewMode === 'list' ? (
                /* MELO DETAILED TABLE LIST VIEW */
                <div className={styles.trackTable}>
                  {displayedSongs.map((song, index) => {
                    const isPlayingThis = currentSong?.id === song.id && isPlaying;
                    const isLiked = likedSongIds.includes(song.id);
                    return (
                      <div 
                        key={song.id} 
                        className={`${styles.tableRow} ${currentSong?.id === song.id ? styles.tableRowActive : ''}`}
                        onClick={() => playSong(song)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, width: '20px' }}>{index + 1}</span>
                          <img 
                            src={song.cover_url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80"} 
                            alt={song.title} 
                            className={styles.tableThumb} 
                          />
                        </div>

                        <div>
                          <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{song.title}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{song.artist}</div>
                        </div>

                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {song.album || 'Single Release'}
                        </div>

                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {song.year || '2026'}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.85rem' }}>
                          <button 
                            className="btn-cyber-outline" 
                            style={{ padding: '0.4rem', border: 'none', background: 'transparent' }}
                            onClick={(e) => toggleLike(song.id, e)}
                          >
                            <Heart size={18} color={isLiked ? 'var(--neon-pink)' : 'var(--text-muted)'} fill={isLiked ? 'var(--neon-pink)' : 'none'} />
                          </button>
                          <button className="btn-neon" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                            {isPlayingThis ? <Pause size={14} /> : <Play size={14} fill="white" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* 3D CYBER CARD GRID VIEW */
                <div className={styles.trackGrid}>
                  {displayedSongs.map((song) => {
                    const isPlayingThis = currentSong?.id === song.id && isPlaying;
                    return (
                      <div 
                        key={song.id} 
                        className={`${styles.cyberCard} ${currentSong?.id === song.id ? styles.cyberCardActive : ''}`}
                        onClick={() => playSong(song)}
                      >
                        <div className={styles.cardCoverBox}>
                          {song.cover_url ? (
                            <img src={song.cover_url} alt={song.title} className={styles.cardImage} />
                          ) : (
                            <Music size={48} style={{ color: 'var(--text-muted)' }} />
                          )}
                          <div className={styles.cardPlayBtnOverlay}>
                            <div className={styles.playCircleBtn}>
                              {isPlayingThis ? <Pause size={24} /> : <Play size={24} fill="white" style={{ marginLeft: '3px' }} />}
                            </div>
                          </div>
                        </div>

                        <div className={styles.cardInfo}>
                          <div className={styles.cardTitle}>{song.title}</div>
                          <div className={styles.cardSub}>{song.artist}</div>
                        </div>

                        {isPlayingThis && (
                          <div className={styles.eqContainer} style={{ marginTop: '0.5rem' }}>
                            <div className={styles.eqBar}></div>
                            <div className={styles.eqBar}></div>
                            <div className={styles.eqBar}></div>
                            <div className={styles.eqBar}></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                {/* 1-CLICK FULL ALBUM IMPORTER PRESETS */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <div>
                      <h3 className="gradient-text-flashy" style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                        💿 Iconic Juice WRLD Albums (1-Click Importer)
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Import full studio albums directly into your Apollo Cloud Library in 1 click.
                      </p>
                    </div>
                  </div>

                  <div className={styles.trackGrid}>
                    {JUICE_WRLD_ALBUMS.map((album) => (
                      <div key={album.title} className={styles.cyberCard} style={{ background: 'rgba(25, 18, 38, 0.7)' }}>
                        <div className={styles.cardCoverBox}>
                          <img src={album.coverUrl} alt={album.title} className={styles.cardImage} />
                          <span className={styles.cardBadge} style={{ color: 'var(--neon-pink)', borderColor: 'rgba(255,0,127,0.4)' }}>
                            {album.badge}
                          </span>
                        </div>
                        
                        <div className={styles.cardInfo}>
                          <div className={styles.cardTitle}>{album.title}</div>
                          <div className={styles.cardSub}>{album.artist} • {album.year} • {album.tracks.length} Tracks</div>
                        </div>

                        <button 
                          className="btn-neon" 
                          style={{ width: '100%', marginTop: '0.75rem', fontSize: '0.78rem', padding: '0.55rem' }}
                          disabled={importingAlbumTitle === album.title}
                          onClick={() => handleBatchImportAlbum(album)}
                        >
                          <Zap size={14} /> {importingAlbumTitle === album.title ? "Importing Album..." : `Import Full Album (${album.tracks.length} Tracks)`}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* INDIVIDUAL JUICE TRACKS VAULT SEARCH */}
                <div>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                      🔥 Vault 999 Track Explorer
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Search and import individual unreleased grails & studio tracks.
                    </p>
                  </div>

                  {isSearchingJuice ? (
                    <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--neon-cyan)' }}>
                      <div className="animate-spin-slow" style={{ display: 'inline-block', marginBottom: '1rem' }}>
                        <Radio size={40} />
                      </div>
                      <p style={{ fontWeight: 600 }}>Fetching tracks from Juice WRLD Vault...</p>
                    </div>
                  ) : (
                    <div className={styles.trackGrid}>
                      {juiceTracks.map((track) => (
                        <div key={track.id} className={styles.cyberCard}>
                          <div className={styles.cardCoverBox}>
                            <img 
                              src={track.coverUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80"} 
                              alt={track.name} 
                              className={styles.cardImage} 
                            />
                            <span className={styles.cardBadge}>{track.state || 'VAULT'}</span>
                          </div>
                          
                          <div className={styles.cardInfo}>
                            <div className={styles.cardTitle}>{track.name}</div>
                            <div className={styles.cardSub}>Juice WRLD • {track.era}</div>
                          </div>

                          <button 
                            className="btn-cyber-outline" 
                            style={{ width: '100%', marginTop: '0.75rem', fontSize: '0.78rem', padding: '0.45rem' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJuiceTrackUpload(track);
                            }}
                          >
                            <Upload size={14} /> Import Track
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Futuristic Cyberdeck Player */}
      {currentSong && (
        <div className={styles.cyberPlayer}>
          <div className={styles.playerGlowLine}></div>
          
          <div className={styles.playerTrackMeta}>
            <div className={styles.playerArtWrap}>
              {currentSong.cover_url ? (
                <>
                  <img src={currentSong.cover_url} alt="Cover" />
                  <div className={styles.playerArtGlow}></div>
                </>
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Music size={24} style={{ color: 'var(--text-muted)' }} />
                </div>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className={styles.playerTitleText}>{currentSong.title}</div>
              <div className={styles.playerArtistText}>{currentSong.artist}</div>
            </div>
          </div>

          <div className={styles.playerCenterControls}>
            <div className={styles.controlButtons}>
              <button className={styles.btnControlIcon} onClick={prevSong}><SkipBack size={20} fill="currentColor" /></button>
              <button className={styles.btnPlayMain} onClick={togglePlay}>
                {isPlaying ? <Pause size={22} fill="black" /> : <Play size={22} fill="black" style={{ marginLeft: '2px' }} />}
              </button>
              <button className={styles.btnControlIcon} onClick={nextSong}><SkipForward size={20} fill="currentColor" /></button>
            </div>
            
            <div className={styles.progressContainer}>
              <span>{formatTime(progress)}</span>
              <div className={styles.progressTrackCyber} onClick={handleProgressClick}>
                <div className={styles.progressFillCyber} style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}></div>
              </div>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className={styles.playerRightExtras}>
            <div className={styles.volumeBar}>
              <Volume2 size={18} style={{ color: 'var(--neon-cyan)' }} />
              <div 
                className={styles.progressTrackCyber} 
                style={{ height: '5px' }}
                onClick={(e) => {
                  if(!audioRef.current) return;
                  const bounds = e.currentTarget.getBoundingClientRect();
                  audioRef.current.volume = Math.max(0, Math.min(1, (e.clientX - bounds.left) / bounds.width));
                }}
              >
                <div className={styles.progressFillCyber} style={{ width: `${(audioRef.current?.volume ?? 1) * 100}%` }}></div>
              </div>
            </div>

            <button className={styles.btnControlIcon} onClick={() => setIsVisualizerOpen(true)}>
              <Maximize2 size={18} style={{ color: 'var(--neon-pink)' }} />
            </button>
          </div>
        </div>
      )}

      {/* Visualizer Studio Overlay */}
      {isVisualizerOpen && (
        <div className={styles.visualizerOverlay}>
          <div className={styles.visualizerHeader}>
            <div className="gradient-text-flashy" style={{ fontSize: '1.8rem', fontWeight: 800 }}>APOLLO AUDIO VISUALIZER STUDIO</div>
            <button className="btn-cyber-outline" onClick={() => setIsVisualizerOpen(false)}>
              <X size={20} /> Close Visualizer
            </button>
          </div>

          <div className={styles.visualizerBody}>
            <div className={styles.giantSpinningVinyl}>
              <img 
                src={currentSong?.cover_url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80"} 
                alt="Record Art" 
                className={`${styles.giantCenterArt} ${isPlaying ? styles.isVinylSpinning : ''}`} 
              />
            </div>

            <div>
              <h2 className="gradient-text-flashy" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>
                {currentSong ? currentSong.title : "No Track Playing"}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                {currentSong ? currentSong.artist : "Select a track from your library to start"}
              </p>
            </div>

            {/* 16 Audio Spectrum Frequency Bars */}
            <div className={styles.fullSpectrumBars}>
              {[...Array(16)].map((_, i) => (
                <div 
                  key={i} 
                  className={styles.fullSpectrumBar} 
                  style={{ 
                    animationDuration: `${0.4 + (i % 5) * 0.15}s`,
                    animationPlayState: isPlaying ? 'running' : 'paused' 
                  }} 
                />
              ))}
            </div>

            {currentSong && (
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <button className={styles.btnControlIcon} onClick={prevSong}><SkipBack size={28} /></button>
                <button className={styles.btnPlayMain} style={{ width: '64px', height: '64px' }} onClick={togglePlay}>
                  {isPlaying ? <Pause size={28} fill="black" /> : <Play size={28} fill="black" style={{ marginLeft: '3px' }} />}
                </button>
                <button className={styles.btnControlIcon} onClick={nextSong}><SkipForward size={28} /></button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {isModalOpen && (
        <UploadModal 
          selectedTrack={selectedJuiceTrack}
          initialFiles={droppedFiles}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedJuiceTrack(null);
            setDroppedFiles([]);
          }} 
          onSuccess={() => {
            setIsModalOpen(false);
            setSelectedJuiceTrack(null);
            setDroppedFiles([]);
            fetchSongs();
          }} 
        />
      )}

      <audio 
        ref={audioRef} 
        onTimeUpdate={handleTimeUpdate} 
        onEnded={nextSong}
      />
    </>
  );
}

type ParsedTrackItem = {
  file: File;
  title: string;
  artist: string;
  album: string;
  year: number | null;
  coverBlob: Blob | null;
  coverPreviewUrl: string | null;
};

function UploadModal({ 
  selectedTrack, 
  initialFiles = [],
  onClose, 
  onSuccess 
}: { 
  selectedTrack?: JuiceTrack | null, 
  initialFiles?: File[],
  onClose: () => void, 
  onSuccess: () => void 
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>(initialFiles);
  const [cover, setCover] = useState<File | null>(null);
  const [isDropzoneActive, setIsDropzoneActive] = useState(false);
  
  const [parsedTracks, setParsedTracks] = useState<ParsedTrackItem[]>([]);
  const [isParsingMetadata, setIsParsingMetadata] = useState(false);

  useEffect(() => {
    if (initialFiles.length > 0) {
      setFiles(initialFiles);
    }
  }, [initialFiles]);

  useEffect(() => {
    if (files.length > 0) {
      setIsParsingMetadata(true);
      Promise.all(files.map(async (file) => {
        const meta = await extractAudioMetadata(file);
        return {
          file,
          title: meta.title || file.name.replace(/\.[^/.]+$/, ""),
          artist: meta.artist || (selectedTrack ? "Juice WRLD" : ""),
          album: meta.album || selectedTrack?.era || "",
          year: meta.year || (selectedTrack?.releaseDate ? new Date(selectedTrack.releaseDate).getFullYear() || null : null),
          coverBlob: meta.coverBlob,
          coverPreviewUrl: meta.coverPreviewUrl
        };
      })).then((results) => {
        setParsedTracks(results);
        setIsParsingMetadata(false);
      }).catch(err => {
        console.error("Failed to parse metadata", err);
        setIsParsingMetadata(false);
      });
    } else {
      setParsedTracks([]);
    }
  }, [files, selectedTrack]);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (files.length === 0) return alert("Please select one or more audio files (.mp3 / .wav)");
    
    // Capture FormData before any await calls
    const formData = new FormData(e.currentTarget);
    const globalTitle = formData.get('title') as string;
    const globalArtist = formData.get('artist') as string;
    const globalAlbum = formData.get('album') as string;
    const globalYear = formData.get('year') as string;

    setIsUploading(true);
    
    try {
      // 1. Upload Fallback Cover Art if provided via file input
      let globalCoverUrl = selectedTrack?.coverUrl || null;
      if (cover) {
        const coverPath = `covers/${Date.now()}-global-${cover.name.replace(/\s+/g, '_')}`;
        const { error: coverError } = await supabase.storage
          .from('media')
          .upload(coverPath, cover);
          
        if (!coverError) {
          const { data: coverUrlData } = supabase.storage.from('media').getPublicUrl(coverPath);
          globalCoverUrl = coverUrlData.publicUrl;
        }
      }

      const songEntriesToInsert: Array<{
        title: string;
        artist: string;
        album: string | null;
        year: number | null;
        url: string;
        cover_url: string | null;
      }> = [];

      // 2. Loop through each audio file and upload individual audio & embedded cover art
      for (let i = 0; i < parsedTracks.length; i++) {
        const item = parsedTracks[i];
        
        // Upload Audio File
        const musicPath = `music/${Date.now()}-${i}-${item.file.name.replace(/\s+/g, '_')}`;
        const { error: musicError } = await supabase.storage
          .from('media')
          .upload(musicPath, item.file);
          
        if (musicError) throw musicError;
        
        const { data: { publicUrl: musicUrl } } = supabase.storage.from('media').getPublicUrl(musicPath);

        // Upload Individual Track Embedded Artwork if present
        let trackCoverUrl = globalCoverUrl;
        if (item.coverBlob) {
          try {
            const coverPath = `covers/${Date.now()}-${i}-embedded.jpg`;
            const { error: itemCoverErr } = await supabase.storage
              .from('media')
              .upload(coverPath, item.coverBlob, { contentType: item.coverBlob.type || 'image/jpeg' });
            
            if (!itemCoverErr) {
              const { data: itemCoverData } = supabase.storage.from('media').getPublicUrl(coverPath);
              trackCoverUrl = itemCoverData.publicUrl;
            }
          } catch (err) {
            console.warn("Failed to upload embedded cover for track:", item.title, err);
          }
        }

        // Deduce metadata
        const finalTitle = item.title || (files.length === 1 && globalTitle ? globalTitle : item.file.name.replace(/\.[^/.]+$/, ""));
        const finalArtist = item.artist || globalArtist || "Juice WRLD";
        const finalAlbum = item.album || globalAlbum || null;
        const finalYear = item.year || (globalYear ? parseInt(globalYear, 10) : null);

        songEntriesToInsert.push({
          title: finalTitle,
          artist: finalArtist,
          album: finalAlbum,
          year: finalYear,
          url: musicUrl,
          cover_url: trackCoverUrl
        });
      }

      // 3. Batch insert all songs into Supabase Cloud Database
      const { error: dbError } = await supabase.from('songs').insert(songEntriesToInsert);

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
    <div className={styles.modalBackdrop}>
      <div className={styles.modalWindow}>
        <div className={styles.modalHead}>
          <h3 className="gradient-text-flashy">
            {selectedTrack ? `Import "${selectedTrack.name}"` : files.length > 1 ? `Batch Upload Album (${files.length} Files)` : "Upload Music Track"}
          </h3>
          <button className="btn-cyber-outline" style={{ padding: '0.4rem' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleUpload}>
          <div 
            className={`${styles.dropzoneCyber} ${isDropzoneActive ? styles.dropzoneActive : ''}`} 
            onClick={() => document.getElementById('musicFileInput')?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDropzoneActive(true); }}
            onDragLeave={() => setIsDropzoneActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDropzoneActive(false);
              if (e.dataTransfer.files) {
                const dropped = Array.from(e.dataTransfer.files).filter(f => 
                  f.type.startsWith('audio/') || /\.(mp3|wav|flac|m4a|ogg|aac)$/i.test(f.name)
                );
                if (dropped.length > 0) setFiles(dropped);
              }
            }}
          >
            <Music size={36} style={{ color: 'var(--neon-cyan)', margin: '0 auto 0.75rem' }} />
            <div style={{ fontWeight: 600, color: '#fff' }}>
              {files.length > 0 
                ? `${files.length} Audio File(s) Ready` 
                : "Drag & drop MP3 / WAV audio file(s) here or click to select"}
            </div>
            <input 
              id="musicFileInput"
              type="file" 
              accept="audio/*" 
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files) {
                  setFiles(Array.from(e.target.files));
                }
              }}
              required={files.length === 0}
            />
          </div>

          {/* PARSED TRACK PREVIEW LIST WITH INDIVIDUAL COVERS */}
          {isParsingMetadata ? (
            <div style={{ padding: '0.85rem', textAlign: 'center', color: 'var(--neon-cyan)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              <div className="animate-spin-slow" style={{ display: 'inline-block', marginRight: '0.5rem' }}>
                <Sparkles size={16} />
              </div>
              Extracting track names & embedded cover artwork...
            </div>
          ) : parsedTracks.length > 0 && (
            <div style={{ marginBottom: '1.2rem', maxHeight: '180px', overflowY: 'auto', background: 'rgba(5, 8, 15, 0.65)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--neon-pink)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Detected Tracks ({parsedTracks.length} Songs)
              </div>
              {parsedTracks.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0', borderBottom: idx < parsedTracks.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  {item.coverPreviewUrl ? (
                    <img src={item.coverPreviewUrl} alt="Cover" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Music size={18} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.artist || 'Juice WRLD'} {item.album ? `• ${item.album}` : ''}
                    </div>
                  </div>
                  {item.coverBlob && (
                    <span style={{ fontSize: '0.65rem', background: 'rgba(0, 240, 255, 0.15)', color: 'var(--neon-cyan)', padding: '0.15rem 0.45rem', borderRadius: '10px', border: '1px solid rgba(0, 240, 255, 0.3)' }}>
                      Own Cover
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              Album Cover Art (Optional)
            </label>
            <div className={styles.dropzoneCyber} style={{ padding: '1rem' }} onClick={() => document.getElementById('coverFileInput')?.click()}>
              <ImageIcon size={22} style={{ color: 'var(--neon-pink)', margin: '0 auto 0.4rem' }} />
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {cover ? cover.name : selectedTrack?.coverUrl ? "Using Juice WRLD Vault Cover Art" : "Click to select album cover artwork"}
              </div>
              <input 
                id="coverFileInput"
                type="file" 
                accept="image/*" 
                style={{ display: 'none' }}
                onChange={(e) => setCover(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          {files.length <= 1 && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Title</label>
              <input 
                name="title" 
                className="input-cyber" 
                placeholder="Song Title" 
                required={files.length === 1}
                defaultValue={selectedTrack?.name || files[0]?.name.replace(/\.[^/.]+$/, "") || ""} 
              />
            </div>
          )}
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Artist</label>
            <input 
              name="artist" 
              className="input-cyber" 
              placeholder="Artist Name (e.g. Juice WRLD)" 
              required 
              defaultValue={selectedTrack ? "Juice WRLD" : "Juice WRLD"} 
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Album / Era</label>
              <input 
                name="album" 
                className="input-cyber" 
                placeholder="Album Name" 
                defaultValue={selectedTrack?.era || ""} 
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Year</label>
              <input 
                name="year" 
                type="number" 
                className="input-cyber" 
                placeholder="2026" 
                defaultValue={selectedTrack?.releaseDate ? new Date(selectedTrack.releaseDate).getFullYear() || "" : ""} 
              />
            </div>
          </div>

          <button type="submit" className="btn-neon" style={{ width: '100%' }} disabled={isUploading}>
            {isUploading ? `Uploading ${files.length} Track(s) to Apollo Cloud...` : files.length > 1 ? `Upload ${files.length} Tracks (Full Album)` : "Add to Apollo Library"}
          </button>
        </form>
      </div>
    </div>
  );
}

