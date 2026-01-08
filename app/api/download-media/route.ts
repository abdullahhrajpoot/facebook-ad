import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    try {
        const { url, filename } = await req.json()

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 })
        }

        const cleanUrl = url.replace(/&amp;/g, '&');

        const response = await fetch(cleanUrl)
        if (!response.ok) {
            throw new Error(`Failed to fetch media: ${response.statusText}`)
        }

        const contentType = response.headers.get('content-type') || 'application/octet-stream'
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${filename || 'download'}"`,
            },
        })

    } catch (error: any) {
        console.error('Download error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to download media' },
            { status: 500 }
        )
    }
}
