import Image from "next/image";
import { DURATIONS, FIGURE_OPTIONS, RANDOMIZE_OPTIONS, currentPhotoId, nextPhotoId, type Drill, type DrillSource } from "@/lib/useDrill";
import { PHOTOS, PHOTO_CREDIT, getPhoto } from "@/lib/photos";
import styles from "./DrillInterface.module.css";

type DrillInterfaceProps = {
  drill: Drill;
  /** Hide the setup/done cards (e.g. while the whole interface is hidden). */
  cardsHidden: boolean;
  /** Leave Drill and go back to the mode the artist came from. */
  onClose: () => void;
};

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" className={styles.close} onClick={onClose} aria-label="Close drill" title="Close (Esc)">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  );
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = seconds / 60;
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

const RING = 2 * Math.PI * 28;
const PREVIEW_PHOTO = PHOTOS.find((p) => !p.nude) ?? PHOTOS[0];

/**
 * Timed gesture drills: set up → run (timer, pause, next, end) → done.
 * Draws either from the 3D figure or from public-domain photos. During a
 * run everything else steps aside; only the pose, a timer and three quiet
 * controls remain.
 */
export default function DrillInterface({ drill, cardsHidden, onClose }: DrillInterfaceProps) {
  const { state } = drill;

  if (state.phase === "running" || state.phase === "paused") {
    return <DrillRun drill={drill} />;
  }
  if (cardsHidden) return null;
  if (state.phase === "done") return <DrillDone drill={drill} onClose={onClose} />;
  return <DrillSetup drill={drill} onClose={onClose} />;
}

function DrillSetup({ drill, onClose }: { drill: Drill; onClose: () => void }) {
  const { state } = drill;
  const totalMinutes = Math.max(1, Math.round((state.count * state.duration) / 60));

  const sources: { id: DrillSource; title: string; detail: string; image?: string; contain?: boolean; disabled?: boolean }[] = [
    { id: "figure", title: "3D figure", detail: "A new pose, angle and light each time", image: "/thumbnails/poses/Jog_Fwd_Loop.png", contain: true },
    {
      id: "photos",
      title: "Photos",
      detail: PHOTOS.length ? `${PHOTOS.length} Muybridge studies` : "Coming soon",
      image: PREVIEW_PHOTO?.file,
      // Not selectable until a photo set is installed.
      disabled: PHOTOS.length === 0,
    },
  ];

  return (
    <div className={styles.scrim}>
      <div className={`panel ${styles.card}`}>
        <div className={styles.cardHeader}>
          <div className={styles.status}>
            <span className={styles.dot} />
            <span className="text-meta">Drill</span>
          </div>
          <CloseButton onClose={onClose} />
        </div>
        <span className={styles.headline}>Gesture drill</span>
        <span className="text-secondary">One pose after another, on a timer. Draw fast and keep moving.</span>

        <div className={styles.block}>
          <span className={styles.label}>Draw from</span>
          <div className={styles.sources} role="radiogroup" aria-label="Draw from">
            {sources.map((source) => {
              const active = state.source === source.id;
              return (
                <button
                  key={source.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={source.disabled}
                  className={`${styles.source} ${active ? styles.sourceActive : ""}`}
                  onClick={() => drill.setSource(source.id)}
                >
                  <span className={`${styles.sourceImage} ${source.contain ? styles.sourceContain : ""}`}>
                    {source.image && <Image src={source.image} alt="" fill sizes="180px" unoptimized />}
                  </span>
                  <span className={styles.sourceTitle}>{source.title}</span>
                  <span className={styles.sourceDetail}>{source.detail}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.block}>
          <span className={styles.label}>Hold each pose for</span>
          <div className={styles.segmented} role="radiogroup" aria-label="Pose duration">
            {DURATIONS.map((d) => (
              <button
                key={d.seconds}
                type="button"
                role="radio"
                aria-checked={d.seconds === state.duration}
                className={`${styles.segment} ${d.seconds === state.duration ? styles.segmentActive : ""}`}
                onClick={() => drill.setDuration(d.seconds)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>Number of poses</span>
          <div className={styles.stepper}>
            <button type="button" className={styles.stepperButton} onClick={() => drill.changeCount(-5)} aria-label="Fewer poses" disabled={state.count <= 5}>
              −
            </button>
            <span className={styles.stepperValue}>{state.count}</span>
            <button type="button" className={styles.stepperButton} onClick={() => drill.changeCount(5)} aria-label="More poses" disabled={state.count >= 60}>
              +
            </button>
          </div>
        </div>

        <hr className="divider" />

        {state.source === "figure" ? (
          <div className={styles.options}>
            <div className={styles.row}>
              <span className={styles.label}>Model</span>
              <div className={`${styles.segmented} ${styles.segmentedSmall}`} role="radiogroup" aria-label="Model">
                {FIGURE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={option.id === state.figures}
                    className={`${styles.segment} ${option.id === state.figures ? styles.segmentActive : ""}`}
                    onClick={() => drill.setFigures(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-meta">Change with each pose</span>
            {RANDOMIZE_OPTIONS.map((option) => (
              <Toggle
                key={option.key}
                label={option.label}
                detail={option.detail}
                on={state.randomize[option.key]}
                onToggle={() => drill.toggle(option.key)}
              />
            ))}
          </div>
        ) : (
          <div className={styles.options}>
            <span className="text-meta">Photos</span>
            <Toggle
              label="Include nude studies"
              detail="Classical academic figure studies"
              on={state.includeNude}
              onToggle={drill.toggleNude}
            />
            <span className={styles.note}>
              {drill.photoCount} photos in this set
              {drill.photoCount > 0 && drill.photoCount < state.count ? " · some will repeat" : ""}
            </span>
          </div>
        )}

        <button type="button" className={`button button-primary ${styles.start}`} onClick={drill.start} disabled={!drill.canStart}>
          Start · about {totalMinutes} min
        </button>
        <span className={styles.hint}>While drawing: Space pauses · → next pose · Esc ends</span>
      </div>
    </div>
  );
}

function Toggle({ label, detail, on, onToggle }: { label: string; detail?: string; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} className={styles.toggleRow} onClick={onToggle}>
      <span className={styles.toggleText}>
        <span className={styles.label}>{label}</span>
        {detail && <span className={styles.toggleDetail}>{detail}</span>}
      </span>
      <span className={`${styles.switch} ${on ? styles.switchOn : ""}`}>
        <span className={styles.knob} />
      </span>
    </button>
  );
}

function DrillRun({ drill }: { drill: Drill }) {
  const { state } = drill;
  const progress = state.secondsLeft / state.duration;
  const photo = getPhoto(currentPhotoId(state) ?? "");
  const upcoming = getPhoto(nextPhotoId(state) ?? "");

  return (
    <>
      {state.source === "photos" && photo && (
        <div className={styles.photoStage}>
          <div className={styles.photoFrame}>
            <Image
              key={photo.id}
              src={photo.file}
              alt={photo.action}
              width={photo.width}
              height={photo.height}
              className={styles.photo}
              unoptimized
              preload
            />
          </div>
          <a className={styles.credit} href={photo.source} target="_blank" rel="noopener noreferrer">
            {photo.action} · {PHOTO_CREDIT}
          </a>
          {upcoming && (
            // Load the next photo ahead of time so the switch is instant.
            <Image src={upcoming.file} alt="" width={upcoming.width} height={upcoming.height} className={styles.preload} unoptimized loading="eager" />
          )}
        </div>
      )}

      <div className={styles.session} aria-hidden="true">
        <div className={styles.sessionFill} style={{ width: `${((state.index - 1 + (1 - progress)) / state.count) * 100}%` }} />
      </div>

      <div className={styles.timer}>
        <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="28" className={styles.track} />
          <circle
            cx="32"
            cy="32"
            r="28"
            className={styles.progress}
            strokeDasharray={RING}
            strokeDashoffset={RING * (1 - progress)}
            transform="rotate(-90 32 32)"
            // Snap (don't animate) back to a full ring when a new pose starts.
            style={state.secondsLeft === state.duration ? { transition: "none" } : undefined}
          />
        </svg>
        <span className={styles.clock}>{formatClock(state.secondsLeft)}</span>
        <span className={styles.count} aria-live="polite">{state.phase === "paused" ? "Paused" : `${state.index} of ${state.count}`}</span>
      </div>

      <div className={styles.controls}>
        {state.phase === "paused" ? (
          <button type="button" className={styles.control} onClick={drill.resume} title="Resume (Space)">
            Resume
          </button>
        ) : (
          <button type="button" className={styles.control} onClick={drill.pause} title="Pause (Space)">
            Pause
          </button>
        )}
        <button type="button" className={styles.control} onClick={drill.skip} title="Next pose (→)">
          Next
        </button>
        <button type="button" className={`${styles.control} ${styles.quiet}`} onClick={drill.end} title="End drill (Esc)">
          End
        </button>
      </div>
    </>
  );
}

function DrillDone({ drill, onClose }: { drill: Drill; onClose: () => void }) {
  const { state } = drill;
  const totalMinutes = Math.max(1, Math.round((state.count * state.duration) / 60));
  return (
    <div className={styles.scrim}>
      <div className={`panel ${styles.card} ${styles.doneCard}`}>
        <div className={styles.cardHeader}>
          <div className={styles.status}>
            <span className={styles.dot} />
            <span className="text-meta">Drill complete</span>
          </div>
          <CloseButton onClose={onClose} />
        </div>
        <span className={styles.headline}>Nice work.</span>
        <span className="text-secondary">
          {state.count} poses · {formatDuration(state.duration)} each · about {totalMinutes} minutes of drawing
        </span>
        <div className={styles.actions}>
          <button type="button" className="button button-primary" onClick={drill.start}>
            Run again
          </button>
          <button type="button" className="button button-secondary" onClick={drill.end}>
            Change settings
          </button>
        </div>
      </div>
    </div>
  );
}
