import { useCallback, useEffect, useRef, useState } from 'react';

export default function useSpeech(rate: number, voiceName: string = 'en-AU') {
  const [speakingText, setSpeakingText] = useState('');
  const activeRef = useRef<SpeechSynthesisUtterance | null>(null);
  const pendingTimerRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);

  const stop = useCallback(() => {
    requestIdRef.current += 1;
    if (pendingTimerRef.current !== null) {
      window.clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    if (
      window.speechSynthesis?.speaking ||
      window.speechSynthesis?.pending ||
      activeRef.current
    ) {
      window.speechSynthesis.cancel();
    }
    activeRef.current = null;
    setSpeakingText('');
  }, []);

  useEffect(() => () => stop(), [stop]);

  const speak = useCallback(
    (text: string) => {
      if (!('speechSynthesis' in window) || !text) return;
      const synthesizer = window.speechSynthesis;
      requestIdRef.current += 1;
      const requestId = requestIdRef.current;

      if (pendingTimerRef.current !== null) {
        window.clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }

      const start = () => {
        if (requestId !== requestIdRef.current) return;
        pendingTimerRef.current = null;
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = synthesizer.getVoices();
        const australianVoices = voices.filter(
          (voice) => voice.lang.toLocaleLowerCase() === 'en-au',
        );
        utterance.lang = 'en-AU';
        utterance.voice =
          australianVoices.find((voice) => voice.name === voiceName) ??
          australianVoices.find((voice) => voice.localService) ??
          australianVoices[0] ??
          null;
        utterance.rate = rate;
        utterance.pitch = 1;
        utterance.volume = 1;
        utterance.onend = () => {
          if (
            activeRef.current === utterance &&
            requestId === requestIdRef.current
          ) {
            activeRef.current = null;
            setSpeakingText('');
          }
        };
        utterance.onerror = utterance.onend;
        activeRef.current = utterance;
        setSpeakingText(text);
        if (synthesizer.paused) synthesizer.resume();
        synthesizer.speak(utterance);
      };

      const needsSettling =
        synthesizer.speaking || synthesizer.pending || activeRef.current;
      if (needsSettling) {
        synthesizer.cancel();
        activeRef.current = null;
        setSpeakingText('');
        // Chromium can feed the previous audio buffer into a new utterance
        // when cancel() and speak() happen in the same frame.
        pendingTimerRef.current = window.setTimeout(start, 120);
      } else {
        start();
      }
    },
    [rate, voiceName],
  );

  return { speak, stop, speakingText };
}
