"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, Upload, Music, Plus, X, ChevronDown,
  Image as ImageIcon, Search, Disc, Flame, Sparkles, Maximize2, Zap, 
  Radio, Heart, List, Grid, Clock, BarChart3, Bookmark, Compass, ShieldCheck,
  RotateCcw, RotateCw, Shuffle, Repeat, Repeat1, Smartphone, ListMusic,
  Sliders, Activity, FolderPlus, ArrowUp, ArrowDown, Trash2, AlignLeft, Layers, VolumeX
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
  genre?: string;
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

type Playlist = {
  id: string;
  name: string;
  color: string;
  songIds: string[];
};

type LyricLine = {
  time: number;
  text: string;
};

const MOCK_LYRICS: LyricLine[] = [
  { time: 0, text: "♪ (Apollo Audio Engine Cyber Intro) ♪" },
  { time: 5, text: "I still see your shadows in my room" },
  { time: 10, text: "Can't take back the love that I gave you" },
  { time: 15, text: "It's to the point where I love and I hate you" },
  { time: 20, text: "And I cannot change you, so I must replace you" },
  { time: 25, text: "Easier said than done, I thought you were the one" },
  { time: 30, text: "Listening to my heart instead of my head" },
  { time: 35, text: "You found another one, but I am the better one" },
  { time: 40, text: "I won't let you forget me... 999 Vault Grails" },
  { time: 50, text: "♪ (Slowed & Reverb Cyber Synth Solo) ♪" }
];

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'my-library' | 'juicewrld' | 'favorites'>('my-library');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [likedSongIds, setLikedSongIds] = useState<string[]>([]);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'track'>('off');
  const [isMobilePlayerExpanded, setIsMobilePlayerExpanded] = useState(false);
  
  // Realtime Listening Party State
  const [isPartyMode, setIsPartyMode] = useState(false);
  const partyChannelRef = useRef<any>(null);

  // Dynamic Search, Sort & Filtering State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'artist' | 'plays'>('newest');
  const [vibeFilter, setVibeFilter] = useState<'all' | 'unreleased' | 'synthwave' | 'trap' | 'chill'>('all');
  
  // Audio Queue State
  const [queue, setQueue] = useState<Song[]>([]);
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  // Custom Playlists State
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistColor, setNewPlaylistColor] = useState("#00f0ff");

  // Visualizer Studio Tabs & Canvas Engine State
  const [visualizerTab, setVisualizerTab] = useState<'canvas' | 'eq' | 'lyrics'>('canvas');
  const [canvasMode, setCanvasMode] = useState<'spectrum' | 'waveform' | 'circular'>('spectrum');

  // Web Audio API & DSP Equalizer / Speed State
  const [eqGains, setEqGains] = useState<number[]>([0, 0, 0, 0, 0]); // 5 bands in dB
  const [activeEqPreset, setActiveEqPreset] = useState<string>('flat');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isSlowedAndReverb, setIsSlowedAndReverb] = useState(false);
  const [isNightcore, setIsNightcore] = useState(false);
  const [isBassBoost, setIsBassBoost] = useState(false);

  // Live Lyrics Fetch State
  const [liveLyrics, setLiveLyrics] = useState<string | null>(null);
  const [isFetchingLyrics, setIsFetchingLyrics] = useState(false);

  // Juice WRLD API state
  const [juiceTracks, setJuiceTracks] = useState<JuiceTrack[]>([]);
  const [juiceSearch, setJuiceSearch] = useState("");
  const [isSearchingJuice, setIsSearchingJuice] = useState(false);
  const [selectedJuiceTrack, setSelectedJuiceTrack] = useState<JuiceTrack | null>(null);
  const [importingAlbumTitle, setImportingAlbumTitle] = useState<string | null>(null);

  // Audio & Web Audio Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const eqNodesRef = useRef<BiquadFilterNode[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [isDraggingOverPage, setIsDraggingOverPage] = useState(false);

  // Initialize Playlists from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('apollo_custom_playlists');
      if (saved) {
        setPlaylists(JSON.parse(saved));
      } else {
        const defaults: Playlist[] = [
          { id: 'p1', name: '999 Vault Grails', color: '#ff007f', songIds: [] },
          { id: 'p2', name: 'Synthwave & Cyber', color: '#00f0ff', songIds: [] }
        ];
        setPlaylists(defaults);
        localStorage.setItem('apollo_custom_playlists', JSON.stringify(defaults));
      }
    } catch (e) {
      console.warn("Failed to read playlists from localStorage", e);
    }
  }, []);

  const savePlaylists = (updated: Playlist[]) => {
    setPlaylists(updated);
    try {
      localStorage.setItem('apollo_custom_playlists', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const newP: Playlist = {
      id: `pl-${Date.now()}`,
      name: newPlaylistName.trim(),
      color: newPlaylistColor || '#00f0ff',
      songIds: []
    };
    savePlaylists([...playlists, newP]);
    setNewPlaylistName("");
    setIsPlaylistModalOpen(false);
  };

  const toggleSongInPlaylist = (playlistId: string, songId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = playlists.map(p => {
      if (p.id === playlistId) {
        const exists = p.songIds.includes(songId);
        return {
          ...p,
          songIds: exists ? p.songIds.filter(id => id !== songId) : [...p.songIds, songId]
        };
      }
      return p;
    });
    savePlaylists(updated);
  };

  useEffect(() => {
    fetchSongs();
    fetchJuiceTracks("Lucid Dreams");
  }, []);

  // Web Audio API Setup
  const initWebAudio = () => {
    if (audioContextRef.current || !audioRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaElementSource(audioRef.current);
      sourceNodeRef.current = source;

      // 5 EQ Frequency Filters (60Hz Sub Bass, 250Hz Bass, 1kHz Mid, 4kHz High Mid, 12kHz Treble)
      const freqs = [60, 250, 1000, 4000, 12000];
      const types: BiquadFilterType[] = ['lowshelf', 'peaking', 'peaking', 'peaking', 'highshelf'];

      const eqNodes = freqs.map((freq, i) => {
        const filter = ctx.createBiquadFilter();
        filter.type = types[i];
        filter.frequency.value = freq;
        filter.gain.value = eqGains[i] || 0;
        return filter;
      });
      eqNodesRef.current = eqNodes;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.85;
      analyserNodeRef.current = analyser;

      // Connect Node Chain: source -> EQ filters -> Analyser -> Destination
      let lastNode: AudioNode = source;
      eqNodes.forEach(filter => {
        lastNode.connect(filter);
        lastNode = filter;
      });
      lastNode.connect(analyser);
      analyser.connect(ctx.destination);
    } catch (err) {
      console.warn("Web Audio API node connection notice:", err);
    }
  };

  // Sync EQ Gains to Audio Nodes
  useEffect(() => {
    if (eqNodesRef.current.length > 0) {
      eqGains.forEach((g, idx) => {
        if (eqNodesRef.current[idx]) {
          eqNodesRef.current[idx].gain.value = isBassBoost && idx === 0 ? g + 12 : g;
        }
      });
    }
  }, [eqGains, isBassBoost]);

  // Sync Playback Speed
  useEffect(() => {
    if (audioRef.current) {
      const speed = isNightcore ? 1.25 : playbackSpeed;
      audioRef.current.playbackRate = speed;
    }
  }, [playbackSpeed, isNightcore]);

  const applyEqPreset = (presetKey: string) => {
    setActiveEqPreset(presetKey);
    if (presetKey === 'flat') {
      setEqGains([0, 0, 0, 0, 0]);
      setIsSlowedAndReverb(false);
      setIsNightcore(false);
      setIsBassBoost(false);
      setPlaybackSpeed(1.0);
    } else if (presetKey === 'bass-boost') {
      setEqGains([8, 5, 1, 0, 2]);
      setIsBassBoost(true);
    } else if (presetKey === 'cyber-club') {
      setEqGains([6, 3, -2, 4, 7]);
    } else if (presetKey === 'vocal') {
      setEqGains([-3, 2, 6, 4, 1]);
    } else if (presetKey === 'slowed-reverb') {
      setEqGains([7, 4, 2, -1, 4]);
      setIsSlowedAndReverb(true);
      setPlaybackSpeed(0.8);
    }
  };

  // Real-Time Canvas Render Loop
  useEffect(() => {
    if (!isVisualizerOpen || visualizerTab !== 'canvas' || !canvasRef.current) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (analyserNodeRef.current && isPlaying) {
        const analyser = analyserNodeRef.current;

        if (canvasMode === 'spectrum') {
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyser.getByteFrequencyData(dataArray);

          const barWidth = (width / bufferLength) * 2.4;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * (height * 0.85);

            const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
            gradient.addColorStop(0, '#00f0ff');
            gradient.addColorStop(0.5, '#ff007f');
            gradient.addColorStop(1, '#9d4edd');

            ctx.fillStyle = gradient;
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#00f0ff';
            ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x, height - barHeight - 4, barWidth - 2, 3);

            x += barWidth;
          }
        } else if (canvasMode === 'waveform') {
          const bufferLength = analyser.fftSize;
          const dataArray = new Uint8Array(bufferLength);
          analyser.getByteTimeDomainData(dataArray);

          ctx.lineWidth = 3;
          ctx.strokeStyle = '#00f0ff';
          ctx.shadowBlur = 18;
          ctx.shadowColor = '#00f0ff';
          ctx.beginPath();

          const sliceWidth = width / bufferLength;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * height) / 2;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);

            x += sliceWidth;
          }

          ctx.lineTo(width, height / 2);
          ctx.stroke();
        } else if (canvasMode === 'circular') {
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyser.getByteFrequencyData(dataArray);

          const centerX = width / 2;
          const centerY = height / 2;
          const radius = Math.min(width, height) * 0.28;

          ctx.shadowBlur = 20;
          ctx.shadowColor = '#ff007f';

          for (let i = 0; i < bufferLength; i += 2) {
            const value = dataArray[i];
            const angle = (i / bufferLength) * Math.PI * 2;
            const barLen = (value / 255) * 75;

            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + barLen);
            const y2 = centerY + Math.sin(angle) * (radius + barLen);

            ctx.strokeStyle = i % 4 === 0 ? '#00f0ff' : '#ff007f';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
        }
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.font = '600 14px Space Grotesk';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ Play audio to start real-time spectrum engine', width / 2, height / 2);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isVisualizerOpen, visualizerTab, canvasMode, isPlaying]);

  // Realtime Listening Party Synchronization
  useEffect(() => {
    if (isPartyMode) {
      const channel = supabase.channel('apollo_party', {
        config: { broadcast: { self: false } },
      });

      channel.on('broadcast', { event: 'sync_playback' }, ({ payload }) => {
        if (!payload) return;
        if (payload.song && payload.song.id !== currentSong?.id) {
          setCurrentSong(payload.song);
          if (audioRef.current) audioRef.current.src = payload.song.url;
        }
        if (audioRef.current) {
          if (Math.abs(audioRef.current.currentTime - payload.currentTime) > 2) {
            audioRef.current.currentTime = payload.currentTime;
          }
          if (payload.isPlaying && audioRef.current.paused) {
            audioRef.current.play().catch(e => console.error(e));
            setIsPlaying(true);
          } else if (!payload.isPlaying && !audioRef.current.paused) {
            audioRef.current.pause();
            setIsPlaying(false);
          }
        }
      }).subscribe();

      partyChannelRef.current = channel;
    } else {
      if (partyChannelRef.current) {
        supabase.removeChannel(partyChannelRef.current);
        partyChannelRef.current = null;
      }
    }

    return () => {
      if (partyChannelRef.current) supabase.removeChannel(partyChannelRef.current);
    };
  }, [isPartyMode, currentSong]);

  const broadcastPlaybackState = (isPlayingState: boolean, song: Song | null = currentSong) => {
    if (isPartyMode && partyChannelRef.current && song && audioRef.current) {
      partyChannelRef.current.send({
        type: 'broadcast',
        event: 'sync_playback',
        payload: {
          song: song,
          currentTime: audioRef.current.currentTime,
          isPlaying: isPlayingState
        }
      });
    }
  };

  // Fetch Live Lyrics
  useEffect(() => {
    if (!currentSong) return;
    const fetchLyricsData = async () => {
      setIsFetchingLyrics(true);
      setLiveLyrics(null);
      try {
        const res = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(currentSong.artist)}/${encodeURIComponent(currentSong.title)}`);
        if (res.ok) {
          const data = await res.json();
          setLiveLyrics(data.lyrics || "No live lyrics found for this track.");
        } else {
          setLiveLyrics("No live lyrics found for this track.");
        }
      } catch (err) {
        setLiveLyrics("Failed to fetch live lyrics.");
      } finally {
        setIsFetchingLyrics(false);
      }
    };
    fetchLyricsData();
  }, [currentSong]);

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

  const toggleLike = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isCurrentlyLiked = likedSongIds.includes(id);
    const newLikedState = !isCurrentlyLiked;

    setLikedSongIds(prev =>
      newLikedState ? [...prev, id] : prev.filter(item => item !== id)
    );
    setSongs(prev =>
      prev.map(s => s.id === id ? { ...s, is_liked: newLikedState } : s)
    );

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

    initWebAudio();
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    setCurrentSong(song);
    setIsPlaying(true);
    broadcastPlaybackState(true, song);

    const updatedPlays = (song.plays || 0) + 1;
    setSongs(prev =>
      prev.map(s => s.id === song.id ? { ...s, plays: updatedPlays } : s)
    );

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
    initWebAudio();
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
      broadcastPlaybackState(false);
    } else {
      audioRef.current.play();
      broadcastPlaybackState(true);
    }
    setIsPlaying(!isPlaying);
  };

  const addToQueue = (song: Song, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setQueue(prev => [...prev, song]);
  };

  const removeFromQueue = (index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  };

  const moveQueueItem = (index: number, direction: 'up' | 'down') => {
    setQueue(prev => {
      const newQ = [...prev];
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= newQ.length) return prev;
      const temp = newQ[index];
      newQ[index] = newQ[targetIdx];
      newQ[targetIdx] = temp;
      return newQ;
    });
  };

  const skipForward10 = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + 10);
    }
  };

  const skipBackward10 = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
    }
  };

  const toggleRepeatMode = () => {
    setRepeatMode(prev => prev === 'off' ? 'all' : prev === 'all' ? 'track' : 'off');
  };

  const nextSong = () => {
    if (queue.length > 0) {
      const nextInQueue = queue[0];
      setQueue(prev => prev.slice(1));
      playSong(nextInQueue);
      return;
    }

    if (!currentSong || songs.length === 0) return;
    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * songs.length);
      playSong(songs[randomIndex]);
    } else {
      const currentIndex = songs.findIndex((s) => s.id === currentSong.id);
      const nextIndex = (currentIndex + 1) % songs.length;
      playSong(songs[nextIndex]);
    }
  };

  const prevSong = () => {
    if (!currentSong || songs.length === 0) return;
    const currentIndex = songs.findIndex((s) => s.id === currentSong.id);
    const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    playSong(songs[prevIndex]);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator && currentSong) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentSong.title,
          artist: currentSong.artist,
          album: currentSong.album || "Apollo 999",
          artwork: [
            { src: currentSong.cover_url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80", sizes: "512x512", type: "image/jpeg" }
          ]
        });

        navigator.mediaSession.setActionHandler('play', () => {
          audioRef.current?.play();
          setIsPlaying(true);
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          audioRef.current?.pause();
          setIsPlaying(false);
        });
        navigator.mediaSession.setActionHandler('previoustrack', prevSong);
        navigator.mediaSession.setActionHandler('nexttrack', nextSong);

        try {
          navigator.mediaSession.setActionHandler('seekbackward', null);
        } catch (e) {}
        try {
          navigator.mediaSession.setActionHandler('seekforward', null);
        } catch (e) {}
      } catch (err) {
        console.warn("MediaSession error", err);
      }
    }
  }, [currentSong, songs, isShuffle, repeatMode, queue]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (e.shiftKey) nextSong();
        else skipForward10();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (e.shiftKey) prevSong();
        else skipBackward10();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSong, isPlaying, songs, isShuffle, queue]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const cur = audioRef.current.currentTime;
      const dur = audioRef.current.duration || 0;
      setProgress(cur);
      setDuration(dur);

      if (typeof window !== 'undefined' && 'mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
        try {
          if (dur > 0 && !isNaN(cur)) {
            navigator.mediaSession.setPositionState({
              duration: dur,
              playbackRate: audioRef.current.playbackRate || 1,
              position: Math.min(cur, dur)
            });
          }
        } catch (e) {}
      }
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

  // Dynamic Search, Filter, Playlist & Multi-Sort Calculation
  const displayedSongs = (() => {
    let list = activeTab === 'favorites' 
      ? songs.filter(s => likedSongIds.includes(s.id))
      : activePlaylistId
      ? songs.filter(s => playlists.find(p => p.id === activePlaylistId)?.songIds.includes(s.id))
      : songs;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => 
        s.title.toLowerCase().includes(q) || 
        s.artist.toLowerCase().includes(q) || 
        (s.album && s.album.toLowerCase().includes(q))
      );
    }

    if (vibeFilter !== 'all') {
      if (vibeFilter === 'unreleased') {
        list = list.filter(s => s.title.toLowerCase().includes('unreleased') || s.title.toLowerCase().includes('vault') || s.album?.toLowerCase().includes('vault'));
      } else if (vibeFilter === 'synthwave') {
        list = list.filter(s => s.genre?.toLowerCase().includes('synth') || s.album?.toLowerCase().includes('cyber'));
      }
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'artist') return a.artist.localeCompare(b.artist);
      if (sortBy === 'plays') return (b.plays || 0) - (a.plays || 0);
      if (sortBy === 'oldest') return (a.created_at || '').localeCompare(b.created_at || '');
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
  })();

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
                className={`${styles.navItem} ${activeTab === 'my-library' && !activePlaylistId ? styles.navItemActive : ''}`}
                onClick={() => { setActiveTab('my-library'); setActivePlaylistId(null); }}
              >
                <Disc size={18} /> Feed & Library
                <span className={styles.dockBadge}>{songs.length}</span>
              </button>

              <button 
                className={`${styles.navItem} ${activeTab === 'juicewrld' ? styles.navItemActive : ''}`}
                onClick={() => { setActiveTab('juicewrld'); setActivePlaylistId(null); }}
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
                onClick={() => { setActiveTab('favorites'); setActivePlaylistId(null); }}
              >
                <Heart size={18} style={{ color: 'var(--neon-pink)' }} /> Favourites
                <span className={styles.dockBadge}>{totalLikesCount}</span>
              </button>

              <button 
                className={styles.navItem} 
                onClick={() => setIsQueueOpen(true)}
              >
                <ListMusic size={18} style={{ color: 'var(--neon-amber)' }} /> Audio Queue
                {queue.length > 0 && <span className={styles.dockBadge} style={{ background: 'rgba(255,170,0,0.15)', color: 'var(--neon-amber)' }}>{queue.length}</span>}
              </button>
            </nav>

            {/* CUSTOM PLAYLISTS SECTION */}
            <div className={styles.navSection}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '0.5rem' }}>
                <div className={styles.navLabel}>CUSTOM PLAYLISTS</div>
                <button 
                  onClick={() => setIsPlaylistModalOpen(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--neon-cyan)', cursor: 'pointer', padding: '2px' }}
                  title="Create New Playlist"
                >
                  <Plus size={14} />
                </button>
              </div>

              {playlists.map(p => (
                <button
                  key={p.id}
                  className={`${styles.navItem} ${activePlaylistId === p.id ? styles.navItemActive : ''}`}
                  onClick={() => { setActiveTab('my-library'); setActivePlaylistId(p.id); }}
                >
                  <span className={styles.vibeDot} style={{ color: p.color }}></span> {p.name}
                  <span className={styles.dockBadge}>{p.songIds.length}</span>
                </button>
              ))}
            </div>

            {/* VIBE TAGS */}
            <div className={styles.navSection}>
              <div className={styles.navLabel}>GENRES & VIBES</div>
              <div className={styles.vibeTag} onClick={() => setVibeFilter(vibeFilter === 'unreleased' ? 'all' : 'unreleased')}>
                <span className={styles.vibeDot} style={{ color: '#ff007f' }}></span> Unreleased 999
              </div>
              <div className={styles.vibeTag} onClick={() => setVibeFilter(vibeFilter === 'synthwave' ? 'all' : 'synthwave')}>
                <span className={styles.vibeDot} style={{ color: '#00f0ff' }}></span> Synthwave & Cyber
              </div>
            </div>
          </div>

          <div className={styles.dockFooter}>
            <div className={styles.dockStatus}>
              <span className={styles.statusDot}></span>
              <span>Web Audio Engine Live</span>
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
            {/* Mobile Header Branding */}
            <div className={styles.mobileBrandHeader}>
              <div className="gradient-text-flashy" style={{ fontFamily: 'Syne', fontSize: '1.3rem', fontWeight: 800 }}>
                APOLLO 999
              </div>
              <div className={styles.mobileBrandActions}>
                <button className="btn-cyber-outline" style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }} onClick={() => setIsVisualizerOpen(true)}>
                  <Sparkles size={14} style={{ color: 'var(--neon-pink)' }} /> Studio
                </button>
                <button className="btn-neon" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => { setSelectedJuiceTrack(null); setIsModalOpen(true); }}>
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>

            <div className={styles.searchBox}>
              <Search size={18} style={{ color: 'var(--neon-cyan)' }} />
              <input 
                type="text" 
                placeholder={activeTab === 'juicewrld' ? "Search Juice WRLD Vault API..." : "Live search songs, artists, or albums..."} 
                value={activeTab === 'juicewrld' ? juiceSearch : searchQuery}
                onChange={(e) => {
                  if (activeTab === 'juicewrld') {
                    setJuiceSearch(e.target.value);
                  } else {
                    setSearchQuery(e.target.value);
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
              <button 
                className={isPartyMode ? "btn-neon" : "btn-cyber-outline"} 
                onClick={() => setIsPartyMode(!isPartyMode)}
                style={{ background: isPartyMode ? 'var(--neon-pink)' : 'transparent', borderColor: isPartyMode ? 'var(--neon-pink)' : 'var(--border-neon)' }}
              >
                <Radio size={16} style={{ color: isPartyMode ? 'white' : 'var(--neon-pink)' }} /> <span>Party Sync</span>
              </button>
              <button className="btn-cyber-outline" onClick={() => setIsQueueOpen(true)}>
                <ListMusic size={16} style={{ color: 'var(--neon-amber)' }} /> Queue ({queue.length})
              </button>
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
                  {songs.length} tracks • Hi-Res 320kbps
                </div>
                <h3 className="gradient-text-flashy" style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                  Spotlight Track
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
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '0.2rem' }}>Web Audio DSP Engine & Equalizer Active</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Enjoy 5-Band Equalizer, real-time Canvas Visualizer & Slowed + Reverb mode.</p>
              </div>
              <button className="btn-neon" style={{ fontSize: '0.78rem', padding: '0.5rem 1.2rem' }} onClick={() => setIsVisualizerOpen(true)}>
                <Zap size={14} /> Open FX Studio
              </button>
            </div>
          </section>

          {/* Content Track Section */}
          <section className={styles.gridSection}>
            {/* SEARCH, SORT & FILTER TOOLBAR */}
            <div className={styles.filterBar}>
              <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
                {activeTab === 'my-library' && <Disc style={{ color: 'var(--neon-cyan)' }} />}
                {activeTab === 'juicewrld' && <Flame style={{ color: 'var(--neon-pink)' }} />}
                {activeTab === 'favorites' && <Heart style={{ color: 'var(--neon-pink)' }} />}
                {activePlaylistId ? playlists.find(p => p.id === activePlaylistId)?.name : activeTab === 'my-library' ? "Your Music Collection" : activeTab === 'juicewrld' ? "Juice WRLD Vault 999" : "Your Favorites"}
              </h2>

              {activeTab !== 'juicewrld' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className={styles.filterChips}>
                    <button 
                      className={`${styles.filterChip} ${vibeFilter === 'all' ? styles.filterChipActive : ''}`}
                      onClick={() => setVibeFilter('all')}
                    >
                      All Tracks
                    </button>
                    <button 
                      className={`${styles.filterChip} ${vibeFilter === 'unreleased' ? styles.filterChipActive : ''}`}
                      onClick={() => setVibeFilter(vibeFilter === 'unreleased' ? 'all' : 'unreleased')}
                    >
                      🔥 Unreleased
                    </button>
                  </div>

                  <select 
                    className={styles.sortSelect} 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value as any)}
                  >
                    <option value="newest">Sort: Newest First</option>
                    <option value="oldest">Sort: Oldest First</option>
                    <option value="title">Sort: Title (A-Z)</option>
                    <option value="artist">Sort: Artist Name</option>
                    <option value="plays">Sort: Most Played</option>
                  </select>

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
              )}
            </div>

            {activeTab === 'my-library' || activeTab === 'favorites' ? (
              displayedSongs.length === 0 ? (
                <div className="cyber-panel" style={{ padding: '3rem', textAlign: 'center', margin: '2rem 0' }}>
                  <Music size={48} style={{ color: 'var(--neon-pink)', margin: '0 auto 1rem' }} />
                  <h3 className="gradient-text-flashy" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                    {activeTab === 'favorites' ? "No Favorites Saved Yet" : searchQuery ? "No Songs Found Matching Search" : "No Songs Uploaded Yet"}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    {activeTab === 'favorites' ? "Click the heart icon on any song to add it to your favorites." : "Upload your local audio files or explore the Juice WRLD Vault."}
                  </p>
                  <button className="btn-neon" onClick={() => setIsModalOpen(true)}>
                    <Upload size={16} /> Upload Audio File
                  </button>
                </div>
              ) : viewMode === 'list' ? (
                /* DETAILED TABLE LIST VIEW */
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

                        <div className={styles.mobileHide} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {song.album || 'Single Release'}
                        </div>

                        <div className={styles.mobileHide} style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {song.year || '2026'}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button 
                            className="btn-cyber-outline" 
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                            onClick={(e) => addToQueue(song, e)}
                            title="Add to Audio Queue"
                          >
                            <Plus size={14} /> Queue
                          </button>
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

                        <button 
                          className="btn-cyber-outline" 
                          style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.75rem', padding: '0.35rem' }}
                          onClick={(e) => addToQueue(song, e)}
                        >
                          <Plus size={14} /> Add to Queue
                        </button>

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

      {/* Futuristic Cyberdeck Player (Desktop + Mobile Mini Player & Expanded Sheet) */}
      {currentSong && (
        <>
          {/* Mobile Mini Player Bar */}
          <div className={styles.mobileMiniPlayer}>
            <div 
              className={styles.miniPlayerProgressBar} 
              style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
            />

            <div 
              className={styles.miniPlayerTrackInfo}
              onClick={() => setIsMobilePlayerExpanded(true)}
            >
              <img 
                src={currentSong.cover_url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80"} 
                alt={currentSong.title} 
                className={`${styles.miniPlayerArt} ${isPlaying ? styles.isVinylSpinning : ''}`} 
              />
              <div className={styles.miniPlayerMeta}>
                <div className={styles.miniPlayerTitle}>{currentSong.title}</div>
                <div className={styles.miniPlayerArtist}>{currentSong.artist}</div>
              </div>
            </div>

            <div className={styles.miniPlayerControls}>
              <button 
                className={styles.miniPlayerBtn} 
                onClick={(e) => { e.stopPropagation(); toggleLike(currentSong.id); }}
                style={{ color: likedSongIds.includes(currentSong.id) ? 'var(--neon-pink)' : 'var(--text-muted)' }}
              >
                <Heart size={20} fill={likedSongIds.includes(currentSong.id) ? 'var(--neon-pink)' : 'none'} />
              </button>

              <button 
                className={styles.miniPlayerPlayBtn} 
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              >
                {isPlaying ? <Pause size={18} fill="black" /> : <Play size={18} fill="black" style={{ marginLeft: '2px' }} />}
              </button>

              <button 
                className={styles.miniPlayerBtn} 
                onClick={(e) => { e.stopPropagation(); nextSong(); }}
              >
                <SkipForward size={20} fill="currentColor" />
              </button>
            </div>
          </div>

          {/* Desktop Cyberdeck Player Bar */}
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
              <div className={styles.controlButtons} style={{ gap: '0.6rem' }}>
                <button 
                  className={styles.btnControlIcon} 
                  onClick={() => setIsShuffle(!isShuffle)}
                  style={{ color: isShuffle ? 'var(--neon-cyan)' : 'var(--text-muted)' }}
                  title={isShuffle ? "Shuffle On" : "Shuffle Off"}
                >
                  <Shuffle size={16} />
                </button>

                <button className={styles.btnControlIcon} onClick={skipBackward10} title="Rewind 10s">
                  <RotateCcw size={17} />
                </button>

                <button className={styles.btnControlIcon} onClick={prevSong} title="Previous Song">
                  <SkipBack size={20} fill="currentColor" />
                </button>

                <button className={styles.btnPlayMain} onClick={togglePlay} title={isPlaying ? "Pause" : "Play"}>
                  {isPlaying ? <Pause size={22} fill="black" /> : <Play size={22} fill="black" style={{ marginLeft: '2px' }} />}
                </button>

                <button className={styles.btnControlIcon} onClick={nextSong} title="Next Song">
                  <SkipForward size={20} fill="currentColor" />
                </button>

                <button className={styles.btnControlIcon} onClick={skipForward10} title="Skip 10s">
                  <RotateCw size={17} />
                </button>

                <button 
                  className={styles.btnControlIcon} 
                  onClick={toggleRepeatMode}
                  style={{ color: repeatMode !== 'off' ? 'var(--neon-pink)' : 'var(--text-muted)' }}
                  title={`Repeat: ${repeatMode}`}
                >
                  {repeatMode === 'track' ? <Repeat1 size={17} /> : <Repeat size={17} />}
                </button>
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
              <button 
                className={styles.btnControlIcon} 
                onClick={() => setIsQueueOpen(true)}
                style={{ color: queue.length > 0 ? 'var(--neon-amber)' : 'inherit' }}
                title="View Queue"
              >
                <ListMusic size={18} />
              </button>

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

              <button className={styles.btnControlIcon} onClick={() => setIsVisualizerOpen(true)} title="Visualizer Studio">
                <Maximize2 size={18} style={{ color: 'var(--neon-pink)' }} />
              </button>
            </div>
          </div>

          {/* Full-Screen Mobile Player Sheet */}
          {isMobilePlayerExpanded && (
            <div className={styles.mobileExpandedSheet}>
              <div className={styles.mobileSheetHeader}>
                <button 
                  className={styles.mobileSheetCloseBtn}
                  onClick={() => setIsMobilePlayerExpanded(false)}
                >
                  <ChevronDown size={28} />
                </button>
                <div className={styles.mobileSheetHeaderTitle}>
                  PLAYING FROM APOLLO
                </div>
                <button 
                  className={styles.mobileSheetCloseBtn}
                  onClick={() => toggleLike(currentSong.id)}
                  style={{ color: likedSongIds.includes(currentSong.id) ? 'var(--neon-pink)' : 'var(--text-muted)' }}
                >
                  <Heart size={22} fill={likedSongIds.includes(currentSong.id) ? 'var(--neon-pink)' : 'none'} />
                </button>
              </div>

              <div className={styles.mobileSheetBody}>
                <div className={styles.mobileSheetArtWrap}>
                  <img 
                    src={currentSong.cover_url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&q=80"} 
                    alt={currentSong.title} 
                    className={`${styles.mobileSheetArt} ${isPlaying ? styles.isVinylSpinning : ''}`} 
                  />
                  <div className={styles.mobileSheetArtGlow} />
                </div>

                <div className={styles.mobileSheetMeta}>
                  <h2 className="gradient-text-flashy" style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>
                    {currentSong.title}
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '0.25rem' }}>
                    {currentSong.artist} {currentSong.album ? `• ${currentSong.album}` : ''}
                  </p>
                </div>

                <div className={styles.mobileSheetProgressWrap}>
                  <div className={styles.progressTrackCyber} style={{ height: '8px' }} onClick={handleProgressClick}>
                    <div className={styles.progressFillCyber} style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }} />
                  </div>
                  <div className={styles.mobileSheetTimeRow}>
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className={styles.mobileSheetControlsRow}>
                  <button 
                    className={styles.btnControlIcon} 
                    onClick={() => setIsShuffle(!isShuffle)}
                    style={{ color: isShuffle ? 'var(--neon-cyan)' : 'var(--text-muted)' }}
                  >
                    <Shuffle size={22} />
                  </button>

                  <button className={styles.btnControlIcon} onClick={prevSong}>
                    <SkipBack size={32} fill="currentColor" />
                  </button>

                  <button className={styles.mobileSheetPlayBtnMain} onClick={togglePlay}>
                    {isPlaying ? <Pause size={30} fill="black" /> : <Play size={30} fill="black" style={{ marginLeft: '4px' }} />}
                  </button>

                  <button className={styles.btnControlIcon} onClick={nextSong}>
                    <SkipForward size={32} fill="currentColor" />
                  </button>

                  <button 
                    className={styles.btnControlIcon} 
                    onClick={toggleRepeatMode}
                    style={{ color: repeatMode !== 'off' ? 'var(--neon-pink)' : 'var(--text-muted)' }}
                  >
                    {repeatMode === 'track' ? <Repeat1 size={22} /> : <Repeat size={22} />}
                  </button>
                </div>

                <div className={styles.mobileSheetVolumeRow}>
                  <Volume2 size={18} style={{ color: 'var(--neon-cyan)' }} />
                  <div 
                    className={styles.progressTrackCyber} 
                    style={{ height: '6px' }}
                    onClick={(e) => {
                      if(!audioRef.current) return;
                      const bounds = e.currentTarget.getBoundingClientRect();
                      audioRef.current.volume = Math.max(0, Math.min(1, (e.clientX - bounds.left) / bounds.width));
                    }}
                  >
                    <div className={styles.progressFillCyber} style={{ width: `${(audioRef.current?.volume ?? 1) * 100}%` }} />
                  </div>
                </div>

                <div className={styles.mobileSheetToolsRow}>
                  <button 
                    className="btn-cyber-outline" 
                    style={{ flex: 1, fontSize: '0.8rem', padding: '0.55rem' }} 
                    onClick={() => { setIsMobilePlayerExpanded(false); setIsVisualizerOpen(true); }}
                  >
                    <BarChart3 size={16} style={{ color: 'var(--neon-cyan)' }} /> FX Studio
                  </button>
                  <button 
                    className="btn-cyber-outline" 
                    style={{ flex: 1, fontSize: '0.8rem', padding: '0.55rem' }} 
                    onClick={() => { setIsMobilePlayerExpanded(false); setSelectedJuiceTrack(null); setIsModalOpen(true); }}
                  >
                    <Upload size={16} style={{ color: 'var(--neon-amber)' }} /> Upload
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* UP NEXT QUEUE DRAWER */}
      {isQueueOpen && (
        <div className={styles.queueDrawerOverlay} onClick={() => setIsQueueOpen(false)}>
          <div className={styles.queueDrawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.queueHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <ListMusic size={22} style={{ color: 'var(--neon-amber)' }} />
                <h3 className="gradient-text-flashy" style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  Audio Queue ({queue.length})
                </h3>
              </div>
              <button className="btn-cyber-outline" style={{ padding: '0.35rem 0.6rem' }} onClick={() => setIsQueueOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {/* Currently Playing Card */}
            {currentSong && (
              <div style={{ marginBottom: '1.25rem', padding: '0.85rem', background: 'rgba(0, 240, 255, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid var(--neon-cyan)' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--neon-cyan)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>NOW PLAYING</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img src={currentSong.cover_url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80"} alt={currentSong.title} style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover' }} />
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{currentSong.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{currentSong.artist}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Queue List */}
            <div className={styles.queueList}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>UP NEXT</div>
              {queue.length === 0 ? (
                <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Queue is empty. Click "+ Queue" on any song to add it!
                </div>
              ) : (
                queue.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className={styles.queueRow}>
                    <img src={item.cover_url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80"} alt={item.title} style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.artist}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.2rem' }}>
                      <button className={styles.btnControlIcon} onClick={() => moveQueueItem(idx, 'up')} disabled={idx === 0}><ArrowUp size={14} /></button>
                      <button className={styles.btnControlIcon} onClick={() => moveQueueItem(idx, 'down')} disabled={idx === queue.length - 1}><ArrowDown size={14} /></button>
                      <button className={styles.btnControlIcon} onClick={() => removeFromQueue(idx)} style={{ color: 'var(--neon-pink)' }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {queue.length > 0 && (
              <button 
                className="btn-cyber-outline" 
                style={{ width: '100%', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--neon-pink)' }}
                onClick={() => setQueue([])}
              >
                Clear Queue
              </button>
            )}
          </div>
        </div>
      )}

      {/* Visualizer Studio Overlay */}
      {isVisualizerOpen && (
        <div className={styles.visualizerOverlay}>
          <div className={styles.visualizerHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div className="gradient-text-flashy" style={{ fontSize: '1.6rem', fontWeight: 800 }}>APOLLO AUDIO FX STUDIO</div>
              
              {/* Studio Tabs */}
              <div className={styles.modePills}>
                <button 
                  className={`${styles.modePill} ${visualizerTab === 'canvas' ? styles.modePillActive : ''}`}
                  onClick={() => setVisualizerTab('canvas')}
                >
                  <Activity size={15} /> Visualizer Canvas
                </button>
                <button 
                  className={`${styles.modePill} ${visualizerTab === 'eq' ? styles.modePillActive : ''}`}
                  onClick={() => setVisualizerTab('eq')}
                >
                  <Sliders size={15} /> 5-Band EQ & Speed
                </button>
                <button 
                  className={`${styles.modePill} ${visualizerTab === 'lyrics' ? styles.modePillActive : ''}`}
                  onClick={() => setVisualizerTab('lyrics')}
                >
                  <AlignLeft size={15} /> Karaoke Lyrics
                </button>
              </div>
            </div>

            <button className="btn-cyber-outline" onClick={() => setIsVisualizerOpen(false)}>
              <X size={20} /> Close Studio
            </button>
          </div>

          <div className={styles.visualizerBody}>
            {visualizerTab === 'canvas' && (
              <>
                {/* Canvas Render Window */}
                <div className={styles.canvasContainer}>
                  <canvas 
                    ref={canvasRef} 
                    width={800} 
                    height={260} 
                    className={styles.visualizerCanvas}
                  />
                </div>

                {/* Canvas Mode Switcher */}
                <div className={styles.modePills}>
                  <button 
                    className={`${styles.modePill} ${canvasMode === 'spectrum' ? styles.modePillActive : ''}`}
                    onClick={() => setCanvasMode('spectrum')}
                  >
                    Cyber Spectrum
                  </button>
                  <button 
                    className={`${styles.modePill} ${canvasMode === 'waveform' ? styles.modePillActive : ''}`}
                    onClick={() => setCanvasMode('waveform')}
                  >
                    Oscilloscope Wave
                  </button>
                  <button 
                    className={`${styles.modePill} ${canvasMode === 'circular' ? styles.modePillActive : ''}`}
                    onClick={() => setCanvasMode('circular')}
                  >
                    Pulse Ring
                  </button>
                </div>
              </>
            )}

            {visualizerTab === 'eq' && (
              <div className={styles.eqPanel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>5-Band Graphic Equalizer</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tune sound frequencies directly in your browser using Web Audio API</p>
                  </div>

                  <button 
                    className={`${styles.slowedToggleBtn} ${isSlowedAndReverb ? styles.slowedToggleBtnActive : ''}`}
                    onClick={() => {
                      if (isSlowedAndReverb) {
                        applyEqPreset('flat');
                      } else {
                        applyEqPreset('slowed-reverb');
                      }
                    }}
                  >
                    <Flame size={16} /> Slowed + Reverb 999 Mode
                  </button>
                </div>

                {/* EQ Presets */}
                <div className={styles.eqPresetsRow}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>PRESETS:</span>
                  <button className={`${styles.presetChip} ${activeEqPreset === 'flat' ? styles.presetChipActive : ''}`} onClick={() => applyEqPreset('flat')}>Flat</button>
                  <button className={`${styles.presetChip} ${activeEqPreset === 'bass-boost' ? styles.presetChipActive : ''}`} onClick={() => applyEqPreset('bass-boost')}>Bass Boost</button>
                  <button className={`${styles.presetChip} ${activeEqPreset === 'cyber-club' ? styles.presetChipActive : ''}`} onClick={() => applyEqPreset('cyber-club')}>Cyber Club</button>
                  <button className={`${styles.presetChip} ${activeEqPreset === 'vocal' ? styles.presetChipActive : ''}`} onClick={() => applyEqPreset('vocal')}>Vocal Polish</button>
                </div>

                {/* 5-Band Sliders Grid */}
                <div className={styles.eqSlidersGrid}>
                  {['60Hz', '250Hz', '1kHz', '4kHz', '12kHz'].map((label, i) => (
                    <div key={label} className={styles.eqCol}>
                      <span className={styles.eqVal}>{eqGains[i] > 0 ? `+${eqGains[i]}` : eqGains[i]}dB</span>
                      <input 
                        type="range" 
                        min="-12" 
                        max="12" 
                        step="1"
                        value={eqGains[i]} 
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setEqGains(prev => {
                            const updated = [...prev];
                            updated[i] = val;
                            return updated;
                          });
                          setActiveEqPreset('custom');
                        }}
                        className={styles.eqSliderVertical} 
                      />
                      <span className={styles.eqLabel}>{label}</span>
                    </div>
                  ))}
                </div>

                {/* Speed & Pitch Control */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--border-glass)' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Quick Effects:</span>
                    <button 
                      className={isNightcore ? "btn-neon" : "btn-cyber-outline"} 
                      onClick={() => setIsNightcore(!isNightcore)} 
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                    >
                      <Zap size={14} /> Nightcore (1.25x)
                    </button>
                    <button 
                      className={isBassBoost ? "btn-neon" : "btn-cyber-outline"} 
                      onClick={() => setIsBassBoost(!isBassBoost)} 
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                    >
                      <Radio size={14} /> Mega Bass Boost
                    </button>
                  </div>

                  <div className={styles.modePills}>
                    {[0.8, 1.0, 1.25, 1.5].map(speed => (
                      <button 
                        key={speed} 
                        className={`${styles.modePill} ${playbackSpeed === speed && !isNightcore ? styles.modePillActive : ''}`}
                        onClick={() => { setIsNightcore(false); setPlaybackSpeed(speed); }}
                      >
                        {speed === 0.8 ? "0.8x (Slowed)" : `${speed}x`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {visualizerTab === 'lyrics' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
                {/* Synced Karaoke Lyrics */}
                <div className={styles.lyricsContainer}>
                  {MOCK_LYRICS.map((line, idx) => {
                    const isActive = progress >= line.time && (idx === MOCK_LYRICS.length - 1 || progress < MOCK_LYRICS[idx + 1].time);
                    return (
                      <div 
                        key={idx} 
                        className={`${styles.lyricLine} ${isActive ? styles.lyricLineActive : ''}`}
                        onClick={() => {
                          if (audioRef.current) audioRef.current.currentTime = line.time;
                        }}
                      >
                        {line.text}
                      </div>
                    );
                  })}
                </div>

                {/* API Live Fetched Lyrics Box */}
                {liveLyrics && (
                  <div className={styles.lyricsPanel}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--neon-cyan)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                      API Live Song Lyrics
                    </div>
                    {isFetchingLyrics ? (
                      <div className={styles.lyricsLoading}>Fetching live lyrics for track...</div>
                    ) : (
                      <pre className={styles.lyricsText}>{liveLyrics}</pre>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <h2 className="gradient-text-flashy" style={{ fontSize: '1.8rem', marginBottom: '0.2rem' }}>
                {currentSong ? currentSong.title : "No Track Playing"}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                {currentSong ? currentSong.artist : "Select a track from your library to start"}
              </p>
            </div>

            {currentSong && (
              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                <button 
                  className={styles.btnControlIcon} 
                  onClick={() => setIsShuffle(!isShuffle)}
                  style={{ color: isShuffle ? 'var(--neon-cyan)' : 'var(--text-muted)' }}
                >
                  <Shuffle size={20} />
                </button>
                <button className={styles.btnControlIcon} onClick={skipBackward10}><RotateCcw size={22} /></button>
                <button className={styles.btnControlIcon} onClick={prevSong}><SkipBack size={26} /></button>
                <button className={styles.btnPlayMain} style={{ width: '64px', height: '64px' }} onClick={togglePlay}>
                  {isPlaying ? <Pause size={28} fill="black" /> : <Play size={28} fill="black" style={{ marginLeft: '3px' }} />}
                </button>
                <button className={styles.btnControlIcon} onClick={nextSong}><SkipForward size={26} /></button>
                <button className={styles.btnControlIcon} onClick={skipForward10}><RotateCw size={22} /></button>
                <button 
                  className={styles.btnControlIcon} 
                  onClick={toggleRepeatMode}
                  style={{ color: repeatMode !== 'off' ? 'var(--neon-pink)' : 'var(--text-muted)' }}
                >
                  {repeatMode === 'track' ? <Repeat1 size={20} /> : <Repeat size={20} />}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE PLAYLIST MODAL */}
      {isPlaylistModalOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalWindow}>
            <div className={styles.modalHead}>
              <h3 className="gradient-text-flashy">Create Custom Playlist</h3>
              <button className="btn-cyber-outline" style={{ padding: '0.4rem' }} onClick={() => setIsPlaylistModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Playlist Name</label>
                <input 
                  className="input-cyber" 
                  placeholder="e.g. 999 Midnight Vibe" 
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Accent Color</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {['#00f0ff', '#ff007f', '#8b5cf6', '#ffaa00', '#00ffaa'].map(c => (
                    <button
                      key={c}
                      onClick={() => setNewPlaylistColor(c)}
                      style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '50%', 
                        background: c, 
                        border: newPlaylistColor === c ? '3px solid #fff' : 'none',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>

              <button className="btn-neon" style={{ marginTop: '1rem' }} onClick={handleCreatePlaylist}>
                Create Playlist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iPhone / PWA Mobile Cyber Navigation Dock */}
      <nav className={styles.mobileCyberDock}>
        <button 
          className={`${styles.mobileNavItem} ${activeTab === 'my-library' ? styles.mobileNavItemActive : ''}`}
          onClick={() => setActiveTab('my-library')}
        >
          <Disc size={20} />
          <span>Library</span>
        </button>

        <button 
          className={`${styles.mobileNavItem} ${activeTab === 'juicewrld' ? styles.mobileNavItemActive : ''}`}
          onClick={() => setActiveTab('juicewrld')}
        >
          <Flame size={20} style={{ color: activeTab === 'juicewrld' ? 'var(--neon-pink)' : 'inherit' }} />
          <span>Juice 999</span>
        </button>

        <button 
          className={`${styles.mobileNavItem} ${activeTab === 'favorites' ? styles.mobileNavItemActive : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          <Heart size={20} style={{ color: activeTab === 'favorites' ? 'var(--neon-pink)' : 'inherit' }} />
          <span>Favorites</span>
        </button>

        <button 
          className={styles.mobileNavItem}
          onClick={() => setIsVisualizerOpen(true)}
        >
          <BarChart3 size={20} style={{ color: 'var(--neon-cyan)' }} />
          <span>Studio</span>
        </button>

        <button 
          className={styles.mobileNavItem}
          onClick={() => { setSelectedJuiceTrack(null); setIsModalOpen(true); }}
        >
          <Upload size={20} style={{ color: 'var(--neon-amber)' }} />
          <span>Upload</span>
        </button>
      </nav>

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
        crossOrigin="anonymous"
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
  const [uploadProgress, setUploadProgress] = useState<{ completed: number; total: number; currentName: string }>({
    completed: 0,
    total: 0,
    currentName: ""
  });

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

  function sanitizeStorageKey(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_.-]/g, '_')
      .replace(/_+/g, '_');
  }

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (files.length === 0) return alert("Please select one or more audio files (.mp3 / .wav)");
    
    const formData = new FormData(e.currentTarget);
    const globalTitle = formData.get('title') as string;
    const globalArtist = formData.get('artist') as string;
    const globalAlbum = formData.get('album') as string;
    const globalYear = formData.get('year') as string;

    setIsUploading(true);
    setUploadProgress({ completed: 0, total: parsedTracks.length, currentName: "Initializing batch engine..." });

    try {
      let globalCoverUrl = selectedTrack?.coverUrl || null;
      if (cover) {
        const cleanCoverName = sanitizeStorageKey(cover.name);
        const coverPath = `covers/${Date.now()}-global-${cleanCoverName}`;
        const { error: coverError } = await supabase.storage
          .from('media')
          .upload(coverPath, cover, { upsert: true });
          
        if (!coverError) {
          const { data: coverUrlData } = supabase.storage.from('media').getPublicUrl(coverPath);
          globalCoverUrl = coverUrlData.publicUrl;
        }
      }

      let completedCount = 0;
      const CONCURRENCY_LIMIT = 5;

      const processTrack = async (item: ParsedTrackItem, i: number) => {
        try {
          const cleanFileName = sanitizeStorageKey(item.file.name);
          const musicPath = `music/${Date.now()}-${i}-${cleanFileName}`;
          
          const { error: musicError } = await supabase.storage
            .from('media')
            .upload(musicPath, item.file, { upsert: true });
            
          if (musicError) {
            console.error(`Error uploading file ${item.title}:`, musicError);
            return null;
          }
          
          const { data: { publicUrl: musicUrl } } = supabase.storage.from('media').getPublicUrl(musicPath);

          let trackCoverUrl = globalCoverUrl;
          if (item.coverBlob) {
            try {
              const coverPath = `covers/${Date.now()}-${i}-embedded.jpg`;
              const { error: itemCoverErr } = await supabase.storage
                .from('media')
                .upload(coverPath, item.coverBlob, { contentType: item.coverBlob.type || 'image/jpeg', upsert: true });
              
              if (!itemCoverErr) {
                const { data: itemCoverData } = supabase.storage.from('media').getPublicUrl(coverPath);
                trackCoverUrl = itemCoverData.publicUrl;
              }
            } catch (err) {
              console.warn("Failed to upload embedded cover for track:", item.title, err);
            }
          }

          const finalTitle = item.title || (files.length === 1 && globalTitle ? globalTitle : item.file.name.replace(/\.[^/.]+$/, ""));
          const finalArtist = item.artist || globalArtist || "Juice WRLD";
          const finalAlbum = item.album || globalAlbum || null;
          const finalYear = item.year || (globalYear ? parseInt(globalYear, 10) : null);

          completedCount++;
          setUploadProgress({
            completed: completedCount,
            total: parsedTracks.length,
            currentName: finalTitle
          });

          return {
            title: finalTitle,
            artist: finalArtist,
            album: finalAlbum,
            year: finalYear,
            url: musicUrl,
            cover_url: trackCoverUrl
          };
        } catch (err) {
          console.error("Track upload failed:", item.title, err);
          completedCount++;
          setUploadProgress({
            completed: completedCount,
            total: parsedTracks.length,
            currentName: item.title
          });
          return null;
        }
      };

      const queue = [...parsedTracks.map((item, index) => ({ item, index }))];
      const validResults: Array<{
        title: string;
        artist: string;
        album: string | null;
        year: number | null;
        url: string;
        cover_url: string | null;
      }> = [];

      const worker = async () => {
        while (queue.length > 0) {
          const next = queue.shift();
          if (next) {
            const res = await processTrack(next.item, next.index);
            if (res) validResults.push(res);
          }
        }
      };

      const workers = Array(Math.min(CONCURRENCY_LIMIT, parsedTracks.length)).fill(0).map(() => worker());
      await Promise.all(workers);

      if (validResults.length > 0) {
        const chunkSize = 50;
        for (let i = 0; i < validResults.length; i += chunkSize) {
          const chunk = validResults.slice(i, i + chunkSize);
          const { error: dbError } = await supabase.from('songs').insert(chunk);
          if (dbError) throw dbError;
        }
      }

      onSuccess();
    } catch (err: any) {
      console.error("Batch upload error:", err);
      const msg = err?.message || err?.error_description || JSON.stringify(err);
      alert(`Batch upload encountered an issue: ${msg}`);
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

          {/* LIVE BATCH UPLOAD PROGRESS BAR */}
          {isUploading && uploadProgress.total > 0 && (
            <div style={{ marginBottom: '1.2rem', padding: '1rem', background: 'rgba(0, 240, 255, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid var(--neon-cyan)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
                <span>Uploading Tracks ({uploadProgress.completed} / {uploadProgress.total})</span>
                <span style={{ color: 'var(--neon-pink)' }}>{Math.round((uploadProgress.completed / uploadProgress.total) * 100)}%</span>
              </div>
              
              <div className={styles.progressTrackCyber} style={{ height: '8px', marginBottom: '0.5rem' }}>
                <div 
                  className={styles.progressFillCyber} 
                  style={{ width: `${Math.round((uploadProgress.completed / uploadProgress.total) * 100)}%`, transition: 'width 0.2s ease' }}
                ></div>
              </div>
              
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Uploading: <span style={{ color: '#fff', fontWeight: 600 }}>{uploadProgress.currentName}</span>
              </div>
            </div>
          )}

          <button type="submit" className="btn-neon" style={{ width: '100%' }} disabled={isUploading}>
            {isUploading ? `Uploading ${uploadProgress.completed} / ${uploadProgress.total} Tracks (${Math.round((uploadProgress.completed / (uploadProgress.total || 1)) * 100)}%)` : files.length > 1 ? `Upload ${files.length} Tracks (Full Album)` : "Add to Apollo Library"}
          </button>
        </form>
      </div>
    </div>
  );
}
