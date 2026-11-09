/**
 * progressShareImageUtils.ts
 * Generates high-definition summarized progress card images (Canvas API)
 * and coordinates sharing via the Browser's Web Share API (navigator.share)
 * with robust fallbacks to local PNG download and clipboard copy.
 */

export interface ProgressShareData {
  userName: string;
  userAvatar?: string;
  userMotto?: string;
  currentStreak: number;
  longestStreak?: number;
  totalRepeatsCount: number;
  completedGoalsCount: number;
  totalGoalsCount: number;
  vocabCount: number;
  dateStr?: string;
}

/**
 * Renders a crisp 1200x675 HD 16:9 social share progress card onto an HTML5 Canvas.
 */
export function generateProgressShareCanvas(data: ProgressShareData): HTMLCanvasElement {
  const width = 1200;
  const height = 675;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // 1. Background: Deep luxurious dark gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#090d16');
  bgGrad.addColorStop(0.5, '#0f172a');
  bgGrad.addColorStop(1, '#1e163b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Ambient Glow orbs for modern glassmorphism feel
  // Emerald glow top-left
  const glow1 = ctx.createRadialGradient(200, 160, 20, 200, 160, 360);
  glow1.addColorStop(0, 'rgba(16, 185, 129, 0.18)');
  glow1.addColorStop(1, 'rgba(16, 185, 129, 0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, width, height);

  // Amber glow bottom-right
  const glow2 = ctx.createRadialGradient(1000, 500, 20, 1000, 500, 420);
  glow2.addColorStop(0, 'rgba(245, 158, 11, 0.16)');
  glow2.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, width, height);

  // Violet glow center-top
  const glow3 = ctx.createRadialGradient(600, 80, 10, 600, 80, 280);
  glow3.addColorStop(0, 'rgba(99, 102, 241, 0.14)');
  glow3.addColorStop(1, 'rgba(99, 102, 241, 0)');
  ctx.fillStyle = glow3;
  ctx.fillRect(0, 0, width, height);

  // Subtle grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
  ctx.lineWidth = 1;
  for (let x = 40; x < width; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 40; y < height; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // 3. Header Bar: Logo & App Branding
  // Logo Icon Box
  ctx.save();
  ctx.fillStyle = '#6366f1';
  roundRect(ctx, 60, 50, 48, 48, 14);
  ctx.fill();

  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚡', 84, 74);
  ctx.restore();

  // Logo Brand Text
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('WordLoop AI', 122, 50);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('3,000 Vocab & Shadowing Loop Daily Progress', 124, 82);

  // Date Tag (Top Right)
  const today = new Date();
  const dateFormatted =
    data.dateStr ||
    `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(
      today.getDate()
    ).padStart(2, '0')}`;

  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  roundRect(ctx, width - 260, 50, 200, 44, 22);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`📅 ${dateFormatted}`, width - 160, 72);
  ctx.restore();

  // 4. User Profile Hero Strip
  const userY = 135;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
  ctx.lineWidth = 1;
  roundRect(ctx, 60, userY, width - 120, 85, 20);
  ctx.fill();
  ctx.stroke();

  // Avatar Circle
  ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
  roundRect(ctx, 80, userY + 16, 54, 54, 18);
  ctx.fill();

  ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(data.userAvatar || '🔥', 107, userY + 43);

  // User Name & Motto
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`${data.userName || 'WordLoop 학습자'} 님의 학습 성과 리포트`, 150, userY + 18);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const mottoText = data.userMotto || '매일 성장하는 나만의 1인 독점 영어 루프';
  ctx.fillText(mottoText.length > 45 ? mottoText.slice(0, 45) + '...' : mottoText, 150, userY + 48);

  // Status Badge on the right
  ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
  roundRect(ctx, width - 260, userY + 22, 175, 40, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✨ 학습 지속 중', width - 172, userY + 42);
  ctx.restore();

  // 5. Two Main Hero Cards: STREAK & TOTAL REPEATS
  const cardY = 245;
  const cardW = 525;
  const cardH = 245;

  // --- HERO CARD 1: CURRENT STREAK ---
  ctx.save();
  // Card Background with Amber gradient border
  const card1Grad = ctx.createLinearGradient(60, cardY, 60 + cardW, cardY + cardH);
  card1Grad.addColorStop(0, 'rgba(245, 158, 11, 0.12)');
  card1Grad.addColorStop(1, 'rgba(217, 119, 6, 0.04)');
  ctx.fillStyle = card1Grad;
  roundRect(ctx, 60, cardY, cardW, cardH, 24);
  ctx.fill();

  ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 60, cardY, cardW, cardH, 24);
  ctx.stroke();

  // Card Header Tag
  ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
  roundRect(ctx, 85, cardY + 24, 150, 32, 10);
  ctx.fill();

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🔥 연속 실천 스트릭', 160, cardY + 40);

  // Big Streak Number
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 68px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`${data.currentStreak}`, 85, cardY + 68);

  const numWidth = ctx.measureText(`${data.currentStreak}`).width;
  ctx.fillStyle = '#f59e0b';
  ctx.font = '900 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(' 일 연속 달성', 85 + numWidth + 10, cardY + 96);

  // Subtitle / Milestone
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '500 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    data.currentStreak >= 21
      ? '🏆 21일 습관 각인 돌파! 흔들리지 않는 학습 루틴'
      : data.currentStreak >= 7
      ? '🥉 1주일 연속 실천! 습관 궤도에 성공적으로 진입'
      : '🌱 매일 꾸준한 실천으로 새로운 연속 기록 경신 중',
    85,
    cardY + 160
  );

  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`최고 연속 기록: ${data.longestStreak || data.currentStreak}일`, 85, cardY + 192);
  ctx.restore();

  // --- HERO CARD 2: TOTAL REPEATS COUNT ---
  ctx.save();
  const card2X = 60 + cardW + 30;
  const card2Grad = ctx.createLinearGradient(card2X, cardY, card2X + cardW, cardY + cardH);
  card2Grad.addColorStop(0, 'rgba(16, 185, 129, 0.12)');
  card2Grad.addColorStop(1, 'rgba(5, 150, 105, 0.04)');
  ctx.fillStyle = card2Grad;
  roundRect(ctx, card2X, cardY, cardW, cardH, 24);
  ctx.fill();

  ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, card2X, cardY, cardW, cardH, 24);
  ctx.stroke();

  // Card Header Tag
  ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
  roundRect(ctx, card2X + 25, cardY + 24, 150, 32, 10);
  ctx.fill();

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎧 총 음성 반복 청취', card2X + 100, cardY + 40);

  // Big Repeats Number
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 68px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const repeatsStr = data.totalRepeatsCount.toLocaleString();
  ctx.fillText(repeatsStr, card2X + 25, cardY + 68);

  const repWidth = ctx.measureText(repeatsStr).width;
  ctx.fillStyle = '#10b981';
  ctx.font = '900 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(' 회 완수', card2X + 25 + repWidth + 10, cardY + 96);

  // Subtitle
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '500 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('⚡ 무한 반복 자동 루프로 체화한 원어민 음성 데이터', card2X + 25, cardY + 160);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const goalPct =
    data.totalGoalsCount > 0
      ? Math.round((data.completedGoalsCount / data.totalGoalsCount) * 100)
      : 100;
  ctx.fillText(
    `오늘 일일 목표: ${data.completedGoalsCount}/${data.totalGoalsCount}개 완료 (${goalPct}%) • 보유 단어 ${data.vocabCount.toLocaleString()}개`,
    card2X + 25,
    cardY + 192
  );
  ctx.restore();

  // 6. Footer Bar
  const footerY = 515;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  roundRect(ctx, 60, footerY, width - 120, 110, 20);
  ctx.fill();
  ctx.stroke();

  // Footer Tagline & Stats Summary Pills
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('작심삼일 탈출! 매일 성장하는 나만의 영어 루프', 90, footerY + 24);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('원어민 vs 내 발음 1:1 파형 진단 • 3,000 보카 무한 반복 루프 • 실시간 DTW 오디오엔진', 90, footerY + 56);

  // QR / App Link Badge on right
  ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
  roundRect(ctx, width - 290, footerY + 28, 205, 54, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#818cf8';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WordLoop AI Suite', width - 187, footerY + 45);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('wordloop.app', width - 187, footerY + 66);
  ctx.restore();

  return canvas;
}

/**
 * Helper to draw a rounded rectangle on a 2D canvas context
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Generates a PNG Blob from ProgressShareData
 */
export async function generateProgressShareBlob(data: ProgressShareData): Promise<Blob> {
  const canvas = generateProgressShareCanvas(data);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas toBlob failed'));
      }
    }, 'image/png', 0.98);
  });
}

/**
 * Downloads a Blob as a file directly in the browser
 */
export function downloadBlobAsFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Coordinates sharing via Web Share API with automatic fallbacks to download / clipboard
 */
export async function shareProgressCard(data: ProgressShareData): Promise<{
  success: boolean;
  method: 'native_share' | 'download' | 'clipboard';
  message: string;
}> {
  const blob = await generateProgressShareBlob(data);
  const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fileName = `wordloop_progress_${data.currentStreak}streak_${dateTag}.png`;
  const file = new File([blob], fileName, { type: 'image/png' });

  // 1. Try Browser Native Web Share API if supported
  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: `${data.userName}님의 WordLoop 영어 학습 성과`,
        text: `🔥 ${data.currentStreak}일 연속 학습 스트릭 달성 & 🎧 ${data.totalRepeatsCount.toLocaleString()}회 반복 청취 완수! #WordLoop #영어공부 #습관형성`,
        files: [file],
      });
      return {
        success: true,
        method: 'native_share',
        message: '시스템 공유를 완료했습니다!',
      };
    } catch (err: any) {
      // If user cancelled, don't trigger download error, just notify
      if (err?.name === 'AbortError') {
        return {
          success: true,
          method: 'native_share',
          message: '공유를 취소했습니다.',
        };
      }
      // Otherwise fall through to file download
    }
  }

  // 2. Fallback: Download file directly
  downloadBlobAsFile(blob, fileName);

  // 3. Optional: Also attempt copying image to clipboard if supported
  if (typeof navigator !== 'undefined' && navigator.clipboard && (window as any).ClipboardItem) {
    try {
      await navigator.clipboard.write([
        new (window as any).ClipboardItem({
          'image/png': blob,
        }),
      ]);
      return {
        success: true,
        method: 'clipboard',
        message: '성과 카드 이미지가 다운로드 및 클립보드에 복사되었습니다!',
      };
    } catch (_) {}
  }

  return {
    success: true,
    method: 'download',
    message: '성과 카드 이미지 파일(PNG)이 다운로드되었습니다!',
  };
}
