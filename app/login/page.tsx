import type { Metadata } from "next";
import { LoginForm } from "../components/LoginForm";
import { ScreenFrame } from "../components/ScreenFrame";
import { SummitBar } from "../components/SummitBar";
import styles from "../components/AuthForm.module.css";

export const metadata: Metadata = {
  title: "Log In · SummitRush",
};

export default function LoginPage() {
  return (
    <ScreenFrame>
      <SummitBar />
      <main className={styles.main}>
        <LoginForm />
      </main>
    </ScreenFrame>
  );
}
