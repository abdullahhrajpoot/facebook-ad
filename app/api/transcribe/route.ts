import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    try {
        const { videoUrl } = await req.json()

        if (!videoUrl) {
            return NextResponse.json({ error: 'Video URL is required' }, { status: 400 })
        }

        const apiKey = process.env.ELEVENLABS_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: 'ElevenLabs API key is not configured' }, { status: 500 })
        }

        // 1. Fetch the video file from the URL
        const videoResponse = await fetch(videoUrl)
        if (!videoResponse.ok) {
            throw new Error(`Failed to fetch video: ${videoResponse.statusText}`)
        }
        const videoBlob = await videoResponse.blob()

        // 2. Prepare FormData for ElevenLabs API
        const formData = new FormData()
        formData.append('file', videoBlob, 'video.mp4')
        formData.append('model_id', 'scribe_v1')

        // 3. Call ElevenLabs Speech to Text API
        const transcriptionResponse = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
            },
            body: formData,
        })

        if (!transcriptionResponse.ok) {
            const errorText = await transcriptionResponse.text()
            console.error('ElevenLabs API Error:', errorText)
            throw new Error(`ElevenLabs API failed: ${errorText}`)
        }

        const data = await transcriptionResponse.json()

        // The API returns { text: "..." }
        return NextResponse.json({ text: data.text })

    } catch (error: any) {
        console.error('Transcription error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to transcribe video' },
            { status: 500 }
        )
    }
}
