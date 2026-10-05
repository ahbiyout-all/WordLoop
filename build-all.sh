#!/bin/bash

echo "========================================================="
echo "🚀 영단어 학습 & 퀴즈 마스터 크로스 플랫폼 자동 빌드 도구"
echo "========================================================="
echo "1) PC 데스크톱 앱 빌드 (Windows/Mac/Linux - Electron)"
echo "2) 안드로이드 앱 빌드 (Android APK / Android Studio - Capacitor)"
echo "3) PC 및 안드로이드 모두 빌드"
echo "========================================================="
read -p "원하시는 빌드 번호를 입력하세요 (1-3): " CHOICE

chmod +x build-pc.sh build-android.sh

case $CHOICE in
    1)
        ./build-pc.sh
        ;;
    2)
        ./build-android.sh
        ;;
    3)
        ./build-pc.sh
        ./build-android.sh
        ;;
    *)
        echo "❌ 잘못된 선택입니다. 빌드를 종료합니다."
        exit 1
        ;;
esac
