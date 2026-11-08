"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";
import {
  updateActiveAccount,
  useActiveAccount,
  type PlayerProgress,
} from "../lib/accounts";
import { avatarById } from "../lib/avatars";
import {
  checkpointTimes,
  createTask,
  describeStake,
  editPendingTask,
  finishTask,
  formatDuration,
  inProgress,
  intervalChoices,
  pauseTask,
  replaceTask,
  resumeTask,
  saveCheckpointSettings,
  startTask,
  trailPoint,
  validateDraft,
  workingMs,
  type GameTask,
  type TaskDraft,
} from "../lib/gameplay";
import {
  MOUNTAINS,
  isMountainId,
  isMountainUnlocked,
  mountainById,
  tasksCompleted,
} from "../lib/mountains";
import { useSettings } from "../lib/settings";
import { AvatarFigure } from "./AvatarFigure";
import { GameButton } from "./GameButton";
import { ScreenFrame } from "./ScreenFrame";
import { SummitBar } from "./SummitBar";
import styles from "./ClimbScreen.module.css";

type ClimbScreenProps = {
  mountainId: string;
};

const EMPTY_DRAFT: TaskDraft = {
  name: "",
  description: "",
  category: "",
  predictedMinutes: 25,
  stake: 0,
};

export function ClimbScreen({ mountainId }: ClimbScreenProps) {
  const account = useActiveAccount();
  const settings = useSettings();
  const [now, setNow] = useState(0);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [notice, setNotice] = useState("");
  const [setupId, setSetupId] = useState<string | null>(null);
  const mountain = isMountainId(mountainId) ? mountainById(mountainId) : null;
  const unlocked = mountain
    ? isMountainUnlocked(account?.progress.mountainTasks, mountain.id)
    : false;

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const tasks = account?.tasks.filter((task) => task.mountainId === mountain?.id) ?? [];
  const active = account?.tasks.find((task) => inProgress(task)) ?? null;
  const resultTask =
    account?.tasks.find((task) => task.id === account.pendingResultTaskId) ?? null;
  const clock = now > 0 ? now : null;

  if (!mountain) {
    return (
      <ScreenFrame>
        <SummitBar />
        <main className={styles.main}>
          <section className={styles.panel}>
            <h1>Unknown mountain</h1>
            <GameButton href="/mountains">Back to mountains</GameButton>
          </section>
        </main>
      </ScreenFrame>
    );
  }

  if (!account) {
    return (
      <ScreenFrame>
        <SummitBar />
        <main className={styles.main}>
          <section className={styles.panel}>
            <h1>{mountain.name}</h1>
            <p>Sign in to save tasks, coins, and climbing progress on an account.</p>
            <GameButton href="/login">Log in</GameButton>
          </section>
        </main>
      </ScreenFrame>
    );
  }

  if (!account.avatarId || !avatarById(account.avatarId)) {
    return (
      <ScreenFrame>
        <SummitBar />
        <main className={styles.main}>
          <section className={styles.panel}>
            <h1>{mountain.name}</h1>
            <p>Choose an avatar before starting a climb.</p>
            <GameButton href="/play">Choose avatar</GameButton>
          </section>
        </main>
      </ScreenFrame>
    );
  }

  if (!unlocked) {
    return (
      <ScreenFrame>
        <SummitBar />
        <main className={styles.main}>
          <section className={styles.panel}>
            <h1>{mountain.name} is locked</h1>
            <p>This climb cannot be entered until the previous mountain is finished.</p>
            <GameButton href="/mountains">Back to mountains</GameButton>
          </section>
        </main>
      </ScreenFrame>
    );
  }

  const done = tasksCompleted(account.progress.mountainTasks, mountain.id);
  const required = mountain.tasks;
  const remaining = Math.max(0, required - done);
  const permanent = required === 0 ? 0 : done / required;
  const visualTask = active && active.mountainId === mountain.id ? active : null;
  const taskFraction =
    visualTask && clock ? Math.min(1, workingMs(visualTask, clock) / visualTask.predictedMs) : 0;
  const fraction =
    done >= required ? 1 : Math.min(1, permanent + taskFraction * (1 / required));
  const avatarPoint = trailPoint(fraction);
  const next = MOUNTAINS[MOUNTAINS.findIndex((item) => item.id === mountain.id) + 1] ?? null;
  const percent = Math.round(Math.min(1, permanent) * 1000) / 10;
  const setupTask = tasks.find((task) => task.id === setupId) ?? visualTask ?? tasks.find((task) => task.status === "pending") ?? null;
  const editing = editingId === "new"
    ? EMPTY_DRAFT
    : tasks.find((task) => task.id === editingId && task.status === "pending") ?? null;

  function saveDraft(draft: TaskDraft) {
    if (!account || !mountain) {
      return;
    }
    const errors = validateDraft(draft, account.coins, settings.noStakes);
    if (Object.keys(errors).length > 0) {
      setNotice(Object.values(errors)[0] ?? "Check the task details.");
      return;
    }
    if (editingId === "new") {
      const task = createTask(mountain.id, { ...draft, stake: settings.noStakes ? 0 : draft.stake }, Date.now());
      updateActiveAccount({ tasks: [...account.tasks, task] });
    } else if (editingId) {
      const current = account.tasks.find((task) => task.id === editingId);
      if (!current) {
        return;
      }
      updateActiveAccount({
        tasks: replaceTask(account.tasks, editPendingTask(current, { ...draft, stake: settings.noStakes ? 0 : draft.stake })),
      });
    }
    setEditingId(null);
    setNotice("");
  }

  function removeTask(taskId: string) {
    const task = account?.tasks.find((item) => item.id === taskId);
    if (!account || !task || task.status !== "pending") {
      return;
    }
    updateActiveAccount({ tasks: account.tasks.filter((item) => item.id !== taskId) });
  }

  function begin(taskId: string) {
    if (!account) {
      return;
    }
    const started = startTask(account.tasks, taskId, account.coins, Date.now(), settings.noStakes);
    if (!started.ok) {
      setNotice(started.error);
      return;
    }
    updateActiveAccount({ coins: started.coins, tasks: started.tasks });
    setNotice("");
  }

  function settle(task: GameTask) {
    if (!account || !mountain) {
      return;
    }
    const outcome = finishTask(account.tasks, task.id, Date.now(), account.coins, {
      completedTasks: account.progress.completedTasks,
      successfulPredictions: account.progress.successfulPredictions,
      unsuccessfulPredictions: account.progress.unsuccessfulPredictions,
      bettingWins: account.progress.bettingWins,
      bettingLosses: account.progress.bettingLosses,
      coinsEarned: account.progress.coinsEarned,
      coinsLost: account.progress.coinsLost,
      perfectPace: account.progress.perfectPace,
      underdog: account.progress.underdog,
      comeback: account.progress.comeback,
      summits: account.progress.summits,
      achievements: account.progress.achievements,
      mountainTasks: account.progress.mountainTasks,
    });
    if (!outcome.ok) {
      setNotice(outcome.error);
      return;
    }
    if (outcome.held) {
      updateActiveAccount({ tasks: outcome.tasks });
      return;
    }
    const progress: PlayerProgress = {
      ...account.progress,
      ...outcome.progress,
      mountainId: task.mountainId,
    };
    updateActiveAccount({
      coins: outcome.coins,
      tasks: outcome.tasks,
      pendingResultTaskId: outcome.pendingResultTaskId,
      progress,
    });
  }

  const trail = Array.from({ length: 21 }, (_, index) => {
    const point = trailPoint(index / 20);
    return `${point.x},${point.y}`;
  }).join(" ");

  return (
    <ScreenFrame>
      <SummitBar />
      <main className={styles.main}>
        <div className={styles.layout}>
          <section className={styles.stage} aria-label={`${mountain.name} climb`}>
            <Image src={mountain.src} alt="" fill priority sizes="(max-width: 720px) 100vw, 900px" />
            <svg className={styles.trail} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polyline points={trail} />
            </svg>
            <span className={styles.trailhead}>Trailhead</span>
            <span className={`${styles.summitFlag} ${done >= required ? styles.celebrate : ""}`}>Summit</span>
            {visualTask
              ? visualTask.checkpoints.map((checkpoint) => {
                  const point = trailPoint(
                    Math.min(1, permanent + (checkpoint.atMs / visualTask.predictedMs) * (1 / required)),
                  );
                  return (
                    <span
                      key={checkpoint.id}
                      className={`${styles.flag} ${checkpoint.state === "completed" ? styles.planted : ""} ${checkpoint.state === "skipped" ? styles.skippedFlag : ""}`}
                      style={{ left: point.left, bottom: point.bottom }}
                    >
                      <span className={styles.srOnly}>
                        Checkpoint at {formatDuration(checkpoint.atMs)} is {checkpoint.state}
                      </span>
                    </span>
                  );
                })
              : null}
            <div className={styles.climber} style={{ left: avatarPoint.left, bottom: avatarPoint.bottom }}>
              <AvatarFigure
                avatarId={account.avatarId}
                equipped={account.equippedAccessories}
                size="trail"
              />
            </div>
            <div className={styles.stageCopy}>
              <h1>{mountain.name}</h1>
              <p>
                {done} of {required} tasks completed. {remaining} remaining. {percent}% of the mountain. Position: {fraction >= 1 ? "Summit" : fraction <= 0 ? "Trailhead" : "On the climbing trail"}.
              </p>
              <p>
                {next
                  ? `${next.name} unlocks after this mountain's ${required} tasks.`
                  : "This is the final mountain."}
              </p>
            </div>
          </section>
          <aside className={styles.meterWrap}>
            <div
              className={styles.meter}
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(percent)}
              aria-label="Mountain progress from completed tasks"
            >
              <span style={{ ["--fill" as string]: `${percent}%` }} />
            </div>
            <p>{percent}%</p>
            <button type="button" className={styles.checkButton} onClick={() => setSetupId(setupTask?.id ?? "none")}>
              <FlagIcon />
              Checkpoints
            </button>
          </aside>
        </div>

        {notice ? <p className={styles.notice} role="alert">{notice}</p> : null}

        {resultTask && resultTask.mountainId === mountain.id && resultTask.result ? (
          <ResultCard
            task={resultTask}
            onContinue={() => updateActiveAccount({ pendingResultTaskId: null })}
          />
        ) : null}

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>Tasks</h2>
            <button type="button" className={styles.primary} onClick={() => setEditingId("new")}>
              Add task
            </button>
          </div>
          <p className={styles.help}>
            Summit Coins are fictional and have no real-world value. One finished task moves this mountain forward. Checkpoint flags belong to the current task only.
          </p>
          {active && active.mountainId !== mountain.id ? (
            <p className={styles.help}>
              A timer is still saved on {mountainById(active.mountainId)?.name}. Going home does not clear it.
            </p>
          ) : null}
          {visualTask ? (
            <ActiveTask
              task={visualTask}
              now={clock}
              onPause={() => updateActiveAccount({ tasks: replaceTask(account.tasks, pauseTask(visualTask, Date.now())) })}
              onResume={() => updateActiveAccount({ tasks: replaceTask(account.tasks, resumeTask(visualTask, Date.now())) })}
              onFinish={() => settle(visualTask)}
            />
          ) : null}
          <h3>Pending</h3>
          <TaskList
            tasks={tasks.filter((task) => task.status === "pending")}
            empty="No pending tasks."
            accountCoins={account.coins}
            noStakes={settings.noStakes}
            blocked={Boolean(active)}
            onEdit={setEditingId}
            onDelete={removeTask}
            onStart={begin}
          />
          <h3>Completed</h3>
          <ul className={styles.history}>
            {tasks.filter((task) => task.status === "completed").length === 0 ? <li>No completed tasks on this mountain yet.</li> : null}
            {tasks
              .filter((task) => task.status === "completed" && task.result)
              .sort((a, b) => (b.result?.finishedAt ?? 0) - (a.result?.finishedAt ?? 0))
              .map((task) => (
                <li key={task.id}>
                  <strong>{task.name}</strong>
                  {" · "}
                  {task.result?.success ? "On time" : "Late"}
                  {" · "}
                  predicted {formatDuration(task.predictedMs)}, worked {formatDuration(task.result?.actualMs ?? 0)}
                  {task.category ? ` · ${task.category}` : ""}
                </li>
              ))}
          </ul>
        </section>
      </main>
      {editing && editingId ? (
        <TaskEditor
          initial={editingId === "new" ? EMPTY_DRAFT : taskToDraft(editing as GameTask)}
          coins={account.coins}
          noStakes={settings.noStakes}
          title={editingId === "new" ? "New task" : "Edit task"}
          onCancel={() => setEditingId(null)}
          onSave={saveDraft}
        />
      ) : null}
      {setupId ? (
        <CheckpointSetup
          task={setupTask}
          now={clock}
          onClose={() => setSetupId(null)}
          onSave={(intervalMin, summitSight) => {
            if (!setupTask || !account) {
              setSetupId(null);
              return;
            }
            updateActiveAccount({
              tasks: replaceTask(
                account.tasks,
                saveCheckpointSettings(setupTask, intervalMin, summitSight, Date.now()),
              ),
            });
            setSetupId(null);
          }}
        />
      ) : null}
    </ScreenFrame>
  );
}

function ActiveTask({
  task,
  now,
  onPause,
  onResume,
  onFinish,
}: {
  task: GameTask;
  now: number | null;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
}) {
  const elapsed = now ? workingMs(task, now) : task.accumulatedMs;
  const remaining = task.predictedMs - elapsed;
  return (
    <div className={styles.active}>
      <h3>{task.name}</h3>
      {task.description ? <p>{task.description}</p> : null}
      <p>Predicted {formatDuration(task.predictedMs)}. Worked {formatDuration(elapsed)}. {remaining >= 0 ? `${formatDuration(remaining)} left in the prediction.` : `${formatDuration(-remaining)} past the prediction.`}</p>
      <p>
        Stake held: {task.stakeHeld ? task.stake.toLocaleString("en-US") : "0"} Summit Coins.
        {" "}
        Checkpoints: {task.checkpoints.filter((item) => item.state === "completed").length} completed, {task.checkpoints.filter((item) => item.state === "pending").length} pending.
      </p>
      <div className={styles.row}>
        {task.status === "running" ? (
          <button type="button" className={styles.secondary} onClick={onPause}>Pause</button>
        ) : null}
        {task.status === "paused" ? (
          <button type="button" className={styles.secondary} onClick={onResume}>Resume</button>
        ) : null}
        {task.status === "checkpoint" ? <p>The work timer is paused for a checkpoint.</p> : null}
        {task.status === "running" || task.status === "paused" ? (
          <button type="button" className={styles.primary} onClick={onFinish}>Finish</button>
        ) : null}
      </div>
    </div>
  );
}

function TaskList({
  tasks,
  empty,
  accountCoins,
  noStakes,
  blocked,
  onEdit,
  onDelete,
  onStart,
}: {
  tasks: GameTask[];
  empty: string;
  accountCoins: number;
  noStakes: boolean;
  blocked: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onStart: (id: string) => void;
}) {
  if (tasks.length === 0) {
    return <p>{empty}</p>;
  }
  return (
    <ul className={styles.list}>
      {tasks.map((task) => (
        <li key={task.id}>
          <div>
            <strong>{task.name}</strong>
            <p>
              {formatDuration(task.predictedMs)}
              {task.category ? ` · ${task.category}` : ""}
              {task.description ? ` · ${task.description}` : ""}
            </p>
            <p>
              {noStakes
                ? "No stake. The prediction is still recorded."
                : `Stake ${task.stake.toLocaleString("en-US")}. On time, net +${task.stake.toLocaleString("en-US")}. Late, that stake is lost.`}
              {" "}
              Balance {accountCoins.toLocaleString("en-US")}.
            </p>
          </div>
          <div className={styles.row}>
            <button type="button" className={styles.secondary} onClick={() => onEdit(task.id)}>Edit</button>
            <button type="button" className={styles.danger} onClick={() => onDelete(task.id)}>Delete</button>
            <button type="button" className={styles.primary} disabled={blocked} onClick={() => onStart(task.id)}>
              Start
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function TaskEditor({
  initial,
  coins,
  noStakes,
  title,
  onCancel,
  onSave,
}: {
  initial: TaskDraft;
  coins: number;
  noStakes: boolean;
  title: string;
  onCancel: () => void;
  onSave: (draft: TaskDraft) => void;
}) {
  const titleId = useId();
  const [draft, setDraft] = useState(initial);
  const errors = validateDraft(
    { ...draft, stake: noStakes ? 0 : draft.stake },
    coins,
    noStakes,
  );
  return (
    <div className={styles.backdrop}>
      <form
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={(event) => {
          event.preventDefault();
          if (Object.keys(errors).length === 0) {
            onSave(draft);
          }
        }}
      >
        <h2 id={titleId}>{title}</h2>
        <label>
          Task name
          <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required maxLength={80} />
        </label>
        <label>
          Description (optional)
          <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} maxLength={280} rows={3} />
        </label>
        <label>
          Predicted completion time (minutes)
          <input
            type="number"
            min={1}
            max={720}
            step={1}
            value={draft.predictedMinutes}
            onChange={(event) => setDraft({ ...draft, predictedMinutes: Number(event.target.value) })}
            required
          />
        </label>
        <label>
          Category (optional)
          <input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} maxLength={40} />
        </label>
        {noStakes ? (
          <p>{describeStake(0, true)}</p>
        ) : (
          <label>
            Summit Coin stake
            <input
              type="number"
              min={0}
              max={coins}
              step={1}
              value={draft.stake}
              onChange={(event) => setDraft({ ...draft, stake: Number(event.target.value) })}
            />
          </label>
        )}
        {!noStakes ? <p>{describeStake(Math.max(0, draft.stake), false)} Available: {coins.toLocaleString("en-US")}.</p> : null}
        {Object.values(errors)[0] ? <p className={styles.notice}>{Object.values(errors)[0]}</p> : null}
        <div className={styles.row}>
          <button type="submit" className={styles.primary}>Save task</button>
          <button type="button" className={styles.secondary} onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

function CheckpointSetup({
  task,
  now,
  onClose,
  onSave,
}: {
  task: GameTask | null;
  now: number | null;
  onClose: () => void;
  onSave: (intervalMin: number, summitSight: boolean) => void;
}) {
  const titleId = useId();
  const choices = task ? intervalChoices(task.predictedMs) : [];
  const [intervalMin, setIntervalMin] = useState(task && choices.includes(task.intervalMin) ? task.intervalMin : choices[0] ?? 0);
  const [summitSight, setSummitSight] = useState(task ? task.summitSight : true);
  const times = task ? checkpointTimes(task.predictedMs, intervalMin).map((atMs) => atMs / 60000) : [];
  const elapsed = !task || task.status === "pending" || now == null ? 0 : workingMs(task, now);
  return (
    <div className={styles.backdrop}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId}>Checkpoints</h2>
        {!task ? (
          <p>Create a task before setting checkpoints.</p>
        ) : (
          <>
            <p>Current predicted duration: {formatDuration(task.predictedMs)}.</p>
            {choices.length === 0 ? (
              <p>No intermediate checkpoint can fit inside this prediction. The shortest interval is 5 minutes, and a checkpoint is not placed on the predicted finish.</p>
            ) : (
              <label>
                Checkpoint frequency, every {intervalMin} minutes
                <input
                  type="range"
                  min={choices[0]}
                  max={choices[choices.length - 1]}
                  step={5}
                  value={intervalMin}
                  onChange={(event) => setIntervalMin(Number(event.target.value))}
                />
              </label>
            )}
            <p>
              Intermediate checkpoints: {times.length}.
              {times.length > 0 ? ` Times: ${times.join(", ")} minutes.` : ""}
            </p>
            <p>Saved working time stays put. Checkpoints already completed stay completed. New times apply only after {formatDuration(elapsed)} of work.</p>
            <label className={styles.toggle}>
              <input type="checkbox" checked={summitSight} onChange={(event) => setSummitSight(event.target.checked)} />
              SummitSight
            </label>
          </>
        )}
        <div className={styles.row}>
          <button type="button" className={styles.primary} disabled={!task} onClick={() => onSave(intervalMin, summitSight)}>
            Save settings
          </button>
          <button type="button" className={styles.secondary} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ task, onContinue }: { task: GameTask; onContinue: () => void }) {
  const result = task.result;
  if (!result) {
    return null;
  }
  return (
    <section className={`${styles.panel} ${result.reachedSummit ? styles.celebratePanel : ""}`}>
      <h2>{result.reachedSummit ? "Summit reached" : "Task results"}</h2>
      <p><strong>{task.name}</strong></p>
      <ul>
        <li>Predicted: {formatDuration(task.predictedMs)}</li>
        <li>Actual working time: {formatDuration(result.actualMs)}</li>
        <li>{result.success ? "Prediction succeeded." : "Prediction was not met."}</li>
        <li>
          Stake result: {result.stakeNet === 0 ? "no stake coins changed" : `${result.stakeNet > 0 ? "+" : ""}${result.stakeNet} Summit Coins`}
        </li>
        <li>Checkpoint coins: {result.checkpointCoins}</li>
        <li>Bonuses: {result.bonuses.length > 0 ? result.bonuses.join(", ") : "none"}</li>
        <li>Balance after the task: {result.coinsAfter.toLocaleString("en-US")} Summit Coins</li>
        <li>This task counts as one completed climb task.</li>
        <li>Checkpoints completed: {task.checkpoints.filter((item) => item.state === "completed").length}</li>
        {result.reachedSummit ? <li>The summit celebration is for this mountain.</li> : null}
        {result.unlockedMountainName ? <li>New mountain unlocked: {result.unlockedMountainName}.</li> : null}
      </ul>
      <button type="button" className={styles.primary} onClick={onContinue}>Continue climbing</button>
    </section>
  );
}

function taskToDraft(task: GameTask): TaskDraft {
  return {
    name: task.name,
    description: task.description,
    category: task.category,
    predictedMinutes: Math.round(task.predictedMs / 60000),
    stake: task.stake,
  };
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.flagIcon}>
      <path d="M6 21V4M6 4h11l-2 4 2 4H6" />
    </svg>
  );
}
