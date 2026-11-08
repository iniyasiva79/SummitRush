"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useActiveAccount } from "../lib/accounts";
import { MOUNTAINS } from "../lib/mountains";
import { CODE_ALPHABET, ROOM_MAX, ROOM_MIN, type RoomMode } from "../lib/multiplayer";
import { createRoom } from "../lib/room-client";
import { GameButton } from "./GameButton";
import { GameCard } from "./GameCard";
import { ScreenFrame } from "./ScreenFrame";
import { SummitBar } from "./SummitBar";
import form from "./AuthForm.module.css";
import styles from "./RoomHub.module.css";

export function RoomHub() {
  const account = useActiveAccount();
  const router = useRouter();
  const [name, setName] = useState("Saturday Study Summit");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [mode, setMode] = useState<RoomMode>("showdown");
  const [mountainId, setMountainId] = useState(MOUNTAINS[0].id);
  const [joinCode, setJoinCode] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [needsRedis, setNeedsRedis] = useState(false);

  useEffect(() => {
    void fetch("/api/rooms")
      .then((response) => response.json())
      .then((payload: { needsRedis?: boolean }) => setNeedsRedis(payload.needsRedis === true))
      .catch(() => undefined);
  }, []);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!account) {
      setNotice("Log in before creating a private room.");
      return;
    }
    if (!account.avatarId) {
      setNotice("Choose an avatar before creating a room.");
      return;
    }
    setPending(true);
    const result = await createRoom({
      account,
      name,
      maxPlayers,
      mode,
      mountainId,
    });
    setPending(false);
    if (!result.ok) {
      setNotice(result.error);
      return;
    }
    router.push(`/room/${result.room.code}`);
  }

  function onJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitted = new FormData(event.currentTarget).get("code");
    const code = String(submitted ?? joinCode).trim().toUpperCase();
    if (!new RegExp(`^[${CODE_ALPHABET}]{6}$`).test(code)) {
      setNotice("Enter the 6-character room code.");
      return;
    }
    router.push(`/join/${code}`);
  }

  return (
    <ScreenFrame>
      <SummitBar />
      <main className={styles.main}>
        <header className={styles.head}>
          <p className={styles.kicker}>Summit Showdown</p>
          <h1>Private rooms</h1>
          <p>
            Create a room with a unique code, or join a friend&apos;s climb.
            Rooms hold 2 to 6 players and keep everyone in sync across devices.
          </p>
        </header>

        {needsRedis ? (
          <p className={styles.notice} role="status">
            Production multiplayer needs Upstash Redis. Add UPSTASH_REDIS_REST_URL and
            UPSTASH_REDIS_REST_TOKEN in the Vercel project. Local development can still
            sync two browsers through this computer.
          </p>
        ) : null}
        {notice ? <p className={styles.notice} role="alert">{notice}</p> : null}

        <div className={styles.split}>
          <GameCard title="Create a private room">
            {!account ? (
              <p>Log in so the host seat is saved to your account.</p>
            ) : (
              <form className={form.form} onSubmit={onCreate}>
                <label className={form.field}>
                  <span>Room name</span>
                  <input
                    name="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={40}
                    required
                  />
                </label>
                <label className={form.field}>
                  <span>Player limit</span>
                  <select
                    value={maxPlayers}
                    onChange={(event) => setMaxPlayers(Number(event.target.value))}
                  >
                    {Array.from({ length: ROOM_MAX - ROOM_MIN + 1 }, (_, index) => ROOM_MIN + index).map((count) => (
                      <option key={count} value={count}>
                        {count} players
                      </option>
                    ))}
                  </select>
                </label>
                <label className={form.field}>
                  <span>Mode</span>
                  <select value={mode} onChange={(event) => setMode(event.target.value as RoomMode)}>
                    <option value="showdown">Summit Showdown (compete)</option>
                    <option value="team">Team climb</option>
                  </select>
                </label>
                <label className={form.field}>
                  <span>Mountain</span>
                  <select value={mountainId} onChange={(event) => setMountainId(event.target.value as typeof mountainId)}>
                    {MOUNTAINS.map((mountain) => (
                      <option key={mountain.id} value={mountain.id}>
                        {mountain.name}
                      </option>
                    ))}
                  </select>
                </label>
                <GameButton type="submit" disabled={pending}>
                  {pending ? "Creating…" : "Create room"}
                </GameButton>
              </form>
            )}
          </GameCard>

          <GameCard title="Join a private room">
            <form className={form.form} onSubmit={onJoin}>
              <label className={form.field}>
                <span>Room code</span>
                <input
                  name="code"
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="ABC123"
                  autoCapitalize="characters"
                  required
                />
              </label>
              <p className={form.hint}>
                Enter the host&apos;s 6-character code. You will land in that lobby.
              </p>
              <GameButton type="submit" variant="secondary">
                Join room
              </GameButton>
            </form>
          </GameCard>
        </div>
      </main>
    </ScreenFrame>
  );
}
