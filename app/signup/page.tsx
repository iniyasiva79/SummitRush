import type { Metadata } from "next";
import { SignupForm } from "../components/SignupForm";
import { ScreenFrame } from "../components/ScreenFrame";
import { SummitBar } from "../components/SummitBar";
import styles from "../components/AuthForm.module.css";

export const metadata: Metadata = {
  title: "Sign Up · SummitRush",
};

export default function SignupPage() {
  return (
    <ScreenFrame>
      <SummitBar />
      <main className={styles.main}>
        <SignupForm />
      </main>
    </ScreenFrame>
  );
}
