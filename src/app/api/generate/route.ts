import { NextRequest, NextResponse } from 'next/server'
import type { ProposalFormData } from '@/types/proposal'

export async function POST(req: NextRequest) {
  try {
    const data: ProposalFormData = await req.json()

    // 서버에서 docx 생성
    const { generateProposalDocx } = await import('@/lib/generateDocx')
    const blob = await generateProposalDocx(data)
    const buffer = await blob.arrayBuffer()

    const filename = encodeURIComponent(
      `APP_${data.category}_제안서_${data.clientName}_${data.preparedDate}.docx`
    )

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      },
    })
  } catch (err) {
    console.error('Generation error:', err)
    return NextResponse.json({ error: '제안서 생성 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
