import { Injectable } from '@angular/core';

export type NoteMediaProvider =
  | 'youtube'
  | 'vimeo'
  | 'tiktok'
  | 'facebook'
  | 'instagram'
  | 'unknown';

export type NoteResolvedMedia =
  | {
      kind: 'embed';
      mediaType: 'video';
      provider: NoteMediaProvider;
      originalUrl: string;
      embedUrl: string;
    }
  | {
      kind: 'direct';
      mediaType: 'image' | 'video';
      provider: 'unknown';
      originalUrl: string;
      directUrl: string;
    };

@Injectable({ providedIn: 'root' })
export class NoteMediaService {
  /**
   * Normalizza una stringa in URL assoluto.
   * - aggiunge https:// se mancante
   * - ritorna null se invalido
   */
  public normalizeUrl(input: string): string | null {
    if (!input) return null;
    let url = input.trim();
    if (!url) return null;
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    try {
      return new URL(url).toString();
    } catch {
      return null;
    }
  }

  /**
   * Risolve un link incollato in:
   * - embedUrl (provider noti) => iframe
   * - directUrl (file diretto) => <video>/<img>
   */
  public resolveMediaUrl(inputUrl: string): NoteResolvedMedia | null {
    const normalized = this.normalizeUrl(inputUrl);
    if (!normalized) return null;

    const u = new URL(normalized);
    const host = (u.hostname || '').toLowerCase();

    // -------- YouTube --------
    if (host === 'youtu.be' || host.endsWith('.youtu.be') || host.includes('youtube.com')) {
      const id = this.extractYouTubeId(u);
      if (id) {
        return {
          kind: 'embed',
          mediaType: 'video',
          provider: 'youtube',
          originalUrl: normalized,
          embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(id)}`
        };
      }
    }

    // -------- Vimeo --------
    if (host === 'vimeo.com' || host.endsWith('.vimeo.com') || host === 'player.vimeo.com') {
      const id = this.extractVimeoId(u);
      if (id) {
        return {
          kind: 'embed',
          mediaType: 'video',
          provider: 'vimeo',
          originalUrl: normalized,
          embedUrl: `https://player.vimeo.com/video/${encodeURIComponent(id)}`
        };
      }
    }

    // -------- TikTok --------
    if (host.includes('tiktok.com')) {
      const id = this.extractTikTokId(u);
      if (id) {
        // v2 embed tends to work better
        return {
          kind: 'embed',
          mediaType: 'video',
          provider: 'tiktok',
          originalUrl: normalized,
          embedUrl: `https://www.tiktok.com/embed/v2/${encodeURIComponent(id)}`
        };
      }
    }

    // -------- Facebook --------
    if (host.includes('facebook.com') || host.includes('fb.watch')) {
      // Facebook plugin accepts the original URL (encoded)
      const href = encodeURIComponent(normalized);
      return {
        kind: 'embed',
        mediaType: 'video',
        provider: 'facebook',
        originalUrl: normalized,
        embedUrl: `https://www.facebook.com/plugins/video.php?href=${href}&show_text=false&autoplay=false`
      };
    }

    // -------- Instagram --------
    if (host.includes('instagram.com')) {
      const { kind, code } = this.extractInstagramKindAndCode(u);
      if (kind && code) {
        // Public embed endpoint (works for most public posts/reels)
        return {
          kind: 'embed',
          mediaType: 'video',
          provider: 'instagram',
          originalUrl: normalized,
          embedUrl: `https://www.instagram.com/${kind}/${encodeURIComponent(code)}/embed/`
        };
      }
    }

    // -------- Direct file URL heuristic --------
    const mediaType = this.inferDirectMediaTypeFromPath(u.pathname || '');
    if (mediaType) {
      return {
        kind: 'direct',
        mediaType,
        provider: 'unknown',
        originalUrl: normalized,
        directUrl: normalized
      };
    }

    // Unknown generic URL: treat as direct video? too risky -> return null (caller can show error)
    return null;
  }

  private inferDirectMediaTypeFromPath(pathname: string): 'image' | 'video' | null {
    const p = (pathname || '').toLowerCase();
    // image
    if (p.endsWith('.png') || p.endsWith('.jpg') || p.endsWith('.jpeg') || p.endsWith('.gif') || p.endsWith('.webp') || p.endsWith('.svg')) {
      return 'image';
    }
    // video (common)
    if (p.endsWith('.mp4') || p.endsWith('.webm') || p.endsWith('.mov') || p.endsWith('.m4v') || p.endsWith('.ogv') || p.endsWith('.ogg')) {
      return 'video';
    }
    // streaming manifests
    if (p.endsWith('.m3u8') || p.endsWith('.mpd')) {
      return 'video';
    }
    return null;
  }

  private extractYouTubeId(u: URL): string | null {
    const host = (u.hostname || '').toLowerCase();
    if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
      const id = (u.pathname || '').split('/').filter(Boolean)[0];
      return id || null;
    }
    if (host.includes('youtube.com')) {
      // watch?v=...
      const v = u.searchParams.get('v');
      if (v) return v;
      // /shorts/{id}
      const parts = (u.pathname || '').split('/').filter(Boolean);
      const shortsIdx = parts.indexOf('shorts');
      if (shortsIdx >= 0 && parts[shortsIdx + 1]) return parts[shortsIdx + 1];
      // /embed/{id}
      const embedIdx = parts.indexOf('embed');
      if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1];
    }
    return null;
  }

  private extractVimeoId(u: URL): string | null {
    const parts = (u.pathname || '').split('/').filter(Boolean);
    // player.vimeo.com/video/{id}
    const videoIdx = parts.indexOf('video');
    const candidate = videoIdx >= 0 ? parts[videoIdx + 1] : parts[0];
    if (candidate && /^\d+$/.test(candidate)) return candidate;
    return null;
  }

  private extractTikTokId(u: URL): string | null {
    const parts = (u.pathname || '').split('/').filter(Boolean);
    // /@user/video/{id}
    const idx = parts.indexOf('video');
    const candidate = idx >= 0 ? parts[idx + 1] : null;
    if (candidate && /^\d+$/.test(candidate)) return candidate;
    // sometimes share links include ?item_id=...
    const q = u.searchParams.get('item_id') || u.searchParams.get('share_item_id');
    if (q && /^\d+$/.test(q)) return q;
    return null;
  }

  private extractInstagramKindAndCode(u: URL): { kind: 'p' | 'reel' | 'tv' | null; code: string | null } {
    const parts = (u.pathname || '').split('/').filter(Boolean);
    // /p/{code}/ , /reel/{code}/ , /tv/{code}/
    const kind = (parts[0] as any) || null;
    const code = parts[1] || null;
    if ((kind === 'p' || kind === 'reel' || kind === 'tv') && code) {
      return { kind, code };
    }
    return { kind: null, code: null };
  }
}


