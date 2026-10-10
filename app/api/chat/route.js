
import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const SYSTEM_PROMPT = `
You are Aria, the friendly and concise AI customer support specialist
for Aura Skincare, a premium organic Indian skincare brand.

Follow these policies exactly:

1. Shipping is free on orders above ₹499.
   Orders below ₹499 have a ₹50 shipping fee.
   Standard delivery takes 3–5 business days.

2. Returns are accepted within 7 days of delivery only for
   unopened, unused products in their original packaging.

3. Damaged or defective products must be reported within 48 hours
   of delivery, with photos, for replacement.

4. Orders can only be cancelled while their status is Processing.
   Shipped and Out for Delivery orders cannot be cancelled.
   Customers may refuse delivery at the doorstep.

5. Cash on Delivery is available for orders up to ₹2,500.
   Customers may pay by cash or UPI at the doorstep.

Rules:
- Keep responses natural, friendly, and concise.
- Only answer questions related to Aura Skincare.
- Never invent order details or claim that an order was checked.
- Do not promise refunds, replacements, or cancellations.
- If an order-specific request requires a lookup, explain that
  you need to check the order. Do not guess its status.
- If information is unavailable, say so honestly.
- Politely decline unrelated requests.
`;

export async function POST(request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "Groq API key is not configured." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json(
        { error: "Please provide a message." },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: "Message is too long." },
        { status: 400 }
      );
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
      temperature: 0.2,
      max_completion_tokens: 180,
    });

    const reply = completion.choices[0]?.message?.content?.trim();

    if (!reply) {
      throw new Error("The model returned an empty response.");
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat API error:", error.message);

    return NextResponse.json(
      { error: "Aria could not generate a response. Please try again." },
      { status: 502 }
    );
  }
}
