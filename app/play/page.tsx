import type { Metadata } from "next";
import { Suspense } from "react";
import { AvatarSelect } from "../components/AvatarSelect";

export const metadata: Metadata = {
  title: "Choose your mountaineer · SummitRush",
  description: "Choose a starter avatar for your SummitRush account.",
};

export default function PlayPage() {
  return (
    <Suspense>
      <AvatarSelect />
    </Suspense>
  );
}
