# 📱💻 PC & 안드로이드 앱 자동 빌드 가이드

이 프로젝트는 단일 코드베이스(React + Vite)를 기반으로 **PC 데스크톱 프로그램(Windows .exe, Mac, Linux)** 및 **안드로이드 앱(APK)**으로 자동 빌드할 수 있는 스크립트(`.bat` 및 `.sh`)를 제공합니다.

---

## 🚀 빠른 시작 (윈도우 / 마크 / 리눅스)

### 🪟 Windows 사용자
탐색기에서 배치 파일(.bat)을 더블 클릭하거나 명령 프롬프트(cmd)에서 실행합니다:
- **통합 빌드**: `build-all.bat` 실행 (또는 `npm run build:all`)
- **PC 데스크톱 앱 빌드**: `build-pc.bat` 실행 (또는 `npm run pc:build`)
- **안드로이드 앱 동기화**: `build-android.bat` 실행 (또는 `npm run android:sync`)

> 💡 **중요 팁 (Windows 경로 오류 방지)**:
> - 다운로드한 프로젝트 폴더 경로에 `&`, 특수문자, 한글 공백이 포함되어 있을 경우 윈도우 기본 CMD의 특성상 경로 인식이 끊길 수 있습니다.
> - 폴더명을 `WordLoop` 또는 `EnglishVocab`과 같이 **영문/숫자 형태(공백/특수문자 없음)**로 지정하시면 가장 안정적입니다.
> - 최신 배치 파일은 Node.js 직결 러너(`scripts/build-electron.js`, `scripts/sync-android.js`)를 통해 특수문자 경로에서도 안전하게 실행되도록 보호 모드가 적용되어 있습니다.

### 🍎 Mac / 🐧 Linux 사용자
터미널에서 실행합니다:
```bash
npm run build:all
# 또는
bash build-all.sh
```

---

## 💻 1. PC 데스크톱 앱 빌드 (Electron)

### 📌 실행 및 빌드 명령
- **Windows**: `build-pc.bat` 더블 클릭
- **Mac / Linux**: `bash build-pc.sh` 또는 `npm run build:pc`
- **PC 개발 모드 로컬 실행**: `npm run pc:dev`

### 📁 빌드 결과물 위치
- 실행 결과물은 프로젝트 로컬 디렉터리의 `dist_electron/` 폴더에 생성됩니다.
  - **Windows**: `.exe` (설치 파일 및 포터블)
  - **macOS**: `.dmg` 또는 `.app`
  - **Linux**: `.AppImage` 또는 `.deb`

---

## 📱 2. 안드로이드 앱 빌드 (Capacitor)

### 📌 사전 필요 조건
1. **Node.js** (v18 이상)
2. **Android Studio** (APK 생성 및 서명을 위해 설치 권장)
3. **Java JDK** (v17 이상)

### 📌 실행 및 빌드 명령
1. **안드로이드 프로젝트 자동 생성 및 웹 자원 동기화**:
   - **Windows**: `build-android.bat` 더블 클릭
   - **Mac / Linux**: `bash build-android.sh` 또는 `npm run build:android`

2. **안드로이드 스튜디오에서 프로젝트 열기**:
   ```cmd
   npx cap open android
   ```

3. **터미널에서 디버그 APK 자동 빌드 (Android SDK/JDK 환경 설정 시)**:
   - **Windows**:
     ```cmd
     cd android & gradlew.bat assembleDebug
     ```
   - **Mac / Linux**:
     ```bash
     cd android && ./gradlew assembleDebug
     ```
   - **생성된 APK 파일 위치**: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📂 관련 주요 파일 구조
- `build-pc.bat` / `build-pc.sh` : PC 데스크톱 빌드 스크립트 (Windows .bat / Bash .sh)
- `build-android.bat` / `build-android.sh` : 안드로이드 빌드 스크립트 (Windows .bat / Bash .sh)
- `build-all.bat` / `build-all.sh` : 통합 크로스플랫폼 선택 빌드 스크립트
- `electron/main.cjs` : PC 데스크톱 실행 창 및 메뉴 제어 설정
- `capacitor.config.json` : 안드로이드 앱 패키지 설정

