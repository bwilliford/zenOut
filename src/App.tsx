import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

/* ---------- Config ---------- */
const INHALE_MS = 4000;   // 4s
const EXHALE_MS = 8000;   // 8s
const CYCLE_MS = INHALE_MS + EXHALE_MS; // 12s
const AMBIENCE_URL = new URL('./assets/birds.mp3', import.meta.url).toString();
const OM_URL = new URL('./assets/om.mp3', import.meta.url).toString();
const CHIME_URL = new URL('./assets/chime.mp3', import.meta.url).toString();
const BG_URL = new URL('./assets/bg.jpg', import.meta.url).toString();
const BREATHING_ILLUSTRATION_URL = new URL('./assets/illustration-breathing.png', import.meta.url).toString();
const OMS_ILLUSTRATION_URL = new URL('./assets/illustration-oms.png', import.meta.url).toString();
const EAR_MASSAGE_ILLUSTRATION_URL = new URL('./assets/illustration-ears.png', import.meta.url).toString();
const NECK_MASSAGE_ILLUSTRATION_URL = new URL('./assets/illustration-neck.png', import.meta.url).toString();
const EYE_MASSAGE_ILLUSTRATION_URL = new URL('./assets/illustration-eyes.png', import.meta.url).toString();
const VAGUS_ILLUSTRATION_URL = new URL('./assets/illustration-vagus.png', import.meta.url).toString();
const BIRDS_ILLUSTRATION_URL = new URL('./assets/illustration-birds.png', import.meta.url).toString();

const PHASE_ILLUSTRATION_URLS = [
  BREATHING_ILLUSTRATION_URL,
  OMS_ILLUSTRATION_URL,
  EAR_MASSAGE_ILLUSTRATION_URL,
  NECK_MASSAGE_ILLUSTRATION_URL,
  EYE_MASSAGE_ILLUSTRATION_URL,
];

type PhaseKey = "p1" | "p2" | "p3" | "p4" | "p5";
type Phase = { key: PhaseKey; name: string; description: string; illo?: "eyes" | "ears" | "neck" };

const PHASES: Phase[] = [
  { key: "p1", name: "Deep Breathing", description: "Inhale 4s · Exhale 8s. Follow the circle." },
  { key: "p2", name: "Oms (Humming Exhales)", description: "Now hum or 'om' during each exhale. Feel the vibration in your chest and neck." },
  { key: "p3", name: "Ear Massage", description: "Gently rub and stretch your ears.", illo: "ears" },
  { key: "p4", name: "Neck Massage", description: "Gently massage along the side of the neck below the ears.", illo: "neck" },
  { key: "p5", name: "Eye Massage", description: "Close your eyes and gently massage them with your fingertips.", illo: "eyes" }
  
];

/* ---------- BreathPrompt Component ---------- */
function BreathPrompt({ currentPhase, started }: { currentPhase: Phase; started: boolean }) {
  const [cycleTime, setCycleTime] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, []);

  // Start the breathing cycle 4 seconds after the phase begins (same as om timing)
  useEffect(() => {
    if (!started) {
      setCycleTime(null);
      return;
    }

    if (currentPhase.key === "p1") {
      // For phase 1, start immediately (no om sound)
      setCycleTime(Date.now());
      return;
    }

    // For phases 2-5, start the cycle 4 seconds after phase begins (when exhale starts)
    const startCycle = setTimeout(() => {
      setCycleTime(Date.now());
    }, 0);

    return () => {
      clearTimeout(startCycle);
      setCycleTime(null);
    };
  }, [started, currentPhase.key]);

  // If no cycle time is set (p1 or not started), show default text
  if (!cycleTime) {
    return (
      <span
        style={{
          fontSize: 24,
          fontWeight: 400,
          color: "white",
          opacity: 1,
          transition: "opacity 0.8s linear",
          letterSpacing: 0.5,
          position: "absolute",
          top: "calc(50% - 12px)",
          width: "100%",
          left: "0%",
          textAlign: "center",
        }}
        aria-live="polite"
      >
        breathe in...
      </span>
    );
  }

  // Calculate elapsed time in seconds from cycle start
  const elapsedSeconds = ((now - cycleTime) / 1000) % 12; // 12 second cycle
  const isIn = elapsedSeconds < 4; // First 4 seconds is inhale
  const text = isIn ? "breathe in..." : "breathe out...";

  // Simple fade out at the end of each phase
  // Improved fade: fade out over the last 1s of each inhale/exhale
  let opacity = 1;
  if (isIn) {
    // Fade out during last 1s of inhale (from 3s to 4s)
    if (elapsedSeconds > 3) {
      opacity = 1 * (1 - (elapsedSeconds - 3) / 1);
    }
  } else {
    // Fade out during last 1s of exhale (from 11s to 12s)
    if (elapsedSeconds > 11) {
      opacity = 1 * (1 - (elapsedSeconds - 11) / 1);
    }
  }
  opacity = Math.max(0, Math.min(0.6, opacity));

  return (
    <span
      style={{
        fontSize: 20,
        fontWeight: 400,
        color: "white",
        opacity: 1,
        transition: "opacity 0.8s linear",
        letterSpacing: 0.5,
        position: "absolute",
        top: "calc(50% - 12px)",
        width: "100%",
        left: "0%",
        textAlign: "center",
        zIndex: 999
      }}
      aria-live="polite"
    >
      {text}
    </span>
  );
}

export default function App() {
  const [started, setStarted] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseDurationMs, setPhaseDurationMs] = useState(60000); // default 60s per phase
  const [remaining, setRemaining] = useState(60000);
  const [ambienceOn, setAmbienceOn] = useState(true);
  const [learnExpanded, setLearnExpanded] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const omAudioRef = useRef<HTMLAudioElement | null>(null);
  const chimeAudioRef = useRef<HTMLAudioElement | null>(null);
  const phaseIndexRef = useRef(phaseIndex);
  const isTransitioningRef = useRef(false);
  const current = PHASES[phaseIndex];
  const isComplete = started && phaseIndex === PHASES.length - 1 && remaining === 0;

  // When session completes: stop ambience/OM and play chime as completion screen fades in
  useEffect(() => {
    if (isComplete) {
      // Stop ambience audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      // Stop OM audio
      if (omAudioRef.current) {
        omAudioRef.current.pause();
        omAudioRef.current.currentTime = 0;
      }
      // Play chime once when meditation ends (completion screen fades in)
      if (!chimeAudioRef.current) {
        chimeAudioRef.current = new Audio(CHIME_URL);
        chimeAudioRef.current.volume = 0.1;
      }
      chimeAudioRef.current.currentTime = 0;
      chimeAudioRef.current.play().catch(() => {});
    }
  }, [isComplete]);

  // Ensure ambience continues playing during the session
  useEffect(() => {
    if (started && !isComplete && audioRef.current) {
      // Make sure ambience is playing and not muted
      if (ambienceOn && audioRef.current.paused) {
        audioRef.current.play().catch(() => {
          // Ignore autoplay errors
        });
      }
    }
  }, [started, isComplete, ambienceOn]);

  // Update ref when phaseIndex changes
  useEffect(() => {
    phaseIndexRef.current = phaseIndex;
    isTransitioningRef.current = false;
  }, [phaseIndex]);




  // Play chime when phase changes
  useEffect(() => {
    if (!started) return;

    // Play chime sound when phase begins
    if (!chimeAudioRef.current) {
      chimeAudioRef.current = new Audio(CHIME_URL);
      chimeAudioRef.current.volume = 0.1;
    }

    const audio = chimeAudioRef.current;
    audio.currentTime = 0;
    audio.volume = 0.1;
    audio.play().catch(() => {
      // Ignore autoplay errors
    });
  }, [phaseIndex, started]);

  // OM sound effect for all phases after the first
  useEffect(() => {
    if (!started || current.key === "p1" || isComplete) return;

    let cycleStartTime = Date.now();
    let omInterval: number;

    const playOmForExhale = () => {
      // Play OM sound during the exhale phase (seconds 4-12 of each 12-second cycle)
      const playOm = () => {
        if (!omAudioRef.current) {
          omAudioRef.current = new Audio(OM_URL);
          omAudioRef.current.volume = 0.2;
        }

        const audio = omAudioRef.current;
        audio.currentTime = 0;
        audio.volume = 0.2;

        // Play the audio
        audio.play().catch(() => {
          // Ignore autoplay errors
        });

        // Fade out after 7 seconds (before the 8-second exhale ends)
        const fadeDuration = 1000; // 1 second fade
        const fadeStart = 7000; // start fade at 7 seconds

        // Clear any previous fade timers
        if ((audio as any)._fadeTimeout) {
          clearTimeout((audio as any)._fadeTimeout);
        }
        if ((audio as any)._fadeInterval) {
          clearInterval((audio as any)._fadeInterval);
        }

        (audio as any)._fadeTimeout = setTimeout(() => {
          const fadeSteps = 20;
          let step = 0;
          const initialVolume = 0.2;
          (audio as any)._fadeInterval = setInterval(() => {
            step++;
            audio.volume = Math.max(0, initialVolume * (1 - step / fadeSteps));
            if (step >= fadeSteps) {
              clearInterval((audio as any)._fadeInterval);
              audio.volume = 0;
              audio.pause();
              audio.currentTime = 0;
            }
          }, fadeDuration / fadeSteps);
        }, fadeStart);
      };

      // Play OM immediately for the current exhale phase
      playOm();

      // Set up interval to play OM every 12 seconds (full breathing cycle)
      omInterval = setInterval(playOm, 12000);
    };

    // Start the OM cycle after 4 seconds (when exhale begins)
    const startOmCycle = setTimeout(playOmForExhale, 4000);

    return () => {
      clearTimeout(startOmCycle);
      clearInterval(omInterval);
      if (omAudioRef.current) {
        omAudioRef.current.pause();
        omAudioRef.current.currentTime = 0;
      }
    };
  }, [started, current.key, isComplete]);

  // Start a session with chosen minutes → per-phase duration
  const startWithMinutes = async (minutes: 2 | 5 | 10) => {
    const perPhase =
      minutes === 2 ? 24_000 :
        minutes === 5 ? 60_000 :
          120_000; // 10 min

    setPhaseDurationMs(perPhase);
    setPhaseIndex(0);
    setRemaining(perPhase);
    setStarted(true);
    // Make the browser go fullscreen when session starts
    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }

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

  // Phase timer - stable version
  useEffect(() => {
    if (!started) return;
    
    console.log(`Timer started for phase ${phaseIndex + 1}, duration: ${phaseDurationMs}ms`);
    
    const id = setInterval(() => {
      setRemaining((prev) => {
        const currentPhase = phaseIndexRef.current;
        console.log(`Timer tick: remaining=${prev}, phaseIndex=${currentPhase}, phaseName=${PHASES[currentPhase].name}, isTransitioning=${isTransitioningRef.current}`);
        
        if (prev <= 1000 && !isTransitioningRef.current) {
          if (currentPhase < PHASES.length - 1) {
            const nextPhase = currentPhase + 1;
            console.log(`Phase ${currentPhase + 1} (${PHASES[currentPhase].name}) ending, moving to phase ${nextPhase + 1} (${PHASES[nextPhase].name})`);
            isTransitioningRef.current = true;
            setPhaseIndex(p => p + 1);
          }
          return Math.max(0, prev - 1000);
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [started, phaseDurationMs]); // Removed phaseIndex from dependencies

  // Reset remaining time when phase changes
  useEffect(() => {
    if (started) {
      console.log(`Phase changed to ${phaseIndex + 1}: ${PHASES[phaseIndex].name}, resetting timer to ${phaseDurationMs}ms`);
      setRemaining(phaseDurationMs);
    }
  }, [phaseIndex, started, phaseDurationMs]);

  // Remove the duplicate logging effect that was causing double execution

  // Ambience mute/unmute
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = !ambienceOn;
    if (ambienceOn && started && !isComplete) {
      audioRef.current.play().catch(() => { });
    }
  }, [ambienceOn, started, isComplete]);

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
      className="background-fade"
      style={{
        height: "100vh",
        width: "100vw",
        color: "white",
        position: "relative",
        overflow: "hidden",
        backgroundImage:
          `linear-gradient(rgba(0,0,0,.30), rgba(0,0,0,.3)), url('${BG_URL}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >

          <div style={{ position: "absolute", top: 24, right: 24, zIndex: 2, display: "flex", gap: 8 }}>
            <button
              className="pill"
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen?.();
                } else {
                  document.exitFullscreen?.();
                }
              }}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
              aria-label="Toggle Fullscreen"
            >
              {/* Fullscreen Icon */}
              {document.fullscreenElement ? (
                // Exit Fullscreen (contract)
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ marginRight: 4 }} xmlns="http://www.w3.org/2000/svg">
                  {/* Top-left arrow pointing inwards (rotated 180deg, now bottom-right) */}
                  {/* Top-left arrow pointing inwards (rotated 180deg, now bottom-right) */}
                  <g>
                    <g transform="rotate(180 6.5 6.5)">
                      <path d="M4 7V4H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="4,4 9,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </g>
                    {/* Bottom-right arrow pointing inwards (rotated 180deg, now top-left) */}
                    <g transform="rotate(180 14.5 14.5)">
                      <path d="M16 13V16H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="16,16 11,11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </g>
                  </g>
                </svg>
              ) : (
                // Enter Fullscreen (expand)
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ marginRight: 0 }} xmlns="http://www.w3.org/2000/svg">
                  {/* Top-left arrow */}
                  <path d="M8 8L4 4M4 4H8M4 4V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  {/* Bottom-right arrow */}
                  <path d="M12 12L16 16M16 16H12M16 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
            
          </div>



      {/* Start screen with 3 options */}
      {!started && (
        <div className={`start-screen ${learnExpanded ? "learn-expanded" : ""}`} style={{ height: "100vh", display: "grid", placeItems: "center", textAlign: "center", padding: 24, overflow: "hidden" }}>
          <div className={`learn-container ${learnExpanded ? "expanded" : ""}`}>
            <div
              className="pill learn-button"
              role="button"
              tabIndex={0}
              aria-label="Learn"
              onClick={() => setLearnExpanded(true)}
              onKeyDown={(e) => e.key === "Enter" && setLearnExpanded(true)}
            >
              <span className="learn-text">Learn</span>
              <button
                type="button"
                className="learn-close-x"
                aria-label="Close"
                onClick={(e) => {
                  e.stopPropagation();
                  setLearnExpanded(false);
                }}
              >
                ×
              </button>
              <div className="learn-content" onClick={(e) => e.stopPropagation()}>
                
                <img className="learn-illustration" src={VAGUS_ILLUSTRATION_URL} alt="The Vagus Nerve" />
                  <h2>What is the Vagus Nerve?</h2>
                  <p>
                  The vagus nerve is the main nerve of the <i>parasympathetic</i> nervous system—the branch responsible for “rest and digest.” It runs from the brainstem down through the neck into the heart, lungs, and digestive organs, constantly relaying information between the body and brain. When vagal activity increases (often measured by heart rate variability), heart rate slows, breathing becomes more efficient, digestion improves, and stress hormones decrease.</p>
                  <p>Stimulating the vagus nerve essentially shifts the body out of a defensive, sympathetic state (“fight or flight”) into a calm, regulated state associated with safety, recovery, and emotional balance.</p>
                <div className="learn-spacer" />
                
                <h2>Proven Techniques to Stimulate the Vagus Nerve</h2>

                <div className="learn-card">                
                  <img className="learn-illustration" src={BREATHING_ILLUSTRATION_URL} alt="Deep breathing" />
                  <h3>Deep breathing</h3>
                  <p>Slow diaphragmatic breathing—especially at ~5-6 breaths per minute—stimulates vagal afferents via lung stretch receptors and increases heart rate variability (HRV), a marker of parasympathetic (vagal) tone. This shifts the autonomic balance away from sympathetic “fight-or-flight” toward “rest-and-digest,” lowering heart rate and perceived stress. Clinical studies show paced breathing improves vagal tone and emotional regulation (e.g., Lehrer et al., 2020; Brown & Gerbarg, 2005).</p>

                  <p>ZenOut primarily utilizes extended-exhale breathing (4 seconds in, 8 seconds out, for a total of 5 breaths per minute) which can be powerful for stimulating the vagus nerve and having a sedative effect. The vagus nerve exerts stronger influence on the heart during exhalation, so deliberately slowing and especially lengthening the exhale increases vagal tone, lowers heart rate, and shifts the autonomic balance toward parasympathetic dominance.</p>
                </div>

                <div className="learn-card">
                  <img className="learn-illustration" src={OMS_ILLUSTRATION_URL} alt="Oms / Humming" />
                  <h3>Humming / “Om” chanting</h3>
                  <p>Humming and vocal toning activate the vagus nerve through vibration of the vocal cords and stimulation of the auricular and laryngeal branches. Chanting “Om” has been shown in fMRI studies to reduce activity in limbic structures associated with stress, suggesting parasympathetic engagement (Kalyani et al., 2011). The prolonged exhale during humming further enhances vagal activation via respiratory sinus arrhythmia.</p>
                </div>

                <div className="learn-card">
                  <img className="learn-illustration" src={EAR_MASSAGE_ILLUSTRATION_URL} alt="Rubbing ears" />
                  <h3>Rubbing ears</h3>
                  <p>The outer ear contains branches of the auricular vagus nerve (Arnold’s nerve). Gentle stimulation of this area can activate vagal pathways; this is the same anatomical basis used in transcutaneous auricular vagus nerve stimulation (taVNS), which has documented calming and anti-inflammatory effects (Badran et al., 2018). Light ear massage may therefore modestly increase parasympathetic tone.</p>
                </div>

                <div className="learn-card">
                  <img className="learn-illustration" src={NECK_MASSAGE_ILLUSTRATION_URL} alt="Rubbing the sides of the neck" />
                  <h3>Rubbing the sides of the neck</h3>
                  <p>The vagus nerve runs within the carotid sheath along the sides of the neck. Gentle massage in this area may indirectly influence parasympathetic activity by stimulating baroreceptors in the carotid sinus, which help regulate blood pressure and heart rate. Activation of this reflex arc increases vagal output and can slow heart rate, promoting relaxation. </p>
                  <p><b>Note:</b> Pressure should always be gentle to avoid dizziness.</p>
                </div>
                
                <div className="learn-card">
                  <img className="learn-illustration" src={EYE_MASSAGE_ILLUSTRATION_URL} alt="Gently massaging the eyes" />
                  <h3>Gently massaging the eyes</h3>
                  <p>Light pressure over closed eyelids can trigger the oculocardiac reflex, mediated by the trigeminal nerve and vagus nerve. This reflex can slow heart rate and increase parasympathetic tone. While typically discussed in surgical contexts, mild, gentle stimulation may produce subtle calming effects through this same vagal pathway.</p>
                </div>

                <div className="learn-card">
                  <img className="learn-illustration" src={BIRDS_ILLUSTRATION_URL} alt="Nature sounds (e.g., birdsong)" />
                  <h3>Nature sounds (e.g., birdsong)</h3>
                  <p>Listening to natural soundscapes has been shown to reduce sympathetic arousal and enhance parasympathetic activity. Studies measuring HRV and cortisol suggest that exposure to nature sounds increases vagal tone and decreases stress markers (e.g., Annerstedt et al., 2013; Alvarsson et al., 2010). Auditory processing linked with safety cues may signal the nervous system that the environment is non-threatening, facilitating vagal dominance.</p>
                </div>

                <div className="learn-card">
                  <h3>Combining/Stacking Techniques</h3>
                  <p>Stacking vagal practices—such as slow diaphragmatic breathing, extended exhales, humming, gentle auricular (ear) stimulation, and calming auditory input like nature sounds—may amplify parasympathetic activation because they engage overlapping but distinct vagal pathways simultaneously (respiratory, laryngeal, auricular, and cardioinhibitory branches).</p> <p>Because these inputs converge on brainstem nuclei like the nucleus tractus solitarius, combining them may produce additive or synergistic effects—reinforcing safety signaling, increasing vagal tone, and accelerating the transition from sympathetic arousal to a regulated, calm state.</p>
                </div>
          </div>
        </div>
        </div>

          <div>
            <h1 className="title">
              <span style={{ fontWeight: 500 }}>Zen</span>Out
            </h1>
            <p className="subtitle">A science-backed meditation to stimulate the vagus nerve and help you relax</p>

            <div className="options">
              <button className="option" onClick={() => startWithMinutes(2)}>2 Minutes</button>
              <button className="option" onClick={() => startWithMinutes(5)}>5 Minutes</button>
              <button className="option" onClick={() => startWithMinutes(10)}>10 Minutes</button>
            </div>
          </div>

          <div className="created">
            Created with
            <span style={{ fontFamily: "monospace", margin: "0 4px" }} aria-label="heart" role="img">&#9829;</span>by <a href="https://www.blakewilliford.com" target="_blank" style={{ fontWeight: "bold", color: "white", pointerEvents: "auto" }}>Blake Williford</a>
          </div>

          <div className="coffee">
            Enjoying? Buy me a{" "}
            <a
              href="https://ko-fi.com/blakewilliford"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontWeight: "bold", color: "white" }}
            >
              coffee
            </a>
          </div>
        </div>
      )}

      {/* Session in progress */}
      {started && !isComplete && (

        <div className="session-screen" style={{ height: "100vh", display: "flex", flexDirection: "column", padding: "30px 16px 24px", gap: 24, overflow: "hidden" }}>

          {/* Top-right controls */}
          <div style={{ position: "absolute", bottom: 24, right: 24, zIndex: 2, display: "flex", gap: 8 }}>
            <button className="pill" onClick={() => setAmbienceOn(v => !v)} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "flex", alignItems: "center" }}>
                {ambienceOn ? (
                  // Mute icon (crossed speaker)
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ marginRight: 4 }} xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 7V13H7L12 18V2L7 7H3Z" fill="currentColor" fillOpacity="0.7" />
                    <line x1="15" y1="7" x2="19" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="19" y1="7" x2="15" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ) : (
                  // Unmute icon (speaker)
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ marginRight: 4 }} xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 7V13H7L12 18V2L7 7H3Z" fill="currentColor" fillOpacity="0.7" />
                    <path d="M15 10C15 8.34315 13.6569 7 12 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M15 10C15 11.6569 13.6569 13 12 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </span>
              {ambienceOn ? "" : ""}
            </button>
          </div>

          <div style={{ position: "absolute", top: 24, left: 24, zIndex: 2 }}>
            <button
              className="pill"
              onClick={() => {
                setStarted(false);
                setPhaseIndex(0);
                setRemaining(60_000);
                try { audioRef.current?.pause(); audioRef.current!.currentTime = 0; } catch { }
              }}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
              aria-label="Back"
            >
              {/* Chevron Left Icon */}
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ marginRight: 4 }} xmlns="http://www.w3.org/2000/svg">
                <path d="M13 16L7 10L13 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* progress */}
          <div style={{ maxWidth: 960, width: "60%", margin: "9px auto 0 auto" }}>
            <div className="bar">
              <div className="barFill" style={{ width: `${progress}%` }} />
            </div>

            
          </div> 

          <div>
              <div>
                <img
                  className="phase-illustration"
                  src={PHASE_ILLUSTRATION_URLS[phaseIndex]}
                  alt=""
                  aria-hidden
                />
                <div className="smallCaps">Phase {phaseIndex + 1} of {PHASES.length}</div>
                <div className="phaseTitle">{current.name}</div>
                <div className="phaseDesc">{current.description}</div>
              </div>
              {/* <div className="timer">{timeStr}</div> */}
            </div>

            

          {/* breathing circle */}
          <div style={{ marginTop: "40px", display: "grid", placeItems: "center" }}>
            <div style={{ position: "relative" }}>
              <div className="breathCircle" style={{ animation: `breath ${CYCLE_MS}ms infinite` }}>
              </div>
              <div className="circleGlow" />
              <div className="breathText"><BreathPrompt currentPhase={current} started={started} /></div>

            </div>
          </div>
          
          {/* illustrations */}
          <div style={{ minHeight: 80, display: "grid", placeItems: "center" }}>
            {current.illo === "eyes" && <EyeRubSVG />}
            {current.illo === "ears" && <EarRubSVG />}
            {current.illo === "neck" && <NeckRubSVG />}
          </div>

          {/* Animated rain droplets background */}
          <div className="rain-bg" aria-hidden="true">
            {Array.from({ length: 64 }).map((_, i) => {
              // Randomize left, delay, duration, size, and opacity for each droplet
              const left = Math.random() * 100;
              const delay = Math.random() * 3;
              const duration = 1.8 + Math.random() * 1.8;
              const size = 8 + Math.random() * 10;
              const opacity = 0.3 + Math.random() * 0.5;
              return (
                <div
                  key={i}
                  className="rain-drop"
                  style={{
                    left: `${left}%`,
                    animationDelay: `${delay}s`,
                    animationDuration: `${duration}s`,
                    width: `${size}px`,
                    height: `${size * 2.2}px`,
                    opacity,
                  }}
                />
              );
            })}
          </div>
        </div>
      )}


      {/* completion */}
      {isComplete && (
        <div className="completion-screen" style={{ height: "100vh", display: "grid", placeItems: "center", textAlign: "center", padding: 24, overflow: "hidden" }}>
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
                try { audioRef.current?.pause(); audioRef.current!.currentTime = 0; } catch { }
              }}
            >
              Return to Start
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

/* ---------- Minimal SVGs ---------- */
function EyeRubSVG() {
  return (
    <svg width="88" height="56" viewBox="0 0 88 56" fill="none" xmlns="http://www.w3.org/2000/svg">

    </svg>
  );
}
function EarRubSVG() {
  return (
    <svg width="88" height="56" viewBox="0 0 88 56" fill="none" xmlns="http://www.w3.org/2000/svg">
 
    </svg>
  );
}
function NeckRubSVG() {
  return (
    <svg width="88" height="56" viewBox="0 0 88 56" fill="none" xmlns="http://www.w3.org/2000/svg">

    </svg>
  );
}
