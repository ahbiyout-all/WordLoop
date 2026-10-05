#!/bin/bash

echo "========================================="
echo "💻 PC 데스크톱 앱 (Electron) 자동 빌드 스크립트"
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

echo "✅ 웹 빌드 완료 (dist 디렉터리 생성됨)"

# 2. Electron 빌더 의존성 확인
echo "2️⃣ PC 앱 패키징 준비 중..."
if ! npm list electron &> /dev/null; then
    echo "📦 Electron 관련 라이브러리 설치 중..."
    npm install --save-dev electron electron-builder
fi

# 3. PC 실행 파일 패키징
echo "3️⃣ PC 실행 파일(.exe / .dmg / .AppImage) 패키징 실행 중..."
npx electron-builder --config.extraMetadata.main=electron/main.cjs

if [ $? -eq 0 ]; then
    echo "========================================="
    echo "🎉 PC 데스크톱 앱 빌드가 성공적으로 완료되었습니다!"
    echo "📁 생성된 파일 위치: dist_electron/"
    echo "========================================="
else
    echo "⚠️ 패키징 중 오류가 발생했습니다. 'npm run pc:dev'로 개발 실행을 테스트해보세요."
fi
