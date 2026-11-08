"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useActiveAccount } from "../lib/accounts";
import { trailPath, trailPoint } from "../lib/gameplay";
import { MOUNTAINS } from "../lib/mountains";
import type { PublicRoom } from "../lib/multiplayer";
import { clearRoomSession, fetchRoom, roomAction } from "../lib/room-client";
import { AvatarFigure } from "./AvatarFigure";
import { GameButton } from "./GameButton";
import { GameCard } from "./GameCard";
import { ScreenFrame } from "./ScreenFrame";
import { SummitBar } from "./SummitBar";
import climb from "./ClimbScreen.module.css";
import form from "./AuthForm.module.css";
import styles from "./RoomSession.module.css";

type RoomSessionProps = {
  code: string;
  autoJoin?: boolean;
};

const CONFETTI = [
  { x: "6%", rest: "18%", delay: "0ms", color: "#f2c14e", tilt: "-18deg" },
  { x: "14%", rest: "42%", delay: "80ms", color: "#3caf62", tilt: "24deg" },
  { x: "22%", rest: "28%", delay: "40ms", color: "#ffffff", tilt: "12deg" },
  { x: "31%", rest: "54%", delay: "140ms", color: "#2478a3", tilt: "-28deg" },
  { x: "39%", rest: "22%", delay: "20ms", color: "#e07a3d", tilt: "16deg" },
  { x: "47%", rest: "48%", delay: "110ms", color: "#f2c14e", tilt: "-8deg" },
  { x: "55%", rest: "30%", delay: "60ms", color: "#d4537e", tilt: "30deg" },
  { x: "63%", rest: "58%", delay: "160ms", color: "#3caf62", tilt: "-20deg" },
  { x: "71%", rest: "24%", delay: "30ms", color: "#ffffff", tilt: "8deg" },
  { x: "78%", rest: "46%", delay: "120ms", color: "#2478a3", tilt: "-14deg" },
  { x: "86%", rest: "34%", delay: "70ms", color: "#f2c14e", tilt: "22deg" },
  { x: "93%", rest: "52%", delay: "150ms", color: "#e07a3d", tilt: "-26deg" },
  { x: "11%", rest: "64%", delay: "180ms", color: "#d4537e", tilt: "10deg" },
  { x: "27%", rest: "70%", delay: "90ms", color: "#3caf62", tilt: "-16deg" },
  { x: "44%", rest: "66%", delay: "200ms", color: "#ffffff", tilt: "18deg" },
  { x: "61%", rest: "72%", delay: "50ms", color: "#f2c14e", tilt: "-6deg" },
  { x: "76%", rest: "62%", delay: "170ms", color: "#2478a3", tilt: "26deg" },
  { x: "89%", rest: "68%", delay: "100ms", color: "#e07a3d", tilt: "-22deg" },
];

const SUMMIT_KEY_PREFIX = "summitrush.summit.";
const animatedThisTab = new Map<string, Set<string>>();

function summitStorageKey(code: string) {
  return `${SUMMIT_KEY_PREFIX}${code}`;
}

function readCelebratedIds(code: string) {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(summitStorageKey(code)) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeCelebratedIds(code: string, ids: string[]) {
  sessionStorage.setItem(summitStorageKey(code), JSON.stringify(ids));
}

function shouldPlaySummitAnimation(code: string, ids: string[]) {
  if (ids.length === 0) {
    return false;
  }
  const tab = animatedThisTab.get(code) ?? new Set<string>();
  const stored = readCelebratedIds(code);
  const unseen = ids.filter((id) => !stored.includes(id));
  if (unseen.length > 0) {
    for (const id of unseen) {
      tab.add(id);
    }
    animatedThisTab.set(code, tab);
    writeCelebratedIds(code, [...new Set([...stored, ...ids])]);
    return true;
  }
  return ids.some((id) => tab.has(id));
}

export function RoomSession({ code, autoJoin = false }: RoomSessionProps) {
  const account = useActiveAccount();
  const router = useRouter();
  const titleId = useId();
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [notice, setNotice] = useState("");
  const [taskName, setTaskName] = useState("");
  const [minutes, setMinutes] = useState(25);
  const [wagers, setWagers] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function pull(forceJoin: boolean) {
      if (!account) {
        return;
      }
      let result = forceJoin
        ? await roomAction(code, account, "join")
        : await fetchRoom(code, account);
      if (result.ok && !result.room.you) {
        result = await roomAction(code, account, "join");
      }
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setNotice(result.error);
        return;
      }
      setRoom(result.room);
      setNotice("");
    }
    void pull(autoJoin);
    const id = window.setInterval(() => {
      void (async () => {
        if (!account) {
          return;
        }
        const result = await roomAction(code, account, "heartbeat");
        if (!cancelled && result.ok) {
          setRoom(result.room);
        }
      })();
    }, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [account, autoJoin, code]);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (!account) {
      return;
    }
    const result = await roomAction(code, account, action, extra);
    if (!result.ok) {
      setNotice(result.error);
      return;
    }
    setRoom(result.room);
    setNotice("");
  }

  if (!account) {
    return (
      <ScreenFrame>
        <SummitBar />
        <main className={styles.main}>
          <GameCard title="Private room">
            <p>Log in before joining a Summit Showdown.</p>
            <GameButton href="/login">Log in</GameButton>
          </GameCard>
        </main>
      </ScreenFrame>
    );
  }

  if (!room) {
    return (
      <ScreenFrame>
        <SummitBar />
        <main className={styles.main}>
          <GameCard title="Private room">
            <p>{notice || "Opening the lobby…"}</p>
            <GameButton href="/room">Back to rooms</GameButton>
          </GameCard>
        </main>
      </ScreenFrame>
    );
  }

  const you = room.you;
  const invite = `${typeof window !== "undefined" ? window.location.origin : ""}${room.invitePath}`;
  const others = room.members.filter((item) => !item.you && !item.left);
  const showWagers = Boolean(
    you && you.status === "ready" && !you.wagersLocked && others.length > 0,
  );
  const canStartTask = Boolean(
    you?.status === "ready" && (you.wagersLocked || others.length === 0),
  );

  return (
    <ScreenFrame>
      <SummitBar />
      <main className={styles.main}>
        {notice ? <p className={styles.notice} role="alert">{notice}</p> : null}
        {room.phase === "lobby" ? (
          <Lobby
            room={room}
            invite={invite}
            copied={copied}
            isHost={Boolean(you?.isHost)}
            onCopy={async () => {
              await navigator.clipboard.writeText(invite);
              setCopied(true);
            }}
            onReady={() => act("ready", { ready: !you?.ready })}
            onStart={() => act("start")}
            onLeave={async () => {
              await act("leave");
              clearRoomSession(room.code);
              router.push("/room");
            }}
            onConfigure={(partial) => act("configure", partial)}
          />
        ) : (
          <Climb
            room={room}
            titleId={titleId}
            taskName={taskName}
            minutes={minutes}
            wagers={wagers}
            showWagers={showWagers}
            canStartTask={Boolean(canStartTask)}
            onTaskName={setTaskName}
            onMinutes={setMinutes}
            onWager={(id, value) =>
              setWagers((current) => ({
                ...current,
                [id]: value,
              }))
            }
            onSubmitTask={() =>
              act("submitTask", {
                name: taskName,
                predictedMinutes: minutes,
              })
            }
            onPlaceWagers={() => {
              const total = others.reduce((sum, item) => sum + (wagers[item.id] ?? 0), 0);
              if (you && total > you.wallet) {
                setNotice("Those wagers cost more Summit Coins than you have.");
                return;
              }
              return act("placeWagers", {
                wagers: others.map((item) => ({
                  targetId: item.id,
                  predictedMinutes: item.predictedMinutes ?? 0,
                  amount: wagers[item.id] ?? 0,
                })),
              });
            }}
            onStartTask={() => act("startTask")}
            onPause={() => act("pauseTask")}
            onResume={() => act("resumeTask")}
            onFinish={() => act("finishTask")}
            onLeave={async () => {
              await act("leave");
              clearRoomSession(room.code);
              router.push("/room");
            }}
          />
        )}
      </main>
    </ScreenFrame>
  );
}

function Lobby({
  room,
  invite,
  copied,
  isHost,
  onCopy,
  onReady,
  onStart,
  onLeave,
  onConfigure,
}: {
  room: PublicRoom;
  invite: string;
  copied: boolean;
  isHost: boolean;
  onCopy: () => void;
  onReady: () => void;
  onStart: () => void;
  onLeave: () => void;
  onConfigure: (partial: Record<string, unknown>) => void;
}) {
  const seated = room.members.filter((item) => !item.left);
  return (
    <>
      <header className={styles.head}>
        <p className={styles.kicker}>Summit Showdown</p>
        <h1>{room.name}</h1>
        <p>
          Room code <strong>{room.code}</strong> · {seated.length}/{room.maxPlayers} climbers · {room.mountainName}
        </p>
      </header>
      <div className={styles.toolbar}>
        <GameButton type="button" variant="secondary" onClick={onCopy}>
          {copied ? "Invite copied" : "Copy invite link"}
        </GameButton>
        <p className={styles.invite}>{invite}</p>
      </div>
      {isHost ? (
        <div className={styles.hostRow}>
          <label>
            Mountain
            <select value={room.mountainId} onChange={(event) => onConfigure({ mountainId: event.target.value })}>
              {MOUNTAINS.map((mountain) => (
                <option key={mountain.id} value={mountain.id}>
                  {mountain.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <p>Host: {room.members.find((item) => item.isHost)?.username ?? "unknown"}</p>
      )}
      <section className={styles.grid} aria-label="Players in this room">
        {seated.map((member) => (
          <article key={member.id} className={styles.seat}>
            {member.avatarId ? (
              <AvatarFigure avatarId={member.avatarId} equipped={member.equippedAccessories} />
            ) : null}
            <h2>{member.username}</h2>
            <p>{member.isHost ? "Host" : "Climber"}{member.you ? " · you" : ""}</p>
            <p className={member.ready ? styles.ready : styles.wait}>
              {member.ready ? "Ready" : "Not ready"}
            </p>
          </article>
        ))}
      </section>
      <div className={styles.actions}>
        <GameButton type="button" onClick={onReady}>
          {room.you?.ready ? "Unready" : "Ready"}
        </GameButton>
        {isHost ? (
          <GameButton
            type="button"
            variant="gold"
            onClick={onStart}
            disabled={seated.length < 2 || seated.some((member) => !member.ready)}
          >
            Start adventure
          </GameButton>
        ) : null}
        <GameButton type="button" variant="secondary" onClick={onLeave}>
          Leave room
        </GameButton>
      </div>
    </>
  );
}

function Climb({
  room,
  titleId,
  taskName,
  minutes,
  wagers,
  showWagers,
  canStartTask,
  onTaskName,
  onMinutes,
  onWager,
  onSubmitTask,
  onPlaceWagers,
  onStartTask,
  onPause,
  onResume,
  onFinish,
  onLeave,
}: {
  room: PublicRoom;
  titleId: string;
  taskName: string;
  minutes: number;
  wagers: Record<string, number>;
  showWagers: boolean;
  canStartTask: boolean;
  onTaskName: (value: string) => void;
  onMinutes: (value: number) => void;
  onWager: (id: string, value: number) => void;
  onSubmitTask: () => void;
  onPlaceWagers: () => void;
  onStartTask: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onLeave: () => void;
}) {
  const mountain = MOUNTAINS.find((item) => item.id === room.mountainId);
  const seated = room.members.filter((item) => !item.left);
  const you = room.you;
  const needTask = you?.status === "none";
  const route = trailPath();
  const summit = trailPoint(1);
  const complete = room.phase === "finished";
  const finishers = seated.filter((item) => item.finished);
  const celebration = summitCelebration(room.code, finishers);

  return (
    <>
      <div className={climb.layout}>
        <section className={climb.stage} aria-label={`${room.mountainName} showdown`}>
          {mountain ? (
            <Image className={climb.photo} src={mountain.src} alt="" fill sizes="(max-width: 720px) 100vw, 900px" />
          ) : null}
          <svg className={climb.trail} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d={route} />
            <path d={route} />
          </svg>
          <span className={climb.trailhead}>Trailhead</span>
          {celebration.planted ? (
            <span
              className={`${climb.summitPlant} ${celebration.animate ? "" : styles.summitPlantSettled}`}
              style={{ ["--x" as string]: summit.left, ["--y" as string]: summit.bottom }}
              role="img"
              aria-label={`${celebration.names.join(", ")} planted a summit flag`}
            >
              <span className={climb.pole} />
              <span className={climb.cloth} />
            </span>
          ) : (
            <span
              className={climb.summitMark}
              style={{ ["--x" as string]: summit.left, ["--y" as string]: summit.bottom }}
            >
              Summit
            </span>
          )}
          {celebration.planted ? (
            <div
              className={`${climb.confetti} ${celebration.animate ? "" : styles.confettiSettled}`}
              aria-hidden="true"
            >
              {CONFETTI.map((piece) => (
                <span
                  key={`${piece.x}-${piece.delay}`}
                  style={{
                    ["--x" as string]: piece.x,
                    ["--rest" as string]: piece.rest,
                    ["--delay" as string]: piece.delay,
                    ["--color" as string]: piece.color,
                    ["--tilt" as string]: piece.tilt,
                  }}
                />
              ))}
            </div>
          ) : null}
          {celebration.planted ? (
            <div className={styles.summitReached} role="status">
              <p>SUMMIT REACHED!</p>
              <span>
                {celebration.names.length === 1
                  ? `${celebration.names[0]} reached the summit.`
                  : `${celebration.names.join(", ")} reached the summit.`}
              </span>
            </div>
          ) : null}
          {seated.map((member, index) => {
            if (!member.avatarId) {
              return null;
            }
            const point = trailPoint(member.progress);
            const offset = (index - (seated.length - 1) / 2) * 72;
            return (
              <div
                key={member.id}
                className={`${climb.climber} ${styles.racer}`}
                style={{
                  left: `clamp(46px, calc(${point.x}% + ${offset}px), calc(100% - 46px))`,
                  bottom: point.bottom,
                }}
              >
                <span className={index % 2 === 0 ? styles.tag : styles.tagAlt}>{member.username}</span>
                <AvatarFigure
                  avatarId={member.avatarId}
                  equipped={member.equippedAccessories}
                  size="trail"
                />
              </div>
            );
          })}
          <div className={climb.stageCopy}>
            <h1>{room.mountainName}</h1>
            <p>
              Summit Showdown — each climber works their own task. Rankings use completion and prediction accuracy.
            </p>
            {room.leaderboard[0] ? <p>Ahead: {room.leaderboard[0].username}</p> : null}
          </div>
        </section>
        <div className={styles.board}>
          <p className={climb.meterLabel}>Board</p>
          <ol className={styles.ranks}>
            {room.leaderboard.map((member, index) => (
              <li key={member.id}>
                <strong>{index + 1}. {member.username}</strong>
                <span>
                  {Math.round(member.progress * 100)}%
                  {member.finished ? (member.success ? " · on time" : " · late") : ""}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className={styles.panel}>
        {needTask ? (
          <form
            className={form.form}
            onSubmit={(event) => {
              event.preventDefault();
              onSubmitTask();
            }}
          >
            <h2>Your task</h2>
            <p>
              Other climbers see your predicted time and progress, not this task name. After you lock in, you can wager Summit Coins on other players.
            </p>
            <label className={form.field}>
              <span>Task name</span>
              <input value={taskName} onChange={(event) => onTaskName(event.target.value)} required />
            </label>
            <label className={form.field}>
              <span>Your predicted minutes</span>
              <input
                type="number"
                min={1}
                max={240}
                value={minutes}
                onChange={(event) => onMinutes(Number(event.target.value))}
                required
              />
            </label>
            <GameButton type="submit">Lock in task</GameButton>
          </form>
        ) : null}

        {showWagers ? (
          <form
            className={form.form}
            onSubmit={(event) => {
              event.preventDefault();
              onPlaceWagers();
            }}
          >
            <h2>Bet on other climbers</h2>
            <p>
              Wager Summit Coins on another player&apos;s finish. If they complete within their predicted time, your wager is returned plus a matching reward. If they finish late, the wager is lost. You cannot bet on yourself.
            </p>
            {you ? <p>Available: {you.wallet.toLocaleString("en-US")} Summit Coins.</p> : null}
            {room.members.filter((item) => !item.you && !item.left).map((member) => (
              <fieldset key={member.id} className={styles.wager}>
                <legend>{member.username}</legend>
                <p>
                  Predicted time:{" "}
                  {member.predictedMinutes != null
                    ? `${member.predictedMinutes} min`
                    : "Waiting for their lock-in"}
                </p>
                <label>
                  Wager
                  <input
                    type="number"
                    min={0}
                    max={you?.wallet ?? 0}
                    value={wagers[member.id] ?? 0}
                    onChange={(event) => onWager(member.id, Number(event.target.value))}
                  />
                </label>
              </fieldset>
            ))}
            <GameButton type="submit" variant="gold">Lock in wagers</GameButton>
          </form>
        ) : null}

        {you?.wagersLocked && you.wagers.length > 0 ? (
          <div className={styles.wagerRecap}>
            <h2>Your wagers</h2>
            <ul>
              {you.wagers.map((wager) => (
                <li key={wager.targetId}>
                  {wager.username}: {wager.amount.toLocaleString("en-US")} Summit Coins
                  {wager.predictedMinutes > 0 ? ` · ${wager.predictedMinutes} min prediction` : ""}
                  {wager.settled
                    ? wager.won
                      ? " · won"
                      : " · lost"
                    : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {canStartTask ? (
          <GameButton type="button" onClick={onStartTask}>Start climb</GameButton>
        ) : null}
        {you?.status === "running" ? (
          <div className={styles.actions}>
            <GameButton type="button" variant="secondary" onClick={onPause}>Pause</GameButton>
            <GameButton type="button" onClick={onFinish}>Finish task</GameButton>
          </div>
        ) : null}
        {you?.status === "paused" ? (
          <div className={styles.actions}>
            <GameButton type="button" onClick={onResume}>Resume</GameButton>
            <GameButton type="button" onClick={onFinish}>Finish task</GameButton>
          </div>
        ) : null}

        {you?.status === "running" || you?.status === "paused" ? (
          <ElapsedClock
            elapsedMs={you.elapsedMs ?? 0}
            predictedMinutes={you.predictedMinutes ?? 0}
            paused={you.status === "paused"}
            taskName={you.taskName}
          />
        ) : null}
        {you?.finished ? (
          <p>
            Result: {you.success ? "on time" : "late"}.
            {you.taskName ? ` ${you.taskName}.` : ""}
            {you.bonusCoins > 0 ? ` Bonuses +${you.bonusCoins}.` : ""}
          </p>
        ) : null}

        {complete ? (
          <div>
            <h2 id={titleId}>Showdown complete</h2>
            <p>Every climber has finished. Rankings use completion and prediction accuracy, not raw speed.</p>
          </div>
        ) : null}

        <GameButton type="button" variant="secondary" onClick={onLeave}>Leave room</GameButton>
      </div>
    </>
  );
}

function summitCelebration(code: string, finishers: { id: string; username: string }[]) {
  const planted = finishers.length > 0;
  const names = finishers.map((item) => item.username);
  const animate =
    planted && typeof window !== "undefined"
      ? shouldPlaySummitAnimation(
          code,
          finishers.map((item) => item.id),
        )
      : false;
  return { planted, animate, names };
}

function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function ElapsedClock({
  elapsedMs,
  predictedMinutes,
  paused,
  taskName,
}: {
  elapsedMs: number;
  predictedMinutes: number;
  paused: boolean;
  taskName: string | null;
}) {
  const predictedMs = predictedMinutes * 60_000;
  const remaining = predictedMs - elapsedMs;
  return (
    <p>
      {taskName ? `${taskName}. ` : ""}
      {paused ? "Paused. " : "Your task is running. "}
      Elapsed {formatClock(elapsedMs)}
      {predictedMinutes > 0 ? ` · predicted ${predictedMinutes} min` : ""}
      {predictedMinutes > 0
        ? remaining >= 0
          ? ` · ${formatClock(remaining)} remaining`
          : ` · ${formatClock(-remaining)} over`
        : ""}
      . Finish when the real work is done.
    </p>
  );
}
