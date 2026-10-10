"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  Bot,
  CheckCircle2,
  Clock,
  Download,
  FileText,
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
  },
  {
    id: "ORD-102",
    customer: "Rahul Verma",
    product: "Hydrating Sunscreen SPF 50",
    amount: "₹499",
    status: "Delivered",
    tracking: "Delhivery DL-441029",
    delivery: "Delivered 14 days ago",
  },
  {
    id: "ORD-103",
    customer: "Ananya Patel",
    product: "Green Tea Face Wash + Toner",
    amount: "₹850",
    status: "Processing",
    tracking: "Not dispatched yet",
    delivery: "Ordered 3 hours ago",
  },
];

const POLICIES = [
  {
    icon: Truck,
    title: "Shipping",
    description:
      "Free delivery on orders above ₹499. Orders below ₹499 have a ₹50 shipping fee. Delivery takes 3–5 business days.",
  },
  {
    icon: Package,
    title: "Returns",
    description:
      "Returns within 7 days of delivery for unopened, unused products in original packaging.",
  },
  {
    icon: ShieldCheck,
    title: "Damaged items",
    description:
      "Report damaged or defective products within 48 hours of delivery. Photos are required for replacement requests.",
  },
  {
    icon: Clock,
    title: "Cancellation",
    description:
      "Only Processing orders can be cancelled. Shipped or Out for Delivery orders cannot be cancelled.",
  },
];

function createMessage(role, text) {
  const now = new Date();

  return {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    text,
    timestamp: now.toISOString(),
    time: now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function cleanTextForSpeech(text) {
  return String(text ?? "")
    .replace(/\\([*_~`#])/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[*_~`#]{1,}/g, " ")
    .replace(/\p{Extended_Pictographic}/gu, " ")
    .replace(/[\uFE0E\uFE0F\u200D]/g, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
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

function buildCallSummary(messages) {
  const customerMessages = messages.filter(
    (message) => message.role === "user"
  );

  const assistantMessages = messages.filter(
    (message) => message.role === "assistant"
  );

  const customerText = customerMessages
    .map((message) => message.text)
    .join(" ");

  const fullText = messages.map((message) => message.text).join(" ");

  const orderMatch = fullText.match(/\bORD[-\s]?\d{3}\b/i);

  const categories = [
    {
      name: "ORDER_TRACKING",
      pattern:
        /\b(where is|track|tracking|order status|delivery status|delivery estimate)\b/i,
    },
    {
      name: "CANCELLATION",
      pattern: /\b(cancel|cancellation)\b/i,
    },
    {
      name: "RETURN_OR_REFUND",
      pattern: /\b(return|refund|exchange)\b/i,
    },
    {
      name: "DAMAGED_PRODUCT",
      pattern: /\b(damaged|damage|defective|broken|leaking|replacement)\b/i,
    },
    {
      name: "SHIPPING_POLICY",
      pattern: /\b(shipping|delivery time|business days)\b/i,
    },
    {
      name: "PAYMENT_OR_COD",
      pattern: /\b(payment|cash on delivery|COD|UPI)\b/i,
    },
  ];

  const detectedCategory = categories.find(({ pattern }) =>
    pattern.test(customerText)
  );

  const lastReply = assistantMessages.at(-1)?.text || "";

  const needsReview =
    /\b(couldn't find|could not find|unable to|please provide.*order|please share.*order|contact support|follow.?up|send photos|share photos)\b/i.test(
      lastReply
    );

  return {
    customer_intent: detectedCategory?.name || "GENERAL_ENQUIRY",
    order_id: orderMatch
      ? orderMatch[0].replace(/\s+/g, "-").toUpperCase()
      : null,
    resolution_status: needsReview
      ? "NEEDS_REVIEW"
      : assistantMessages.length > 0
        ? "RESPONDED"
        : "NO_RESPONSE",
    call_summary: lastReply
      ? cleanTextForSpeech(lastReply).slice(0, 600)
      : "No response was recorded.",
    total_messages: messages.length,
    customer_messages: customerMessages.length,
    agent_messages: assistantMessages.length,
    follow_up_required: needsReview,
    summary_method: "Rule-based draft; review before operational use.",
  };
}

export default function Home() {
  const [callActive, setCallActive] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [callStartedAt, setCallStartedAt] = useState(null);
  const [callEndedAt, setCallEndedAt] = useState(null);

  const [status, setStatus] = useState("Ready to help");
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [conversation, setConversation] = useState([]);
  const [manualMessage, setManualMessage] = useState("");
  const [recordingError, setRecordingError] = useState("");
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [currentYear, setCurrentYear] = useState(null);
  const [transcriptText, setTranscriptText] = useState("");

  const [callDuration, setCallDuration] = useState("00:00");

  // Keep refs in sync so asynchronous speech and microphone callbacks
  // always see the latest call state.
  const callActiveRef = useRef(false);
  const processingRef = useRef(false);
  const speakingRef = useRef(false);
  const mountedRef = useRef(false);
  const recognitionRef = useRef(null);
  const restartTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const conversationEndRef = useRef(null);

  const callSummary = buildCallSummary(conversation);

  const statusLabel = isTranscribing
    ? "Transcribing audio"
    : isSending
      ? "Thinking"
      : isSpeaking
        ? "Speaking"
        : isRecording
          ? "Listening to you"
          : isListening
            ? "Listening"
            : status;

  useEffect(() => {
    mountedRef.current = true;
    setCurrentYear(new Date().getFullYear());

    return () => {
      mountedRef.current = false;
      callActiveRef.current = false;

      clearTimeout(restartTimerRef.current);

      recognitionRef.current?.abort();

      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());

      if ("speechSynthesis" in window) {
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

  useEffect(() => {
    if (!callActive || !callStartedAt) return;

    const updateDuration = () => {
      const seconds = Math.max(
        0,
        Math.floor((Date.now() - new Date(callStartedAt).getTime()) / 1000)
      );

      setCallDuration(
        `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
          seconds % 60
        ).padStart(2, "0")}`
      );
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);

    return () => clearInterval(interval);
  }, [callActive, callStartedAt]);

  const stopAutomaticListening = useCallback(() => {
    clearTimeout(restartTimerRef.current);

    const recognition = recognitionRef.current;

    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // It may already have stopped.
      }
    }

    setIsListening(false);
  }, []);

  const startAutomaticListening = useCallback(() => {
    if (
      !callActiveRef.current ||
      processingRef.current ||
      speakingRef.current
    ) {
      return;
    }

    const recognition = recognitionRef.current;

    if (!recognition) {
      setStatus(
        "Automatic speech recognition unavailable. Use the microphone fallback below."
      );
      return;
    }

    clearTimeout(restartTimerRef.current);

    try {
      recognition.start();
      setIsListening(true);
      setStatus("Listening");
      setRecordingError("");
    } catch (error) {
      // InvalidStateError means recognition is already running.
      if (error?.name !== "InvalidStateError") {
        setIsListening(false);
        setRecordingError(
          "Unable to start automatic listening. Check your microphone permission."
        );
      }
    }
  }, []);

  const speakResponse = useCallback(
    (text) => {
      if (
        !speechEnabled ||
        typeof window === "undefined" ||
        !("speechSynthesis" in window)
      ) {
        speakingRef.current = false;
        setIsSpeaking(false);

        if (callActiveRef.current) {
          restartTimerRef.current = setTimeout(
            startAutomaticListening,
            300
          );
        }

        return;
      }

      const speechText = cleanTextForSpeech(text).slice(0, 1200);

      if (!speechText) {
        if (callActiveRef.current) {
          restartTimerRef.current = setTimeout(
            startAutomaticListening,
            300
          );
        }
        return;
      }

      // Never listen to the microphone while Aria is speaking.
      stopAutomaticListening();
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(speechText);

      utterance.lang = "en-IN";
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();

      const indianVoice = voices.find((voice) =>
        voice.lang?.toLowerCase().startsWith("en-in")
      );

      const englishVoice = voices.find((voice) =>
        voice.lang?.toLowerCase().startsWith("en-")
      );

      utterance.voice = indianVoice || englishVoice || null;

      utterance.onstart = () => {
        if (!mountedRef.current) return;

        speakingRef.current = true;
        setIsSpeaking(true);
        setStatus("Speaking");
      };

      utterance.onend = () => {
        if (!mountedRef.current) return;

        speakingRef.current = false;
        setIsSpeaking(false);

        if (callActiveRef.current && !processingRef.current) {
          restartTimerRef.current = setTimeout(
            startAutomaticListening,
            350
          );
        } else {
          setStatus(callActiveRef.current ? "Listening" : "Call ended");
        }
      };

      utterance.onerror = () => {
        if (!mountedRef.current) return;

        speakingRef.current = false;
        setIsSpeaking(false);

        if (callActiveRef.current && !processingRef.current) {
          restartTimerRef.current = setTimeout(
            startAutomaticListening,
            500
          );
        }
      };

      window.speechSynthesis.speak(utterance);
    },
    [speechEnabled, startAutomaticListening, stopAutomaticListening]
  );

  const sendMessageToAria = useCallback(
    async (rawMessage) => {
      const message = String(rawMessage ?? "").trim();

      if (!message || processingRef.current || !callActiveRef.current) {
        return;
      }

      processingRef.current = true;
      stopAutomaticListening();

      setRecordingError("");
      setManualMessage("");
      setIsSending(true);
      setIsListening(false);
      setStatus("Thinking");

      setConversation((previous) => [
        ...previous,
        createMessage("user", message),
      ]);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          // Keep the payload compatible with your existing API route.
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

        if (!callActiveRef.current) return;

        setConversation((previous) => [
          ...previous,
          createMessage("assistant", reply),
        ]);

        setIsSending(false);
        processingRef.current = false;

        speakResponse(reply);
      } catch (error) {
        if (mountedRef.current && callActiveRef.current) {
          setRecordingError(
            error instanceof Error
              ? error.message
              : "Something went wrong. Please try again."
          );
        }

        processingRef.current = false;
        setIsSending(false);

        if (callActiveRef.current) {
          setStatus("Listening");
          restartTimerRef.current = setTimeout(
            startAutomaticListening,
            500
          );
        }
      }
    },
    [speakResponse, startAutomaticListening, stopAutomaticListening]
  );

  const initialiseSpeechRecognition = useCallback(() => {
    if (typeof window === "undefined") return null;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return null;

    // Reuse the recogniser for the entire call.
    if (recognitionRef.current) return recognitionRef.current;

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = "";

    recognition.onstart = () => {
      if (!callActiveRef.current) return;

      setIsListening(true);
      setStatus("Listening");
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";

      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index];
        const text = result[0]?.transcript || "";

        if (result.isFinal) {
          finalTranscript += ` ${text}`;
        } else {
          interimTranscript += ` ${text}`;
        }
      }

      const finalText = finalTranscript.trim();

      if (interimTranscript.trim()) {
        setTranscriptText(interimTranscript.trim());
      }

      if (finalText && !processingRef.current) {
        finalTranscript = "";
        setTranscriptText(finalText);

        // Stop recognition before sending the message so the same sentence
        // cannot be submitted twice.
        try {
          recognition.stop();
        } catch {
          // Recognition may already be stopping.
        }

        setIsListening(false);
        sendMessageToAria(finalText);
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);

      if (!callActiveRef.current) return;

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setRecordingError(
          "Microphone permission was denied. Allow microphone access in your browser and restart the call."
        );
        setStatus("Microphone permission required");
        return;
      }

      if (event.error === "audio-capture") {
        setRecordingError(
          "No microphone was detected. Connect a microphone and try again."
        );
      }

      // Ignore no-speech and aborted errors. onend handles restarting.
    };

    recognition.onend = () => {
      setIsListening(false);

      if (
        callActiveRef.current &&
        !processingRef.current &&
        !speakingRef.current
      ) {
        restartTimerRef.current = setTimeout(
          startAutomaticListening,
          400
        );
      }
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [sendMessageToAria, startAutomaticListening]);

  const startCall = useCallback(() => {
    if (callActiveRef.current) return;

    callActiveRef.current = true;
    processingRef.current = false;
    speakingRef.current = false;

    setCallActive(true);
    setCallEnded(false);
    setCallStartedAt(new Date().toISOString());
    setCallEndedAt(null);
    setCallDuration("00:00");
    setStatus("Starting call");
    setRecordingError("");
    setTranscriptText("");

    const greeting =
      "Hello! Welcome to Aura Skincare. I'm Aria, your virtual support assistant. How can I help you today?";

    setConversation((previous) => [
      ...previous,
      createMessage("assistant", greeting),
    ]);

    const recognition = initialiseSpeechRecognition();

    if (!recognition) {
      setStatus("Manual microphone mode");
      setRecordingError(
        "Automatic speech recognition is not supported in this browser. Use the microphone recording fallback or try Chrome."
      );
    }

    // Speak the greeting first. Listening starts when the greeting ends.
    speakResponse(greeting);
  }, [initialiseSpeechRecognition, speakResponse]);

  const endCall = useCallback(() => {
    // Set the ref synchronously before stopping anything. This prevents
    // pending callbacks from restarting the microphone after End Call.
    callActiveRef.current = false;
    processingRef.current = false;
    speakingRef.current = false;

    clearTimeout(restartTimerRef.current);
    stopAutomaticListening();

    try {
      recognitionRef.current?.abort();
    } catch {
      // Ignore if already stopped.
    }

    recognitionRef.current = null;

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setCallActive(false);
    setCallEnded(true);
    setCallEndedAt(new Date().toISOString());
    setIsListening(false);
    setIsRecording(false);
    setIsTranscribing(false);
    setIsSending(false);
    setIsSpeaking(false);
    setStatus("Call ended");
    setRecordingError("");
  }, [stopAutomaticListening]);

  // Fallback recording for browsers that do not support Web Speech API.
  const startRecordingFallback = useCallback(async () => {
    if (!callActiveRef.current || processingRef.current) return;

    setRecordingError("");

    if (
      !navigator.mediaDevices?.getUserMedia ||
      !window.MediaRecorder
    ) {
      setRecordingError(
        "Microphone recording is not supported by this browser."
      );
      return;
    }

    try {
      stopAutomaticListening();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      if (!callActiveRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported(
        "audio/webm;codecs=opus"
      )
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        audioChunksRef.current = [];
        setIsRecording(false);

        if (!blob.size || !callActiveRef.current) return;

        setIsTranscribing(true);
        setStatus("Transcribing");

        try {
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");

          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data?.error || "Transcription failed.");
          }

          const text = String(data.text || "").trim();

          if (!text) {
            throw new Error("No speech was detected. Please try again.");
          }

          setTranscriptText(text);
          setIsTranscribing(false);

          await sendMessageToAria(text);
        } catch (error) {
          setIsTranscribing(false);
          setRecordingError(
            error instanceof Error
              ? error.message
              : "Transcription failed."
          );
        }
      };

      recorder.start();
      setIsRecording(true);
      setStatus("Recording — click Stop recording when finished");
    } catch (error) {
      setRecordingError(
        error instanceof Error && error.name === "NotAllowedError"
          ? "Microphone permission was denied."
          : "Unable to access your microphone."
      );
    }
  }, [sendMessageToAria, stopAutomaticListening]);

  const stopRecordingFallback = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setStatus("Transcribing");
    }
  }, []);

  const handleManualSubmit = async (event) => {
    event.preventDefault();

    if (!callActiveRef.current) {
      setRecordingError("Click Start Call before sending a message.");
      return;
    }

    await sendMessageToAria(manualMessage);
  };

  const downloadTranscript = () => {
    const transcript = {
      brand: "Aura Skincare",
      assistant: "Aria",
      call: {
        status: callEnded ? "ended" : callActive ? "active" : "not_started",
        startedAt: callStartedAt,
        endedAt: callEndedAt,
        duration: callDuration,
      },
      exportedAt: new Date().toISOString(),
      transcript: conversation.map((message, index) => ({
        sequence: index + 1,
        role: message.role,
        text: message.text,
        timestamp: message.timestamp,
        displayTime: message.time,
      })),
      structuredSummary: callSummary,
    };

    const blob = new Blob([JSON.stringify(transcript, null, 2)], {
      type: "application/json;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `aura-call-transcript-${Date.now()}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const sendExample = (text) => {
    if (!callActiveRef.current) {
      startCall();

      // Wait for Start Call state to initialise before sending the test query.
      setTimeout(() => {
        if (callActiveRef.current) sendMessageToAria(text);
      }, 500);

      return;
    }

    sendMessageToAria(text);
  };

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
            {callActive ? "Call in progress" : "Aria is ready"}
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
                  Ask about orders, shipping, returns, cancellations and
                  payment options. Start a call and speak naturally with Aria.
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
                  <div
                    className={`flex h-24 w-24 items-center justify-center rounded-full bg-emerald-800 shadow-inner ${
                      isListening ? "animate-pulse" : ""
                    }`}
                  >
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
              <p className="mt-2 font-semibold">
                {callActive ? "Active" : callEnded ? "Ended" : "Inactive"}
              </p>
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
                  Start a call and speak naturally. Aria will listen again
                  after each reply.
                </p>

                {callStartedAt && (
                  <p className="mt-1 text-xs text-slate-400">
                    Call duration: {callDuration}
                  </p>
                )}
              </div>

              <button
                onClick={downloadTranscript}
                disabled={conversation.length === 0}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Export transcript + summary
              </button>
            </div>

            <div className="flex min-h-[320px] max-h-[520px] flex-col gap-4 overflow-y-auto p-5 sm:p-6">
              {conversation.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                    <Bot size={28} />
                  </div>
                  <h4 className="mt-4 font-semibold">
                    Your conversation starts here
                  </h4>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                    Click Start Call and ask Aria about an order or an Aura
                    Skincare policy.
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
                              isAssistant
                                ? "text-slate-400"
                                : "text-emerald-200"
                            }`}
                          >
                            {message.time}
                          </span>
                        </div>

                        <p className="whitespace-pre-wrap">
                          {message.text.split(/(\*\*.*?\*\*)/g).map((part, index) =>
                            part.startsWith("**") && part.endsWith("**") ? (
                              <strong key={index}>
                                {part.slice(2, -2)}
                              </strong>
                            ) : (
                              <span key={index}>{part}</span>
                            )
                          )}
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
                  Latest transcription:
                </span>{" "}
                {transcriptText}
              </div>
            )}

            <div className="border-t border-slate-100 p-4 sm:p-5">
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  value={manualMessage}
                  onChange={(event) => setManualMessage(event.target.value)}
                  placeholder="Type a message..."
                  maxLength={2000}
                  disabled={!callActive || isSending}
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
                />

                <button
                  type="submit"
                  disabled={!manualMessage.trim() || !callActive || isSending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-40"
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
                  Automatic listening works in compatible browsers.
                </p>

                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecordingFallback}
                    disabled={!callActive || isTranscribing || isSending}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isTranscribing ? (
                      <LoaderCircle size={17} className="animate-spin" />
                    ) : (
                      <Mic size={17} />
                    )}
                    {isTranscribing ? "Transcribing..." : "Record manually"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecordingFallback}
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
                  >
                    <MicOff size={17} />
                    Stop recording
                  </button>
                )}
              </div>
            </div>
          </section>

          {callEnded && conversation.length > 0 && (
            <section className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-900">
                    <FileText size={21} />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold">Post-call summary</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Review the conversation outcome and export the JSON.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={downloadTranscript}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900"
                >
                  <Download size={16} />
                  Download JSON
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ["Customer intent", callSummary.customer_intent],
                  ["Order ID", callSummary.order_id || "Not mentioned"],
                  ["Resolution status", callSummary.resolution_status],
                  ["Follow-up required", callSummary.follow_up_required ? "Review needed" : "Not flagged"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {label}
                    </p>
                    <p className="mt-2 break-words text-sm font-semibold text-slate-800">
                      {value}
                    </p>
                  </div>
                ))}

                <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Call summary
                  </p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
                    {callSummary.call_summary}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Transcript statistics
                  </p>
                  <p className="mt-2 text-sm text-slate-800">
                    {callSummary.total_messages} total ·{" "}
                    {callSummary.customer_messages} customer ·{" "}
                    {callSummary.agent_messages} Aria
                  </p>
                </div>
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                The structured summary is generated using basic rules from
                the transcript. Review it before relying on it operationally.
              </p>
            </section>
          )}

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
                  Select an order to test Aria's lookup.
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
                    onClick={() =>
                      sendExample(
                        `Please check the order details and current status for ${order.id}.`
                      )
                    }
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
              {[
                "Uses the order lookup tool for order-specific questions.",
                "Asks for an order ID when it is missing.",
                "Does not invent tracking details or promise unsupported actions.",
                "Keeps replies friendly, relevant and concise.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2
                    size={16}
                    className="mt-0.5 shrink-0 text-emerald-700"
                  />
                  {item}
                </li>
              ))}
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
                  onClick={() => sendExample(example)}
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
          <p>
            © {currentYear ?? ""} Aura Skincare · AI Voice Support Demo
          </p>
          <p>
            Responses are generated from configured policies and mock order
            data.
          </p>
        </div>
      </footer>
    </main>
  );
}