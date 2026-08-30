# APP (Automatic Project Proposal)

> AI · 클라우드 · ERP 솔루션 제안서를 자동으로 생성하는 도구.
> 회사명·업종·요구사항을 입력하면 표지부터 견적까지 갖춘 Word(.docx) 제안서가 완성됩니다.

## 전체 사용 흐름

```
홈 화면
  └▶ 시작하기 버튼
      └▶ 모듈 선택 (AI · 클라우드 · ERP)
          └▶ 정보 입력 (우측에 실시간 미리보기 동반)
              └▶ 제안서 생성 중 (진행률 표시)
                  └▶ Word 파일 자동 다운로드
```

각 단계는 `src/app/page.tsx`가 `step` 상태(`home` → `select` → `form` → `loading` → `done`)로 관리하며, 화면 전환마다 대응하는 컴포넌트가 렌더링됩니다.

## 핵심 기능

### 1. 홈 화면
`HomeHero.tsx`가 담당합니다. 화면 정중앙에 그라데이션 로고(`Logo.tsx`)를 배치하고, 그 아래 "시작하기" 버튼으로 모듈 선택 화면으로 이동합니다. 배경에는 `GlitterWrap.tsx`(캔버스 기반 파티클 애니메이션)를 깔아 첫인상을 살렸습니다.

### 2. 모듈 선택
`CategorySelector.tsx`에서 AI 솔루션 · 클라우드 전환 · ERP 구축 3가지 유형 중 하나를 카드 형태로 고릅니다. 선택한 유형에 따라 이후 입력 폼의 필드 구성이 완전히 달라집니다.

### 3. 정보 입력 폼 + 실시간 미리보기
`ProposalForm.tsx`가 좌측 폼 / 우측 미리보기(`LivePreview.tsx`)의 2단 레이아웃을 구성합니다. 폼은 아래 6개 섹션으로 이루어져 있고, 타이핑하는 즉시 우측 패널에 반영되어 어떤 항목이 비어 있는지 한눈에 확인할 수 있습니다.

| # | 섹션 | 컴포넌트 | 설명 |
|---|------|----------|------|
| 1 | 기본 정보 | (ProposalForm 내부) | 제안서 제목, 제안사/고객사명, 업종, 예산, 기간, 경영진 요약용 한 줄 요약 |
| 2 | 카테고리별 상세 정보 | (ProposalForm 내부) | AI/클라우드/ERP마다 다른 전용 필드. AI는 업종(금융·제조·유통·의료) 선택 시 표준 Pain Point·KPI·컴플라이언스가 자동 채워짐(`lib/industryPresets.ts`) |
| 3 | 범위 정의 (In/Out Scope) | `ScopeSection.tsx` | 포함 범위·제외 범위를 나란히 입력해 스코프 크리프를 방지. 전제 조건·의존성도 함께 기록 |
| 4 | 항목별 견적 | `EstimateSection.tsx` | 인력 투입(M/M) × 단가로 인건비 자동 계산, SW/HW/클라우드 비용 항목 추가, 할인율·부가세를 반영한 합계까지 실시간 산출 |
| 5 | 회사 소개 및 수행 실적 | `CompanyProfileSection.tsx` | 회사 소개 문단, 핵심 역량, 수행 실적(고객사/연도/개요)을 입력. 비워두면 문서에서 자연스럽게 생략됨 |
| 6 | 문서 구성 | `StructureSection.tsx` | 아래 "문서 구성 커스터마이징" 참고 |

### 4. 문서 구성 커스터마이징
`StructureSection.tsx` + `lib/sections.ts`가 담당합니다.

- **드래그 앤 드롭 순서 변경**: `@dnd-kit`으로 섹션 카드를 끌어서 원하는 순서로 재배치할 수 있습니다. Word 문서의 로마 숫자(I, II, III...)는 실제 배치 순서를 기준으로 매 생성마다 자동으로 다시 매깁니다.
- **섹션 on/off**: 경영진 요약, 범위 정의, 비용 제안은 프로젝트 보호에 필수적이라 끌 수 없도록 잠가두었고(`locked: true`), 나머지 섹션은 자유롭게 켜고 끌 수 있습니다. "사업 관리 방안" 섹션은 조직/품질/리스크 하위 항목까지 개별로 켜고 끌 수 있습니다.
- **간략/상세 프리셋**: 버튼 한 번으로 "간략 버전(약 20p, 핵심만)" 또는 "상세 버전(전체 포함)" 구성으로 즉시 전환됩니다.

### 5. Word 문서 생성
제출 시 `app/api/generate/route.ts`가 폼 데이터를 받아 `lib/generateDocx.ts`의 `generateProposalDocx()`를 호출하고, 완성된 `.docx` 파일을 브라우저로 스트리밍해 자동 다운로드시킵니다(`DownloadScreen.tsx`). 생성 중에는 `LoadingScreen.tsx`가 단계별 진행 상태를 보여줍니다.

## 생성되는 Word 문서 구조

표지(1p 고정) 뒤에 아래 12개 섹션이 `문서 구성`에서 정한 순서·포함 여부대로 배치됩니다. 각 섹션은 카테고리(AI/클라우드/ERP)에 맞춰 서로 다른 내용으로 채워집니다.

| 섹션 | 내용 |
|------|------|
| 경영진 요약 (필수) | Executive Summary, 수신처/제안사/예산/기간 요약표 |
| 현황 분석 | 핵심 Pain Point 3가지를 현상 → 원인 → 영향 구조로 서술 |
| 솔루션 제안 | 기능별 무엇을/왜/어떻게 서술, 아키텍처, 기술 선정 근거 |
| 기대 효과 | 도입 전/후 비교표(정량), 정성적 효과 서술 |
| 범위 정의 (필수) | In Scope / Out of Scope 비교표, 전제 조건, 의존성 |
| 추진 일정 | 마일스톤 표 + Phase별 상세 설명 |
| 단계별 산출물 명세 | Phase별 산출물을 문서·코드·디자인·운영가이드·교육으로 구분 |
| 사업 관리 방안 | 수행 조직, 품질 보증, 리스크(발생가능성·영향도·대응방안) |
| 유지보수 및 지원 | SLA, 장애 대응 체계 |
| 비용 제안 (필수) | 인력 투입 내역, SW/HW/클라우드 비용, 할인·부가세 반영 최종 합계 |
| 회사 소개 및 수행 실적 | 회사 소개, 핵심 역량, 수행 실적 표 |
| 당사를 선택해야 하는 이유 | 차별화 포인트 |

## 기술 스택

- **Frontend/Backend**: Next.js 14 (App Router), TypeScript, React
- **스타일링**: Tailwind CSS (ServiceNow Now Platform 스타일의 엔터프라이즈 UI)
- **드래그 앤 드롭**: `@dnd-kit/core`, `@dnd-kit/sortable`
- **Word 문서 생성**: `docx` (docx.js)
- **배포**: Vercel

## 프로젝트 구조

```
src/
├── app/
│   ├── api/generate/route.ts   # 폼 데이터 → docx 변환 API
│   ├── layout.tsx
│   └── page.tsx                 # 화면 단계(step) 상태 관리
├── components/
│   ├── HomeHero.tsx              # 홈 화면
│   ├── Logo.tsx / GlitterWrap.tsx  # 홈 화면 로고 · 배경 애니메이션
│   ├── CategorySelector.tsx      # 모듈(AI/클라우드/ERP) 선택
│   ├── ProposalForm.tsx          # 입력 폼 전체(레이아웃 + 상태 관리)
│   ├── EstimateSection.tsx       # 항목별 견적 입력
│   ├── ScopeSection.tsx          # 범위 정의 입력
│   ├── CompanyProfileSection.tsx # 회사 소개 및 수행 실적 입력
│   ├── StructureSection.tsx      # 문서 구성 드래그 앤 드롭
│   ├── LivePreview.tsx           # 실시간 미리보기 패널
│   ├── LoadingScreen.tsx         # 생성 중 진행률 화면
│   ├── DownloadScreen.tsx        # 다운로드 완료 화면
│   └── Sidebar.tsx / Topbar.tsx  # 앱 셸(모듈 선택 이후 공통 레이아웃)
├── lib/
│   ├── generateDocx.ts           # Word 문서 생성 핵심 로직
│   ├── sections.ts               # 문서 구성 기본값 · 간략/상세 프리셋
│   ├── estimate.ts               # 견적 계산 로직
│   ├── scope.ts                  # 범위 정의 기본값
│   ├── companyProfile.ts         # 회사 소개 기본값
│   └── industryPresets.ts        # AI 업종별 자동 채움 프리셋
└── types/
    └── proposal.ts                # 전체 데이터 모델 정의
```

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

## 개발 시 참고 사항

`lib/generateDocx.ts`를 수정할 때는 아래 두 규칙을 반드시 지켜야 문서가 깨지지 않습니다.

1. **폰트 크기와 여백 단위를 구분할 것**: 글자 크기(`TextRun.size`)는 `halfPt()`를, 문단 간격·들여쓰기·테두리(`spacing`/`indent`/`border`)는 `pt()` 또는 `twip()`을 씁니다. 이 둘을 섞으면 폰트가 실제 의도보다 10배 커지는 문제가 발생합니다.
2. **모든 표의 `columnWidths`는 `scaleWidths([...])`를 통과시킬 것**: 열 너비를 직접 숫자로 넣으면 표가 실제 인쇄 가능 너비를 넘어서 오른쪽 여백을 침범합니다.

### RFP PDF 업로드 기능 (`src/lib/rfp/`)

`src/lib/rfp/extractText.ts`는 브라우저에서 `pdfjs-dist`로 PDF 텍스트를 추출합니다. pdfjs는 파싱을 별도 Worker 스크립트(`public/pdf.worker.min.mjs`)로 실행하는데, 이 파일은 `node_modules/pdfjs-dist/build/pdf.worker.min.mjs`를 그대로 복사해 커밋해 둔 것입니다.

**⚠️ `pdfjs-dist`를 업그레이드하면 `public/pdf.worker.min.mjs`를 반드시 수동으로 재복사해야 합니다.** 버전이 어긋나면(`API version X, Worker version Y`) 브라우저 콘솔에 에러가 나며 PDF 파싱이 실패합니다.

```bash
npm install pdfjs-dist@latest
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs
```

---

Made with Next.js + docx.js
