"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useActiveAccount } from "../lib/accounts";
import { trailPath, trailPoint } from "../lib/gameplay";
import { MOUNTAINS } from "../lib/mountains";
import type { PublicRoom, RoomMode } from "../lib/multiplayer";
import { TEAM_CLIMB_COINS } from "../lib/multiplayer";
import { clearRoomSession, fetchRoom, roomAction } from "../lib/room-client";
import { useSettings } from "../lib/settings";
import { AvatarFigure } from "./AvatarFigure";
import { GameButton } from "./GameButton";
import { GameCard } from "./GameCard";
import { GameOverlay } from "./GameOverlay";
import { ScreenFrame } from "./ScreenFrame";
import { SummitBar } from "./SummitBar";
import climb from "./ClimbScreen.module.css";
import form from "./AuthForm.module.css";
import styles from "./RoomSession.module.css";

type RoomSessionProps = {
  code: string;
  autoJoin?: boolean;
};

export function RoomSession({ code, autoJoin = false }: RoomSessionProps) {
  const account = useActiveAccount();
  const settings = useSettings();
  const router = useRouter();
  const titleId = useId();
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [notice, setNotice] = useState("");
  const [taskName, setTaskName] = useState("");
  const [minutes, setMinutes] = useState(25);
  const [stake, setStake] = useState(0);
  const [wagers, setWagers] = useState<Record<string, { minutes: number; amount: number }>>({});
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
            stake={stake}
            wagers={wagers}
            noStakes={settings.noStakes}
            showWagers={showWagers}
            canStartTask={Boolean(canStartTask)}
            onTaskName={setTaskName}
            onMinutes={setMinutes}
            onStake={setStake}
            onWager={(id, field, value) =>
              setWagers((current) => ({
                ...current,
                [id]: {
                  minutes: field === "minutes" ? value : current[id]?.minutes ?? 25,
                  amount: field === "amount" ? value : current[id]?.amount ?? 0,
                },
              }))
            }
            onSubmitTask={() =>
              act("submitTask", {
                name: taskName,
                predictedMinutes: minutes,
                stake: settings.noStakes ? 0 : stake,
              })
            }
            onPlaceWagers={() =>
              act("placeWagers", {
                wagers: others.map((item) => ({
                  targetId: item.id,
                  predictedMinutes: wagers[item.id]?.minutes ?? 25,
                  amount: settings.noStakes ? 0 : wagers[item.id]?.amount ?? 0,
                })),
              })
            }
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
        <p className={styles.kicker}>{room.mode === "team" ? "Team climb" : "Summit Showdown"}</p>
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
            Mode
            <select value={room.mode} onChange={(event) => onConfigure({ mode: event.target.value as RoomMode })}>
              <option value="showdown">Summit Showdown</option>
              <option value="team">Team climb</option>
            </select>
          </label>
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
  stake,
  wagers,
  noStakes,
  showWagers,
  canStartTask,
  onTaskName,
  onMinutes,
  onStake,
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
  stake: number;
  wagers: Record<string, { minutes: number; amount: number }>;
  noStakes: boolean;
  showWagers: boolean;
  canStartTask: boolean;
  onTaskName: (value: string) => void;
  onMinutes: (value: number) => void;
  onStake: (value: number) => void;
  onWager: (id: string, field: "minutes" | "amount", value: number) => void;
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
          {complete ? (
            <span
              className={climb.summitPlant}
              style={{ ["--x" as string]: summit.left, ["--y" as string]: summit.bottom }}
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
          {complete ? (
            <div className={climb.confetti} aria-hidden="true">
              {Array.from({ length: 12 }, (_, index) => (
                <span
                  key={index}
                  style={{
                    ["--x" as string]: `${8 + index * 7}%`,
                    ["--rest" as string]: `${20 + (index % 5) * 10}%`,
                    ["--delay" as string]: `${index * 40}ms`,
                    ["--color" as string]: index % 2 === 0 ? "#f2c14e" : "#2478a3",
                    ["--tilt" as string]: `${index % 2 === 0 ? -18 : 16}deg`,
                  }}
                />
              ))}
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
              {room.mode === "team"
                ? `Team ${room.teamCompletions}/${room.teamGoal} tasks. +${TEAM_CLIMB_COINS} each at the summit.`
                : "Summit Showdown — each climber works their own task. Rankings use completion and prediction accuracy."}
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
              Other climbers see your progress, not this task name. Then you predict their times and wager Summit Coins.
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
            <label className={form.field}>
              <span>Stake on yourself</span>
              <input
                type="number"
                min={0}
                value={noStakes ? 0 : stake}
                onChange={(event) => onStake(Number(event.target.value))}
                disabled={noStakes}
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
              Predict each player&apos;s time. If they finish within your prediction, your wager is returned plus a matching reward. If they finish late, the wager is lost.
            </p>
            {room.members.filter((item) => !item.you && !item.left).map((member) => (
              <fieldset key={member.id} className={styles.wager}>
                <legend>{member.username}</legend>
                <label>
                  Predicted minutes
                  <input
                    type="number"
                    min={1}
                    max={240}
                    value={wagers[member.id]?.minutes ?? 25}
                    onChange={(event) => onWager(member.id, "minutes", Number(event.target.value))}
                  />
                </label>
                <label>
                  Wager
                  <input
                    type="number"
                    min={0}
                    value={noStakes ? 0 : wagers[member.id]?.amount ?? 0}
                    disabled={noStakes}
                    onChange={(event) => onWager(member.id, "amount", Number(event.target.value))}
                  />
                </label>
              </fieldset>
            ))}
            <GameButton type="submit" variant="gold">Lock in wagers</GameButton>
          </form>
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

        <GameButton type="button" variant="secondary" onClick={onLeave}>Leave room</GameButton>
      </div>

      {complete ? (
        <GameOverlay labelledBy={titleId} size="card">
          <h2 id={titleId}>{room.mode === "team" ? "Team summit" : "Showdown complete"}</h2>
          <p>
            {room.mode === "team"
              ? `The team reached the summit. Each climber received ${TEAM_CLIMB_COINS} Summit Coins.`
              : "Every climber has finished. Rankings use completion and prediction accuracy, not raw speed."}
          </p>
          <ol className={styles.ranks}>
            {room.leaderboard.map((member, index) => (
              <li key={member.id}>
                {index + 1}. {member.username}
                {member.success ? " · on time" : member.finished ? " · late" : ""}
              </li>
            ))}
          </ol>
          <GameButton href="/room">Back to rooms</GameButton>
        </GameOverlay>
      ) : null}
    </>
  );
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
