#!/bin/bash

echo "========================================="
echo "📱 안드로이드(Android APK) 앱 자동 빌드 스크립트"
echo "========================================="

# 0. 의존성 패키지 확인
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.bin/vite" ]; then
    echo "📦 프로젝트 의존성(npm packages) 설치 중..."
    npm install
fi

# 1. 웹 자원 빌드
echo "1️⃣ Vite 웹 애플리케이션 빌드 중..."
npm run build:web

if [ $? -ne 0 ]; then
    echo "❌ 웹 빌드 실패!"
    exit 1
fi

echo "✅ 웹 빌드 완료"

# 2. Capacitor 설치 확인 및 초기화
echo "2️⃣ Capacitor 안드로이드 모듈 준비 중..."
if ! npm list @capacitor/core &> /dev/null; then
    echo "📦 Capacitor 패키지 설치 중..."
    npm install @capacitor/core
    npm install --save-dev @capacitor/cli @capacitor/android
fi

# 3. Android 폴더 생성 확인
if [ ! -d "android" ]; then
    echo "🏗️ 안드로이드 네이티브 프로젝트 생성 중..."
    npx cap add android
fi

# 4. 최신 웹 자원 안드로이드 동기화
echo "🔄 웹 자원 안드로이드 프로젝트로 동기화 중..."
npx cap sync android

echo "========================================="
echo "🎉 안드로이드 앱 동기화가 완료되었습니다!"
echo ""
echo "📌 다음 단계 선택:"
echo "1) 안드로이드 스튜디오에서 프로젝트 열기:"
echo "   👉 npx cap open android"
echo ""
echo "2) 커맨드라인에서 디버그 APK 자동 생성 (Android SDK 설치 환경):"
echo "   👉 cd android && ./gradlew assembleDebug"
echo "   (생성 폴더: android/app/build/outputs/apk/debug/app-debug.apk)"
echo "========================================="
