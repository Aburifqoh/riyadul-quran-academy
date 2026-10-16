'use client';

import type { JitsiMeetExternalAPIInstance, JitsiParticipantInfo } from '@/types/globals';

/**
 * The live class runs in one iframe that is owned by this module, not by React.
 *
 * Why: the session page used to create the Jitsi iframe inside its own subtree, so
 * any route change — including the browser back button, which Next's app router
 * handles before our popstate listener can ever see it — unmounted the iframe and
 * killed the conference mid-handshake. The server keeps the abandoned session around
 * until it times out, so walking back in produced a second copy of the same person,
 * then a third. Keeping the iframe attached to <body> for the whole call means
 * leaving the page parks the call instead of ending it, and coming back re-uses the
 * same connection: there is no rejoin, so there is nothing to duplicate.
 *
 * Docked = sized to the session page's video area, painted under the page chrome.
 * Parked = small picture-in-picture in the corner, over whatever page you are on.
 *
 * The call lifecycle lives here rather than in an effect so that React unmounting
 * (route change, StrictMode's double-invoke) can never abort a join that is still
 * in flight.
 */

const HOST_ID = 'ilmvers-classroom-stage';
const DOCKED_Z = '99990';
const PIP_Z = '100200';
const JITSI_DOMAIN = '8x8.vc';
const TOKEN_URL = process.env.NEXT_PUBLIC_CLASSROOM_TOKEN_URL || '';

export type StageMode = 'docked' | 'pip';
export type StageRole = 'teacher' | 'student';

export type Stage = {
  key: string;
  room: string;
  /** Where the picture-in-picture "return to class" button sends the user. */
  href: string;
  host: HTMLDivElement;
  chrome: HTMLDivElement;
  api: JitsiMeetExternalAPIInstance | null;
  starting: boolean;
  joined: boolean;
  startedAt: number;
  mode: StageMode;
  dockedTop: number;
  onReturn: (() => void) | null;
  ticker: ReturnType<typeof setInterval> | null;
  sweeper: ReturnType<typeof setInterval> | null;
  closing: boolean;
};

let stage: Stage | null = null;

export function getStage(): Stage | null {
  return stage;
}

export function stageElapsedMinutes(): number {
  if (!stage) return 0;
  return Math.floor((Date.now() - stage.startedAt) / 60000);
}

/** True when a call is running but the user has navigated away from it. */
export function stageIsParked(): boolean {
  return Boolean(stage && stage.mode === 'pip' && !stage.closing);
}

// ---------------------------------------------------------------- host element

function buildChrome(): HTMLDivElement {
  const chrome = document.createElement('div');
  chrome.style.cssText = [
    'position:absolute',
    'inset:0',
    'z-index:2',
    'display:none',
    'flex-direction:column',
    'justify-content:space-between',
    'pointer-events:none',
  ].join(';');

  const top = document.createElement('div');
  top.style.cssText = 'display:flex;justify-content:flex-end;padding:6px';

  const leave = document.createElement('button');
  leave.type = 'button';
  leave.textContent = '✕';
  leave.title = 'Leave class';
  leave.setAttribute('aria-label', 'Leave class');
  leave.style.cssText = [
    'pointer-events:auto',
    'width:24px;height:24px',
    'border:0;border-radius:999px',
    'background:rgba(220,38,38,0.92);color:#fff',
    'font-size:12px;font-weight:700;line-height:1',
    'cursor:pointer',
  ].join(';');
  leave.addEventListener('click', (event) => {
    event.stopPropagation();
    void closeStage();
  });
  top.appendChild(leave);

  const back = document.createElement('button');
  back.type = 'button';
  back.textContent = 'Return to class';
  back.style.cssText = [
    'pointer-events:auto',
    'width:100%;margin:0;padding:7px 8px',
    'border:0',
    'background:rgba(17,17,17,0.88);color:#fff',
    'font:800 11px/1.2 inherit',
    'cursor:pointer',
  ].join(';');
  back.addEventListener('click', (event) => {
    event.stopPropagation();
    stage?.onReturn?.();
  });

  chrome.appendChild(top);
  chrome.appendChild(back);
  return chrome;
}

function applyLayout() {
  if (!stage) return;
  const { host, chrome } = stage;
  if (stage.mode === 'pip') {
    host.style.zIndex = PIP_Z;
    host.style.top = 'auto';
    host.style.left = 'auto';
    host.style.right = '16px';
    const overBottomNav = window.matchMedia('(max-width: 1023px)').matches;
    host.style.bottom = `calc(${overBottomNav ? 80 : 16}px + env(safe-area-inset-bottom, 0px))`;
    host.style.width = 'min(260px, 46vw)';
    host.style.height = 'min(164px, 30vh)';
    host.style.borderRadius = '14px';
    host.style.boxShadow = '0 12px 30px rgba(0,0,0,0.45)';
    chrome.style.display = 'flex';
    return;
  }
  host.style.zIndex = DOCKED_Z;
  host.style.top = `${stage.dockedTop}px`;
  host.style.left = '0';
  host.style.right = '0';
  host.style.bottom = '0';
  host.style.width = 'auto';
  host.style.height = 'auto';
  host.style.borderRadius = '0';
  host.style.boxShadow = 'none';
  chrome.style.display = 'none';
}

/** Show the call full-bleed below a page header of `topPx` pixels. */
export function dockStage(topPx: number) {
  if (!stage) return;
  stage.mode = 'docked';
  stage.dockedTop = Math.max(0, Math.round(topPx));
  applyLayout();
}

/** Leaving the page: shrink to a corner and keep the conference connected. */
export function parkStage(onReturn?: () => void) {
  if (!stage || stage.closing) return;
  if (onReturn) stage.onReturn = onReturn;
  stage.mode = 'pip';
  applyLayout();
}

// ------------------------------------------------------------------ lifecycle

/**
 * Returns the live stage for `key`, creating an empty one if the call is not running
 * yet. `isNew` is true only when the caller still has to start the conference.
 */
export function openStage(opts: {
  key: string;
  room: string;
  href: string;
  onReturn?: () => void;
  onTick?: () => void;
}): { stage: Stage; isNew: boolean } {
  if (stage && stage.key === opts.key && !stage.closing) {
    stage.href = opts.href;
    if (opts.onReturn) stage.onReturn = opts.onReturn;
    return { stage, isNew: !stage.starting && !stage.api };
  }

  // A different room or a different user: the previous call is genuinely over.
  if (stage) destroyStageNow();

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText = 'position:fixed;overflow:hidden;background:#000';

  const chrome = buildChrome();
  host.appendChild(chrome);
  document.body.appendChild(host);

  stage = {
    key: opts.key,
    room: opts.room,
    href: opts.href,
    host,
    chrome,
    api: null,
    starting: false,
    joined: false,
    startedAt: Date.now(),
    mode: 'docked',
    dockedTop: 0,
    onReturn: opts.onReturn ?? null,
    ticker: null,
    sweeper: null,
    closing: false,
  };

  if (opts.onTick) {
    opts.onTick();
    stage.ticker = setInterval(opts.onTick, 60000);
  }

  window.addEventListener('pagehide', hangupOnUnload);
  applyLayout();
  return { stage, isNew: true };
}

function hangupOnUnload() {
  if (!stage?.api) return;
  try {
    stage.api.executeCommand('hangup');
  } catch {
    // the tab is going away regardless
  }
}

function destroyStageNow() {
  if (!stage) return;
  const dying = stage;
  stage = null;
  window.removeEventListener('pagehide', hangupOnUnload);
  if (dying.ticker) clearInterval(dying.ticker);
  if (dying.sweeper) clearInterval(dying.sweeper);
  try {
    dying.api?.dispose();
  } catch {
    // iframe already gone
  }
  dying.host.remove();
}

/**
 * End the call for real: ask Jitsi to hang up, wait for it to confirm the leave was
 * sent, then tear the iframe down. Ripping the iframe out without that wait is what
 * strands a participant server-side for the next join to collide with.
 */
export function closeStage(): Promise<void> {
  const dying = stage;
  if (!dying || dying.closing) return Promise.resolve();
  dying.closing = true;
  dying.chrome.style.display = 'none';

  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (stage === dying) destroyStageNow();
      resolve();
    };
    if (!dying.api) {
      finish();
      return;
    }
    try {
      dying.api.addEventListener('readyToClose', finish);
      dying.api.executeCommand('hangup');
    } catch {
      finish();
      return;
    }
    window.setTimeout(finish, 1500);
  });
}

// ------------------------------------------------------- duplicate participants

const GENERIC_NAMES = new Set(['student', 'instructor', 'teacher', 'admin monitor', 'class participant', '']);

/**
 * A stable identity for a peer. Email comes from the JaaS token and is unique per
 * account; the display-name fallback deliberately ignores the generic placeholders,
 * because kicking two different people who both showed up as "Student" would be a
 * far worse bug than leaving a stale tile on screen.
 */
function identityOf(person: JitsiParticipantInfo): string {
  const email = (person.email || '').trim().toLowerCase();
  if (email) return `e:${email}`;
  const name = (person.displayName || person.formattedDisplayName || '')
    .replace(/\s*\(me\)\s*/i, '')
    .trim()
    .toLowerCase();
  if (GENERIC_NAMES.has(name) || !name.includes(' ')) return '';
  return `n:${name}`;
}

/**
 * Safety net for stale copies left by an earlier hard disconnect (a closed laptop, a
 * killed tab). Keeps the most recently seen copy of each identity and kicks the rest.
 * Only a moderator can kick, so this is a no-op for students.
 */
function sweepDuplicates(api: JitsiMeetExternalAPIInstance, firstSeen: Map<string, number>) {
  if (!api.getParticipantsInfo) return;
  let people: JitsiParticipantInfo[];
  try {
    people = api.getParticipantsInfo() || [];
  } catch {
    return;
  }

  const present = new Set<string>();
  const groups = new Map<string, string[]>();
  for (const person of people) {
    const id = person.participantId;
    if (!id) continue;
    present.add(id);
    if (!firstSeen.has(id)) firstSeen.set(id, Date.now());
    const identity = identityOf(person);
    if (!identity) continue;
    groups.set(identity, [...(groups.get(identity) || []), id]);
  }
  for (const id of firstSeen.keys()) {
    if (!present.has(id)) firstSeen.delete(id);
  }

  for (const ids of groups.values()) {
    if (ids.length < 2) continue;
    // Newest wins: a ghost is always a leftover of a session that started earlier.
    const ordered = [...ids].sort((a, b) => (firstSeen.get(a) || 0) - (firstSeen.get(b) || 0));
    for (const id of ordered.slice(0, -1)) {
      try {
        api.executeCommand('kickParticipant', id);
      } catch {
        // not a moderator, or the ghost has already timed out
      }
    }
  }
}

// ----------------------------------------------------------------- conference

function loadJitsiScript(): Promise<void> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('jitsi-script') as HTMLScriptElement | null;
    const script = existing || document.createElement('script');
    const done = () => (window.JitsiMeetExternalAPI ? resolve() : reject(new Error('jitsi-missing')));
    script.addEventListener('load', done);
    script.addEventListener('error', () => reject(new Error('jitsi-script-failed')));
    if (!existing) {
      script.id = 'jitsi-script';
      script.src = `https://${JITSI_DOMAIN}/external_api.js`;
      script.async = true;
      document.body.appendChild(script);
    }
    // A tag that finished loading before we attached the listener would otherwise
    // leave the stage wedged in `starting` with no way back.
    window.setTimeout(done, 12000);
  });
}

export type StartCallOptions = {
  appId: string;
  roomName: string;
  displayName: string;
  email?: string;
  userId: string;
  role: StageRole;
  isGhost: boolean;
  canModerate: boolean;
  onStatus: (text: string) => void;
  onJoined: () => void;
  onLeft: () => void;
  onFailed: (text: string) => void;
};

/**
 * Video/audio tuning notes, since these numbers are the difference between a call
 * that degrades and one that freezes:
 *
 * - No forced `setVideoQuality(720)`. Pinning the receive layer to 720p means a
 *   thin link has to stall rather than fall back to the 360p/180p simulcast layer,
 *   which is exactly the "skipping and hanging" behaviour.
 * - VP9 first. Its SVC layers degrade smoothly and it holds far more detail per bit
 *   than VP8, which matters most for a face plus on-screen Arabic text.
 * - `channelLastN: -1` keeps the bridge from ever dropping a camera; that drop is
 *   what surfaces as "video turned off to save bandwidth".
 * - Opus RED (redundant encoding) is what stops audio dropping out on packet loss,
 *   and DTX stays off so quiet passages of recitation are not clipped as silence.
 */
function callConfig(opts: StartCallOptions) {
  const toolbarButtons = opts.isGhost
    ? ['hangup']
    : opts.role === 'teacher'
      ? ['microphone', 'camera', 'desktop', 'fullscreen', 'fodeviceselection', 'hangup', 'profile', 'settings', 'raisehand', 'whiteboard', 'videoquality', 'filmstrip', 'tileview', 'videobackgroundblur', 'participants-pane', 'noisesuppression']
      : ['microphone', 'camera', 'fullscreen', 'fodeviceselection', 'hangup', 'raisehand', 'whiteboard', 'videoquality', 'filmstrip', 'tileview', 'videobackgroundblur', 'participants-pane', 'noisesuppression'];

  const codecOrder = ['VP9', 'VP8', 'H264'];

  return {
    // A monitor must not request the camera. Saved Jitsi settings otherwise
    // override startWithAudioMuted and the join stalls on a permission prompt.
    startWithAudioMuted: opts.isGhost,
    startWithVideoMuted: opts.isGhost,
    startSilent: opts.isGhost,
    disableInitialGUM: opts.isGhost,
    disableSelfView: opts.isGhost,
    startVideoMuted: 99,
    startAudioMuted: 99,
    disableInviteFunctions: true,
    prejoinPageEnabled: false,
    prejoinConfig: { enabled: false },
    disableDeepLinking: true,
    defaultLanguage: 'en',
    toolbarButtons,
    readOnlyName: opts.role !== 'teacher' || opts.isGhost,
    tileViewEnabled: true,
    startWithTileView: true,
    disableThirdPartyRequests: false,
    disableChat: true,
    enableNoAudioDetection: true,
    // Recitation is loud and sustained; the noisy-mic detector reads that as a fault.
    enableNoisyMicDetection: false,
    fileRecordingsEnabled: false,
    liveStreamingEnabled: false,
    hiddenPremeetingButtons: ['invite'],
    localRecording: { disable: true, notifyAllParticipants: false },

    // One-to-one lessons go peer-to-peer: no bridge hop, so lower latency and
    // noticeably better picture on the same connection. The cost is that every
    // crossing of the 2-participant line renegotiates the whole session, and
    // that renegotiation is the freeze. Phantom rejoins used to trigger it
    // constantly; with those gone the remaining causes are real third
    // participants (an admin monitor, a second student), so hold off returning
    // to p2p for longer than the 5s default rather than switching twice in
    // quick succession when someone looks in briefly.
    // The monitor does not open its own peer connection. The class already
    // renegotiates once when a third person enters; a second handshake from
    // this client is what made that look-in fail.
    p2p: { enabled: !opts.isGhost, codecPreferenceOrder: codecOrder, backToP2PDelay: 15 },

    channelLastN: -1,
    startLastN: -1,
    enableLayerSuspension: true,
    startAudioOnly: false,
    resolution: 720,
    constraints: {
      video: {
        height: { ideal: 720, max: 720, min: 180 },
        frameRate: { ideal: 24, max: 30 },
      },
    },
    videoQuality: {
      persist: false,
      codecPreferenceOrder: codecOrder,
      maxBitratesVideo: {
        VP9: { low: 100000, standard: 350000, high: 1200000 },
        VP8: { low: 200000, standard: 500000, high: 1500000 },
        H264: { low: 200000, standard: 500000, high: 1500000 },
      },
    },

    enableOpusRed: true,
    audioQuality: { stereo: false, enableOpusDtx: false, opusMaxAverageBitrate: 32000 },
  };
}

/** Boots the conference into the current stage. Safe to call once per stage. */
export async function startCall(opts: StartCallOptions): Promise<void> {
  const own = stage;
  if (!own || own.starting || own.api) return;
  own.starting = true;

  const stillOurs = () => stage === own && !own.closing;

  try {
    opts.onStatus('Preparing Your Classroom...');
    await loadJitsiScript();
    if (!stillOurs()) return;

    opts.onStatus('Authenticating Secure Token...');
    if (!TOKEN_URL || !opts.appId) {
      own.starting = false;
      opts.onFailed('Live classroom is not configured yet. Add the JaaS app id and classroom token URL.');
      return;
    }
    let secureToken: string | undefined;
    try {
      const tokenRes = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: `${opts.appId}/${opts.roomName}`,
          name: opts.displayName,
          email: opts.email,
          role: opts.role,
          id: opts.userId,
        }),
      });
      if (!tokenRes.ok) {
        own.starting = false;
        opts.onFailed('Failed to authenticate classroom. Please refresh.');
        return;
      }
      secureToken = (await tokenRes.json()).token;
    } catch (error) {
      console.error('[Classroom] JWT fetch error:', error);
    }
    if (!stillOurs()) return;

    opts.onStatus('Initializing Interface...');
    const api = new window.JitsiMeetExternalAPI!(JITSI_DOMAIN, {
      roomName: `${opts.appId}/${opts.roomName}`,
      jwt: secureToken,
      width: '100%',
      height: '100%',
      parentNode: own.host,
      userInfo: { displayName: opts.displayName, email: opts.email || undefined },
      configOverwrite: callConfig(opts),
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_BRAND_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        MOBILE_APP_PROMO: false,
        DEFAULT_LOGO_URL: '',
        DEFAULT_WELCOME_PAGE_LOGO_URL: '',
        TILE_VIEW_MAX_COLUMNS: 2,
        TOOLBAR_TIMEOUT: 4000,
      },
    });

    own.api = api;
    own.starting = false;

    if (!stillOurs()) {
      void closeStage();
      return;
    }

    api.addEventListener('videoConferenceJoined', () => {
      if (stage !== own) return;
      own.joined = true;
      own.startedAt = Date.now();
      opts.onJoined();
    });

    api.addEventListener('videoConferenceLeft', () => {
      if (stage !== own) return;
      opts.onLeft();
      void closeStage();
    });

    if (opts.canModerate) {
      const firstSeen = new Map<string, number>();
      own.sweeper = setInterval(() => {
        if (stage !== own || !own.api) return;
        sweepDuplicates(own.api, firstSeen);
      }, 8000);
    }
  } catch (error) {
    own.starting = false;
    console.error('[Classroom] init error:', error);
    opts.onFailed('Failed to load classroom framework. Please refresh.');
  }
}
