<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Sitemap — The Mavion Corporation</title>
        <link rel="icon" href="/favicon-32.png"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="crossorigin"/>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;family=Archivo:wght@800;900&amp;display=swap" rel="stylesheet"/>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          :root {
            --bg: #0a0a12; --card: #13131f; --card-hover: #1a1a2e;
            --line: rgba(255,255,255,0.07); --text: #fff; --muted: rgba(255,255,255,0.5);
            --cyan: #00D7E2; --blue: #0041E5; --navy: #002BBA;
          }
          body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg); color: var(--text); min-height: 100vh;
            -webkit-font-smoothing: antialiased; line-height: 1.5;
          }
          .wrap { max-width: 980px; margin: 0 auto; padding: 64px 32px 80px; }

          .head {
            display: flex; align-items: center; gap: 16px; margin-bottom: 10px;
          }
          .logo svg { height: 38px; display: block; }
          .kicker { font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--cyan); margin-bottom: 8px; }
          h1 { font-family: 'Archivo', sans-serif; font-weight: 900; font-size: clamp(30px, 5vw, 50px); letter-spacing: -0.03em; line-height: 1; }
          .sub { color: var(--muted); font-size: 16px; margin-top: 14px; max-width: 580px; }
          .count {
            display: inline-flex; align-items: center; gap: 8px; margin-top: 20px;
            font-size: 13px; font-weight: 600; color: var(--muted);
            background: var(--card); border: 1px solid var(--line);
            padding: 7px 14px; border-radius: 999px;
          }
          .count strong { color: var(--text); }

          .list { margin-top: 36px; display: flex; flex-direction: column; gap: 10px; }
          .row {
            display: grid; grid-template-columns: 1fr auto auto auto; align-items: center; gap: 18px;
            background: var(--card); border: 1px solid var(--line); border-radius: 14px;
            padding: 16px 20px; text-decoration: none; color: var(--text);
            transition: transform 0.18s, border-color 0.18s, background 0.18s;
          }
          .row:hover { transform: translateY(-2px); border-color: rgba(0,215,226,0.35); background: var(--card-hover); }
          .row-loc { display: flex; align-items: center; gap: 12px; min-width: 0; }
          .row-loc .ico { color: var(--cyan); flex-shrink: 0; }
          .row-loc .url { font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .row-loc .url .dim { color: var(--muted); font-weight: 500; }

          .pri { display: flex; align-items: center; gap: 8px; }
          .pri-bar { width: 60px; height: 5px; border-radius: 3px; background: rgba(255,255,255,0.1); overflow: hidden; }
          .pri-fill { height: 100%; background: linear-gradient(90deg, var(--blue), var(--cyan)); }
          .pri-num { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; width: 26px; }

          .chip { font-size: 11px; font-weight: 600; text-transform: capitalize; padding: 4px 11px; border-radius: 999px; background: rgba(255,255,255,0.06); color: var(--muted); white-space: nowrap; }
          .date { font-size: 12.5px; color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }

          .foot { margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--line); font-size: 13px; color: var(--muted); }
          .foot a { color: var(--cyan); text-decoration: none; font-weight: 600; }
          .foot code { background: var(--card); padding: 2px 7px; border-radius: 6px; font-size: 12px; color: var(--muted); }

          @media (max-width: 720px) {
            .wrap { padding: 44px 18px 60px; }
            .row { grid-template-columns: 1fr auto; gap: 10px 14px; }
            .date, .chip { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="head">
            <span class="logo">
              <svg viewBox="0 0 83 59" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M83 43.6836L34.9474 31.3232L34.9474 17.4731L83 29.8335L83 43.6836Z" fill="#00D7E2"/>
                <path d="M83 58.9727L34.9474 45.5822L34.9474 30.5779L83 43.9684L83 58.9727Z" fill="#002BBA"/>
                <path d="M83 30.5781L34.9474 18.2177L34.9474 4.3676L83 16.728L83 30.5781Z" fill="#0041E5"/>
                <path d="M0.0175781 13.125L48.0474 25.7355V41.5197L0.0175781 28.4225V13.125Z" fill="#00D7E2"/>
                <path d="M0 28.3945L48.0526 40.7549V54.6051L0 42.2446V28.3945Z" fill="#0041E5"/>
                <path d="M0 0L48.0526 12.3604V26.2105L0 13.8501V0Z" fill="#002BBA"/>
              </svg>
            </span>
          </div>
          <div class="kicker">XML Sitemap</div>
          <h1>The Mavion Corporation</h1>
          <p class="sub">This is the machine-readable map of tmc.gg that search engines use to discover our pages. Below is a friendlier view of the same data.</p>
          <div class="count">
            <span>📍</span>
            <span><strong><xsl:value-of select="count(s:urlset/s:url)"/></strong> URLs indexed</span>
          </div>

          <div class="list">
            <xsl:for-each select="s:urlset/s:url">
              <xsl:sort select="s:priority" order="descending" data-type="number"/>
              <a class="row" target="_blank" rel="noopener">
                <xsl:attribute name="href"><xsl:value-of select="s:loc"/></xsl:attribute>

                <div class="row-loc">
                  <span class="ico">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  </span>
                  <span class="url">
                    <xsl:variable name="path" select="substring-after(s:loc, 'tmc.gg')"/>
                    <span class="dim">tmc.gg</span><xsl:value-of select="$path"/>
                  </span>
                </div>

                <span class="date"><xsl:value-of select="s:lastmod"/></span>

                <span class="chip"><xsl:value-of select="s:changefreq"/></span>

                <span class="pri">
                  <span class="pri-bar">
                    <span class="pri-fill">
                      <xsl:attribute name="style">width: <xsl:value-of select="s:priority * 100"/>%;</xsl:attribute>
                    </span>
                  </span>
                  <span class="pri-num"><xsl:value-of select="s:priority"/></span>
                </span>
              </a>
            </xsl:for-each>
          </div>

          <div class="foot">
            <p>Raw XML lives at <code>/sitemap.xml</code> — crawlers read it directly; this styled view is just for people. · <a href="/">← Back to tmc.gg</a></p>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
