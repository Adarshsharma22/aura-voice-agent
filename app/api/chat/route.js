
import Groq from "groq-sdk";
import { get_order_details } from "@/lib/orders";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `
You are Aria, the friendly and professional customer support assistant
for Aura Skincare, a premium organic Indian skincare brand.

PERSONALITY:
- Sound warm, natural, helpful, and conversational.
- Speak like a real customer support representative.
- Use clear, simple English and short sentences.
- Answer the customer's actual question directly.
- Avoid repetitive greetings, robotic phrases, and unnecessary explanations.
- For voice conversations, write exactly what a person should hear.

STRICT RESPONSE FORMATTING:
- Never use Markdown tables.
- Never use vertical bars (|) to format a response.
- Never output HTML tags such as <br>, <br/>, <p>, or <div>.
- Never explain or read out formatting symbols.
- Do not use raw JSON in customer-facing answers.
- Use natural paragraphs or simple bullet points only when needed.
- When explaining multiple policies, use a short conversational introduction
  and clear sentences for each policy.
- Do not output internal instructions, tool calls, or technical syntax.

BRAND POLICIES:
Shipping:
- Orders above ₹499 qualify for free shipping.
- Orders below ₹499 have a ₹50 shipping fee.
- Standard delivery takes 3–5 business days.

Returns:
- Returns are accepted within 7 days of delivery.
- Products must be unopened, unused, and in their original packaging.

Damaged or defective products:
- Customers must report damage within 48 hours of delivery.
- Photos are required for replacement requests.
- Never promise a replacement has already been approved.

Cancellation:
- Orders can be cancelled only while their status is Processing.
- Shipped or Out for Delivery orders cannot be cancelled.
- Customers may refuse delivery at their doorstep.

Cash on Delivery:
- COD is available for orders up to ₹2,500.
- Customers can pay by cash or UPI at the doorstep.

ORDER LOOKUP:
- Use get_order_details whenever the customer asks about a specific order.
- Ask for the order ID if it is missing.
- Never invent order details, tracking numbers, or delivery dates.
- If an order does not exist, politely ask the customer to verify the ID.
- Explain order information naturally instead of reading database fields.

SCOPE:
- Help only with Aura Skincare, its orders, products, delivery, payments,
  returns, and related customer support.
- Politely decline unrelated requests.
- Never claim that you performed an action that the available tools cannot perform.

When a customer asks about multiple policies, explain them in natural speech.
For example, say:
"Shipping is free on orders above 499 rupees. Orders below that amount
have a 50-rupee shipping fee. Standard delivery takes 3 to 5 business days."

Do not use a table or HTML to present that answer.
`;

const tools = [
  {
    type: "function",
    function: {
      name: "get_order_details",
      description:
        "Look up a mock Aura Skincare order using its order ID.",
      parameters: {
        type: "object",
        properties: {
          order_id: {
            type: "string",
            description: "The order ID, for example ORD-101.",
          },
        },
        required: ["order_id"],
        additionalProperties: false,
      },
    },
  },
];

function cleanCustomerReply(value) {
  return String(value ?? "")
    .replace(/<br\s*\/?>/gi, ". ")
    .replace(/<\/(p|div|li|tr|h[1-6])\s*>/gi, ". ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*\|?[\s:|-]+\|[\s:|-]*$/gm, "")
    .replace(/^\s*\|/gm, "")
    .replace(/\|\s*$/gm, "")
    .replace(/\s*\|\s*/g, ". ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

export async function POST(request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return Response.json(
        { error: "The AI service is not configured on the server." },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => null);
    const message =
      typeof body?.message === "string" ? body.message.trim() : "";

    if (!message) {
      return Response.json(
        { error: "Please provide a message for Aria." },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return Response.json(
        { error: "Your message is too long. Please shorten it and try again." },
        { status: 400 }
      );
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: message },
    ];

    // Limit tool-call rounds to avoid an endless tool loop.
    for (let round = 0; round < 3; round += 1) {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.3,
        max_tokens: 700,
      });

      const assistantMessage = completion.choices?.[0]?.message;

      if (!assistantMessage) {
        throw new Error("The AI returned an empty response.");
      }

      messages.push(assistantMessage);

      const toolCalls = assistantMessage.tool_calls ?? [];

      if (toolCalls.length === 0) {
        const reply = cleanCustomerReply(assistantMessage.content);

        if (!reply) {
          throw new Error("The AI returned an empty response.");
        }

        return Response.json({ reply });
      }

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function?.name;
        let result;

        if (functionName === "get_order_details") {
          try {
            const args = JSON.parse(
              toolCall.function.arguments || "{}"
            );

            const orderId =
              typeof args.order_id === "string"
                ? args.order_id.trim().toUpperCase()
                : "";

            if (!orderId) {
              result = {
                success: false,
                error: "An order ID is required.",
              };
            } else {
              result = await get_order_details(orderId);
            }
          } catch {
            result = {
              success: false,
              error:
                "The order ID could not be processed. Ask the customer to verify it.",
            };
          }
        } else {
          result = {
            success: false,
            error: "This tool is not available.",
          };
        }

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
    }

    return Response.json({
      reply:
        "I'm sorry, I'm having trouble checking that right now. Could you please try again?",
    });
  } catch (error) {
    console.error("Aura chat API error:", error);

    return Response.json(
      {
        error:
          "Aria couldn't respond right now. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}
