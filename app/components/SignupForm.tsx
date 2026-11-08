"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { signup, type SignupErrors, type SignupInput } from "../lib/accounts";
import { GameButton } from "./GameButton";
import { GameCard } from "./GameCard";
import styles from "./AuthForm.module.css";

const empty: SignupInput = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  username: "",
  password: "",
};

export function SignupForm() {
  const [values, setValues] = useState<SignupInput>(empty);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [pending, setPending] = useState(false);
  const [createdName, setCreatedName] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: SignupInput = {
      firstName: String(data.get("firstName") ?? ""),
      lastName: String(data.get("lastName") ?? ""),
      dateOfBirth: String(data.get("dateOfBirth") ?? ""),
      username: String(data.get("username") ?? ""),
      password: String(data.get("password") ?? ""),
    };
    setValues(next);
    setPending(true);
    const result = await signup(next);
    setPending(false);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setValues(empty);
    setErrors({});
    setCreatedName(result.account.username);
  }

  if (createdName) {
    return (
      <GameCard title="Account created">
        <div className={styles.confirm}>
          <p className={styles.note}>
            {createdName} is signed in with 1,000 fictional Summit Coins. The
            password is stored only as a hash in this browser.
          </p>
          <GameButton href="/">Back to SummitRush</GameButton>
        </div>
      </GameCard>
    );
  }

  return (
    <GameCard title="Sign Up">
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <p className={styles.note}>
          Summit Coins are fictional and have no real-world value. A new
          account starts with 1,000 coins, saved in this browser.
        </p>
        <Field
          label="First Name"
          name="firstName"
          autoComplete="given-name"
          value={values.firstName}
          error={errors.firstName}
          onChange={(firstName) => setValues({ ...values, firstName })}
        />
        <Field
          label="Last Name"
          name="lastName"
          autoComplete="family-name"
          value={values.lastName}
          error={errors.lastName}
          onChange={(lastName) => setValues({ ...values, lastName })}
        />
        <Field
          label="Date of Birth"
          name="dateOfBirth"
          type="date"
          autoComplete="bday"
          value={values.dateOfBirth}
          error={errors.dateOfBirth}
          onChange={(dateOfBirth) => setValues({ ...values, dateOfBirth })}
        />
        <Field
          label="Username"
          name="username"
          autoComplete="username"
          value={values.username}
          error={errors.username}
          onChange={(username) => setValues({ ...values, username })}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          error={errors.password}
          hint="At least 8 characters, including one number."
          onChange={(password) => setValues({ ...values, password })}
        />
        <div className={styles.actions}>
          <GameButton type="submit" disabled={pending}>
            {pending ? "Saving…" : "Sign Up"}
          </GameButton>
          <Link href="/login">Already have an account? Log in</Link>
        </div>
      </form>
    </GameCard>
  );
}

function Field({
  label,
  name,
  value,
  error,
  onChange,
  type = "text",
  autoComplete,
  hint,
}: {
  label: string;
  name: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete: string;
  hint?: string;
}) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </label>
  );
}
