# APP 배포 가이드 (Claude Code + Terminal)

## 1단계: 로컬 준비

```bash
# 프로젝트 폴더로 이동
cd app-proposal

# 의존성 설치
npm install

# 로컬 테스트
npm run dev
# → http://localhost:3000 에서 확인
```

---

## 2단계: GitHub 푸시

```bash
# Git 초기화
git init
git add .
git commit -m "feat: initial APP - Automatic Project Proposal"

# GitHub에 새 리포지토리 생성 후 (GitHub.com → New Repository)
# 리포지토리명 예시: app-proposal

git remote add origin https://github.com/<YOUR_USERNAME>/app-proposal.git
git branch -M main
git push -u origin main
```

---

## 3단계: Vercel 배포

### 방법 A: Vercel CLI (터미널에서 직접)

```bash
# Vercel CLI 설치
npm i -g vercel

# 로그인
vercel login

# 배포 (첫 배포)
vercel

# 프로덕션 배포
vercel --prod
```

### 방법 B: Vercel 웹 대시보드
1. https://vercel.com 로그인
2. "Add New Project" 클릭
3. GitHub에서 `app-proposal` 리포지토리 선택
4. Framework: **Next.js** (자동 감지)
5. "Deploy" 클릭

---

## 환경 변수 (현재 불필요)
현재 버전은 외부 API 키 없이 동작합니다.

---

## Claude Code에서 실행하는 경우

Claude Code 터미널에서 아래 순서로:

```bash
# 1. 빌드 확인
npm run build

# 2. GitHub 푸시
git add . && git commit -m "feat: APP v1.0" && git push

# 3. Vercel 배포
vercel --prod
```

배포 완료 후 Vercel이 URL을 제공합니다 (예: `https://app-proposal.vercel.app`)

