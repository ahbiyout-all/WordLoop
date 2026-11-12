/**
 * WordLoop Global Version & Distribution Constants (Single Source of Truth)
 * Centralizes version number, build codes, package names, and release URLs across the application.
 */

export const APP_VERSION = '4.0.1';
export const APP_VERSION_CODE = 40001;
export const APP_NAME = 'WordLoop';
export const APP_PACKAGE_NAME = 'com.wordloop.app';
export const APP_APK_FILENAME = `WordLoop-v${APP_VERSION}.apk`;
export const APP_APK_DOWNLOAD_PATH = '/api/download/apk';
export const APP_APK_DIRECT_PATH = `/downloads/${APP_APK_FILENAME}`;
export const APP_APK_ALIAS_PATH = '/downloads/WordLoop.apk';

export const GITHUB_REPO_OWNER = 'ahbiyout-all';
export const GITHUB_REPO_NAME = 'WordLoop';
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`;
export const GITHUB_RELEASES_URL = `${GITHUB_REPO_URL}/releases`;
export const GITHUB_PAGES_URL = `https://${GITHUB_REPO_OWNER}.github.io/${GITHUB_REPO_NAME}/`;
