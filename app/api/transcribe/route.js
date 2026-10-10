
import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "Groq API key is not configured." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const audio = formData.get("audio");

    if (!audio || typeof audio.arrayBuffer !== "function" || audio.size === 0) {
      return NextResponse.json(
        { error: "Please provide a valid audio recording." },
        { status: 400 }
      );
    }

    // Keep uploads within the free-tier documented limit.
    if (audio.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Audio must be smaller than 25 MB." },
        { status: 413 }
      );
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const bytes = Buffer.from(await audio.arrayBuffer());

    const audioFile = new File(
      [bytes],
      "recording.webm",
      { type: audio.type || "audio/webm" }
    );

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3-turbo",
      response_format: "json",
      temperature: 0,
    });

    return NextResponse.json({
      text: transcription.text.trim(),
    });
  } catch (error) {
    console.error("Transcription error:", error.message);

    return NextResponse.json(
      { error: "Audio transcription failed. Please try again." },
      { status: 502 }
    );
  }
}
