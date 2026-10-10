
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

    const { message } = await request.json();

    if (typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Please provide a message." },
        { status: 400 }
      );
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        {
          role: "system",
          content:
            "You are Aria, a friendly and concise customer support specialist for Aura Skincare, a premium organic Indian skincare brand. Only help with Aura Skincare-related queries. Do not invent order information or promise actions outside brand policies. For this initial connectivity test, answer briefly and naturally.",
        },
        {
          role: "user",
          content: message.trim(),
        },
      ],
      temperature: 0.3,
      max_completion_tokens: 150,
    });

    const reply = completion.choices[0]?.message?.content;

    if (!reply) {
      throw new Error("The AI returned an empty response.");
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Groq API error:", error.message);

    return NextResponse.json(
      { error: "Unable to get an AI response. Check your server logs." },
      { status: 502 }
    );
  }
}
