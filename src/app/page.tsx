"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, Upload, Music, Plus, X, 
  Image as ImageIcon, Search, Disc, Flame, Sparkles, Maximize2, Zap, 
  Radio
} from "lucide-react";
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
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
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

  const activeFeaturedSong = currentSong || (songs.length > 0 ? songs[0] : null);

  return (
    <>
      {/* Dynamic Aurora Ambient Background */}
      <div className="aurora-bg">
        <div className="aurora-blob aurora-blob-1"></div>
        <div className="aurora-blob aurora-blob-2"></div>
        <div className="aurora-blob aurora-blob-3"></div>
      </div>
      <div className="noise-overlay"></div>

      <div className={styles.mainApp}>
        {/* Left Cyber Dock Sidebar */}
        <aside className={styles.cyberDock}>
          <div>
            <div className={styles.brandWrap}>
              <div className={styles.brandIcon}>
                <Radio color="white" size={24} />
              </div>
              <div className={`${styles.brandText} gradient-text-flashy`}>APOLLO</div>
            </div>

            <nav className={styles.navSection}>
              <div className={styles.navLabel}>Sound Deck</div>
              <button 
                className={`${styles.navItem} ${activeTab === 'my-library' ? styles.navItemActive : ''}`}
                onClick={() => setActiveTab('my-library')}
              >
                <Disc size={18} /> Library
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
                <Zap size={18} style={{ color: 'var(--neon-amber)' }} /> Visualizer Studio
              </button>
            </nav>
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
                placeholder="Search tracks, vault audio, eras..." 
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
                <Sparkles size={16} style={{ color: 'var(--neon-pink)' }} /> FX Deck
              </button>
              <button className="btn-neon" onClick={() => { setSelectedJuiceTrack(null); setIsModalOpen(true); }}>
                <Plus size={16} /> Add Song
              </button>
            </div>
          </header>

          {/* Featured Stage / Hero Vinyl Showcase */}
          <section className={styles.heroStage}>
            <div className={styles.heroContent}>
              <div className={styles.heroTag}>
                <Sparkles size={14} /> High Fidelity Audio Platform
              </div>
              <h1 className={`${styles.heroTitle} gradient-text-flashy`}>
                {activeFeaturedSong ? activeFeaturedSong.title : "Immersive Sound System"}
              </h1>
              <p className={styles.heroSub}>
                {activeFeaturedSong 
                  ? `Now ready: ${activeFeaturedSong.artist} • ${activeFeaturedSong.album || 'Apollo Original Stream'}` 
                  : "Experience studio quality audio playback, custom library uploads, and Juice WRLD Vault integration."}
              </p>
              
              {activeFeaturedSong && (
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn-neon" onClick={() => playSong(activeFeaturedSong)}>
                    {currentSong?.id === activeFeaturedSong.id && isPlaying ? <Pause size={18} /> : <Play size={18} fill="white" />}
                    {currentSong?.id === activeFeaturedSong.id && isPlaying ? "Pause Audio" : "Play Now"}
                  </button>
                  <button className="btn-cyber-outline" onClick={() => setIsVisualizerOpen(true)}>
                    <Maximize2 size={16} /> Open Studio Visualizer
                  </button>
                </div>
              )}
            </div>

            {/* Vinyl Record Display */}
            <div className={styles.vinylWrapper}>
              <img 
                src={activeFeaturedSong?.cover_url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80"} 
                alt="Album Cover" 
                className={styles.albumCardCover} 
              />
              <div className={`${styles.vinylDisc} ${isPlaying ? styles.isVinylSpinning : ''}`}>
                <div className={styles.vinylCenterLabel}>
                  <div className={styles.vinylHole}></div>
                </div>
              </div>
            </div>
          </section>

          {/* Content Track Grid */}
          <section className={styles.gridSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                {activeTab === 'my-library' ? <Disc style={{ color: 'var(--neon-cyan)' }} /> : <Flame style={{ color: 'var(--neon-pink)' }} />}
                {activeTab === 'my-library' ? "Your Music Collection" : "Juice WRLD Unreleased Vault"}
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className={`btn-cyber-outline ${activeTab === 'my-library' ? styles.navItemActive : ''}`}
                  onClick={() => setActiveTab('my-library')}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}
                >
                  Library ({songs.length})
                </button>
                <button 
                  className={`btn-cyber-outline ${activeTab === 'juicewrld' ? styles.navItemActive : ''}`}
                  onClick={() => setActiveTab('juicewrld')}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}
                >
                  Vault 999
                </button>
              </div>
            </div>

            {activeTab === 'my-library' ? (
              songs.length === 0 ? (
                <div className="cyber-panel" style={{ padding: '3rem', textAlign: 'center', margin: '2rem 0' }}>
                  <Music size={48} style={{ color: 'var(--neon-pink)', margin: '0 auto 1rem' }} />
                  <h3 className="gradient-text-flashy" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>No Songs Uploaded Yet</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Your sound bank is empty. Upload your first track or import from the Juice WRLD Vault.</p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                    <button className="btn-neon" onClick={() => setIsModalOpen(true)}>
                      <Upload size={16} /> Upload Audio File
                    </button>
                    <button className="btn-cyber-outline" onClick={() => setActiveTab('juicewrld')}>
                      <Flame size={16} /> Explore Vault
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.trackGrid}>
                  {songs.map((song) => {
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
              <div>
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
                          <Upload size={14} /> Import to Apollo
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
    </>
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
    if (!file) return alert("Please select an audio file (.mp3 / .wav)");
    
    // Capture FormData before any await calls
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const artist = formData.get('artist') as string;
    const album = formData.get('album') as string;
    const year = formData.get('year') as string;

    setIsUploading(true);
    
    try {
      // 1. Upload Audio File
      const musicPath = `music/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      const { error: musicError } = await supabase.storage
        .from('media')
        .upload(musicPath, file);
        
      if (musicError) throw musicError;
      
      const { data: { publicUrl: musicUrl } } = supabase.storage.from('media').getPublicUrl(musicPath);

      // 2. Upload Cover Art
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

      // 3. Insert into Supabase
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
    <div className={styles.modalBackdrop}>
      <div className={styles.modalWindow}>
        <div className={styles.modalHead}>
          <h3 className="gradient-text-flashy">
            {selectedTrack ? `Import "${selectedTrack.name}"` : "Upload Music Track"}
          </h3>
          <button className="btn-cyber-outline" style={{ padding: '0.4rem' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleUpload}>
          <div className={styles.dropzoneCyber} onClick={() => document.getElementById('musicFileInput')?.click()}>
            <Music size={36} style={{ color: 'var(--neon-cyan)', margin: '0 auto 0.75rem' }} />
            <div style={{ fontWeight: 600, color: '#fff' }}>{file ? file.name : "Click to select MP3 / WAV audio file"}</div>
            <input 
              id="musicFileInput"
              type="file" 
              accept="audio/*" 
              style={{ display: 'none' }}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
          </div>

          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              Cover Art (Optional)
            </label>
            <div className={styles.dropzoneCyber} style={{ padding: '1rem' }} onClick={() => document.getElementById('coverFileInput')?.click()}>
              <ImageIcon size={22} style={{ color: 'var(--neon-pink)', margin: '0 auto 0.4rem' }} />
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {cover ? cover.name : selectedTrack?.coverUrl ? "Using Juice WRLD Vault Cover Art" : "Click to select image cover"}
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

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Title</label>
            <input 
              name="title" 
              className="input-cyber" 
              placeholder="Song Title" 
              required 
              defaultValue={selectedTrack?.name || file?.name.replace(/\.[^/.]+$/, "") || ""} 
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Artist</label>
            <input 
              name="artist" 
              className="input-cyber" 
              placeholder="Artist Name" 
              required 
              defaultValue={selectedTrack ? "Juice WRLD" : ""} 
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
                placeholder="2024" 
                defaultValue={selectedTrack?.releaseDate ? new Date(selectedTrack.releaseDate).getFullYear() || "" : ""} 
              />
            </div>
          </div>

          <button type="submit" className="btn-neon" style={{ width: '100%' }} disabled={isUploading}>
            {isUploading ? "Uploading Audio Engine..." : "Add to Apollo Library"}
          </button>
        </form>
      </div>
    </div>
  );
}

