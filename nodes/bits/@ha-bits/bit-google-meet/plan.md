# Plan: Google Meet Voice Bit (pure audio transport via Meet Media API)

## TL;DR
Create a single universal bit `@ha-bits/bit-google-meet` whose ONLY job is moving audio in and out of a Google Meet call via the **Google Meet Media API** (official WebRTC SFU). It does NO transcription and NO TTS itself. It exposes two entry points in one bit:
- `hear` — a `STREAMING` cue that joins the call, captures ingress audio, and emits raw audio frames (PCM16) to the next downstream bit.
- `speak` — an `ACTION` that accepts pre-made audio bytes and injects them back into the same call (reusing the live session owned by `hear`).

Transcription (Deepgram/Whisper) and TTS (ElevenLabs) are SEPARATE bits chained into the workflow by the user. Runtime is `all` (Tauri WebView + Node Cortex) via two runtime adapters: native WebRTC in the browser, `werift` in Node. A singleton `MeetSessionManager` lets both cue and action share one connection keyed by conference ID.

## Decisions (from clarification)
- **Join**: Google Meet Media API (official, WebRTC to Google's SFU, OAuth2 + consent)
- **No transcription in this bit.** `hear` emits raw audio frames only. Deepgram/Whisper/etc. are separate bits wired into the habit by the user.
- **No TTS in this bit.** `speak` accepts pre-made audio bytes (from a separate `bit-elevenlabs` or any audio source) and injects them into the call.
- **Runtime**: `all` (universal: Tauri app + Cortex server)
- **Auth**: CustomAuth bundling only Google OAuth2 (clientId/secret/refreshToken or accessToken) + Meet conference ID/space. No Deepgram key.

## Critical technical caveats (must surface in plan)
1. **Meet Media API is in Developer Preview** (as of the latest docs, updated 2026-04-20). Requires the Google Cloud project, OAuth principal, host, and all participants to be enrolled in the Developer Preview Program. Admin consent + in-call initiator presence also required for consumer (gmail) meetings.
2. **No official JS/Node SDK** exists for the Meet Media API. The only reference client is C++. We must implement the protocol directly: ICE/SDP offer to Google's SFU, RtpTransceivers for audio egress/ingress, data channels for resource negotiation (conference records, active conference, participant, endpoint resources).
3. **WebRTC on Node**: no WebRTC library is currently in workspace deps. Need to add `werift` (pure JS, works on Node, no native deps) for the server runtime.

## Key Findings (Discovery)

### Framework patterns confirmed
- **Bit location**: `nodes/bits/@ha-bits/{bit-name}/src/`
- **API**: `createBit`, `createAction` (routines, run once, single return), `createCue` (triggers/streaming), `Property`, `BitAuth` from `@ha-bits/cortex-core`.
- **Streaming triggers** (`CueStrategy.STREAMING`): onEnable sets up a listener; on each event the cue calls `context.executor.executeWorkflow(workflowId, { initialContext: { 'habits.input': event, __streamingTrigger: true, __streamingNodeId: nodeId } })` to re-fire the workflow; `run` returns `[eventData]`. Reference: `nodes/bits/@ha-bits/bit-voice/src/lib/triggers/voice-command.ts`.
- **Actions return a single result** and run once per workflow execution (speak fits this).
- **Context** provides: `auth`, `propsValue`, `store` (get/put/delete), `files.write({fileName, data: Buffer})`, `server`, `logger`, `app.createListeners`, `executor`, `workflowId`, `nodeId`.
- **Runtime split pattern** (bit-voice): `src/lib/browser/` holds the real impl; `src/lib/stubs/` holds Node no-ops; trigger imports from `../browser` when app, bundles resolve stubs at non-app runtime. For universal we invert this: ship both browser and node impls side by side and select at runtime by detecting globals (`typeof RTCPeerConnection`, `typeof window`).

### Existing assets to reuse
- `bit-voice` STREAMING trigger pattern: how onEnable owns a long-lived resource, how to re-fire workflow per event.
- `bit-openai/text-to-speech.ts`: how to buffer audio and use `files.write()`.
- `bit-openai/transcriptions.ts`: transcription API call pattern.
- `bit-google-calendar` already implements Google OAuth2 via `BitAuth` (clientId/clientSecret/refreshToken) — reuse its OAuth token-fetch helper.
- No `bit-elevenlabs` exists yet (user will create separately; this bit just defines the audio-injection contract).

## Architecture (single bit, two entry points, NO transcription/TTS)

```
┌────────────────────────── bit-google-meet ──────────────────────────────────┐
│                                                                            │
│   ┌────────────────────┐         ┌───────────────────────────────────┐    │
│   │ hear (STREAMING)   │         │ speak (ACTION)                    │    │
│   │ cue                │         │                                   │    │
│   │  onEnable → join   │ ┌──────▶│  resolves active MeetSession       │    │
│   │  Meet via Media    │ │      │  decodes input → PCM16/opus        │    │
│   │  API WebRTC        │ │      │  pushes via RtpSender              │    │
│   │  audio → emit raw  │ │      └───────────────────────────────────┘    │
│   │  frames downstream │ │                                              │
│   └─────────┬──────────┘ │                                              │
│             │            │                                              │
│             ▼            │                                              │
│   ┌─────────────────────────────────────────────┐                       │
│   │  MeetSessionManager (singleton, in-process)  │◀──── keyed by         │
│   │   - connect(conference, auth) → RTCPeerConn   │      (conferenceId)  │
│   │   - onIngressAudio(cb)  [raw PCM16 frames]    │                      │
│   │   - pushEgressAudio(pcmBytes)  [for speak]    │                      │
│   │   - getParticipants()                          │                      │
│   │   - disconnect()                              │                      │
│   └─────────────────────────────────────────────┘                       │
│                                                                            │
│   Runtime-adapter split (selected at module load):                        │
│     src/lib/runtime/browser  (RTCPeerConnection, AudioContext)            │
│     src/lib/runtime/node     (werift RTCPeerConnection, PCM buffer)       │
└────────────────────────────────────────────────────────────────────────────┘

   hear emits a raw AudioFrame per chunk downstream:
     { audioBytesBase64, format: 'pcm16', sampleRate: 16000, channels: 1,
       participantId, csrc, timestampMs, durationMs }

   Typical user-facing habit wiring:
     hear (audio frames) ─▶ [bit-transcribe-deepgram] ─▶ text ─▶ [LLM]
                                                       ─▶ text ─▶ [bit-elevenlabs] ─▶ audio ─▶ speak
   Those other bits are OUT OF SCOPE for this plan; user builds them separately.
```

## Steps

### Phase A: Bit skeleton + runtime abstraction (no Meet logic yet)
1. **Create bit directory and metadata**: `nodes/bits/@ha-bits/bit-google-meet/` with `package.json` (name, `habits: { catalog: true }`, deps: `@ha-bits/cortex-core`, `werift`, `ws`, dev dep `@types/ws`). `runtime: 'all'` so it loads in both. Mirror `bit-openai/package.json` and `bit-voice/tsconfig.json`.
2. **Create common types** in `src/lib/common/types.ts`: `GoogleMeetAuth` (oauth fields), `AudioFrame` (the payload `hear` emits downstream: `audioBytesBase64`, `format: 'pcm16'`, `sampleRate`, `channels`, `participantId`, `csrc`, `timestampMs`, `durationMs`), `SpeakInput` (audioBytes Base64 OR audioUrl OR fileName, plus `audioFormat`), `MeetJoinConfig` (conferenceId/space/deviceLabel). NO transcription-related types.
3. **Define the runtime-adapter contract** in `src/lib/runtime/types.ts`: an interface `MeetMediaAdapter` declaring `connect(opts)`, `onIngressAudio(cb: (pcmFrame) => void)`, `pushEgressAudio(bytes, format)`, `getParticipants()`, `disconnect()`. Ingress audio is normalized to PCM16/16k/mono before calling the callback.

### Phase B: Meet Media API protocol module (the hard part - one runtime first)
4. **Implement Meet Media API client primitives** in `src/lib/meet/`:
   - `auth.ts`: fetch a Google OAuth2 access token from refresh token (reuse bit-google-calendar token flow as reference). Scopes: `https://www.googleapis.com/auth/meet.media` + meetings read.
   - `signaling.ts`: build SDP offer for an audio-only transceiver (recvtransceiver for ingress, sendtransceiver for egress) per Meet Media API SDP rules, gather ICE candidates, exchange SDP with Google SFU. The Media API uses its own transport (not the public WebRTC signaling endpoint), follow the C++ reference client semantics: open the data channel named `active-conference`/`participant`/`endpoint`, request resources, attach transceivers.
   - `session.ts`: `MeetSession` class managing a single live `RTCPeerConnection` (from the chosen runtime adapter), data channels, ingress audio frames (`RTCRtpReceiver.onRtp` or `RTCRtpReceiver.track`/`ontrack`), and egress (`RTCRtpSender.replaceTrack`).
   - `data-channels.ts`: encode/decode the protobuf-style resource request messages that Meet Media API uses (placeholders first; real wire format to be reverse-engineered from the C++ reference client during implementation).
5. **Implement Node runtime adapter** using **werift** in `src/lib/runtime/node/werift-adapter.ts`: wrap `RTCPeerConnection`, `RtpReceiver.onRtp`, `RtpSender.sendRtp`.
6. **Implement Browser/Tauri runtime adapter** in `src/lib/runtime/browser/webrtc-adapter.ts`: wrap native `RTCPeerConnection`, `RTCRtpTransceiver`, `addEventListener('track')`, `RTCRtpSender`.
7. **Implement the session manager** in `src/lib/meet/session-manager.ts`: a process/global singleton keyed by conferenceId. `acquire(conferenceId, auth, config)` returns a cached `MeetSession` (ref-counted). Used by both the cue and the action.
8. **Implement ingress PCM normalization** in `src/lib/audio/ingress-normalizer.ts`: take ingress RTP frames from either adapter → strip RTP headers → resample to mono 16k PCM16 (use `AudioContext` in browser, a tiny PCM resampler in node) → emit a normalized `AudioFrame`. Map CSRC → participantId via the Meet `participant` data channel (best-effort; if unavailable, pass `participantId: null` and let downstream bits decide).

### Phase C: The two entry points (cue + action)
9. **Implement `hear` cue** in `src/lib/triggers/hear.ts` as a STREAMING cue. Props: conferenceId/meetingSpace. `onEnable`: acquire MeetSession, register an ingress-audio callback that builds an `AudioFrame` from the normalized PCM chunk and calls `context.executor.executeWorkflow(context.workflowId, { initialContext: { 'habits.input': audioFrame, __streamingTrigger: true, __streamingNodeId: context.nodeId } })`. `run`: return `[context.payload]` (the raw AudioFrame). `onDisable`: release session. No transcription, no filtering beyond optional min-duration/silence props.
10. **Implement `speak` action** in `src/lib/actions/speak.ts`. Props: conferenceId, audioBytes (LongText base64) OR audioUrl OR audioFile (File), audioFormat ('pcm16' | 'opus' | 'wav' | 'mp3'), speakerLabel. `run`: acquire/cached MeetSession (same as hear), decode provided audio to PCM16 16k mono, encode to Opus frames, call `session.pushEgressAudio(opus)`. Return `{ spoken: true, durationMs, participantId }`.
11. **Wire everything in `src/index.ts`**: `createBit({ displayName: 'Google Meet Voice', logoUrl: 'lucide:Video', runtime: 'all', categories: [BitCategory.COMMUNICATION], auth: BitAuth.CustomAuth({...}), cues: [hear], routines: [speak] })`.

### Phase D: OAuth + auth wiring
12. **Define CustomAuth** with Google OAuth fields (clientId, clientSecret, refreshToken or accessToken) and optional deviceLabel. No Deepgram key. Implement a `validate` that calls a quick Google token endpoint to confirm the OAuth principal works.

### Phase E: Showcase habit + verification
13. **Create a showcase habit** in `showcase/google-meet/stack.yaml` + `habit.yaml`. MUST chain a separate transcription bit + LLM + separate elevenlabs-style audio-source bit + `speak`. Until those sibling bits exist, demonstrate the flow with `bit-http`/`bit-string` placeholders that consume the `hear` AudioFrame and produce a stub audioPayload for `speak`. Schema reviewed against `schemas/habits.schema.yaml`.
14. **Update docs**: `docs/.vitepress/theme/data/bits-data.json` registry entry; add `docs/bits/google-meet.md` clarifying it is an audio-transport-only bit and documenting the suggested habit composition (hear → transcribe-bit → LLM → tts-bit → speak).

## Relevant files

**Create (new)**:
- `nodes/bits/@ha-bits/bit-google-meet/package.json`
- `nodes/bits/@ha-bits/bit-google-meet/tsconfig.json`
- `nodes/bits/@ha-bits/bit-google-meet/src/index.ts`
- `nodes/bits/@ha-bits/bit-google-meet/src/lib/common/types.ts`
- `nodes/bits/@ha-bits/bit-google-meet/src/lib/runtime/types.ts`
- `nodes/bits/@ha-bits/bit-google-meet/src/lib/runtime/node/werift-adapter.ts`
- `nodes/bits/@ha-bits/bit-google-meet/src/lib/runtime/browser/webrtc-adapter.ts`
- `nodes/bits/@ha-bits/bit-google-meet/src/lib/meet/auth.ts`
- `nodes/bits/@ha-bits/bit-google-meet/src/lib/meet/signaling.ts`
- `nodes/bits/@ha-bits/bit-google-meet/src/lib/meet/data-channels.ts`
- `nodes/bits/@ha-bits/bit-google-meet/src/lib/meet/session.ts`
- `nodes/bits/@ha-bits/bit-google-meet/src/lib/meet/session-manager.ts`
- `nodes/bits/@ha-bits/bit-google-meet/src/lib/audio/ingress-normalizer.ts`
- `nodes/bits/@ha-bits/bit-google-meet/src/lib/triggers/hear.ts`
- `nodes/bits/@ha-bits/bit-google-meet/src/lib/actions/speak.ts`
- `showcase/google-meet/stack.yaml`
- `showcase/google-meet/habit.yaml`
- `docs/bits/google-meet.md`

**Reference (do not modify, study patterns)**:
- `nodes/bits/@ha-bits/bit-voice/src/lib/triggers/voice-command.ts` — STREAMING cue lifecycle + executor.executeWorkflow pattern
- `nodes/bits/@ha-bits/bit-openai/src/lib/actions/text-to-speech.ts` — audio → buffer → files.write pattern
- `nodes/bits/@ha-bits/bit-google-calendar/src/index.ts` — Google OAuth2 token-fetch reference
- `packages/cortex/core/src/bits/framework.ts` — CueStrategy enum, createCue/createAction/createBit API
- `schemas/habits.schema.yaml` — schema to validate the showcase habit against

**Explicitly NOT created in this plan** (user builds separately, but `speak`/`hear` are designed to compose with them):
- `bit-transcribe-deepgram` (or similar) — consumes `hear` AudioFrame → emits text
- `bit-elevenlabs` — accepts text → emits audio bytes for `speak`

## Verification

1. **Build** the bit: `pnpm nx build @ha-bits/bit-google-meet` (TypeScript must compile clean; check via `getErrors` on the new files).
2. **Lint / type-check**: `pnpm tsc --noEmit -p nodes/bits/@ha-bits/bit-google-meet/tsconfig.json`.
3. **Index in catalog** (cortex mode): start server in base mode and verify the bit appears in `GET Base UI/templates`/modules endpoint metadata.
4. **Helper-level tests that don't need a real Google account**:
   - `ingress-normalizer.ts`: feed canned RTP/PCM frames from a `samples/test.wav` and assert each output `AudioFrame` has correct `format`, `sampleRate`, `durationMs`, and valid base64 `audioBytesBase64`.
   - `webrtc-adapter`/`werift-adapter` smoke: construct each runtime adapter and assert it can build an SDP without throwing.
5. **Cortex end-to-end test of `hear` (Meet adapter stubbed)**: replace the real Meet connect with a stub that streams a local `samples/conversation.wav` as PCM frames; run `pnpm nx test-habit @ha-bits/manage --path=showcase/google-meet/stack.yaml --mode=cortex`, assert AudioFrame payloads flow downstream and appear in workflow logs.
6. **Cortex end-to-end test of `speak` (Meet adapter stubbed)**: invoke `speak` action with small canned audio bytes; assert the stub adapter receives the decoded PCM/Opus and the action returns `{ spoken: true, durationMs, participantId }`.
7. **WebDriver (Tauri) build sanity**: `pnpm nx test-webdriver @ha-bits/manage --path=showcase/google-meet/stack.yaml` — confirm the bit loads, props render, action validates input shape (omit actual call to Google since consent is required).
8. **End-to-end live test (manual, requires Google preview enrollment)**: run a real Meet call with developer-preview enrolled accounts, start the habit, verify raw audio frames flow to downstream nodes and that calling `speak` with audio bytes from a real TTS source is audible in the call.
9. **Capture all logs and analyse**: as per project instructions, run the showcase habit and inspect logs for errors per `pnpm nx test-habit @ha-bits/manage --path=showcase/google-meet/stack.yaml`.

## Decisions
- Use the official **Google Meet Media API** (WebRTC, signed in-app OAuth) per the user's explicit instruction.
- This bit is **audio-transport only**. No Deepgram, no Whisper, no ElevenLabs, no transcription, no TTS. Those are separate bits chained into the habit by the user.
- `hear` emits **raw PCM16 audio frames** (with light framing metadata: participantId/CSRC, timestamp, format) so any downstream transcription bit can consume them uniformly.
- `speak` accepts pre-made audio bytes from any source (typically `bit-elevenlabs`, built separately).
- Runtime is `all` (universal) with `werift` for Node and native WebRTC for the Tauri WebView.
- **Excluded from scope**: `bit-transcribe-deepgram`, `bit-elevenlabs`, any "eleven labs habit", video frames (audio-only), recordings/artifacts (those belong to the Google Meet REST API, not Media API).

## Further Considerations
1. **Meet Media API is Developer Preview** and the SDK story is C++ only. We'll need to implement the wire protocol from the reference client. Recommend: build the `hear` path against a local audio file stub first (verification step 5), then integrate real Meet last. **Option A** (recommended): phased rollout, stub the Meet adapter behind an interface so it can be swapped out. **Option B**: defer server runtime until the browser path works. **Option C**: use a conference bot SaaS (Recall.ai) as a stop-gap.
2. **Audio frame chunking policy**: how often `hear` re-fires the workflow (per 20ms RTP packet? per 1s buffer? per silence-bounded utterance?). Smaller = lower latency but more downstream invocations; larger = fewer but laggier. Recommendation: default to a fixed 1s window overridable by prop `frameMs`.
3. **Auth shape**: storing Google refresh tokens in a CustomAuth is functional but Google's safer pattern is per-user OAuth2 with BitAuth.OAuth2. **Option A** (recommended, simpler): CustomAuth with refreshToken. **Option B**: BitAuth.OAuth2 with full consent flow. Decide based on whether habits UI supports OAuth2 cleanly.
