import { act, renderHook } from '@testing-library/react';
import useSpeech from '../renderer/hooks/useSpeech';

class MockUtterance {
  text: string;

  voice: { name: string; lang: string; localService: boolean } | null = null;

  lang = '';

  rate = 1;

  pitch = 1;

  volume = 1;

  onend: ((event: Event) => void) | null = null;

  onerror: ((event: Event) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

describe('useSpeech', () => {
  const spoken: MockUtterance[] = [];
  let cancelCount = 0;
  const synthesizer = {
    speaking: false,
    pending: false,
    paused: false,
    getVoices: () => [
      {
        name: 'Local English',
        lang: 'en-US',
        localService: true,
      },
      {
        name: 'Karen',
        lang: 'en-AU',
        localService: true,
      },
    ],
    speak: (utterance: MockUtterance) => {
      spoken.push(utterance);
      synthesizer.speaking = true;
    },
    cancel: () => {
      cancelCount += 1;
      synthesizer.speaking = false;
      synthesizer.pending = false;
    },
    resume: jest.fn(),
  };

  beforeEach(() => {
    jest.useFakeTimers();
    spoken.length = 0;
    cancelCount = 0;
    synthesizer.speaking = false;
    synthesizer.pending = false;
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: synthesizer,
    });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: MockUtterance,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('does not cancel the audio engine before a clean second reading', () => {
    const { result } = renderHook(() => useSpeech(1, 'Karen'));

    act(() => result.current.speak('attention'));
    expect(spoken).toHaveLength(1);
    expect(cancelCount).toBe(0);
    expect(spoken[0].lang).toBe('en-AU');
    expect(spoken[0].voice).toEqual(
      expect.objectContaining({ name: 'Karen', lang: 'en-AU' }),
    );

    synthesizer.speaking = false;
    act(() => spoken[0].onend?.({} as Event));
    act(() => result.current.speak('attention'));

    expect(spoken).toHaveLength(2);
    expect(cancelCount).toBe(0);
  });

  it('lets Chromium settle before replacing an active utterance', () => {
    const { result } = renderHook(() => useSpeech(1, ''));

    act(() => result.current.speak('attention'));
    act(() => result.current.speak('fragmented'));

    expect(cancelCount).toBe(1);
    expect(spoken).toHaveLength(1);

    act(() => jest.advanceTimersByTime(120));
    expect(spoken).toHaveLength(2);
    expect(spoken[1].text).toBe('fragmented');
  });
});
