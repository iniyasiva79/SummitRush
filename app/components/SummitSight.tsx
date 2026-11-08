"use client";

import { useEffect, useId, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import styles from "./SummitSight.module.css";

type Method = "webcam" | "alternative";
type Phase = "intro" | "calibrate" | "play" | "success" | "fail";

type Gaze = { x: number; y: number; at: number };

type WebGazerApi = {
  begin: () => Promise<unknown>;
  end: () => void | Promise<unknown>;
  saveDataAcrossSessions: (save: boolean) => WebGazerApi;
  setGazeListener: (listener: (data: { x: number; y: number } | null) => void) => WebGazerApi;
  clearGazeListener: () => WebGazerApi;
  showVideoPreview: (show: boolean) => WebGazerApi;
  showPredictionPoints: (show: boolean) => WebGazerApi;
  recordScreenPosition: (x: number, y: number, eventType: string) => void;
  removeMouseEventListeners: () => WebGazerApi;
  stopVideo?: () => void;
};

declare global {
  interface Window {
    webgazer?: WebGazerApi;
  }
}

type SummitSightProps = {
  summitSightEnabled: boolean;
  alreadyRewarded: boolean;
  onSuccess: () => void;
  onSkip: () => void;
  onResume: () => void;
};

const HOLD_MS = 700;
const WINDOW_MS = 5000;
const TOLERANCE_PX = 84;
const SCRIPT_URL = "https://cdn.jsdelivr.net/npm/webgazer@3.5.3/dist/webgazer.min.js";
const POINTS = [
  { id: "nw", label: "upper left" },
  { id: "n", label: "top" },
  { id: "ne", label: "upper right" },
  { id: "w", label: "left" },
  { id: "c", label: "center" },
  { id: "e", label: "right" },
  { id: "sw", label: "lower left" },
  { id: "s", label: "bottom" },
  { id: "se", label: "lower right" },
];

let sessionCalibrated = false;
let scriptPromise: Promise<void> | null = null;

export function SummitSight({
  summitSightEnabled,
  alreadyRewarded,
  onSuccess,
  onSkip,
  onResume,
}: SummitSightProps) {
  const titleId = useId();
  const circleRef = useRef<HTMLButtonElement>(null);
  const gazeRef = useRef<Gaze | null>(null);
  const pointerRef = useRef(false);
  const keyRef = useRef(false);
  const startedRef = useRef(0);
  const paidRef = useRef(alreadyRewarded);
  const [phase, setPhase] = useState<Phase>(alreadyRewarded ? "success" : "intro");
  const [method, setMethod] = useState<Method>("alternative");
  const [cameraError, setCameraError] = useState("");
  const [startingCamera, setStartingCamera] = useState(false);
  const [samples, setSamples] = useState(0);
  const [calibratedCount, setCalibratedCount] = useState(0);
  const [circleIndex, setCircleIndex] = useState(0);
  const [done, setDone] = useState([false, false, false]);
  const [secondsLeft, setSecondsLeft] = useState(15);
  const doneRef = useRef([false, false, false]);
  const onSuccessRef = useRef(onSuccess);
  const [runId, setRunId] = useState(0);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, []);

  useEffect(() => {
    if (phase !== "play") {
      return;
    }
    startedRef.current = Date.now();
    const hold = [0, 0, 0];
    const missAt = [0, 0, 0];
    let frame = 0;
    let previousIndex = 0;
    let previous = Date.now();

    const step = () => {
      const now = Date.now();
      const elapsed = now - startedRef.current;
      const index = Math.min(2, Math.floor(elapsed / WINDOW_MS));
      if (index !== previousIndex) {
        hold[index] = 0;
        missAt[index] = 0;
        previousIndex = index;
      }
      setCircleIndex(index);
      setSecondsLeft(Math.max(0, Math.ceil((15000 - elapsed) / 1000)));
      const circle = circleRef.current;
      if (circle && !doneRef.current[index] && elapsed < 15000) {
        const rect = circle.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const gaze = gazeRef.current;
        const gazeHit =
          method === "webcam" &&
          gaze != null &&
          now - gaze.at < 500 &&
          Math.hypot(gaze.x - centerX, gaze.y - centerY) <= TOLERANCE_PX;
        const alternativeHit =
          method === "alternative" && (pointerRef.current || (keyRef.current && document.activeElement === circle));
        const hit = method === "webcam" ? gazeHit : alternativeHit;
        const delta = Math.min(250, Math.max(0, now - previous));
        if (hit) {
          missAt[index] = 0;
          hold[index] += delta;
          if (hold[index] >= HOLD_MS) {
            doneRef.current[index] = true;
            setDone([...doneRef.current]);
          }
        } else if (!doneRef.current[index]) {
          if (missAt[index] === 0) {
            missAt[index] = now;
          } else if (now - missAt[index] > 300) {
            hold[index] = 0;
          }
        }
      }
      previous = now;
      if (elapsed >= 15000) {
        const success = doneRef.current.every(Boolean);
        setPhase(success ? "success" : "fail");
        if (success && !paidRef.current) {
          paidRef.current = true;
          onSuccessRef.current();
        }
        return;
      }
      frame = window.requestAnimationFrame(step);
    };
    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [method, phase, runId]);

  useEffect(() => {
    if (phase !== "play") {
      return;
    }
    circleRef.current?.focus();
  }, [circleIndex, phase]);

  async function startWebcam() {
    setCameraError("");
    setStartingCamera(true);
    setMethod("webcam");
    try {
      await loadWebGazer();
      const gazer = window.webgazer;
      if (!gazer) {
        throw new Error("WebGazer did not start.");
      }
      gazer.saveDataAcrossSessions(false);
      gazer.showVideoPreview(true);
      gazer.showPredictionPoints(true);
      gazer.setGazeListener((data) => {
        if (!data || !Number.isFinite(data.x) || !Number.isFinite(data.y)) {
          return;
        }
        gazeRef.current = { x: data.x, y: data.y, at: Date.now() };
        setSamples((count) => (count > 9999 ? count : count + 1));
      });
      await Promise.race([
        gazer.begin(),
        new Promise((_, reject) => {
          window.setTimeout(() => reject(new Error("camera timeout")), 8000);
        }),
      ]);
      placePreview();
      setStartingCamera(false);
      if (sessionCalibrated) {
        gazer.removeMouseEventListeners();
        beginChallenge("webcam");
      } else {
        setCalibratedCount(0);
        setPhase("calibrate");
      }
    } catch {
      await stopCamera();
      setStartingCamera(false);
      setMethod("alternative");
      setCameraError(
        "Webcam gaze tracking did not start. The camera may be missing, blocked, or WebGazer could not load. No gaze result was counted.",
      );
      setPhase("intro");
    }
  }

  function calibrate(event: ReactMouseEvent<HTMLButtonElement>, index: number) {
    const rect = event.currentTarget.getBoundingClientRect();
    window.webgazer?.recordScreenPosition(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      "click",
    );
    const next = index + 1;
    setCalibratedCount(next);
    if (next >= POINTS.length) {
      sessionCalibrated = true;
      window.webgazer?.removeMouseEventListeners();
      beginChallenge("webcam");
    }
  }

  function beginChallenge(nextMethod: Method) {
    doneRef.current = [false, false, false];
    setDone([false, false, false]);
    setCircleIndex(0);
    setSecondsLeft(15);
    setMethod(nextMethod);
    pointerRef.current = false;
    keyRef.current = false;
    setRunId((value) => value + 1);
    setPhase("play");
  }

  const circleClass =
    circleIndex === 0 ? styles.left : circleIndex === 1 ? styles.upper : styles.right;

  return (
    <div className={styles.backdrop} role="presentation">
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <p className={styles.kicker}>SummitSight — focus checkpoint</p>
        <h2 id={titleId}>A short visual break</h2>
        <p className={styles.note}>
          This is an interactive visual break. It does not measure alertness, concentration, productivity, or eye health. The camera stays off unless you choose webcam tracking, and video is not recorded or uploaded.
        </p>
        {startingCamera ? <p>Requesting the camera. Nothing is counted until gaze samples arrive.</p> : null}
        {cameraError ? <p className={styles.error}>{cameraError}</p> : null}

        {phase === "intro" ? (
          <div className={styles.stack}>
            <p>
              {summitSightEnabled
                ? "The work timer is paused. Follow three glowing circles, one at a time, for 15 seconds."
                : "SummitSight is off for this task. You can skip this checkpoint with no coin reward, or play the break anyway."}
            </p>
            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={() => void startWebcam()}>
                Use webcam gaze tracking
              </button>
              <button type="button" className={styles.secondary} onClick={() => beginChallenge("alternative")}>
                Use mouse, touch, or keyboard
              </button>
              <button type="button" className={styles.secondary} onClick={onSkip}>
                Skip without reward
              </button>
            </div>
          </div>
        ) : null}

        {phase === "calibrate" ? (
          <div className={styles.stack}>
            <p>
              Look at each dot and click it. Calibration point {Math.min(calibratedCount + 1, 9)} of 9. This only tunes the estimate for this browser session.
            </p>
            <div className={styles.grid}>
              {POINTS.map((point, index) => (
                <button
                  key={point.id}
                  type="button"
                  className={styles.dot}
                  disabled={index !== calibratedCount}
                  onClick={(event) => calibrate(event, index)}
                >
                  <span className={styles.srOnly}>{point.label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => {
                void stopCamera();
                setPhase("intro");
              }}
            >
              Cancel webcam tracking
            </button>
          </div>
        ) : null}

        {phase === "play" ? (
          <div className={styles.stack}>
            <p className={styles.method}>
              Tracking method: {method === "webcam" ? "webcam gaze estimate" : "mouse, touch, or keyboard"}.
              {method === "webcam" ? ` Gaze samples received: ${samples}.` : " Hold the pointer on the circle, or focus it and hold Space or Enter."}
            </p>
            <p>{secondsLeft} seconds left. A circle counts only after it is followed. A window ending does not count as a success.</p>
            <div className={styles.field}>
              <button
                ref={circleRef}
                type="button"
                className={`${styles.circle} ${circleClass}`}
                aria-label={`Circle ${circleIndex + 1}`}
                onPointerEnter={() => {
                  pointerRef.current = true;
                }}
                onPointerLeave={() => {
                  pointerRef.current = false;
                }}
                onPointerDown={() => {
                  pointerRef.current = true;
                }}
                onPointerUp={() => {
                  pointerRef.current = false;
                }}
                onKeyDown={(event) => {
                  if (event.key === " " || event.key === "Enter") {
                    event.preventDefault();
                    keyRef.current = true;
                  }
                }}
                onKeyUp={(event) => {
                  if (event.key === " " || event.key === "Enter") {
                    keyRef.current = false;
                  }
                }}
              >
                {done[circleIndex] ? <span className={styles.check}>✓</span> : circleIndex + 1}
              </button>
            </div>
            <CircleStatus done={done} />
          </div>
        ) : null}

        {phase === "success" ? (
          <div className={styles.stack}>
            <p className={styles.success}>CHECKPOINT COMPLETE!</p>
            <p className={styles.flag} aria-hidden="true">⚑</p>
            <p>10 Summit Coins have been added once for this checkpoint. The work timer resumes when you continue.</p>
            <CircleStatus done={alreadyRewarded ? [true, true, true] : done} />
            <button type="button" className={styles.primary} onClick={onResume}>
              Resume climb
            </button>
          </div>
        ) : null}

        {phase === "fail" ? (
          <div className={styles.stack}>
            <p className={styles.fail}>Checkpoint Not Completed</p>
            <CircleStatus done={done} />
            <p>No Summit Coins were deducted, and this checkpoint has not been paid.</p>
            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={() => beginChallenge(method)}>
                Retry
              </button>
              <button type="button" className={styles.secondary} onClick={onSkip}>
                Skip
              </button>
              {method === "webcam" ? (
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => {
                    void stopCamera();
                    beginChallenge("alternative");
                  }}
                >
                  Use alternative activity
                </button>
              ) : (
                <button type="button" className={styles.secondary} onClick={() => void startWebcam()}>
                  Try webcam tracking
                </button>
              )}
              <button
                type="button"
                className={styles.secondary}
                onClick={() => {
                  sessionCalibrated = false;
                  void startWebcam();
                }}
              >
                Recalibrate webcam
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function CircleStatus({ done }: { done: boolean[] }) {
  const places = ["Left circle", "Upper-middle circle", "Right circle"];
  return (
    <ul className={styles.status}>
      {places.map((place, index) => (
        <li key={place}>
          {place}: {done[index] ? "tracked" : "not tracked"}
        </li>
      ))}
    </ul>
  );
}

function loadWebGazer() {
  if (window.webgazer) {
    return Promise.resolve();
  }
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("WebGazer failed to load"));
      };
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

async function stopCamera() {
  const gazer = window.webgazer;
  try {
    gazer?.clearGazeListener();
    gazer?.stopVideo?.();
    await gazer?.end();
  } catch {
    // The camera may already be stopped.
  }
  document.getElementById("webgazerVideoContainer")?.remove();
  document.getElementById("webgazerVideoFeed")?.remove();
  document.getElementById("webgazerFaceFeedbackBox")?.remove();
}

function placePreview() {
  const box = document.getElementById("webgazerVideoContainer");
  if (!box) {
    return;
  }
  box.style.position = "fixed";
  box.style.left = "12px";
  box.style.bottom = "12px";
  box.style.zIndex = "90";
  box.style.width = "160px";
  box.style.height = "auto";
}
