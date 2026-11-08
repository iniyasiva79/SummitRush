"use client";

import { useActiveAccount } from "../lib/accounts";

export function SavedName() {
  const account = useActiveAccount();

  if (!account) {
    return <p>Sign in to see the username saved with an account.</p>;
  }

  return (
    <p>
      Username: <strong>{account.username}</strong>
    </p>
  );
}
