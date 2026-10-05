/**
 * GitHub Releases Real-Time Auto-Update Service
 * Repo: AhBiYout/WordLoop
 * Target: Real-time update checks, semantic version comparison, and direct installer downloads.
 */

import { APP_VERSION } from '../data/patchNotesData';

export const GITHUB_REPO_OWNER = 'AhBiYout';
export const GITHUB_REPO_NAME = 'WordLoop';
export const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases`;
export const GITHUB_API_LATEST_RELEASE = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`;

export interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
  content_type: string;
  download_count: number;
}

export interface UpdateCheckResult {
  isUpdateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseTitle: string;
  releaseNotes: string;
  publishedAt: string;
  htmlUrl: string;
  downloadUrlPC?: string;
  downloadUrlApk?: string;
  downloadUrlIOS?: string;
  downloadUrlWeb?: string;
  checkedAt: number;
  error?: string;
}

/**
 * Compare two semver strings (e.g. "3.11.0" vs "3.10.0")
 * Returns:
 *   1 if a > b (a is newer)
 *  -1 if a < b (b is newer)
 *   0 if a == b
 */
export const compareVersions = (a: string, b: string): number => {
  const cleanA = a.replace(/^[vV]/, '').trim();
  const cleanB = b.replace(/^[vV]/, '').trim();

  const partsA = cleanA.split('.').map((p) => parseInt(p, 10) || 0);
  const partsB = cleanB.split('.').map((p) => parseInt(p, 10) || 0);

  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const valA = partsA[i] || 0;
    const valB = partsB[i] || 0;
    if (valA > valB) return 1;
    if (valA < valB) return -1;
  }
  return 0;
};

const STORAGE_KEY = 'wordloop_github_latest_release_info';
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes cache to avoid GitHub API rate limits

export class GitHubUpdateService {
  private static cachedResult: UpdateCheckResult | null = null;

  /**
   * Check for latest release on GitHub
   * @param force - If true, bypasses local cache and calls GitHub API directly
   */
  static async checkForUpdates(force: boolean = false): Promise<UpdateCheckResult> {
    const currentVersion = APP_VERSION;

    // Check memory / localStorage cache first if not forced
    if (!force) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as UpdateCheckResult;
          if (Date.now() - parsed.checkedAt < CACHE_TTL_MS) {
            // Re-evaluate update availability in case currentVersion changed
            parsed.isUpdateAvailable = compareVersions(parsed.latestVersion, currentVersion) > 0;
            parsed.currentVersion = currentVersion;
            this.cachedResult = parsed;
            return parsed;
          }
        }
      } catch {
        // Ignore cache parse errors
      }
    }

    try {
      const response = await fetch(GITHUB_API_LATEST_RELEASE, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No release published yet on repo
          const result: UpdateCheckResult = {
            isUpdateAvailable: false,
            currentVersion,
            latestVersion: currentVersion,
            releaseTitle: `WordLoop v${currentVersion}`,
            releaseNotes: '현재 설치된 버전이 최신 버전입니다 (등록된 신규 릴리스 없음).',
            publishedAt: new Date().toISOString(),
            htmlUrl: GITHUB_RELEASES_URL,
            checkedAt: Date.now(),
          };
          this.saveCache(result);
          return result;
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const rawTag = (data.tag_name || data.name || '').trim();
      const latestVersion = rawTag.replace(/^[vV]/, '');
      const isNewer = compareVersions(latestVersion, currentVersion) > 0;

      const assets: GitHubAsset[] = Array.isArray(data.assets) ? data.assets : [];

      // Find specific platform installer assets
      const pcAsset = assets.find((a) =>
        a.name.toLowerCase().endsWith('.exe') || a.name.toLowerCase().includes('windows')
      );
      const apkAsset = assets.find((a) =>
        a.name.toLowerCase().endsWith('.apk') || a.name.toLowerCase().includes('android')
      );
      const iosAsset = assets.find((a) =>
        a.name.toLowerCase().includes('ios') || a.name.toLowerCase().endsWith('.ipa')
      );
      const webAsset = assets.find((a) =>
        a.name.toLowerCase().includes('web') && a.name.toLowerCase().endsWith('.zip')
      );

      const result: UpdateCheckResult = {
        isUpdateAvailable: isNewer,
        currentVersion,
        latestVersion: latestVersion || currentVersion,
        releaseTitle: data.name || `WordLoop v${latestVersion}`,
        releaseNotes: data.body || '최신 업데이트 릴리스입니다.',
        publishedAt: data.published_at || new Date().toISOString(),
        htmlUrl: data.html_url || GITHUB_RELEASES_URL,
        downloadUrlPC: pcAsset?.browser_download_url,
        downloadUrlApk: apkAsset?.browser_download_url,
        downloadUrlIOS: iosAsset?.browser_download_url,
        downloadUrlWeb: webAsset?.browser_download_url,
        checkedAt: Date.now(),
      };

      this.saveCache(result);
      return result;
    } catch (err: any) {
      console.warn('GitHub update check failed:', err?.message || err);
      const fallbackResult: UpdateCheckResult = {
        isUpdateAvailable: false,
        currentVersion,
        latestVersion: currentVersion,
        releaseTitle: `WordLoop v${currentVersion}`,
        releaseNotes: '오프라인 환경이거나 네트워크 상태를 확인해주세요.',
        publishedAt: new Date().toISOString(),
        htmlUrl: GITHUB_RELEASES_URL,
        checkedAt: Date.now(),
        error: err?.message || '네트워크 확인 필요',
      };
      return fallbackResult;
    }
  }

  private static saveCache(result: UpdateCheckResult) {
    this.cachedResult = result;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    } catch {
      // Storage quota or disabled
    }
  }

  /**
   * Get last checked cached result if exists
   */
  static getCachedResult(): UpdateCheckResult | null {
    if (this.cachedResult) return this.cachedResult;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.cachedResult = JSON.parse(stored);
        return this.cachedResult;
      }
    } catch {
      // Ignore
    }
    return null;
  }
}
