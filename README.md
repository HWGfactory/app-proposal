# APP (Automatic Project Proposal)

> 제안요청서(RFP) PDF를 올리면 요구사항과 평가 기준을 분석해 제안 발표자료(.pptx)를 만들어 주는 도구.
> 사업에 관한 내용은 전부 RFP에서 나오고, 사용자가 입력하는 것은 제안사(우리 회사) 정보뿐입니다.

## 전체 사용 흐름

```
홈 화면
  └▶ 시작하기
      └▶ RFP 업로드 (PDF)
          └▶ RFP 분석 결과 확인 · 반영할 요구사항 선택
              └▶ 제안사 정보 입력 (회사명 · 소개 · 실적)
                  └▶ 생성 중
                      └▶ PPTX 파일 자동 다운로드
```

`src/app/page.tsx`가 `step` 상태(`home` → `upload` → `analysis` → `form` → `loading` → `done`)로 화면 전환을 관리합니다. 제안서는 항상 특정 RFP에 대한 응답이므로, 분석 결과 없이는 `form` 단계에 진입할 수 없습니다.

## 핵심 기능

### 1. RFP PDF 텍스트 추출 (`lib/rfp/extractText.ts`)

`pdfjs-dist`로 **브라우저 안에서** PDF를 파싱합니다. 파일이 서버로 전송되지 않는 것이 이 설계의 의도입니다.

PDF에는 "줄"이나 "문장"이라는 개념이 없고 좌표가 찍힌 텍스트 조각만 있으므로, Y좌표가 비슷한 조각들을 묶고 X좌표 순으로 이어 붙여 줄 단위로 재구성합니다. 각 줄은 페이지 번호를 함께 보관하며, 이 번호가 나중에 제안서의 "근거 페이지"가 됩니다.

### 2. RFP 분석 (`lib/rfp/analyze.ts`)

LLM 없이 규칙 기반으로 동작하는 순수 함수입니다. 완벽하지 않으며, 사용자가 화면에서 눈으로 확인하고 취사선택하는 것을 전제로 한 **초안 추출**입니다.

- **제목 상태 기계**: `3. 요구사항 정의` / `4. 제안서 평가 기준` 같은 번호 매겨진 제목을 만나면 이후 목록의 해석 문맥이 바뀌고, 새로운 대제목(`5. 기타 사항`)에서 문맥을 벗어납니다.
- **요구사항**: 요구사항 문맥 안의 목록 항목이거나, 문맥과 무관하게 `~해야 한다 / 하여야 함 / 되어야 하며` 같은 의무 표현을 가진 문장. 중복 텍스트는 제거합니다. 소제목에서 기능 / 비기능을 판정합니다.
- **평가 기준**: 목록 항목뿐 아니라 `4.2 가격 평가: 20점`처럼 **소제목 자체가 배점을 갖는 경우**까지 수집합니다.
- **사업 개요**: `사업명 : ...` 처럼 `항목: 값` 형태로 적힌 줄에서 사업명·발주기관·예산·기간·제출기한을 찾습니다. 먼저 나온 값을 우선합니다(RFP는 앞부분에 요약 정보를 두는 것이 관례).

### 3. 분석 결과 확인 (`components/RfpAnalysis.tsx`)

추출된 사업 개요 / 요구사항 / 평가 기준을 페이지 번호와 함께 보여줍니다. 요구사항은 기본적으로 전부 선택돼 있고, 오탐을 체크 해제하면 제안서에서 빠집니다. 규칙 기반이라 누락·오탐이 있을 수 있으므로 화면에서 원문과 대조하도록 안내합니다.

### 4. 제안사 정보 입력 (`components/ProposerForm.tsx`)

사용자가 입력하는 **유일한** 영역입니다.

| 항목 | 필수 | 반영되는 곳 |
|------|:---:|------|
| 제안사 (우리 회사) | ● | 표지, 마무리 슬라이드 |
| 작성자 · 작성일 | | 표지 |
| 회사 소개 | | 제안사 소개 슬라이드 |
| 핵심 역량 | | 제안사 소개 슬라이드 |
| 주요 수행 실적 | | 수행 실적 슬라이드 (비우면 슬라이드 자체가 생략됨) |

화면 상단에는 "RFP에서 자동 반영된 내용"이 읽기 전용으로 표시되어, 입력하지 않아도 제안서에 들어가는 항목을 확인할 수 있습니다.

### 5. PPTX 생성 (`lib/generatePptx.ts`)

`app/api/generate/route.ts`가 서버에서 `generateProposalPptx()`를 호출해 `.pptx`를 스트리밍합니다. PowerPoint가 시스템에 설치된 한글 폰트를 사용하므로 폰트 파일을 임베드하지 않습니다.

## 생성되는 발표자료 구조

16:9 비율로 아래 슬라이드가 만들어집니다. 내용이 없는 슬라이드(수행 실적, 평가 기준)는 자동으로 생략됩니다.

| 슬라이드 | 내용 |
|------|------|
| 표지 | 사업명, 발주기관, 제안사, 작성자·작성일 |
| 목차 | 실제로 생성되는 장만 나열 |
| 사업 개요 | RFP에서 찾은 사업명·발주기관·예산·기간. 없으면 "제안요청서 미명시" |
| 요구사항 구성 | 기능 / 비기능 / 기타 건수를 카드로 표시 |
| **요구사항 대응 방안** | ID · 구분 · RFP 원문 · 대응 방안 · 근거 페이지 표. **한 장에 5행씩 자동 분할** |
| 평가 기준별 대응 | 배점 내림차순 정렬, 배점 합계 표시 |
| 추진 일정 | 4단계 마일스톤 |
| 제안사 소개 | 회사 소개 + 핵심 역량 |
| 주요 수행 실적 | 고객사 · 연도 · 성과 표 (최대 6건) |
| 마무리 | 감사합니다 + 제안사명 |

### ⚠️ 요구사항 "대응 방안"은 표준 문구입니다

사용자가 대응 방안을 직접 입력하지 않는 구조이므로, 요구사항 **유형별로 정해진 3가지 문구**(기능 / 비기능 / 기타) 중 하나가 들어갑니다(`STANDARD_RESPONSE`). 실제 제안서로 제출하려면 PowerPoint에서 각 요구사항에 맞게 보완해야 합니다.

## 기술 스택

- **Frontend/Backend**: Next.js 14 (App Router), TypeScript, React
- **스타일링**: Tailwind CSS (ServiceNow Now Platform 스타일의 엔터프라이즈 UI)
- **PDF 파싱**: `pdfjs-dist` (브라우저에서 실행)
- **PPTX 생성**: `pptxgenjs` (서버에서 실행)
- **배포**: Vercel

## 프로젝트 구조

```
src/
├── app/
│   ├── api/generate/route.ts     # 제안서 데이터 → pptx 변환 API
│   ├── layout.tsx
│   └── page.tsx                   # 화면 단계(step) 상태 관리
├── components/
│   ├── HomeHero.tsx                # 홈 화면
│   ├── Logo.tsx / GlitterWrap.tsx  # 로고 · 배경 파티클 애니메이션
│   ├── RfpUploader.tsx             # PDF 드래그앤드롭 업로드
│   ├── RfpAnalysis.tsx             # 분석 결과 표시 · 요구사항 선택
│   ├── ProposerForm.tsx            # 제안사 정보 입력
│   ├── CompanyProfileSection.tsx   # 회사 소개 · 핵심 역량 · 수행 실적 입력
│   ├── LoadingScreen.tsx           # 생성 중 진행률 화면
│   ├── DownloadScreen.tsx          # 다운로드 완료 화면
│   └── Sidebar.tsx / Topbar.tsx    # 앱 셸 (진행 단계 표시)
├── lib/
│   ├── generatePptx.ts             # 발표자료 생성 핵심 로직
│   ├── rfp/
│   │   ├── extractText.ts          # PDF → 줄 단위 텍스트 (페이지 번호 포함)
│   │   ├── analyze.ts              # 줄 → 요구사항 · 평가기준 · 사업개요
│   │   └── prefill.ts              # 분석 결과 → 제안서 데이터 모델
│   ├── companyProfile.ts           # 제안사 정보 기본값
│   └── id.ts                       # 목록 항목용 ID 생성
└── types/
    └── proposal.ts                  # 전체 데이터 모델 정의
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

### pdf.worker.min.mjs 버전 동기화

`pdfjs-dist`는 파싱을 별도 Worker 스크립트로 실행하며, `public/pdf.worker.min.mjs`는 `node_modules/pdfjs-dist/build/pdf.worker.min.mjs`를 그대로 복사해 커밋해 둔 파일입니다.

**⚠️ `pdfjs-dist`를 업그레이드하면 이 파일을 반드시 수동으로 재복사해야 합니다.** 버전이 어긋나면(`API version X, Worker version Y`) 브라우저 콘솔에 에러가 나며 PDF 파싱이 실패합니다.

```bash
npm install pdfjs-dist@latest
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs
```

### 스캔 PDF는 지원하지 않습니다

OCR을 쓰지 않으므로 이미지로만 이루어진 PDF에서는 텍스트를 추출할 수 없습니다. 업로드 화면에 안내가 표시됩니다.

### PPTX 레이아웃 수정 시

`lib/generatePptx.ts`의 좌표 단위는 **인치**입니다(16:9 = 10 × 5.625). `MARGIN`과 `BODY_W` 상수를 기준으로 배치하면 좌우 여백이 맞습니다. 표의 `colW` 합계는 `BODY_W`를 넘지 않아야 하며, 넘으면 슬라이드 밖으로 밀려납니다.

요구사항이 많을 때 한 슬라이드에 다 들어가지 않으므로 `ROWS_PER_SLIDE`(기본 5)로 나눠 담습니다. 표 행 높이를 키우면 이 값도 함께 줄여야 합니다.

---

Made with Next.js + pptxgenjs
