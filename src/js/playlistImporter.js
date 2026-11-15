const { exec, spawn } = require('child_process');
const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');

class PlaylistImporter {
    constructor(getYtDlpPath) {
        this.getYtDlpPath = getYtDlpPath;
    }

    detectPlatform(url) {
        if (/open\.spotify\.com\/playlist\//i.test(url)) return 'spotify';
        if (/music\.youtube\.com\/playlist/i.test(url) || /youtube\.com\/playlist/i.test(url) || /youtu\.be/i.test(url)) return 'youtube';
        return null;
    }

    fetchPage(url) {
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https') ? https : http;
            const req = client.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9'
                },
                timeout: 15000
            }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    this.fetchPage(res.headers.location).then(resolve).catch(reject);
                    return;
                }
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            });
            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        });
    }

    async extractSpotifyTracks(url) {
        const embedUrl = url.replace('open.spotify.com/playlist/', 'open.spotify.com/embed/playlist/').split('?')[0];
        const html = await this.fetchPage(embedUrl);

        let playlistTitle = '';
        const titleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) {
            playlistTitle = titleMatch[1].replace(/\s*\|\s*Spotify/i, '').replace(/^Spotify\s*[-–]\s*/i, '').trim();
        }

        let tracks = [];

        const scriptMatch = html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
        if (scriptMatch) {
            try {
                const json = JSON.parse(scriptMatch[1]);
                const entity = json?.props?.pageProps?.state?.data?.entity;
                if (entity) {
                    if (entity.name || entity.title) playlistTitle = entity.name || entity.title;
                    if (entity.trackList) {
                        tracks = entity.trackList.map(t => ({
                            title: t.title || t.name,
                            artist: t.subtitle || (t.artists ? t.artists.map(a => a.name).join(', ') : ''),
                            durationMs: t.duration || 0
                        }));
                    }
                }
            } catch (e) { }
        }

        if (tracks.length === 0) {
            const resourceMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
            if (resourceMatch) {
                try {
                    const ld = JSON.parse(resourceMatch[1]);
                    if (ld.track) {
                        tracks = ld.track.map(t => ({
                            title: t.name,
                            artist: t.byArtist ? (t.byArtist.name || '') : '',
                            durationMs: this.parseDuration(t.duration) * 1000
                        }));
                    }
                } catch (e) { }
            }
        }

        if (tracks.length === 0) {
            const metaMatch = html.match(/Spotify\.Entity\s*=\s*({[\s\S]*?});/);
            if (metaMatch) {
                try {
                    const entity = JSON.parse(metaMatch[1]);
                    if (entity.tracks && entity.tracks.items) {
                        tracks = entity.tracks.items.map(item => {
                            const t = item.track || item;
                            return {
                                title: t.name,
                                artist: t.artists ? t.artists.map(a => a.name).join(', ') : '',
                                durationMs: t.duration_ms || 0
                            };
                        });
                    }
                } catch (e) { }
            }
        }

        if (tracks.length === 0) {
            const titleRegex = /<meta[^>]*property="music:song"[^>]*content="([^"]+)"/g;
            let m;
            while ((m = titleRegex.exec(html)) !== null) {
                tracks.push({ title: decodeURIComponent(m[1].split('/').pop()), artist: '', durationMs: 0 });
            }
        }

        if (tracks.length === 0) {
            const trackRowRegex = /data-testid="tracklist-row"[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/g;
            let m;
            while ((m = trackRowRegex.exec(html)) !== null) {
                const title = m[1].replace(/<[^>]+>/g, '').trim();
                const artist = m[2].replace(/<[^>]+>/g, '').trim();
                if (title) tracks.push({ title, artist, durationMs: 0 });
            }
        }

        return { title: playlistTitle || 'Spotify', tracks };
    }

    parseDuration(iso) {
        if (!iso) return 0;
        const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!m) return 0;
        return (parseInt(m[1] || 0) * 3600) + (parseInt(m[2] || 0) * 60) + parseInt(m[3] || 0);
    }

    streamYouTubeTracks(url, onTrack, onDone, onError) {
        const ytDlp = this.getYtDlpPath();
        const args = ['--flat-playlist', '--dump-json', '--no-warnings', url];
        const child = spawn(ytDlp, args, { windowsHide: true });
        let buffer = '';

        child.stdout.on('data', (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop();
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                try {
                    const info = JSON.parse(trimmed);
                    const track = {
                        title: info.title || info.fulltitle || 'Unknown',
                        url: `https://www.youtube.com/watch?v=${info.id}`,
                        thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || '',
                        videoId: info.id,
                        type: 'youtube',
                        durationSec: info.duration || 0,
                        playlistTitle: info.playlist_title || info.playlist || '',
                        playlistCount: info.playlist_count || info.n_entries || 0
                    };
                    onTrack(track);
                } catch (e) { }
            }
        });

        child.stderr.on('data', () => {});

        child.on('error', (err) => {
            if (onError) onError(err);
        });

        child.on('close', (code) => {
            if (buffer.trim()) {
                try {
                    const info = JSON.parse(buffer.trim());
                    onTrack({
                        title: info.title || info.fulltitle || 'Unknown',
                        url: `https://www.youtube.com/watch?v=${info.id}`,
                        thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || '',
                        videoId: info.id,
                        type: 'youtube',
                        durationSec: info.duration || 0
                    });
                } catch (e) { }
            }
            if (onDone) onDone(code);
        });

        return child;
    }

    async extractYouTubeTracks(url, progressCb) {
        const ytDlp = this.getYtDlpPath();
        const command = `"${ytDlp}" --flat-playlist --dump-json --no-warnings "${url}"`;

        return new Promise((resolve, reject) => {
            const child = exec(command, { maxBuffer: 1024 * 1024 * 50 }, (error, stdout) => {
                if (error) {
                    reject(new Error('yt-dlp playlist extraction failed'));
                    return;
                }
                const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
                const tracks = [];
                lines.forEach((line, i) => {
                    try {
                        const info = JSON.parse(line);
                        tracks.push({
                            title: info.title || info.fulltitle || 'Unknown',
                            url: `https://www.youtube.com/watch?v=${info.id}`,
                            thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || '',
                            videoId: info.id,
                            type: 'youtube',
                            durationSec: info.duration || 0
                        });
                        if (progressCb) progressCb(tracks.length, lines.length);
                    } catch (e) { }
                });
                resolve(tracks);
            });
        });
    }

    async searchYouTube(query, ytSearchFn) {
        try {
            const results = await ytSearchFn(query);
            return results.videos ? results.videos.slice(0, 10) : results.slice(0, 10);
        } catch (e) {
            return [];
        }
    }

    parseTimestamp(ts) {
        if (!ts) return 0;
        const parts = ts.split(':').map(Number);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        return parts[0] || 0;
    }

    async matchSpotifyTrackToYouTube(track, ytSearchFn) {
        const spotifyDurationSec = track.durationMs ? Math.round(track.durationMs / 1000) : 0;
        const tolerance = 6;

        const baseQuery = `${track.title} ${track.artist}`.trim();

        const searches = [
            baseQuery,
            `${baseQuery} audio`,
            `${baseQuery} lyrics`
        ];

        let bestMatch = null;
        let bestDiff = Infinity;

        for (let i = 0; i < searches.length; i++) {
            const results = await this.searchYouTube(searches[i], ytSearchFn);
            if (!results || results.length === 0) continue;

            for (const v of results) {
                const videoDuration = this.parseTimestamp(v.timestamp);

                if (spotifyDurationSec > 0) {
                    const diff = Math.abs(videoDuration - spotifyDurationSec);
                    if (diff <= tolerance) {
                        return {
                            title: track.title + (track.artist ? ` - ${track.artist}` : ''),
                            url: v.url || `https://www.youtube.com/watch?v=${v.videoId}`,
                            thumbnail: v.thumbnail || '',
                            type: 'youtube'
                        };
                    }
                    if (diff < bestDiff) {
                        bestDiff = diff;
                        bestMatch = v;
                    }
                } else {
                    return {
                        title: track.title + (track.artist ? ` - ${track.artist}` : ''),
                        url: v.url || `https://www.youtube.com/watch?v=${v.videoId}`,
                        thumbnail: v.thumbnail || '',
                        type: 'youtube'
                    };
                }
            }

            if (spotifyDurationSec > 0 && bestMatch && bestDiff <= tolerance) break;
        }

        if (bestMatch) {
            return {
                title: track.title + (track.artist ? ` - ${track.artist}` : ''),
                url: bestMatch.url || `https://www.youtube.com/watch?v=${bestMatch.videoId}`,
                thumbnail: bestMatch.thumbnail || '',
                type: 'youtube'
            };
        }

        return null;
    }
}

module.exports = PlaylistImporter;
