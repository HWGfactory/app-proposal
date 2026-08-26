/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    // 이 프로젝트 폴더가 OneDrive 동기화 경로에 있어 webpack의 영속 캐시(.next/cache)
    // pack 파일 rename이 OneDrive와 충돌해 종종 깨진다. dev 모드에서는 캐시를 꺼서
    // 이 문제를 원천적으로 피한다 (빌드 속도는 약간 느려지지만 안정성 우선).
    if (dev) config.cache = false
    return config
  },
}

module.exports = nextConfig
