/* ─────────────────────────────────────────────────────────────────────────
   Mavion Radio — multi-source station loader
   Aggregates the built-in TMCast network (cast.tmc.gg) with any extra sources
   listed in /radio-sources.json, and normalises everything to one shape used by
   tmc.gg/stations and the /radio player.

   Add sources by editing radio-sources.json -> "sources": [ ... ]. Types:
     { "type": "azuracast", "base": "https://your.azuracast.tld" }                 // every station on that server
     { "type": "azuracast", "base": "https://your.azuracast.tld", "station": "id" } // one station (numeric id OR shortcode)
     { "type": "stream",  "id": "slug", "name": "My Station", "genre": "Lo-fi",
                          "logo": "https://…/art.png", "stream": "https://…/listen" } // a plain Icecast/Shoutcast stream

   Normalised station shape:
     { station:{id,name,genre,location,logo_url}, now_playing:{artist,title,artwork_url}|null,
       listeners:{current}, live:boolean, listen_url:string, source:string }
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  const PRIMARY = { type: 'tmcast', base: 'https://cast.tmc.gg' };

  const host = (u) => { try { return new URL(u).hostname; } catch { return String(u || '').replace(/^https?:\/\//, '').split('/')[0]; } };

  // ── normalisers ──
  function normTmcast(base, s) {
    const np = s.now_playing;
    return {
      station: { id: String(s.station.id), name: s.station.name || 'Station', genre: s.station.genre || '', location: s.station.location || '', logo_url: s.station.logo_url || '' },
      now_playing: (np && np.title && np.title !== 'Unknown') ? { artist: np.artist || '', title: np.title || '', artwork_url: np.artwork_url || '' } : null,
      listeners: { current: (s.listeners && s.listeners.current) || 0 },
      live: !!s.live,
      listen_url: `${base}/listen/${s.station.id}/radio.mp3`,
      source: 'tmcast'
    };
  }
  function normAzura(base, s) {
    const song = (s.now_playing && s.now_playing.song) || {};
    const mount = (s.station && s.station.mounts && s.station.mounts[0]) || {};
    return {
      station: { id: `${host(base)}__${s.station.id}`, name: s.station.name || 'Station', genre: s.station.genre || '', location: '', logo_url: s.station.logo_url || '' },
      now_playing: song.title ? { artist: song.artist || '', title: song.title || '', artwork_url: song.art || '' } : null,
      listeners: { current: (s.listeners && s.listeners.current) || 0 },
      live: !!(s.live && s.live.is_live) || (s.is_online !== false && !!song.title),
      listen_url: (s.station && s.station.listen_url) || mount.url || '',
      source: 'azuracast'
    };
  }
  function normStream(src) {
    return {
      station: { id: String(src.id || host(src.stream)), name: src.name || 'Stream', genre: src.genre || '', location: src.location || '', logo_url: src.logo || '' },
      now_playing: src.title ? { artist: src.artist || '', title: src.title || '', artwork_url: src.logo || '' } : null,
      listeners: { current: 0 },
      live: true,
      listen_url: src.stream || '',
      source: 'stream'
    };
  }

  async function fetchSource(src) {
    try {
      if (!src || !src.type) return [];
      if (src.type === 'tmcast') {
        const base = String(src.base || PRIMARY.base).replace(/\/+$/, '');
        const r = await fetch(`${base}/api/nowplaying`, { cache: 'no-store' });
        if (!r.ok) return [];
        return (await r.json()).map((s) => normTmcast(base, s));
      }
      if (src.type === 'azuracast') {
        const base = String(src.base || '').replace(/\/+$/, '');
        if (!base) return [];
        if (src.station) {
          const r = await fetch(`${base}/api/nowplaying/${encodeURIComponent(src.station)}`, { cache: 'no-store' });
          if (!r.ok) return [];
          return [normAzura(base, await r.json())];
        }
        const r = await fetch(`${base}/api/nowplaying`, { cache: 'no-store' });
        if (!r.ok) return [];
        return (await r.json()).map((s) => normAzura(base, s));
      }
      if (src.type === 'stream' && src.stream) return [normStream(src)];
    } catch (e) {
      console.warn('[radio] source failed:', src && src.type, src && src.base, e && e.message);
    }
    return [];
  }

  async function getSources() {
    let extra = [];
    try {
      const r = await fetch('/radio-sources.json', { cache: 'no-store' });
      if (r.ok) { const j = await r.json(); extra = Array.isArray(j) ? j : (j.sources || []); }
    } catch { /* no config = TMCast only */ }
    return [PRIMARY, ...extra];
  }

  async function loadStations() {
    const sources = await getSources();
    const groups = await Promise.all(sources.map(fetchSource));
    // de-dupe by id, keep only playable
    const seen = new Set();
    return groups.flat().filter((s) => s.listen_url && !seen.has(s.station.id) && seen.add(s.station.id));
  }

  window.MavionRadio = { loadStations, fetchSource };
})();
