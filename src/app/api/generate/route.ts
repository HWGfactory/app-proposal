import { NextRequest, NextResponse } from 'next/server'
import type { ProposalFormData } from '@/types/proposal'

export async function POST(req: NextRequest) {
  try {
    const data: ProposalFormData = await req.json()

    // 서버에서 pptx 생성
    const { generateProposalPptx } = await import('@/lib/generatePptx')
    const buffer = await generateProposalPptx(data)

    const filename = encodeURIComponent(
      `APP_제안서_${data.rfp.client || data.rfp.projectName || '제안'}_${data.preparedDate}.pptx`
    )

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      },
    })
  } catch (err) {
    console.error('Generation error:', err)
    return NextResponse.json({ error: '제안서 생성 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
