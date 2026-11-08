"use client";

import { useDisplayName } from "../lib/displayName";

export function SavedName() {
  const name = useDisplayName();

  return (
    <p>
      Display name: <strong>{name || "Not set yet"}</strong>
    </p>
  );
}
