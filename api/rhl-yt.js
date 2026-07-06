// RHL Now 24 — YouTube channel feed proxy.
// Fetches a channel's public uploads feed server-side (no API key required)
// and returns the latest videos as JSON for the /rhl live strip.

const FEED_URL = 'https://www.youtube.com/feeds/videos.xml?channel_id=';

function pick(entry, re) {
  const m = entry.match(re);
  return m ? m[1] : '';
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const channel = String(req.query.channel || '').trim();
  if (!/^UC[A-Za-z0-9_-]{22}$/.test(channel)) {
    res.status(400).json({ error: 'channel must be a YouTube channel id (UC…)' });
    return;
  }

  try {
    const upstream = await fetch(FEED_URL + channel, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RHLNow24/1.0; +https://tmc.gg/rhl)' },
    });
    if (!upstream.ok) {
      res.status(502).json({ error: 'youtube feed unavailable', status: upstream.status });
      return;
    }
    const xml = await upstream.text();

    const channelTitle = decodeEntities(pick(xml, /<title>([^<]*)<\/title>/));
    const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, 10).map((m) => {
      const e = m[1];
      return {
        id: pick(e, /<yt:videoId>([^<]*)<\/yt:videoId>/),
        title: decodeEntities(pick(e, /<title>([^<]*)<\/title>/)),
        published: pick(e, /<published>([^<]*)<\/published>/),
        thumbnail: pick(e, /<media:thumbnail url="([^"]*)"/),
        views: Number(pick(e, /<media:statistics views="(\d+)"/)) || 0,
      };
    });

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
    res.status(200).json({ channel, channelTitle, videos });
  } catch (err) {
    res.status(502).json({ error: 'feed fetch failed' });
  }
};
