
"use client";

import { useRef, useState } from "react";
import {
  Activity,
  Bot,
  CheckCircle2,
  Clock,
  Headphones,
  Mic,
  MicOff,
  Package,
  Phone,
  PhoneOff,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  User,
  Volume2,
  LoaderCircle,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

const ORDERS = [
  {
    id: "ORD-101",
    customer: "Priya Sharma",
    product: "Vitamin C Serum (30ml)",
    amount: 699,
    status: "Out for Delivery",
    courier: "BlueDart",
    tracking: "BD-982103",
    delivery: "Expected by 6 PM today",
  },
  {
    id: "ORD-102",
    customer: "Rahul Verma",
    product: "Hydrating Sunscreen SPF 50",
    amount: 499,
    status: "Delivered",
    courier: "Delhivery",
    tracking: "DL-441029",
    delivery: "Delivered 14 days ago",
  },
  {
    id: "ORD-103",
    customer: "Ananya Patel",
    product: "Green Tea Face Wash + Toner",
    amount: 850,
    status: "Processing",
    courier: "Not dispatched yet",
    tracking: "Not available",
    delivery: "Ordered 3 hours ago",
  },
];

const POLICIES = [
  {
    title: "Shipping",
    description:
      "Free above ₹499. Orders below ₹499 have a ₹50 shipping fee. Delivery takes 3–5 business days.",
    icon: Truck,
  },
  {
    title: "Returns",
    description:
      "Returns within 7 days of delivery for unopened, unused products in original packaging.",
    icon: RotateCcw,
  },
  {
    title: "Damaged products",
    description:
      "Report damaged or defective products within 48 hours of delivery, with photos, for replacement.",
    icon: ShieldCheck,
  },
  {
    title: "Cancellation",
    description:
      "Orders can be cancelled only while Processing. Shipped and Out for Delivery orders cannot be cancelled.",
    icon: Package,
  },
  {
    title: "Cash on Delivery",
    description:
      "COD is available for orders up to ₹2,500. Pay by cash or UPI at the doorstep.",
    icon: ShoppingBag,
  },
];

const INITIAL_GREETING = {
  role: "assistant",
  text: "Hi! Welcome to Aura Skincare. I'm Aria, your virtual support assistant. How can I help you today?",
};

function StatusBadge({ status }) {
  const styles = {
    Idle: "bg-slate-100 text-slate-600",
    Listening: "bg-emerald-50 text-emerald-700",
    Thinking: "bg-amber-50 text-amber-700",
    Speaking: "bg-sky-50 text-sky-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
        styles[status] || styles.Idle
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          status === "Listening"
            ? "animate-pulse bg-emerald-500"
            : status === "Thinking"
              ? "animate-pulse bg-amber-500"
              : status === "Speaking"
                ? "bg-sky-500"
                : "bg-slate-400"
        }`}
      />
      {status}
    </span>
  );
}

function SectionHeading({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
        <Icon size={20} />
      </div>
      <div>
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [callActive, setCallActive] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");
  const [recordingError, setRecordingError] = useState("");
  const [conversation, setConversation] = useState([INITIAL_GREETING]);
  const [manualMessage, setManualMessage] = useState("");

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingSessionRef = useRef(0);
  const conversationEndRef = useRef(null);

  function releaseMicrophone() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  function startCall() {
    setCallActive(true);
    setStatus("Idle");
    setRecordingError("");
  }

  function endCall() {
    setCallActive(false);
    setStatus("Idle");
    recordingSessionRef.current += 1;

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    releaseMicrophone();
    setIsRecording(false);
  }

  async function sendMessageToAria(message) {
    const cleanMessage = message.trim();

    if (!cleanMessage) return;

    setConversation((previous) => [
      ...previous,
      { role: "user", text: cleanMessage },
    ]);

    setIsSending(true);
    setStatus("Thinking");
    setRecordingError("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: cleanMessage }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Aria could not respond.");
      }

      if (!data.reply) {
        throw new Error("Aria returned an empty response.");
      }

      setConversation((previous) => [
        ...previous,
        { role: "assistant", text: data.reply },
      ]);

      setStatus("Idle");
    } catch (error) {
      setRecordingError(
        error.message || "Unable to contact Aria. Please try again."
      );
      setStatus("Idle");
    } finally {
      setIsSending(false);
    }
  }

  async function startRecording() {
    if (isRecording || isTranscribing || isSending) return;

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setRecordingError(
        "Your browser does not support microphone recording. Use a supported browser on localhost or HTTPS."
      );
      return;
    }

    setRecordingError("");
    setTranscriptText("");
    chunksRef.current = [];

    const sessionId = ++recordingSessionRef.current;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (sessionId !== recordingSessionRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      let options = {};

      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          options.mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          options.mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          options.mimeType = "audio/mp4";
        }
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setRecordingError("Recording failed. Please try again.");
        setIsRecording(false);
        setStatus("Idle");
        releaseMicrophone();
      };

      recorder.onstop = async () => {
        releaseMicrophone();

        if (sessionId !== recordingSessionRef.current) return;

        const audioBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        setIsRecording(false);

        if (!audioBlob.size) {
          setStatus("Idle");
          setRecordingError("No audio was recorded. Please try again.");
          return;
        }

        await transcribeRecording(audioBlob, sessionId);
      };

      recorder.start();
      setIsRecording(true);
      setStatus("Listening");
    } catch (error) {
      releaseMicrophone();
      setIsRecording(false);
      setStatus("Idle");

      if (error.name === "NotAllowedError") {
        setRecordingError(
          "Microphone access was denied. Allow microphone access in your browser settings."
        );
      } else {
        setRecordingError(
          error.message || "Could not start recording."
        );
      }
    }
  }

  async function transcribeRecording(audioBlob, sessionId) {
    setIsTranscribing(true);
    setStatus("Thinking");

    try {
      const formData = new FormData();

      const extension = audioBlob.type.includes("mp4")
        ? "m4a"
        : "webm";

      formData.append("audio", audioBlob, `recording.${extension}`);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not transcribe your recording."
        );
      }

      if (sessionId !== recordingSessionRef.current) return;

      const recognisedText = data.text?.trim();

      if (!recognisedText) {
        throw new Error(
          "No speech was detected. Please speak clearly and try again."
        );
      }

      setTranscriptText(recognisedText);

      // Send the recognised speech to Aria.
      await sendMessageToAria(recognisedText);
    } catch (error) {
      if (sessionId === recordingSessionRef.current) {
        setRecordingError(
          error.message || "Speech processing failed. Please try again."
        );
        setStatus("Idle");
      }
    } finally {
      setIsTranscribing(false);
      if (sessionId === recordingSessionRef.current) {
        setStatus("Idle");
      }
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;

    if (recorder?.state === "recording") {
      recorder.stop();
    }

    setIsRecording(false);
  }

  async function handleManualSubmit(event) {
    event.preventDefault();

    const message = manualMessage.trim();

    if (!message || isSending || isTranscribing) return;

    setManualMessage("");
    await sendMessageToAria(message);
  }

  function resetConversation() {
    if (isRecording) {
      stopRecording();
    }

    setConversation([INITIAL_GREETING]);
    setTranscriptText("");
    setRecordingError("");
    setStatus("Idle");
  }

  const busy = isSending || isTranscribing;

  return (
    <main className="min-h-screen bg-[#f7faf8] text-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-700 text-white">
              <Sparkles size={23} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                Aura Skincare
              </h1>
              <p className="text-xs text-slate-500">
                AI Customer Support
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Voice agent dashboard
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        {/* Page introduction */}
        <div className="mb-7">
          <p className="mb-2 text-sm font-semibold text-emerald-700">
            CUSTOMER EXPERIENCE
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Meet Aria, your AI support agent
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Help customers with orders, shipping, returns and product
            support through a simple voice-enabled interface.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
          {/* Main column */}
          <div className="space-y-6">
            {/* Agent card */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="bg-gradient-to-br from-emerald-800 to-emerald-600 p-6 text-white sm:p-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/15">
                      <Bot size={34} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-bold">Aria</h3>
                        <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium">
                          AI Assistant
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-emerald-50">
                        Friendly, concise customer support
                      </p>
                      <div className="mt-3">
                        <StatusBadge status={status} />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!callActive ? (
                      <button
                        onClick={startCall}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
                      >
                        <Phone size={17} />
                        Start Call
                      </button>
                    ) : (
                      <button
                        onClick={endCall}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
                      >
                        <PhoneOff size={17} />
                        End Call
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-7 grid grid-cols-3 gap-3 border-t border-white/15 pt-5">
                  <div>
                    <p className="text-xs text-emerald-100">Language</p>
                    <p className="mt-1 text-sm font-semibold">English</p>
                  </div>
                  <div>
                    <p className="text-xs text-emerald-100">Interaction</p>
                    <p className="mt-1 text-sm font-semibold">Voice + Text</p>
                  </div>
                  <div>
                    <p className="text-xs text-emerald-100">AI provider</p>
                    <p className="mt-1 text-sm font-semibold">Groq</p>
                  </div>
                </div>
              </div>

              {/* Conversation */}
              <div className="p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <SectionHeading
                    icon={Headphones}
                    title="Conversation"
                    subtitle="Customer messages and Aria's replies"
                  />

                  <button
                    onClick={resetConversation}
                    className="mb-4 inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                    title="Reset conversation"
                  >
                    <RotateCcw size={14} />
                    Reset
                  </button>
                </div>

                <div
                  className="max-h-[440px] min-h-[220px] space-y-4 overflow-y-auto rounded-xl bg-slate-50 p-4"
                  aria-live="polite"
                >
                  {conversation.map((message, index) => {
                    const isAssistant = message.role === "assistant";

                    return (
                      <div
                        key={`${index}-${message.role}`}
                        className={`flex items-start gap-2.5 ${
                          isAssistant ? "" : "flex-row-reverse"
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            isAssistant
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-sky-100 text-sky-800"
                          }`}
                        >
                          {isAssistant ? (
                            <Bot size={18} />
                          ) : (
                            <User size={18} />
                          )}
                        </div>

                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                            isAssistant
                              ? "rounded-tl-sm border border-slate-200 bg-white text-slate-700"
                              : "rounded-tr-sm bg-emerald-700 text-white"
                          }`}
                        >
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">
                            {isAssistant ? "Aria" : "You"}
                          </p>
                          <p className="whitespace-pre-wrap">
                            {message.text}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {isSending && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <LoaderCircle
                        size={17}
                        className="animate-spin text-emerald-700"
                      />
                      Aria is thinking...
                    </div>
                  )}

                  <div ref={conversationEndRef} />
                </div>

                {/* Text input */}
                <form
                  onSubmit={handleManualSubmit}
                  className="mt-4 flex gap-2"
                >
                  <input
                    value={manualMessage}
                    onChange={(event) =>
                      setManualMessage(event.target.value)
                    }
                    disabled={busy}
                    maxLength={2000}
                    placeholder="Type a message to Aria..."
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                  />
                  <button
                    type="submit"
                    disabled={!manualMessage.trim() || busy}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send size={17} />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </form>
              </div>
            </section>

            {/* Speech-to-text */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionHeading
                icon={Mic}
                title="Speech-to-Text Test"
                subtitle="Record your voice and send your question to Aria"
              />

              <div className="flex flex-col gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${
                      isRecording
                        ? "animate-pulse bg-red-100 text-red-600"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {isRecording ? (
                      <MicOff size={23} />
                    ) : (
                      <Mic size={23} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {isRecording
                        ? "Recording your voice..."
                        : isTranscribing
                          ? "Transcribing your recording..."
                          : isSending
                            ? "Waiting for Aria's response..."
                            : "Ready to record"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Speak clearly, then stop the recording.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {!isRecording ? (
                    <button
                      onClick={startRecording}
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Mic size={17} />
                      Record
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                    >
                      <span className="h-2.5 w-2.5 rounded-sm bg-white" />
                      Stop Recording
                    </button>
                  )}
                </div>
              </div>

              {busy && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                  <LoaderCircle size={17} className="animate-spin" />
                  {isTranscribing
                    ? "Converting your voice to text..."
                    : "Aria is preparing a response..."}
                </div>
              )}

              {recordingError && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700"
                >
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <p>{recordingError}</p>
                </div>
              )}

              {transcriptText && (
                <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-800">
                    <CheckCircle2 size={16} />
                    Recognised speech
                  </p>
                  <p className="text-sm leading-6 text-slate-700">
                    {transcriptText}
                  </p>
                </div>
              )}
            </section>

            {/* Development progress */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionHeading
                icon={Activity}
                title="Development Progress"
                subtitle="Core application components"
              />

              <div className="space-y-3">
                {[
                  "Groq API connection",
                  "Speech-to-text transcription",
                  "AI customer support responses",
                  "Conversation transcript display",
                  "Mock order reference data",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 text-sm text-slate-700"
                  >
                    <CheckCircle2
                      size={18}
                      className="shrink-0 text-emerald-600"
                    />
                    {item}
                  </div>
                ))}
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <Clock size={18} className="shrink-0" />
                  Text-to-speech playback and order lookup integration
                </div>
              </div>
            </section>
          </div>

          {/* Right column */}
          <aside className="space-y-6">
            {/* Orders */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <SectionHeading
                icon={Package}
                title="Test Orders"
                subtitle="Reference data for testing"
              />

              <p className="mb-4 rounded-lg bg-sky-50 p-3 text-xs leading-5 text-sky-800">
                Use these order IDs when testing. The order cards are
                reference data; Aria is not yet connected to a
                server-side order lookup tool.
              </p>

              <div className="space-y-4">
                {ORDERS.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-bold text-emerald-800">
                        {order.id}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          order.status === "Delivered"
                            ? "bg-slate-100 text-slate-700"
                            : order.status === "Processing"
                              ? "bg-amber-50 text-amber-800"
                              : "bg-sky-50 text-sky-800"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <p className="mt-3 text-sm font-semibold text-slate-900">
                      {order.product}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Customer: {order.customer}
                    </p>
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      ₹{order.amount.toLocaleString("en-IN")}
                    </p>

                    <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
                      <p>
                        <span className="font-medium text-slate-700">
                          Courier:
                        </span>{" "}
                        {order.courier}
                      </p>
                      <p>
                        <span className="font-medium text-slate-700">
                          Tracking:
                        </span>{" "}
                        {order.tracking}
                      </p>
                      <p>{order.delivery}</p>
                    </div>

                    <button
                      onClick={() =>
                        sendMessageToAria(
                          `Please help me check order ${order.id}.`
                        )
                      }
                      disabled={busy}
                      className="mt-3 w-full rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-50"
                    >
                      Test with Aria
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Policies */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <SectionHeading
                icon={ShieldCheck}
                title="Support Policies"
                subtitle="Approved brand information"
              />

              <div className="space-y-4">
                {POLICIES.map((policy) => {
                  const Icon = policy.icon;

                  return (
                    <div key={policy.title} className="flex gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                        <Icon size={17} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">
                          {policy.title}
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {policy.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Technical details */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <SectionHeading
                icon={Volume2}
                title="Agent Information"
                subtitle="Current configuration"
              />

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">AI model</span>
                  <span className="font-medium text-slate-800">
                    Llama 3.3 70B
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Speech recognition</span>
                  <span className="font-medium text-slate-800">
                    Whisper
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Voice playback</span>
                  <span className="font-medium text-amber-700">
                    Not connected
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Order lookup</span>
                  <span className="font-medium text-amber-700">
                    Not connected
                  </span>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <footer className="mt-8 border-t border-slate-200 py-5 text-center text-xs text-slate-500">
          Aura Skincare · AI Voice Customer Support Agent
        </footer>
      </div>
    </main>
  );
}
