"use client";

import { useCallback, useRef, useState } from "react";
import { voiceApi } from "./api-client";

export type VoiceRecorderState = "idle" | "recording" | "transcribing" | "error";

export function useVoiceRecorder(onTranscribed: (text: string) => void) {
  const [state, setState] = useState<VoiceRecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState("error");
      setError("Voice input isn't supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size === 0) {
          setState("idle");
          return;
        }
        setState("transcribing");
        try {
          const text = await voiceApi.transcribe(blob);
          onTranscribed(text);
          setState("idle");
        } catch (err) {
          setState("error");
          setError(err instanceof Error ? err.message : "Transcription failed.");
        }
      };

      recorder.start();
      setState("recording");
    } catch (err) {
      setState("error");
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Microphone access was denied. Allow it in your browser settings to use voice input."
          : "Couldn't access the microphone."
      );
    }
  }, [onTranscribed]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const toggle = useCallback(() => {
    if (state === "recording") stop();
    else if (state === "idle" || state === "error") start();
  }, [state, start, stop]);

  return { state, error, toggle };
}
