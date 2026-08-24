# APP — Automatic Project Proposal

> AI · 클라우드 · ERP 솔루션 제안서를 자동으로 생성하는 도구

## 기능

- 🤖 **AI 솔루션** 제안서 — LLM, ML, 컴퓨터 비전 등
- ☁️ **클라우드 전환** 제안서 — AWS/Azure/GCP 마이그레이션
- 🏢 **ERP 구축** 제안서 — 회계/SCM/HR 통합 시스템

## 화면 흐름

```
유형 선택 → 정보 입력 → 생성 중 → Word 파일 다운로드
```

## 기술 스택

- **Frontend/Backend**: Next.js 14 (App Router)
- **Word 생성**: docx.js
- **스타일링**: Tailwind CSS
- **배포**: Vercel

## 로컬 실행

```bash
npm install
npm run dev
# http://localhost:3000
```

## 배포

```bash
# Vercel CLI
npm i -g vercel
vercel --prod
```

## 생성 문서 구조

| 섹션 | 내용 |
|------|------|
| 표지 | 제안 유형, 제목, 고객사, 작성일 |
| I. 경영진 요약 | Executive Summary |
| II. 현황 분석 | AS-IS, Pain Point |
| III. 솔루션 제안 | 아키텍처, 기능, 특장점 |
| IV. 기대 효과 | KPI, 정량적 효과 |
| V. 추진 일정 | 마일스톤 테이블 |
| VI. 사업 관리 | 조직, 품질, 리스크 |
| VII. 유지보수 | SLA, 지원 체계 |
| VIII. 비용 제안 | 항목별 예산 구성 |
| IX. 선택 이유 | 차별화 포인트 |

---

Made with ❤️ using Next.js + docx.js
