import type { JsonValue } from './json';

export type TurnstileRenderOptions = {
  sitekey: string;
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact' | 'flexible';
};

export type PhonemeAlignment = {
  phoneme: string;
  start_time: number;
  end_time: number;
  confidence_log: number;
  confidence_norm: number;
  confidence_threshold: number;
  duration_sec: number;
  madd_class: string | null;
  madd_judgement: string | null;
  tajweed_rule: string | null;
  tajweed_judgement: string | null;
  vad_judgement: string | null;
  source_index: number | null;
  /** Traditional makhraj (articulation point) label, e.g. "wasat al-halq
   *  (middle throat)" -- diagnostic/display metadata only, not a new
   *  acoustic check (see alignment.py's MAKHRAJ_LABELS for the full
   *  honesty note on why this isn't per-makhraj calibrated). */
  makhraj: string | null;
  /** The reference word this sound belongs to, attached by api/hifz-review from
   *  the same word boundaries used for per-word error attribution. Without it
   *  the panel could only name a bare IPA symbol -- "iː held too short" tells a
   *  student nothing about WHERE in the passage to fix anything. */
  word?: string | null;
};

export type JitsiParticipantInfo = {
  participantId: string;
  displayName?: string;
  formattedDisplayName?: string;
  /** Comes from the JaaS token context; the only stable identity a remote peer exposes. */
  email?: string;
};

export type JitsiMeetExternalAPIInstance = {
  dispose: () => void;
  addEventListener: (event: string, handler: (...args: JsonValue[]) => void) => void;
  removeEventListener?: (event: string, handler: (...args: JsonValue[]) => void) => void;
  executeCommand: (command: string, ...args: JsonValue[]) => void;
  getParticipantsInfo?: () => JitsiParticipantInfo[];
};

type JitsiMeetOptions = {
  roomName: string;
  jwt?: string;
  width?: string | number;
  height?: string | number;
  parentNode?: HTMLElement | null;
  configOverwrite?: Record<string, JsonValue>;
  interfaceConfigOverwrite?: Record<string, JsonValue>;
  userInfo?: { displayName?: string; email?: string };
};

type PaystackSetupOptions = {
  key: string;
  email: string;
  amount: number;
  currency?: string;
  metadata?: Record<string, JsonValue>;
  ref?: string;
  callback?: (res: Record<string, JsonValue>) => void;
  onClose?: () => void;
};

type FlutterwaveOptions = {
  public_key: string;
  tx_ref: string;
  amount: number;
  currency?: string;
  payment_options?: string;
  meta?: Record<string, JsonValue>;
  customer?: { email: string; name?: string };
  customizations?: { title?: string; description?: string };
  callback?: (res: Record<string, JsonValue>) => void;
  onclose?: () => void;
};

declare global {
  const PaystackPop: {
    setup: (options: PaystackSetupOptions) => { openIframe: () => void };
  };

  const FlutterwaveCheckout: (options: FlutterwaveOptions) => void;

  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: JitsiMeetOptions) => JitsiMeetExternalAPIInstance;
    webkitAudioContext?: typeof AudioContext;
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
    Calendly?: {
      initInlineWidget: (options: {
        url: string;
        parentElement: HTMLElement;
        prefill?: { name?: string; email?: string };
      }) => void;
    };
    turnstile?: {
      render: (container: string | HTMLElement, options: TurnstileRenderOptions) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
    onloadTurnstileCallback?: () => void;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }

  interface SpeechRecognition extends EventTarget {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    maxAlternatives: number;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
  }

  interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
  }

  interface SpeechRecognitionResultList {
    length: number;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    isFinal: boolean;
    length: number;
    [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionAlternative {
    transcript: string;
  }
}

export {};
