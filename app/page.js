
"use client";

import { useState } from "react";
import {
  Mic,
  Phone,
  PhoneOff,
  Sparkles,
  Package,
  Truck,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";

const orders = [
  {
    id: "ORD-101",
    customer: "Priya Sharma",
    product: "Vitamin C Serum (30ml)",
    value: "₹699",
    status: "Out for Delivery",
    details: "BlueDart · BD-982103 · Expected by 6 PM today",
  },
  {
    id: "ORD-102",
    customer: "Rahul Verma",
    product: "Hydrating Sunscreen SPF 50",
    value: "₹499",
    status: "Delivered",
    details: "Delhivery · DL-441029 · Delivered 14 days ago",
  },
  {
    id: "ORD-103",
    customer: "Ananya Patel",
    product: "Green Tea Face Wash + Toner",
    value: "₹850",
    status: "Processing",
    details: "Ordered 3 hours ago · Eligible for cancellation",
  },
];

export default function Home() {
  const [callActive, setCallActive] = useState(false);
  const [status, setStatus] = useState("Idle");

  function startCall() {
    setCallActive(true);
    setStatus("Listening");
  }

  function endCall() {
    setCallActive(false);
    setStatus("Idle");
  }

  const statusColors = {
    Idle: "bg-gray-100 text-gray-600",
    Listening: "bg-emerald-100 text-emerald-700",
    Thinking: "bg-amber-100 text-amber-700",
    Speaking: "bg-sky-100 text-sky-700",
  };

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#24352e]">
      <header className="border-b border-[#e5e9e2] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#dce9d8]">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Aura Skincare
              </h1>
              <p className="text-xs text-gray-500">
                AI Customer Support
              </p>
            </div>
          </div>

          <span className="rounded-full bg-[#edf3e9] px-3 py-1.5 text-xs font-medium">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Browser Voice Agent
          </span>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="space-y-6">
          <div className="rounded-3xl bg-[#243b30] p-7 text-white sm:p-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm">
              <Sparkles className="h-4 w-4" />
              Meet your AI assistant
            </span>

            <h2 className="mt-6 text-3xl font-semibold sm:text-4xl">
              Hello, I'm Aria.
            </h2>

            <p className="mt-3 max-w-lg leading-7 text-white/75">
              I'm here to help with your Aura Skincare orders,
              delivery updates, returns and product support.
              Let's talk.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              {!callActive ? (
                <button
                  onClick={startCall}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#dce9d8] px-6 py-3 font-semibold text-[#243b30] transition hover:bg-white"
                >
                  <Phone className="h-5 w-5" />
                  Start Call
                </button>
              ) : (
                <button
                  onClick={endCall}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-6 py-3 font-semibold text-white transition hover:bg-red-600"
                >
                  <PhoneOff className="h-5 w-5" />
                  End Call
                </button>
              )}

              <span
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  statusColors[status]
                }`}
              >
                {status}
              </span>
            </div>

            <div className="mt-10 flex items-center gap-4 border-t border-white/15 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                <Mic className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">Aria Voice Assistant</p>
                <p className="text-sm text-white/60">
                  Real-time voice support will connect in the next phase.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#e5e9e2] bg-white p-6">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Call Transcript</h3>
            </div>

            <div className="mt-5 rounded-2xl bg-[#f7f8f5] p-5 text-sm text-gray-500">
              Your conversation with Aria will appear here when
              transcript support is implemented.
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-[#e5e9e2] bg-white p-6">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Test Orders</h3>
            </div>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Use these sample orders to test Aria's order lookup
              and cancellation policies.
            </p>

            <div className="mt-5 space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-[#e5e9e2] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-semibold">{order.id}</span>
                    <span className="rounded-full bg-[#edf3e9] px-2.5 py-1 text-xs">
                      {order.status}
                    </span>
                  </div>

                  <p className="mt-3 text-sm font-medium">
                    {order.product}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {order.customer}
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {order.value}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    {order.details}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#e5e9e2] bg-white p-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Support Policies</h3>
            </div>

            <ul className="mt-4 space-y-4 text-sm leading-6">
              <li>
                <strong>Shipping</strong>
                <p className="text-gray-500">
                  Free above ₹499; otherwise ₹50. Delivery in 3–5 business days.
                </p>
              </li>
              <li>
                <strong>Returns</strong>
                <p className="text-gray-500">
                  Within 7 days for unopened, unused products in original packaging.
                </p>
              </li>
              <li>
                <strong>Damaged products</strong>
                <p className="text-gray-500">
                  Report within 48 hours with photos.
                </p>
              </li>
              <li>
                <strong>Cancellation</strong>
                <p className="text-gray-500">
                  Only while an order is Processing.
                </p>
              </li>
              <li>
                <strong>Cash on Delivery</strong>
                <p className="text-gray-500">
                  Available for orders up to ₹2,500; pay by cash or UPI.
                </p>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      <footer className="border-t border-[#e5e9e2] bg-white px-5 py-5 text-center text-sm text-gray-500">
        Aura Skincare · AI Voice Customer Support Agent
      </footer>
    </main>
  );
}
