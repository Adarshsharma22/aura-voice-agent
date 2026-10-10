"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  Bot,
  CheckCircle2,
  Clock,
  Headphones,
  LoaderCircle,
  Mic,
  MicOff,
  Package,
  Phone,
  PhoneOff,
  Send,
  ShieldCheck,
  Sparkles,
  Truck,
  Volume2,
  VolumeX,
} from "lucide-react";

const TEST_ORDERS = [
  {
    id: "ORD-101",
    customer: "Priya Sharma",
    product: "Vitamin C Serum (30ml)",
    amount: "₹699",
    status: "Out for Delivery",
    tracking: "BlueDart BD-982103",
    delivery: "Expected by 6 PM today",
    color: "amber",
  },
  {
    id: "ORD-102",
    customer: "Rahul Verma",
    product: "Hydrating Sunscreen SPF 50",
    amount: "₹499",
    status: "Delivered",
    tracking: "Delhivery DL-441029",
    delivery: "Delivered 14 days ago",
    color: "emerald",
  },
  {
    id: "ORD-103",
    customer: "Ananya Patel",
    product: "Green Tea Face Wash + Toner",
    amount: "₹850",
    status: "Processing",
    tracking: "Not dispatched yet",
    delivery: "Ordered 3 hours ago",
    color: "blue",
  },
];

const POLICIES = [
  {
    icon: Truck,
    title: "Shipping",
    description: "Free above ₹499. Otherwise, ₹50. Delivery in 3–5 business days.",
  },
  {
    icon: Package,
    title: "Returns",
    description:
      "Within 7 days of delivery for unopened, unused products in original packaging.",
  },
  {
    icon: ShieldCheck,
    title: "Damaged items",
    description:
      "Report within 48 hours of delivery. Photos are required for replacement requests.",
  },
  {
    icon: Clock,
    title: "Cancellation",
    description:
      "Only Processing orders can be cancelled. Shipped orders cannot be cancelled.",
  },
];

function cleanTextForSpeech(text) {
  return String(text ?? "")
    // Turn escaped Markdown markers into normal characters first.
    // Example: \*\*ORD-101\*\* becomes **ORD-101**
    .replace(/\\([*_~`#])/g, "$1")
    // Remove Markdown emphasis, headings, inline code and strike-through markers.
    .replace(/[*_~`#]{1,}/g, " ")
    // Remove Markdown links but preserve their readable labels.
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Avoid reading raw URLs aloud.
    .replace(/https?:\/\/\S+/gi, " ")
    // Remove emoji and associated variation/joiner characters.
    .replace(/\p{Extended_Pictographic}/gu, " ")
    .replace(/[\uFE0E\uFE0F\u200D]/g, "")
    // Remove common Markdown quote and list prefixes.
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    // Clean up leftover punctuation and whitespace.
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function getStatusClasses(status) {
  if (status === "Delivered") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "Out for Delivery") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-blue-50 text-blue-700 ring-blue-200";
}

export default function Home() {
  const [callActive, setCallActive] = useState(false);
  const [status, setStatus] = useState("Ready to help");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");
  const [recordingError, setRecordingError] = useState("");
  const [conversation, setConversation] = useState([]);
  const [manualMessage, setManualMessage] = useState("");
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [currentYear, setCurrentYear] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const conversationEndRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setCurrentYear(new Date().getFullYear());

    return () => {
      mountedRef.current = false;

      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [conversation]);

  const speakResponse = useCallback(
    (text) => {
      if (!speechEnabled || typeof window === "undefined") return;

      if (!("speechSynthesis" in window)) {
        setRecordingError(
          "Speech playback is not supported by this browser. You can still read Aria's replies."
        );
        return;
      }

      // Always pass cleaned text to the speech engine.
      const speechText = cleanTextForSpeech(text).slice(0, 1200);

      if (!speechText) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.lang = "en-IN";
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      const indianEnglishVoice = voices.find(
        (voice) =>
          voice.lang?.toLowerCase() === "en-in" &&
          /female|heera|priya|neerja|india/i.test(voice.name)
      );

      const anyIndianEnglishVoice = voices.find((voice) =>
        voice.lang?.toLowerCase().startsWith("en-in")
      );

      const EnglishVoice = voices.find((voice) =>
        voice.lang?.toLowerCase().startsWith("en-")
      );

      utterance.voice =
        indianEnglishVoice || anyIndianEnglishVoice || EnglishVoice || null;

      utterance.onstart = () => {
        if (!mountedRef.current) return;
        setIsSpeaking(true);
        setStatus("Speaking");
      };

      utterance.onend = () => {
        if (!mountedRef.current) return;
        setIsSpeaking(false);
        setStatus(callActive ? "Listening" : "Ready to help");
      };

      utterance.onerror = () => {
        if (!mountedRef.current) return;
        setIsSpeaking(false);
        setStatus(callActive ? "Listening" : "Ready to help");
      };

      window.speechSynthesis.speak(utterance);
    },
    [speechEnabled, callActive]
  );

  const stopSpeech = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(false);
    setStatus(callActive ? "Listening" : "Ready to help");
  }, [callActive]);

  const sendMessageToAria = useCallback(
    async (rawMessage) => {
      const message = String(rawMessage ?? "").trim();

      if (!message || isSending) return;

      setRecordingError("");
      setManualMessage("");
      setIsSending(true);
      setStatus("Thinking");

      setConversation((previous) => [
        ...previous,
        {
          id: `${Date.now()}-user`,
          role: "user",
          text: message,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error || "Aria could not respond. Please try again."
          );
        }

        const reply =
          typeof data.reply === "string" ? data.reply.trim() : "";

        if (!reply) {
          throw new Error("Aria returned an empty response.");
        }

        setConversation((previous) => [
          ...previous,
          {
            id: `${Date.now()}-assistant`,
            role: "assistant",
            text: reply,
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);

        speakResponse(reply);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.";

        setRecordingError(errorMessage);
        setStatus(callActive ? "Listening" : "Ready to help");
      } finally {
        setIsSending(false);
      }
    },
    [isSending, speakResponse, callActive]
  );

  const startCall = useCallback(() => {
    setCallActive(true);
    setStatus("Listening");
    setRecordingError("");
    setConversation((previous) => [
      ...previous,
      {
        id: `${Date.now()}-welcome`,
        role: "assistant",
        text: "Hello! Welcome to Aura Skincare. I'm Aria, your virtual support assistant. How can I help you today?",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);

    speakResponse(
      "Hello! Welcome to Aura Skincare. I'm Aria, your virtual support assistant. How can I help you today?"
    );
  }, [speakResponse]);

  const endCall = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    stopSpeech();
    setCallActive(false);
    setIsRecording(false);
    setIsTranscribing(false);
    setStatus("Call ended");
    setRecordingError("");
  }, [stopSpeech]);

  const startRecording = useCallback(async () => {
    setRecordingError("");

    if (!callActive) {
      setRecordingError("Start the call before using the microphone.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setRecordingError(
        "Microphone recording is not supported in this browser. Try a recent version of Chrome."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      const preferredMimeType = MediaRecorder.isTypeSupported(
        "audio/webm;codecs=opus"
      )
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";

      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setRecordingError("There was a problem recording your voice.");
        setIsRecording(false);
        setStatus("Listening");
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        audioChunksRef.current = [];

        if (!audioBlob.size) {
          setIsRecording(false);
          setStatus("Listening");
          return;
        }

        setIsRecording(false);
        setIsTranscribing(true);
        setStatus("Transcribing");

        try {
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");

          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data?.error || "We couldn't transcribe your recording."
            );
          }

          const transcribedText =
            typeof data.text === "string" ? data.text.trim() : "";

          if (!transcribedText) {
            throw new Error(
              "No speech was detected. Please try speaking a little louder."
            );
          }

          setTranscriptText(transcribedText);
          setIsTranscribing(false);
          setStatus("Listening");

          await sendMessageToAria(transcribedText);
        } catch (error) {
          setIsTranscribing(false);
          setStatus("Listening");
          setRecordingError(
            error instanceof Error
              ? error.message
              : "Transcription failed. Please try again."
          );
        }
      };

      recorder.start();
      setIsRecording(true);
      setStatus("Listening");
    } catch (error) {
      setIsRecording(false);
      setStatus("Listening");
      setRecordingError(
        error instanceof Error && error.name === "NotAllowedError"
          ? "Microphone access was denied. Allow microphone permission in your browser settings."
          : "Unable to access the microphone. Check that it is connected and try again."
      );
    }
  }, [callActive, sendMessageToAria]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setStatus("Transcribing");
    }
  }, []);

  const handleManualSubmit = (event) => {
    event.preventDefault();
    sendMessageToAria(manualMessage);
  };

  const downloadTranscript = () => {
    const transcript = {
      brand: "Aura Skincare",
      assistant: "Aria",
      createdAt: new Date().toISOString(),
      callStatus: callActive ? "active" : "ended",
      messages: conversation.map((message) => ({
        role: message.role,
        text: message.text,
        time: message.time,
      })),
      structuredSummary: {
        customerIssue: "",
        orderId: "",
        resolution: "",
        followUpRequired: false,
      },
    };

    const blob = new Blob([JSON.stringify(transcript, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aura-call-transcript-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const statusLabel = isRecording
    ? "Listening to you"
    : isTranscribing
      ? "Transcribing audio"
      : isSending
        ? "Thinking"
        : isSpeaking
          ? "Speaking"
          : status;

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-950 text-white">
              <Sparkles size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Aura Skincare
              </h1>
              <p className="text-xs text-slate-500">
                AI Voice Customer Support
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Aria is ready
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <section className="space-y-6">
          <div className="overflow-hidden rounded-3xl bg-emerald-950 text-white shadow-sm">
            <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_220px] md:items-center">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-emerald-100">
                  <Activity size={14} />
                  Voice-powered customer care
                </div>

                <h2 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
                  Meet Aria, your personal support assistant.
                </h2>

                <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-100/80 sm:text-base">
                  Ask about orders, shipping, returns, cancellations, and
                  payment options. Aria uses the available order records and
                  Aura Skincare policies to help you.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  {!callActive ? (
                    <button
                      onClick={startCall}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-50"
                    >
                      <Phone size={17} />
                      Start Call
                    </button>
                  ) : (
                    <button
                      onClick={endCall}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-600"
                    >
                      <PhoneOff size={17} />
                      End Call
                    </button>
                  )}

                  <button
                    onClick={() => setSpeechEnabled((enabled) => !enabled)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15"
                    aria-pressed={speechEnabled}
                  >
                    {speechEnabled ? (
                      <Volume2 size={17} />
                    ) : (
                      <VolumeX size={17} />
                    )}
                    Voice {speechEnabled ? "On" : "Off"}
                  </button>
                </div>
              </div>

              <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-full border border-white/15 bg-white/5">
                <div className="flex h-32 w-32 items-center justify-center rounded-full border border-white/20 bg-white/10">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-800 shadow-inner">
                    <Bot size={48} strokeWidth={1.4} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Activity size={16} />
                Call status
              </div>
              <p className="mt-2 font-semibold">{callActive ? "Active" : "Inactive"}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Headphones size={16} />
                Assistant status
              </div>
              <p className="mt-2 flex items-center gap-2 font-semibold">
                {(isSending || isTranscribing) && (
                  <LoaderCircle size={16} className="animate-spin" />
                )}
                {statusLabel}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CheckCircle2 size={16} />
                Conversation
              </div>
              <p className="mt-2 font-semibold">
                {conversation.length} messages
              </p>
            </div>
          </div>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h3 className="font-semibold">Conversation with Aria</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Speak using your microphone or type a message below.
                </p>
              </div>

              <button
                onClick={downloadTranscript}
                disabled={conversation.length === 0}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Export JSON
              </button>
            </div>

            <div className="flex min-h-[320px] max-h-[520px] flex-col gap-4 overflow-y-auto p-5 sm:p-6">
              {conversation.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                    <Bot size={28} />
                  </div>
                  <h4 className="mt-4 font-semibold">Your conversation starts here</h4>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                    Start a call, ask Aria about an order, or type a question
                    about Aura Skincare policies.
                  </p>
                </div>
              ) : (
                conversation.map((message) => {
                  const isAssistant = message.role === "assistant";

                  return (
                    <div
                      key={message.id}
                      className={`flex items-start gap-3 ${
                        isAssistant ? "justify-start" : "justify-end"
                      }`}
                    >
                      {isAssistant && (
                        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-950 text-white">
                          <Bot size={18} />
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[78%] ${
                          isAssistant
                            ? "rounded-tl-md bg-slate-100 text-slate-800"
                            : "rounded-tr-md bg-emerald-950 text-white"
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-4">
                          <span className="text-xs font-semibold">
                            {isAssistant ? "Aria" : "You"}
                          </span>
                          <span
                            className={`text-[10px] ${
                              isAssistant ? "text-slate-400" : "text-emerald-200"
                            }`}
                          >
                            {message.time}
                          </span>
                        </div>

                        <p className="whitespace-pre-wrap break-words text-sm leading-6">
                          {message.text}
                        </p>

                        {isAssistant && (
                          <button
                            type="button"
                            onClick={() => speakResponse(message.text)}
                            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 hover:underline"
                          >
                            <Volume2 size={13} />
                            Play reply
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              <div ref={conversationEndRef} />
            </div>

            {recordingError && (
              <div
                role="alert"
                className="mx-5 mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:mx-6"
              >
                {recordingError}
              </div>
            )}

            {transcriptText && (
              <div className="mx-5 mb-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600 sm:mx-6">
                <span className="font-semibold text-slate-700">
                  Last voice transcription:
                </span>{" "}
                {transcriptText}
              </div>
            )}

            <div className="border-t border-slate-100 p-4 sm:p-5">
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  value={manualMessage}
                  onChange={(event) => setManualMessage(event.target.value)}
                  placeholder="Ask about an order or policy..."
                  maxLength={2000}
                  disabled={isSending}
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
                />
                <button
                  type="submit"
                  disabled={!manualMessage.trim() || isSending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Send message"
                >
                  {isSending ? (
                    <LoaderCircle size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Voice input uses microphone access and audio transcription.
                </p>

                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={!callActive || isTranscribing || isSending}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isTranscribing ? (
                      <LoaderCircle size={17} className="animate-spin" />
                    ) : (
                      <Mic size={17} />
                    )}
                    {isTranscribing ? "Transcribing..." : "Speak"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
                  >
                    <MicOff size={17} />
                    Stop recording
                  </button>
                )}
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Aura Skincare policies</h3>
              <p className="mt-1 text-sm text-slate-500">
                Information Aria uses when answering support questions.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {POLICIES.map((policy) => {
                const Icon = policy.icon;

                return (
                  <div
                    key={policy.title}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-900">
                        <Icon size={19} />
                      </div>
                      <h4 className="font-semibold">{policy.title}</h4>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {policy.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">Test order lookup</h3>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Use these IDs to test Aria&apos;s order lookup.
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-900">
                <Package size={20} />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {TEST_ORDERS.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold">
                      {order.id}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${getStatusClasses(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <p className="mt-3 text-sm font-semibold">{order.product}</p>
                  <div className="mt-2 space-y-1 text-xs leading-5 text-slate-500">
                    <p>{order.customer}</p>
                    <p>Amount: {order.amount}</p>
                    <p>{order.tracking}</p>
                    <p>{order.delivery}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!callActive) startCall();
                      sendMessageToAria(
                        `Please check the order details and current status for ${order.id}.`
                      );
                    }}
                    disabled={isSending}
                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-40"
                  >
                    Ask Aria about this order
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="font-semibold">Support guidelines</h3>
                <p className="text-xs text-slate-500">How Aria should respond</p>
              </div>
            </div>

            <ul className="mt-4 space-y-3 text-sm leading-5 text-slate-600">
              <li className="flex gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-700" />
                Uses the order lookup tool for order-specific questions.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-700" />
                Asks for an order ID when it is missing.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-700" />
                Does not invent tracking details or promise actions it cannot perform.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-700" />
                Keeps replies friendly, relevant, and concise.
              </li>
            </ul>
          </section>

          <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
            <div className="flex items-center gap-2 text-emerald-950">
              <Sparkles size={18} />
              <h3 className="font-semibold">Try asking</h3>
            </div>

            <div className="mt-3 space-y-2">
              {[
                "Where is my order ORD-101?",
                "Can I cancel order ORD-103?",
                "What is your return policy?",
                "Do you offer cash on delivery?",
              ].map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    if (!callActive) startCall();
                    sendMessageToAria(example);
                  }}
                  disabled={isSending}
                  className="block w-full rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-left text-sm text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-100/50 disabled:opacity-40"
                >
                  {example}
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {currentYear ?? ""} Aura Skincare · AI Voice Support Demo</p>
          <p>Responses are generated from configured policies and mock order data.</p>
        </div>
      </footer>
    </main>
  );
}