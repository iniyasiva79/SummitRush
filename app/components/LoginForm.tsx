"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { login, logout, useActiveAccount } from "../lib/accounts";
import { GameButton } from "./GameButton";
import { GameCard } from "./GameCard";
import styles from "./AuthForm.module.css";

export function LoginForm() {
  const account = useActiveAccount();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [signedInName, setSignedInName] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextUsername = String(data.get("username") ?? "");
    const nextPassword = String(data.get("password") ?? "");
    setUsername(nextUsername);
    setPassword(nextPassword);
    setPending(true);
    const result = await login(nextUsername, nextPassword);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPassword("");
    setError("");
    setSignedInName(result.account.username);
  }

  if (signedInName) {
    return (
      <GameCard title="Welcome back">
        <div className={styles.confirm}>
          <p className={styles.note}>
            {signedInName} is signed in. The saved username, Summit Coins, and
            progress for this account are restored.
          </p>
          <GameButton href="/">Back to SummitRush</GameButton>
        </div>
      </GameCard>
    );
  }

  return (
    <GameCard title="Log In">
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {account ? (
          <p className={styles.note}>
            {account.username} is already signed in. Logging in switches to
            another saved account.
          </p>
        ) : null}
        <label className={styles.field}>
          <span>Username</span>
          <input
            name="username"
            autoComplete="username"
            value={username}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
            onChange={(event) => {
              setUsername(event.target.value);
              setError("");
            }}
          />
        </label>
        <label className={styles.field}>
          <span>Password</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
          />
        </label>
        {error ? (
          <p id="login-error" className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.actions}>
          <GameButton type="submit" disabled={pending}>
            {pending ? "Checking…" : "GO"}
          </GameButton>
          {account ? (
            <GameButton variant="secondary" onClick={logout}>
              Log out
            </GameButton>
          ) : null}
          <Link href="/signup">Need an account? Sign up</Link>
        </div>
      </form>
    </GameCard>
  );
}
