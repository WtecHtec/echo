import { useCallback, useEffect, useRef, useState } from 'react';

const wordAudioUrl = (word: string) =>
  `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`;

export default function useWordAudio() {
  const [speakingWord, setSpeakingWord] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speakingWordRef = useRef('');
  const requestIdRef = useRef(0);

  const stop = useCallback(() => {
    requestIdRef.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
      audioRef.current = null;
    }
    speakingWordRef.current = '';
    setSpeakingWord('');
  }, []);

  useEffect(() => () => stop(), [stop]);

  const speakWord = useCallback(
    (value: string) => {
      const word = value.trim().toLocaleLowerCase();
      if (!word) return;
      if (speakingWordRef.current === word) {
        stop();
        return;
      }

      stop();
      const requestId = requestIdRef.current;
      const audio = new Audio(wordAudioUrl(word));
      audio.preload = 'auto';
      const finish = () => {
        if (requestId === requestIdRef.current) {
          audioRef.current = null;
          speakingWordRef.current = '';
          setSpeakingWord('');
        }
      };
      audio.onended = finish;
      audio.onerror = finish;
      audioRef.current = audio;
      speakingWordRef.current = word;
      setSpeakingWord(word);
      audio.play().catch(() => {
        if (requestId === requestIdRef.current) {
          audioRef.current = null;
          speakingWordRef.current = '';
          setSpeakingWord('');
        }
      });
    },
    [stop],
  );

  return { speakWord, speakingWord, stopWord: stop };
}
