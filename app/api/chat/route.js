
import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { get_order_details } from "@/lib/orders";

const SYSTEM_PROMPT = `
You are Aria, a friendly and concise AI customer support specialist
for Aura Skincare, a premium organic Indian skincare brand.

BRAND POLICIES

1. Shipping:
   - Free shipping on orders above ₹499.
   - Orders below ₹499 have a ₹50 shipping fee.
   - Standard delivery takes 3–5 business days.

2. Returns:
   - Returns are accepted within 7 days of delivery only.
   - Products must be unopened, unused, and in their original packaging.

3. Damaged or defective products:
   - Customers must report the issue within 48 hours of delivery.
   - Photos are required for replacement requests.

4. Cancellation:
   - Orders can only be cancelled while their status is Processing.
   - Shipped and Out for Delivery orders cannot be cancelled.
   - Customers may refuse delivery at the doorstep.

5. Cash on Delivery:
   - COD is available for orders up to ₹2,500.
   - Customers may pay by cash or UPI at the doorstep.

ORDER LOOKUP RULES

- When a customer asks about a specific order, use the
  get_order_details tool before answering.
- If the order ID is missing, ask the customer to provide it.
- Never invent an order's status, tracking number, customer,
  product, amount, or delivery estimate.
- If an order is not found, explain that clearly.
- Only share order details returned by the tool.
- Never claim an order lookup succeeded unless the tool returned it.
- Do not reveal another customer's personal information unnecessarily.
- Do not promise a cancellation, refund, or replacement has been completed.
- For cancellation questions, explain the policy based on the
  retrieved order status without claiming to perform a cancellation.

GENERAL RULES

- Keep responses friendly, natural, and concise.
- Only answer questions related to Aura Skincare.
- Never invent company policies or product details.
- If information is unavailable, say so honestly.
- Politely decline unrelated requests.
`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_order_details",
      description:
        "Look up a mock Aura Skincare order by its order ID. Use this function whenever the customer asks about a specific order's status, tracking, product, amount, or delivery estimate.",
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

async function executeToolCall(toolCall) {
  const functionName = toolCall.function.name;

  if (functionName !== "get_order_details") {
    return {
      success: false,
      error: "Unknown tool requested.",
    };
  }

  try {
    const args = JSON.parse(toolCall.function.arguments || "{}");

    return get_order_details(args.order_id);
  } catch {
    return {
      success: false,
      error: "Invalid order lookup arguments.",
    };
  }
}

export async function POST(request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "Groq API key is not configured." },
        { status: 500 }
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request." },
        { status: 400 }
      );
    }

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

    const messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: message,
      },
    ];

    // First request: allow Groq to request an order lookup.
    let completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages,
      tools: TOOLS,
      tool_choice: "auto",
      temperature: 0.2,
      max_completion_tokens: 250,
    });

    let assistantMessage = completion.choices[0]?.message;

    // Execute requested tool calls, with a maximum of 3 rounds.
    let rounds = 0;
    const MAX_TOOL_ROUNDS = 3;

    while (
      assistantMessage?.tool_calls?.length &&
      rounds < MAX_TOOL_ROUNDS
    ) {
      messages.push(assistantMessage);

      const toolResults = await Promise.all(
        assistantMessage.tool_calls.map(async (toolCall) => {
          const result = await executeToolCall(toolCall);

          return {
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          };
        })
      );

      messages.push(...toolResults);
      rounds += 1;

      completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages,
        tools: TOOLS,
        tool_choice: "auto",
        temperature: 0.2,
        max_completion_tokens: 250,
      });

      assistantMessage = completion.choices[0]?.message;
    }

    if (assistantMessage?.tool_calls?.length) {
      return NextResponse.json(
        {
          error: "Aria could not complete the order lookup. Please try again.",
        },
        { status: 502 }
      );
    }

    const reply = assistantMessage?.content?.trim();

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
