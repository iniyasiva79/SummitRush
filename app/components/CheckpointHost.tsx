"use client";

import { useEffect } from "react";
import { readActiveAccount, updateActiveAccount, useActiveAccount } from "../lib/accounts";
import {
  catchCheckpoint,
  replaceTask,
  resumeOpenCheckpoint,
  rewardCheckpoint,
  skipCheckpoint,
} from "../lib/gameplay";
import { SummitSight } from "./SummitSight";

export function CheckpointHost() {
  const account = useActiveAccount();
  const task = account?.tasks.find((item) => item.status === "checkpoint") ?? null;
  const checkpoint = task?.checkpoints.find((item) => item.id === task.openCheckpointId) ?? null;

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

  if (!account || !task || !checkpoint) {
    return null;
  }

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

  function skip() {
    const current = readActiveAccount();
    const open = current?.tasks.find((item) => item.id === task?.id);
    if (!current || !open) {
      return;
    }
    updateActiveAccount({
      tasks: replaceTask(current.tasks, skipCheckpoint(open, Date.now())),
    });
  }

  function resume() {
    const current = readActiveAccount();
    const open = current?.tasks.find((item) => item.id === task?.id);
    if (!current || !open) {
      return;
    }
    void stopPreview();
    updateActiveAccount({
      tasks: replaceTask(current.tasks, resumeOpenCheckpoint(open, Date.now())),
    });
  }

  return (
    <SummitSight
      summitSightEnabled={task.summitSight}
      alreadyRewarded={checkpoint.rewardPaid || checkpoint.state === "completed"}
      onSuccess={pay}
      onSkip={skip}
      onResume={resume}
    />
  );
}

function stopPreview() {
  document.getElementById("webgazerVideoContainer")?.remove();
}
