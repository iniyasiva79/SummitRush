"use client";

import { useEffect } from "react";
import { readActiveAccount, updateActiveAccount, useActiveAccount } from "../lib/accounts";
import { rollAndSaveChaos } from "../lib/chaos-apply";
import {
  catchCheckpoint,
  closeCheckpoint,
  parkCheckpoint,
  replaceTask,
  resumeTask,
  rewardCheckpoint,
} from "../lib/gameplay";
import { useSettings } from "../lib/settings";
import { ChaosCard } from "./ChaosCard";
import { SummitSight } from "./SummitSight";

export function CheckpointHost() {
  const account = useActiveAccount();
  const settings = useSettings();
  const task = account?.tasks.find((item) => item.status === "checkpoint") ?? null;
  const checkpoint = task?.checkpoints.find((item) => item.id === task.openCheckpointId) ?? null;
  const chaosOpen = Boolean(account?.chaosEvents.some((item) => !item.acknowledged));

  useEffect(() => {
    const id = window.setInterval(() => {
      const current = readActiveAccount();
      const running = current?.tasks.find((item) => item.status === "running");
      if (!current || !running) {
        return;
      }
      const held = catchCheckpoint(running, Date.now());
      if (held) {
        updateActiveAccount({ tasks: replaceTask(current.tasks, held) });
      }
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  function pay() {
    const current = readActiveAccount();
    const open = current?.tasks.find((item) => item.id === task?.id);
    if (!current || !open) {
      return;
    }
    const rewarded = rewardCheckpoint(open, current.coins);
    updateActiveAccount({
      coins: rewarded.coins,
      tasks: replaceTask(current.tasks, rewarded.task),
      progress: {
        ...current.progress,
        checkpoints: current.progress.checkpoints + (rewarded.paid > 0 ? 1 : 0),
        summitSightCompleted:
          current.progress.summitSightCompleted + (rewarded.paid > 0 ? 1 : 0),
        coinsEarned: current.progress.coinsEarned + rewarded.paid,
      },
    });
  }

  function continueAfterCheckpoint(next: "skip" | "resume") {
    const current = readActiveAccount();
    const open = current?.tasks.find((item) => item.id === task?.id);
    const openCheckpoint = open?.checkpoints.find((item) => item.id === open.openCheckpointId);
    if (!current || !open || !openCheckpoint) {
      return;
    }
    if (next === "resume") {
      void stopPreview();
    }
    const parked = next === "skip" ? closeCheckpoint(open, "skipped") : parkCheckpoint(open);
    const created = rollAndSaveChaos({
      account: current,
      enabled: settings.chaosCards,
      mountainId: open.mountainId,
      triggerKey: `checkpoint:${open.id}:${openCheckpoint.id}`,
      resumeTaskId: open.id,
      tasks: replaceTask(current.tasks, parked),
    });
    if (created) {
      return;
    }
    const latest = readActiveAccount();
    const paused = latest?.tasks.find((item) => item.id === open.id);
    if (!latest || !paused) {
      return;
    }
    updateActiveAccount({
      tasks: replaceTask(latest.tasks, resumeTask(paused, Date.now())),
    });
  }

  return (
    <>
      {account && task && checkpoint && !chaosOpen ? (
        <SummitSight
          summitSightEnabled={task.summitSight}
          alreadyRewarded={checkpoint.rewardPaid || checkpoint.state === "completed"}
          onSuccess={pay}
          onSkip={() => continueAfterCheckpoint("skip")}
          onResume={() => continueAfterCheckpoint("resume")}
        />
      ) : null}
      <ChaosCard />
    </>
  );
}

function stopPreview() {
  document.getElementById("webgazerVideoContainer")?.remove();
}
