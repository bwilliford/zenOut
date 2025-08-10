import React, { useEffect, useMemo, useRef, useState } from "react";

/* ---------- Config ---------- */
const INHALE_MS = 4000;   // 4s
const EXHALE_MS = 8000;   // 8s
const CYCLE_MS  = INHALE_MS + EXHALE_MS; // 12s
const AMBIENCE_URL = "https://example.com/birds-ambience.mp3"; // <-- dummy URL

type PhaseKey = "p1" | "p2" | "p3" | "p4" | "p5";
type Phase = { key: PhaseKey; name: string; description: string; illo?: "eyes"|"ears"|"neck" };

const PHASES: Phase[] = [
  { key: "p1", name: "Resonant Breathing", description: "Inhale 4s · Exhale 8s. Follow the circle." },
  { key: "p2", name: "Oms (Humming Exhales)", description: "Hum a gentle ‘om’ during each exhale (optional)." },
  { key: "p3", name: "Gently Rub Eyes", description: "With fingertips, trace slow circles on eyelids/brow.", illo: "eyes" },
  { key: "p4", name: "Rub Ears", description: "Gently rub and lightly stretch the outer ears.", illo: "ears" },
  { key: "p5", name: "Rub Neck", description: "Massage along the side of the neck below the ears.", illo: "neck" },
];

export default function App() {
  const [started, setStarted] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseDurationMs, setPhaseDurationMs] = useState(60000); // default 60s per phase
  const [remaining, setRemaining] = useState(60000);
  const [ambienceOn, setAmbienceOn] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const current = PHASES[phaseIndex];
  const isComplete = started && phaseIndex === PHASES.length - 1 && remaining === 0;

  // Start a session with chosen minutes → per-phase duration
  const startWithMinutes = async (minutes: 5 | 10 | 15) => {
    const perPhase =
      minutes === 5 ? 60_000 :
      minutes === 10 ? 120_000 :
      180_000; // 15 min

    setPhaseDurationMs(perPhase);
    setPhaseIndex(0);
    setRemaining(perPhase);
    setStarted(true);

    // Prime / autoplay ambience on user gesture
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(AMBIENCE_URL);
        audioRef.current.loop = true;
      }
      audioRef.current.muted = !ambienceOn;
      // Attempt autoplay after this click
      await audioRef.current.play();
    } catch {
      // If blocked, the mute toggle or any interaction will resume playback
    }
  };

  // Phase timer
  useEffect(() => {
    if (!started) return;
    setRemaining(phaseDurationMs);
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1000) {
          if (phaseIndex < PHASES.length - 1) {
            setPhaseIndex((p) => p + 1);
          }
          return Math.max(0, prev - 1000);
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [started, phaseIndex, phaseDurationMs]);

  // Ambience mute/unmute
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = !ambienceOn;
    if (ambienceOn) {
      audioRef.current.play().catch(() => {});
    }
  }, [ambienceOn]);

  // Progress across all phases
  const progress = useMemo(() => {
    const per = 100 / PHASES.length;
    const within = 1 - remaining / phaseDurationMs;
    return Math.min(100, phaseIndex * per + within * per);
  }, [phaseIndex, remaining, phaseDurationMs]);

  const min = Math.floor((remaining / 1000) / 60);
  const sec = Math.floor((remaining / 1000) % 60);
  const timeStr = `${min}:${sec.toString().padStart(2, "0")}`;

  return (
    <div
      style={{
        minHeight: "100vh",
        color: "white",
        position: "relative",
        backgroundImage:
          "linear-gradient(rgba(0,0,0,.40), rgba(0,0,0,.40)), url('https://plus.unsplash.com/premium_photo-1661954483883-edd65eac3577?q=80&w=3270&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Top-right controls */}
      <div style={{ position: "absolute", top: 16, right: 16, zIndex: 2, display: "flex", gap: 8 }}>
        <button className="pill" onClick={() => setAmbienceOn(v => !v)}>
          {ambienceOn ? "Mute Ambience" : "Unmute Ambience"}
        </button>
      </div>

      {/* Start screen with 3 options */}
      {!started && (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
          <div>
            <h1 className="title">Nervous System Reset</h1>
            <p className="subtitle">Science-backed meditation to stimulate the vagus nerve and help you relax.</p>

            <div className="options">
              <button className="option" onClick={() => startWithMinutes(5)}>5 Minutes</button>
              <button className="option" onClick={() => startWithMinutes(10)}>10 Minutes</button>
              <button className="option" onClick={() => startWithMinutes(15)}>15 Minutes</button>
            </div>

            <div className="hint" style={{ marginTop: 10 }}>
              Audio will start automatically on selection (browser may require this click).
            </div>
          </div>
        </div>
      )}

      {/* Session in progress */}
      {started && !isComplete && (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "80px 16px 24px", gap: 24 }}>
          {/* progress */}
          <div style={{ maxWidth: 960, width: "100%", margin: "0 auto" }}>
            <div className="bar">
              <div className="barFill" style={{ width: `${progress}%` }} />
            </div>
            <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div className="smallCaps">Phase {phaseIndex + 1} of {PHASES.length}</div>
                <div className="phaseTitle">{current.name}</div>
                <div className="phaseDesc">{current.description}</div>
              </div>
              <div className="timer">{timeStr}</div>
            </div>
          </div>

          {/* breathing circle */}
          <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
            <div style={{ position: "relative" }}>
              <div className="breathCircle" style={{ animation: `breath ${CYCLE_MS}ms infinite` }} />
              <div className="circleGlow" />
            </div>
          </div>

          {/* illustrations */}
          <div style={{ minHeight: 80, display: "grid", placeItems: "center" }}>
            {current.illo === "eyes" && <EyeRubSVG />}
            {current.illo === "ears" && <EarRubSVG />}
            {current.illo === "neck" && <NeckRubSVG />}
          </div>
        </div>
      )}

      {/* completion */}
      {isComplete && (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
          <div>
            <h2 className="title">How do you feel?</h2>
            <p className="subtitle" style={{ maxWidth: 640, margin: "12px auto 0" }}>
              Notice your breath, your heartbeat, and the ease across your face, ears, and neck.
            </p>
            <button
              className="cta"
              onClick={() => {
                setStarted(false);
                setPhaseIndex(0);
                setRemaining(60_000);
                try { audioRef.current?.pause(); audioRef.current!.currentTime = 0; } catch {}
              }}
            >
              Return to Start
            </button>
          </div>
        </div>
      )}

      {/* Minimal CSS */}
      <style>{`
        .title { font-size: clamp(28px, 5vw, 56px); font-weight: 800; letter-spacing: -0.02em; }
        .subtitle { margin-top: 10px; font-size: clamp(16px, 2.2vw, 22px); opacity: .9; }

        .options { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px; margin-top: 20px; }
        .option { padding: 12px 16px; border-radius: 14px; background: white; color: black; font-weight: 700; border: none; cursor: pointer; }
        .cta { margin-top: 24px; padding: 12px 24px; border-radius: 14px; background: white; color: black; font-weight: 700; border: none; cursor: pointer; }

        .pill { padding: 8px 14px; border-radius: 999px; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.2); color: white; cursor: pointer; }
        .hint { font-size: 12px; opacity: .75; margin-top: 6px; }

        .bar { height: 8px; width: 100%; background: rgba(255,255,255,.25); border-radius: 999px; overflow: hidden; }
        .barFill { height: 100%; background: rgba(255,255,255,.85); }

        .smallCaps { font-size: 11px; letter-spacing: .22em; text-transform: uppercase; opacity: .75; }
        .phaseTitle { font-size: 20px; font-weight: 700; margin-top: 2px; }
        .phaseDesc { font-size: 14px; opacity: .85; }
        .timer { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 28px; }

        .breathCircle {
          width: 220px; height: 220px; border-radius: 9999px;
          background: rgba(255,255,255,.20); backdrop-filter: blur(6px);
          will-change: transform;
        }
        .circleGlow { position:absolute; inset:-24px; border-radius:9999px; background: rgba(255,255,255,.10); filter: blur(20px); }

        /* 12s loop: 0–4s inhale (expand), 4–12s exhale (contract) */
        @keyframes breath {
          0% { transform: scale(1); animation-timing-function: cubic-bezier(.2,.8,.2,1); }
          33.333% { transform: scale(1.5); animation-timing-function: cubic-bezier(.4,0,.2,1); }
          100% { transform: scale(1); }
        }

        @media (max-width: 480px) {
          .options { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

/* ---------- Minimal SVGs ---------- */
function EyeRubSVG() {
  return (
    <svg width="88" height="56" viewBox="0 0 88 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="28" cy="28" rx="20" ry="12" stroke="white" strokeWidth="2" fill="rgba(255,255,255,.15)"/>
      <ellipse cx="60" cy="28" rx="20" ry="12" stroke="white" strokeWidth="2" fill="rgba(255,255,255,.15)"/>
      <circle cx="28" cy="28" r="4" fill="white"/><circle cx="60" cy="28" r="4" fill="white"/>
      <path d="M20 12c6-4 10-4 16 0" stroke="white" strokeWidth="2"/><polygon points="36,10 40,12 36,14" fill="white"/>
      <path d="M52 44c6 4 10 4 16 0" stroke="white" strokeWidth="2"/><polygon points="52,46 48,44 52,42" fill="white"/>
    </svg>
  );
}
function EarRubSVG() {
  return (
    <svg width="88" height="56" viewBox="0 0 88 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M36 16c0-6 4-10 10-10s12 6 12 14c0 8-6 10-8 16-1.5 3.8-2 8-8 8" stroke="white" strokeWidth="2"/>
      <path d="M28 20c2-4 6-6 10-6" stroke="white" strokeWidth="2"/>
      <circle cx="62" cy="20" r="4" fill="white"/><circle cx="68" cy="28" r="4" fill="white"/><circle cx="58" cy="34" r="4" fill="white"/>
    </svg>
  );
}
function NeckRubSVG() {
  return (
    <svg width="88" height="56" viewBox="0 0 88 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 14c10 10 14 10 22 10 4 0 8 2 10 6 2 4 2 8-2 12" stroke="white" strokeWidth="2"/>
      <path d="M34 18c2 4 2 8 0 12" stroke="white" strokeWidth="2"/>
      <circle cx="54" cy="26" r="3" fill="white"/><circle cx="50" cy="32" r="3" fill="white"/><circle cx="46" cy="38" r="3" fill="white"/>
    </svg>
  );
}
