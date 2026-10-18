/**
 * Parent Photo Management Utilities & Built-in Expressive Presets
 */

// High quality expressive SVG portraits for fallback / presets
export const DEFAULT_MOM_PHOTO = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#fda4af"/>
      <stop offset="60%" stop-color="#f43f5e"/>
      <stop offset="100%" stop-color="#881337"/>
    </radialGradient>
    <filter id="comicShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#4c0519" flood-opacity="0.5"/>
    </filter>
  </defs>
  <!-- Background comic burst -->
  <rect width="400" height="400" fill="url(#bgGlow)"/>
  <circle cx="200" cy="200" r="170" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="12 8" opacity="0.4"/>
  
  <!-- Hair Base (Ajumma Perm) -->
  <g filter="url(#comicShadow)">
    <circle cx="140" cy="140" r="45" fill="#3b0764"/>
    <circle cx="260" cy="140" r="45" fill="#3b0764"/>
    <circle cx="200" cy="110" r="55" fill="#3b0764"/>
    <circle cx="120" cy="190" r="40" fill="#3b0764"/>
    <circle cx="280" cy="190" r="40" fill="#3b0764"/>
    <circle cx="160" cy="115" r="45" fill="#581c87"/>
    <circle cx="240" cy="115" r="45" fill="#581c87"/>
  </g>

  <!-- Face & Neck -->
  <path d="M175 250 L175 300 L225 300 L225 250 Z" fill="#fcd34d"/>
  <ellipse cx="200" cy="200" rx="75" ry="85" fill="#fde68a" stroke="#d97706" stroke-width="3"/>

  <!-- Cheeks Blush -->
  <circle cx="155" cy="215" r="16" fill="#f43f5e" opacity="0.6"/>
  <circle cx="245" cy="215" r="16" fill="#f43f5e" opacity="0.6"/>

  <!-- Eyebrows (Dynamic Stern/Loving Arch) -->
  <path d="M145 160 Q165 145 185 165" fill="none" stroke="#374151" stroke-width="5" stroke-linecap="round"/>
  <path d="M215 165 Q235 145 255 160" fill="none" stroke="#374151" stroke-width="5" stroke-linecap="round"/>

  <!-- Eyes (Wide expressive anime eyes) -->
  <ellipse cx="165" cy="180" rx="14" ry="12" fill="#1f2937"/>
  <circle cx="162" cy="176" r="5" fill="#ffffff"/>
  <ellipse cx="235" cy="180" rx="14" ry="12" fill="#1f2937"/>
  <circle cx="232" cy="176" r="5" fill="#ffffff"/>

  <!-- Nose -->
  <path d="M196 195 Q200 205 204 205 Q200 210 195 210" fill="none" stroke="#b45309" stroke-width="3" stroke-linecap="round"/>

  <!-- Open Talking Mouth -->
  <path d="M170 230 Q200 270 230 230 Z" fill="#991b1b" stroke="#7f1d1d" stroke-width="2"/>
  <path d="M180 232 Q200 242 220 232" fill="#ffffff"/>
  <path d="M185 248 Q200 262 215 248" fill="#f43f5e"/>

  <!-- Floral Apron & Clothes -->
  <path d="M120 310 Q200 280 280 310 L300 400 L100 400 Z" fill="#ec4899"/>
  <circle cx="160" cy="350" r="10" fill="#fef08a"/>
  <circle cx="240" cy="350" r="10" fill="#fef08a"/>
  <circle cx="200" cy="370" r="12" fill="#fef08a"/>

  <!-- Red Rubber Glove / Spatula in hand -->
  <g transform="translate(40, 240) rotate(-15)">
    <path d="M10 50 C5 30, 25 10, 40 25 L55 70 C40 85, 20 70, 10 50 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="3"/>
    <rect x="35" y="0" width="12" height="60" rx="4" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
  </g>

  <!-- Comic Action Sweat & Sparks -->
  <path d="M280 130 Q290 120 285 140 Q275 145 280 130 Z" fill="#38bdf8"/>
  <path d="M110 120 L120 110 M100 130 L115 130" stroke="#fbbf24" stroke-width="4" stroke-linecap="round"/>
</svg>
`)}`;

export const DEFAULT_DAD_PHOTO = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <radialGradient id="bgDadGlow" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#93c5fd"/>
      <stop offset="60%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </radialGradient>
    <filter id="dadShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#0284c7" flood-opacity="0.4"/>
    </filter>
  </defs>
  <!-- Background comic burst -->
  <rect width="400" height="400" fill="url(#bgDadGlow)"/>
  <circle cx="200" cy="200" r="170" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="12 8" opacity="0.4"/>

  <!-- Hair Base (Dad 2:8 Side Part) -->
  <g filter="url(#dadShadow)">
    <path d="M120 170 C110 120, 150 80, 200 80 C260 80, 290 120, 280 170 C270 120, 220 100, 180 105 C140 110, 125 140, 120 170 Z" fill="#1e293b"/>
  </g>

  <!-- Neck & Face -->
  <path d="M175 250 L175 300 L225 300 L225 250 Z" fill="#fcd34d"/>
  <ellipse cx="200" cy="195" rx="72" ry="80" fill="#fde68a" stroke="#d97706" stroke-width="3"/>

  <!-- Eyebrows (Thick Dad Eyebrows) -->
  <path d="M140 155 L180 162" stroke="#0f172a" stroke-width="8" stroke-linecap="round"/>
  <path d="M220 162 L260 155" stroke="#0f172a" stroke-width="8" stroke-linecap="round"/>

  <!-- Black-rimmed / Gold Glasses -->
  <rect x="135" y="165" width="45" height="35" rx="8" fill="none" stroke="#0f172a" stroke-width="5"/>
  <rect x="220" y="165" width="45" height="35" rx="8" fill="none" stroke="#0f172a" stroke-width="5"/>
  <line x1="180" y1="180" x2="220" y2="180" stroke="#0f172a" stroke-width="5"/>
  <line x1="135" y1="180" x2="120" y2="175" stroke="#0f172a" stroke-width="4"/>
  <line x1="265" y1="180" x2="280" y2="175" stroke="#0f172a" stroke-width="4"/>

  <!-- Eyes behind glasses -->
  <ellipse cx="158" cy="182" rx="10" ry="10" fill="#0f172a"/>
  <circle cx="155" cy="179" r="3.5" fill="#ffffff"/>
  <ellipse cx="242" cy="182" rx="10" ry="10" fill="#0f172a"/>
  <circle cx="239" cy="179" r="3.5" fill="#ffffff"/>

  <!-- Nose -->
  <path d="M195 190 Q200 206 205 206" fill="none" stroke="#b45309" stroke-width="3.5" stroke-linecap="round"/>

  <!-- Dad Mustache & Open Talking Mouth -->
  <path d="M178 220 Q200 214 222 220 Q200 224 178 220 Z" fill="#334155"/>
  <path d="M175 230 Q200 265 225 230 Z" fill="#991b1b" stroke="#7f1d1d" stroke-width="2"/>
  <path d="M182 232 Q200 240 218 232" fill="#ffffff"/>
  <path d="M188 245 Q200 258 212 245" fill="#f43f5e"/>

  <!-- Suit & Tie -->
  <path d="M110 310 Q200 270 290 310 L310 400 L90 400 Z" fill="#1e3a8a"/>
  <!-- White Shirt V -->
  <path d="M165 300 L200 360 L235 300 Z" fill="#ffffff"/>
  <!-- Red Striped Tie -->
  <polygon points="194,310 206,310 212,390 200,400 188,390" fill="#dc2626"/>
  <line x1="190" y1="330" x2="210" y2="340" stroke="#fef08a" stroke-width="3"/>
  <line x1="190" y1="360" x2="210" y2="370" stroke="#fef08a" stroke-width="3"/>

  <!-- Thumbs Up Hand on Right -->
  <g transform="translate(290, 240)">
    <path d="M20 50 C20 20, 45 10, 50 35 L50 70 C40 85, 20 80, 20 50 Z" fill="#fde68a" stroke="#d97706" stroke-width="3"/>
    <circle cx="45" cy="20" r="14" fill="#fde68a" stroke="#d97706" stroke-width="3"/>
    <text x="35" y="25" font-size="20">👍</text>
  </g>
</svg>
`)}`;

// Preset character types for one-click instant registration
export interface ParentPhotoPreset {
  id: string;
  name: string;
  description: string;
  role: 'mom' | 'dad';
  dataUrl: string;
}

export const MOM_PHOTO_PRESETS: ParentPhotoPreset[] = [
  {
    id: 'mom_comic_default',
    name: '코믹 열정 엄마',
    description: '원조 뽀글파마 & 뒤집개 파이팅',
    role: 'mom',
    dataUrl: DEFAULT_MOM_PHOTO,
  },
  {
    id: 'mom_gentle_warm',
    name: '다정 온화 엄마',
    description: '따뜻한 미소 & 부드러운 힐링 케어',
    role: 'mom',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <radialGradient id="warmMomGlow" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#fed7aa"/>
      <stop offset="60%" stop-color="#fb923c"/>
      <stop offset="100%" stop-color="#c2410c"/>
    </radialGradient>
  </defs>
  <rect width="400" height="400" fill="url(#warmMomGlow)"/>
  <circle cx="200" cy="200" r="170" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="10 6" opacity="0.4"/>
  <!-- Gentle Bob Hair -->
  <path d="M120 180 C110 90, 290 90, 280 180 C290 250, 260 270, 250 250 C240 220, 260 160, 200 160 C140 160, 160 220, 150 250 C140 270, 110 250, 120 180 Z" fill="#451a03"/>
  <!-- Face -->
  <path d="M180 250 L180 300 L220 300 L220 250 Z" fill="#ffedd5"/>
  <ellipse cx="200" cy="205" rx="72" ry="78" fill="#ffedd5" stroke="#ea580c" stroke-width="2.5"/>
  <circle cx="160" cy="225" r="16" fill="#f43f5e" opacity="0.4"/>
  <circle cx="240" cy="225" r="16" fill="#f43f5e" opacity="0.4"/>
  <!-- Soft Eyes Smiling -->
  <path d="M150 185 Q165 170 180 185" fill="none" stroke="#431407" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M220 185 Q235 170 250 185" fill="none" stroke="#431407" stroke-width="4.5" stroke-linecap="round"/>
  <!-- Smile -->
  <path d="M175 230 Q200 260 225 230" fill="none" stroke="#be123c" stroke-width="4.5" stroke-linecap="round"/>
  <!-- Clothes -->
  <path d="M110 320 Q200 280 290 320 L310 400 L90 400 Z" fill="#059669"/>
  <!-- Heart pin -->
  <text x="185" y="370" font-size="28">💖</text>
</svg>
`)}`,
  },
  {
    id: 'mom_mentor_smart',
    name: '지적 멘토 엄마',
    description: '스마트 안경 & 똑 부러지는 코칭',
    role: 'mom',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <radialGradient id="mentorMomGlow" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#e9d5ff"/>
      <stop offset="60%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#581c87"/>
    </radialGradient>
  </defs>
  <rect width="400" height="400" fill="url(#mentorMomGlow)"/>
  <!-- Hair -->
  <circle cx="200" cy="180" r="85" fill="#1e1b4b"/>
  <!-- Face -->
  <ellipse cx="200" cy="205" rx="70" ry="76" fill="#fde68a" stroke="#d97706" stroke-width="2.5"/>
  <!-- Glasses -->
  <rect x="140" y="180" width="45" height="32" rx="8" fill="none" stroke="#7e22ce" stroke-width="4"/>
  <rect x="215" y="180" width="45" height="32" rx="8" fill="none" stroke="#7e22ce" stroke-width="4"/>
  <line x1="185" y1="195" x2="215" y2="195" stroke="#7e22ce" stroke-width="4"/>
  <ellipse cx="162" cy="196" rx="8" ry="8" fill="#1e1b4b"/>
  <ellipse cx="238" cy="196" rx="8" ry="8" fill="#1e1b4b"/>
  <!-- Smile -->
  <path d="M178 238 Q200 262 222 238" fill="none" stroke="#9333ea" stroke-width="4" stroke-linecap="round"/>
  <!-- Clothes -->
  <path d="M110 320 Q200 280 290 320 L310 400 L90 400 Z" fill="#6d28d9"/>
  <text x="185" y="370" font-size="28">📚</text>
</svg>
`)}`,
  },
];

export const DAD_PHOTO_PRESETS: ParentPhotoPreset[] = [
  {
    id: 'dad_comic_default',
    name: '코믹 든든 아빠',
    description: '2:8 가르마 & 엄지척 슈트 스타일',
    role: 'dad',
    dataUrl: DEFAULT_DAD_PHOTO,
  },
  {
    id: 'dad_gentle_warm',
    name: '다정 인자 아빠',
    description: '따뜻한 눈웃음 & 든든한 응원군',
    role: 'dad',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <radialGradient id="gentleDadGlow" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#bae6fd"/>
      <stop offset="60%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#0c4a6e"/>
    </radialGradient>
  </defs>
  <rect width="400" height="400" fill="url(#gentleDadGlow)"/>
  <circle cx="200" cy="200" r="170" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="10 6" opacity="0.4"/>
  <!-- Hair Short Natural -->
  <path d="M130 180 C120 100, 280 100, 270 180 C250 120, 150 120, 130 180 Z" fill="#1f2937"/>
  <!-- Face -->
  <ellipse cx="200" cy="205" rx="74" ry="80" fill="#fde68a" stroke="#d97706" stroke-width="2.5"/>
  <!-- Gentle Smiling Eyes -->
  <path d="M148 185 Q165 170 182 185" fill="none" stroke="#111827" stroke-width="5" stroke-linecap="round"/>
  <path d="M218 185 Q235 170 252 185" fill="none" stroke="#111827" stroke-width="5" stroke-linecap="round"/>
  <!-- Warm Broad Smile -->
  <path d="M165 230 Q200 270 235 230" fill="#dc2626" stroke="#991b1b" stroke-width="2"/>
  <path d="M172 232 Q200 242 228 232" fill="#ffffff"/>
  <!-- Blue Knit Sweater -->
  <path d="M100 320 Q200 275 300 320 L320 400 L80 400 Z" fill="#0284c7"/>
  <text x="185" y="370" font-size="28">☕</text>
</svg>
`)}`,
  },
  {
    id: 'dad_cool_sporty',
    name: '유쾌 친구 아빠',
    description: '캡모자 & 에너지 넘치는 화이팅',
    role: 'dad',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <radialGradient id="coolDadGlow" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#bbf7d0"/>
      <stop offset="60%" stop-color="#16a34a"/>
      <stop offset="100%" stop-color="#14532d"/>
    </radialGradient>
  </defs>
  <rect width="400" height="400" fill="url(#coolDadGlow)"/>
  <!-- Sporty Cap -->
  <path d="M130 160 C130 110, 270 110, 270 160 Z" fill="#2563eb"/>
  <path d="M120 160 Q200 140 280 160 L300 180 L180 165 Z" fill="#1d4ed8"/>
  <!-- Face -->
  <ellipse cx="200" cy="210" rx="72" ry="78" fill="#fde68a" stroke="#d97706" stroke-width="2.5"/>
  <circle cx="160" cy="195" r="9" fill="#1e293b"/>
  <circle cx="157" cy="192" r="3" fill="#fff"/>
  <circle cx="240" cy="195" r="9" fill="#1e293b"/>
  <circle cx="237" cy="192" r="3" fill="#fff"/>
  <!-- Smile with Dimples -->
  <path d="M170 235 Q200 268 230 235" fill="none" stroke="#b91c1c" stroke-width="4.5" stroke-linecap="round"/>
  <!-- Hood / Jersey -->
  <path d="M100 320 Q200 270 300 320 L320 400 L80 400 Z" fill="#0f766e"/>
  <text x="185" y="370" font-size="28">🔥</text>
</svg>
`)}`,
  },
];

/**
 * Compress and scale an uploaded image File to safe Base64 Data URL
 * Rock-solid processing supporting JPG, PNG, WebP, HEIC/HEIF, BMP, GIF, and missing mime types.
 */
export async function processImageFileToDataUrl(
  file: File,
  maxDimension: number = 480,
  quality: number = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('파일이 선택되지 않았습니다.'));
      return;
    }

    // Security Check: Enforce maximum upload size (10MB) to prevent memory exhaustion / DoS
    const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error('이미지 파일 크기는 최대 10MB까지만 업로드할 수 있습니다.'));
      return;
    }

    // Strict type check: allow common safe image extensions
    const name = file.name || '';
    const hasImageExt = /\.(jpe?g|png|webp|gif|bmp|svg|heic|heif|avif|ico|tiff?)$/i.test(name);
    const hasImageMime = file.type ? file.type.startsWith('image/') : false;

    if (!hasImageMime && !hasImageExt && file.type !== '') {
      reject(new Error('이미지 파일(JPG, PNG, WebP 등)만 업로드할 수 있습니다.'));
      return;
    }

    const tryProcessWithSource = (src: string, cleanup?: () => void) => {
      // Security: Strip dangerous XSS / script vectors from SVG sources
      let sanitizedSrc = src;
      if (sanitizedSrc.includes('<script') || sanitizedSrc.includes('javascript:') || sanitizedSrc.includes('onerror=')) {
        sanitizedSrc = sanitizedSrc
          .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
          .replace(/javascript\s*:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      let isFinished = false;
      const safeFinish = (result: string) => {
        if (isFinished) return;
        isFinished = true;
        if (cleanup) {
          try { cleanup(); } catch {}
        }
        resolve(result);
      };

      const safeFail = (err: Error) => {
        if (isFinished) return;
        isFinished = true;
        if (cleanup) {
          try { cleanup(); } catch {}
        }
        reject(err);
      };

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (!width || !height) {
            safeFinish(sanitizedSrc);
            return;
          }

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            safeFinish(sanitizedSrc);
            return;
          }

          // Solid background to avoid transparent black artifacts when converting to JPEG
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Always normalize to raster JPEG data URL (completely strips any embedded script tags)
          const compressed = canvas.toDataURL('image/jpeg', quality);
          safeFinish(compressed);
        } catch {
          // Fallback to sanitized src if canvas conversion fails
          safeFinish(sanitizedSrc);
        }
      };

      img.onerror = () => {
        // If image object loading failed (e.g. objectUrl glitch), fallback to FileReader
        const reader = new FileReader();
        reader.onload = (e) => {
          const res = e.target?.result as string;
          if (res) {
            const cleanRes = res
              .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
              .replace(/javascript\s*:/gi, '')
              .replace(/on\w+\s*=/gi, '');
            safeFinish(cleanRes);
          } else {
            safeFail(new Error('이미지를 읽을 수 없습니다. 다른 사진을 선택해주세요.'));
          }
        };
        reader.onerror = () => safeFail(new Error('이미지 파일 읽기에 실패했습니다.'));
        reader.readAsDataURL(file);
      };

      img.src = sanitizedSrc;
    };

    // Attempt URL.createObjectURL first (instant, low RAM usage)
    try {
      if (typeof window !== 'undefined' && window.URL && window.URL.createObjectURL) {
        const objUrl = window.URL.createObjectURL(file);
        tryProcessWithSource(objUrl, () => {
          try {
            window.URL.revokeObjectURL(objUrl);
          } catch {}
        });
        return;
      }
    } catch {
      // Fall through to FileReader
    }

    // Direct FileReader fallback
    const reader = new FileReader();
    reader.onload = (e) => {
      const res = e.target?.result as string;
      if (res) {
        tryProcessWithSource(res);
      } else {
        reject(new Error('파일 읽기 실패'));
      }
    };
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsDataURL(file);
  });
}
