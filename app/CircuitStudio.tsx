"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

type DeviceKind = "panel" | "switch" | "lamp" | "outlet" | "gfci";
type WireColor = "black" | "white" | "green";

type Device = {
  id: string;
  kind: DeviceKind;
  label: string;
  x: number;
  y: number;
};

type TerminalRef = { deviceId: string; terminalId: string };

type Connection = {
  id: string;
  from: TerminalRef;
  to: TerminalRef;
  color: WireColor;
};

type Lesson = {
  id: string;
  number: string;
  title: string;
  eyebrow: string;
  time: string;
  difficulty: string;
  brief: string;
  devices: Device[];
  expected: Array<{ from: string; to: string; color: WireColor; note: string }>;
  steps: string[];
};

type TerminalDefinition = {
  id: string;
  label: string;
  tone: "hot" | "neutral" | "ground";
  x: number;
  y: number;
};

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 560;

const DEVICE_CATALOG: Record<
  DeviceKind,
  { name: string; short: string; description: string; terminals: TerminalDefinition[] }
> = {
  panel: {
    name: "Service panel",
    short: "PANEL",
    description: "Branch-circuit source",
    terminals: [
      { id: "hot", label: "HOT", tone: "hot", x: 116, y: 28 },
      { id: "neutral", label: "N", tone: "neutral", x: 116, y: 56 },
      { id: "ground", label: "G", tone: "ground", x: 116, y: 84 },
    ],
  },
  switch: {
    name: "Single-pole switch",
    short: "SW",
    description: "Controls one load",
    terminals: [
      { id: "line", label: "LINE", tone: "hot", x: 0, y: 34 },
      { id: "load", label: "LOAD", tone: "hot", x: 116, y: 34 },
      { id: "ground", label: "G", tone: "ground", x: 58, y: 88 },
    ],
  },
  lamp: {
    name: "Ceiling light",
    short: "LIGHT",
    description: "Lighting load",
    terminals: [
      { id: "hot", label: "HOT", tone: "hot", x: 0, y: 52 },
      { id: "neutral", label: "N", tone: "neutral", x: 116, y: 52 },
      { id: "ground", label: "G", tone: "ground", x: 58, y: 88 },
    ],
  },
  outlet: {
    name: "Duplex receptacle",
    short: "OUTLET",
    description: "Standard receptacle",
    terminals: [
      { id: "hot", label: "HOT", tone: "hot", x: 0, y: 38 },
      { id: "neutral", label: "N", tone: "neutral", x: 116, y: 38 },
      { id: "ground", label: "G", tone: "ground", x: 58, y: 88 },
    ],
  },
  gfci: {
    name: "GFCI receptacle",
    short: "GFCI",
    description: "Ground-fault protection",
    terminals: [
      { id: "lineHot", label: "L·H", tone: "hot", x: 0, y: 28 },
      { id: "lineNeutral", label: "L·N", tone: "neutral", x: 0, y: 62 },
      { id: "loadHot", label: "LD·H", tone: "hot", x: 116, y: 28 },
      { id: "loadNeutral", label: "LD·N", tone: "neutral", x: 116, y: 62 },
      { id: "ground", label: "G", tone: "ground", x: 58, y: 90 },
    ],
  },
};

const LESSONS: Lesson[] = [
  {
    id: "single-pole",
    number: "01",
    title: "Switch a ceiling light",
    eyebrow: "Lighting fundamentals",
    time: "8 min",
    difficulty: "Beginner",
    brief:
      "Build a complete lighting branch: line power enters the switch, switched power feeds the lamp, and neutral returns to the panel.",
    devices: [
      { id: "panel", kind: "panel", label: "15A PANEL", x: 90, y: 208 },
      { id: "switch", kind: "switch", label: "WALL SWITCH", x: 380, y: 180 },
      { id: "lamp", kind: "lamp", label: "CEILING LIGHT", x: 675, y: 180 },
    ],
    expected: [
      { from: "panel.hot", to: "switch.line", color: "black", note: "Panel hot → switch LINE" },
      { from: "switch.load", to: "lamp.hot", color: "black", note: "Switch LOAD → light hot" },
      { from: "panel.neutral", to: "lamp.neutral", color: "white", note: "Panel neutral → light neutral" },
      { from: "panel.ground", to: "switch.ground", color: "green", note: "Bond the switch ground" },
      { from: "switch.ground", to: "lamp.ground", color: "green", note: "Continue equipment ground" },
    ],
    steps: [
      "Route the black line conductor from the panel hot to switch LINE.",
      "Route switched hot from switch LOAD to the light's hot terminal.",
      "Return the white neutral directly from the light to the panel neutral.",
      "Complete the green equipment-grounding path across all devices.",
    ],
  },
  {
    id: "receptacle-run",
    number: "02",
    title: "Feed two receptacles",
    eyebrow: "Branch circuits",
    time: "10 min",
    difficulty: "Beginner",
    brief:
      "Practice carrying hot, neutral, and equipment ground from a panel through the first receptacle to a second outlet.",
    devices: [
      { id: "panel", kind: "panel", label: "20A PANEL", x: 72, y: 210 },
      { id: "outlet-a", kind: "outlet", label: "RECEPTACLE 1", x: 370, y: 180 },
      { id: "outlet-b", kind: "outlet", label: "RECEPTACLE 2", x: 690, y: 180 },
    ],
    expected: [
      { from: "panel.hot", to: "outlet-a.hot", color: "black", note: "Panel hot → receptacle 1" },
      { from: "outlet-a.hot", to: "outlet-b.hot", color: "black", note: "Carry hot to receptacle 2" },
      { from: "panel.neutral", to: "outlet-a.neutral", color: "white", note: "Panel neutral → receptacle 1" },
      { from: "outlet-a.neutral", to: "outlet-b.neutral", color: "white", note: "Carry neutral to receptacle 2" },
      { from: "panel.ground", to: "outlet-a.ground", color: "green", note: "Bond receptacle 1" },
      { from: "outlet-a.ground", to: "outlet-b.ground", color: "green", note: "Bond receptacle 2" },
    ],
    steps: [
      "Carry the black hot conductor to the brass-side terminals.",
      "Carry the white neutral along the silver-side terminals.",
      "Keep the equipment-grounding path continuous through both boxes.",
      "Check conductor roles before running the virtual test.",
    ],
  },
  {
    id: "gfci-load",
    number: "03",
    title: "Protect a downstream outlet",
    eyebrow: "GFCI line vs. load",
    time: "12 min",
    difficulty: "Intermediate",
    brief:
      "Learn why incoming power lands on LINE and a protected downstream receptacle must leave from the GFCI LOAD terminals.",
    devices: [
      { id: "panel", kind: "panel", label: "20A PANEL", x: 60, y: 210 },
      { id: "gfci", kind: "gfci", label: "GFCI", x: 370, y: 178 },
      { id: "outlet", kind: "outlet", label: "PROTECTED", x: 705, y: 180 },
    ],
    expected: [
      { from: "panel.hot", to: "gfci.lineHot", color: "black", note: "Panel hot → GFCI LINE hot" },
      { from: "panel.neutral", to: "gfci.lineNeutral", color: "white", note: "Panel neutral → GFCI LINE neutral" },
      { from: "gfci.loadHot", to: "outlet.hot", color: "black", note: "GFCI LOAD hot → protected outlet" },
      { from: "gfci.loadNeutral", to: "outlet.neutral", color: "white", note: "GFCI LOAD neutral → protected outlet" },
      { from: "panel.ground", to: "gfci.ground", color: "green", note: "Bond the GFCI" },
      { from: "gfci.ground", to: "outlet.ground", color: "green", note: "Continue equipment ground" },
    ],
    steps: [
      "Identify the GFCI LINE pair before making any connection.",
      "Land incoming hot and neutral only on LINE.",
      "Feed the downstream receptacle from the matching LOAD pair.",
      "Complete the equipment-grounding path and run the test.",
    ],
  },
];

const WIRE_NAMES: Record<WireColor, string> = {
  black: "Hot / switched hot",
  white: "Neutral",
  green: "Equipment ground",
};

function terminalKey(ref: TerminalRef) {
  return `${ref.deviceId}.${ref.terminalId}`;
}

function pairKey(a: string, b: string) {
  return [a, b].sort().join("::");
}

function DeviceGlyph({ kind, active = false }: { kind: DeviceKind; active?: boolean }) {
  return (
    <span className={`device-glyph device-glyph--${kind} ${active ? "is-active" : ""}`} aria-hidden="true">
      {kind === "lamp" ? <span className="lamp-rays">✦</span> : null}
      {kind === "switch" ? <span className="switch-toggle" /> : null}
      {kind === "outlet" || kind === "gfci" ? (
        <>
          <span className="slot slot-a" />
          <span className="slot slot-b" />
          <span className="slot slot-g" />
          {kind === "gfci" ? <span className="gfci-buttons" /> : null}
        </>
      ) : null}
      {kind === "panel" ? (
        <>
          <span className="breaker-line" />
          <span className="breaker-line second" />
          <span className="breaker-line third" />
        </>
      ) : null}
    </span>
  );
}

export function CircuitStudio() {
  const [activeLessonId, setActiveLessonId] = useState(LESSONS[0].id);
  const activeLesson = LESSONS.find((lesson) => lesson.id === activeLessonId) ?? LESSONS[0];
  const [devices, setDevices] = useState<Device[]>(activeLesson.devices);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [wireColor, setWireColor] = useState<WireColor>("black");
  const [selectedTerminal, setSelectedTerminal] = useState<TerminalRef | null>(null);
  const [wireDrag, setWireDrag] = useState<{ from: TerminalRef; x: number; y: number } | null>(null);
  const [powerOn, setPowerOn] = useState(false);
  const [lessonOpen, setLessonOpen] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const draggingDevice = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    try {
      const stored = window.localStorage.getItem("wirewise-completed");
      if (stored) timer = window.setTimeout(() => setCompletedLessons(JSON.parse(stored)), 0);
    } catch {
      // Local progress is optional; the lesson still works without it.
    }
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const resetLesson = useCallback(
    (lesson: Lesson = activeLesson) => {
      setDevices(lesson.devices);
      setConnections([]);
      setSelectedTerminal(null);
      setWireDrag(null);
      setPowerOn(false);
      setToast(null);
    },
    [activeLesson],
  );

  const changeLesson = (lesson: Lesson) => {
    setActiveLessonId(lesson.id);
    resetLesson(lesson);
    setLessonOpen(true);
  };

  const terminalPoint = useCallback(
    (ref: TerminalRef) => {
      const device = devices.find((item) => item.id === ref.deviceId);
      if (!device) return { x: 0, y: 0 };
      const terminal = DEVICE_CATALOG[device.kind].terminals.find((item) => item.id === ref.terminalId);
      return { x: device.x + (terminal?.x ?? 0), y: device.y + (terminal?.y ?? 0) };
    },
    [devices],
  );

  const expectedMap = useMemo(() => {
    return new Map(activeLesson.expected.map((item) => [pairKey(item.from, item.to), item]));
  }, [activeLesson]);

  const connectionResults = useMemo(() => {
    return connections.map((connection) => {
      const key = pairKey(terminalKey(connection.from), terminalKey(connection.to));
      const expected = expectedMap.get(key);
      return { connection, valid: Boolean(expected && expected.color === connection.color), expected };
    });
  }, [connections, expectedMap]);

  const correctKeys = useMemo(
    () => new Set(connectionResults.filter((item) => item.valid).map((item) => pairKey(terminalKey(item.connection.from), terminalKey(item.connection.to)))),
    [connectionResults],
  );
  const correctCount = correctKeys.size;
  const mistakes = connectionResults.filter((item) => !item.valid).length;
  const isComplete = correctCount === activeLesson.expected.length && mistakes === 0;
  const progress = Math.round((correctCount / activeLesson.expected.length) * 100);

  useEffect(() => {
    if (!isComplete || completedLessons.includes(activeLesson.id)) return;
    const next = [...completedLessons, activeLesson.id];
    const timer = window.setTimeout(() => {
      setCompletedLessons(next);
      try {
        window.localStorage.setItem("wirewise-completed", JSON.stringify(next));
      } catch {
        // Ignore storage failures.
      }
      setToast("Circuit verified — lesson complete!");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeLesson.id, completedLessons, isComplete]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const addConnection = useCallback(
    (from: TerminalRef, to: TerminalRef) => {
      if (terminalKey(from) === terminalKey(to)) return;
      const key = pairKey(terminalKey(from), terminalKey(to));
      setConnections((current) => {
        if (current.some((item) => pairKey(terminalKey(item.from), terminalKey(item.to)) === key)) return current;
        return [
          ...current,
          { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, from, to, color: wireColor },
        ];
      });
      setSelectedTerminal(null);
      setPowerOn(false);
    },
    [wireColor],
  );

  const handleTerminalClick = (ref: TerminalRef) => {
    if (!selectedTerminal) {
      setSelectedTerminal(ref);
      return;
    }
    addConnection(selectedTerminal, ref);
  };

  const boardCoordinates = useCallback((clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  }, []);

  const wireDragFrom = wireDrag?.from;

  useEffect(() => {
    if (!wireDragFrom) return;
    const from = wireDragFrom;
    const move = (event: PointerEvent) => {
      const point = boardCoordinates(event.clientX, event.clientY);
      setWireDrag((current) => (current ? { ...current, ...point } : null));
    };
    const up = (event: PointerEvent) => {
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-terminal]");
      if (target?.dataset.device && target.dataset.terminal) {
        addConnection(from, {
          deviceId: target.dataset.device,
          terminalId: target.dataset.terminal,
        });
      }
      setWireDrag(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [addConnection, boardCoordinates, wireDragFrom]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!draggingDevice.current) return;
      const point = boardCoordinates(event.clientX, event.clientY);
      const { id, offsetX, offsetY } = draggingDevice.current;
      setDevices((current) =>
        current.map((device) =>
          device.id === id
            ? {
                ...device,
                x: Math.max(12, Math.min(CANVAS_WIDTH - 130, point.x - offsetX)),
                y: Math.max(44, Math.min(CANVAS_HEIGHT - 115, point.y - offsetY)),
              }
            : device,
        ),
      );
    };
    const up = () => {
      draggingDevice.current = null;
      document.body.classList.remove("is-device-dragging");
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [boardCoordinates]);

  const startDeviceDrag = (event: ReactPointerEvent, device: Device) => {
    if ((event.target as HTMLElement).closest("[data-terminal]")) return;
    const point = boardCoordinates(event.clientX, event.clientY);
    draggingDevice.current = { id: device.id, offsetX: point.x - device.x, offsetY: point.y - device.y };
    document.body.classList.add("is-device-dragging");
  };

  const placeDevice = (kind: DeviceKind, x = 430, y = 360) => {
    const count = devices.filter((device) => device.kind === kind).length + 1;
    const definition = DEVICE_CATALOG[kind];
    setDevices((current) => [
      ...current,
      {
        id: `${kind}-${Date.now()}`,
        kind,
        label: `${definition.short} ${count}`,
        x: Math.min(x, CANVAS_WIDTH - 130),
        y: Math.min(y, CANVAS_HEIGHT - 115),
      },
    ]);
    setPowerOn(false);
  };

  const dropDevice = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const kind = event.dataTransfer.getData("application/wirewise-device") as DeviceKind;
    if (!DEVICE_CATALOG[kind]) return;
    const point = boardCoordinates(event.clientX, event.clientY);
    placeDevice(kind, point.x - 58, point.y - 48);
  };

  const removeConnection = (id: string) => {
    setConnections((current) => current.filter((item) => item.id !== id));
    setPowerOn(false);
  };

  const nextExpected = activeLesson.expected.find((item) => !correctKeys.has(pairKey(item.from, item.to)));

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#studio" aria-label="Wirewise Lab home">
          <span className="brand-mark"><span>W</span></span>
          <span><strong>WIREWISE</strong><small>LEARNING LAB</small></span>
        </a>
        <div className="lesson-location">
          <span>COURSE 01</span>
          <strong>Residential wiring</strong>
        </div>
        <div className="topbar-actions">
          <div className={`power-readout ${powerOn ? "is-on" : ""}`}>
            <span className="power-pip" />
            VIRTUAL POWER {powerOn ? "ON" : "OFF"}
          </div>
          <button
            className={`power-switch ${powerOn ? "is-on" : ""}`}
            type="button"
            role="switch"
            aria-checked={powerOn}
            onClick={() => setPowerOn((value) => !value)}
          >
            <span />
          </button>
          <button className="avatar" type="button" aria-label="Learner profile">JL</button>
        </div>
      </header>

      <div className="workspace" id="studio">
        <aside className={`lesson-rail ${lessonOpen ? "is-open" : ""}`}>
          <button className="rail-toggle" type="button" onClick={() => setLessonOpen((value) => !value)} aria-expanded={lessonOpen}>
            <span>Lessons</span><span>{lessonOpen ? "‹" : "›"}</span>
          </button>
          <div className="rail-content">
            <div className="course-progress">
              <div className="progress-copy"><span>YOUR PROGRESS</span><strong>{completedLessons.length} / {LESSONS.length}</strong></div>
              <div className="progress-track"><span style={{ width: `${(completedLessons.length / LESSONS.length) * 100}%` }} /></div>
            </div>
            <nav className="lesson-list" aria-label="Course lessons">
              {LESSONS.map((lesson) => {
                const done = completedLessons.includes(lesson.id);
                const active = lesson.id === activeLesson.id;
                return (
                  <button key={lesson.id} className={`lesson-link ${active ? "is-active" : ""}`} type="button" onClick={() => changeLesson(lesson)}>
                    <span className="lesson-number">{done ? "✓" : lesson.number}</span>
                    <span><small>{lesson.eyebrow}</small><strong>{lesson.title}</strong></span>
                    <span className="lesson-arrow">→</span>
                  </button>
                );
              })}
            </nav>
            <div className="safety-note">
              <span className="safety-icon">!</span>
              <div><strong>Practice safely</strong><p>This is a simplified, de-energized simulation. Real electrical work should follow local code and qualified guidance.</p></div>
            </div>
          </div>
        </aside>

        <section className="studio-panel">
          <div className="lesson-heading">
            <div>
              <p className="eyebrow">LESSON {activeLesson.number} · {activeLesson.eyebrow}</p>
              <h1>{activeLesson.title}</h1>
              <p>{activeLesson.brief}</p>
            </div>
            <div className="lesson-meta">
              <span>◷ {activeLesson.time}</span>
              <span>◇ {activeLesson.difficulty}</span>
            </div>
          </div>

          <div className="workbench-card">
            <div className="tool-strip">
              <div className="wire-tools" aria-label="Wire color">
                <span className="tool-label">WIRE</span>
                {(["black", "white", "green"] as WireColor[]).map((color) => (
                  <button
                    key={color}
                    className={`wire-choice wire-choice--${color} ${wireColor === color ? "is-selected" : ""}`}
                    type="button"
                    onClick={() => { setWireColor(color); setSelectedTerminal(null); }}
                    aria-label={WIRE_NAMES[color]}
                    title={WIRE_NAMES[color]}
                  ><span /></button>
                ))}
              </div>
              <div className="tool-hint"><span className="mouse-icon">↗</span> Drag between terminals or click two terminals</div>
              <div className="edit-tools">
                <button type="button" onClick={() => setConnections((current) => current.slice(0, -1))} disabled={!connections.length}>↶ <span>Undo</span></button>
                <button type="button" onClick={() => resetLesson()}>↻ <span>Reset</span></button>
              </div>
            </div>

            <div
              ref={boardRef}
              className={`circuit-board ${powerOn ? "power-on" : ""} ${isComplete ? "is-complete" : ""}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={dropDevice}
              aria-label="Interactive circuit workbench"
            >
              <div className="board-badge"><span /> DE-ENERGIZED TRAINING BOARD</div>
              <div className="board-scale">120V AC · SCHEMATIC VIEW</div>
              <svg className="wire-layer" viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} aria-hidden="true">
                {connections.map((connection) => {
                  const start = terminalPoint(connection.from);
                  const end = terminalPoint(connection.to);
                  const bend = Math.max(55, Math.abs(end.x - start.x) * 0.38);
                  const direction = end.x >= start.x ? 1 : -1;
                  const d = `M ${start.x} ${start.y} C ${start.x + bend * direction} ${start.y}, ${end.x - bend * direction} ${end.y}, ${end.x} ${end.y}`;
                  const result = connectionResults.find((item) => item.connection.id === connection.id);
                  return (
                    <g key={connection.id} className={`${result?.valid ? "wire-valid" : "wire-invalid"}`}>
                      <path className="wire-shadow" d={d} />
                      <path className={`wire wire--${connection.color}`} d={d} />
                    </g>
                  );
                })}
                {wireDrag ? (() => {
                  const start = terminalPoint(wireDrag.from);
                  const bend = Math.max(55, Math.abs(wireDrag.x - start.x) * 0.38);
                  const direction = wireDrag.x >= start.x ? 1 : -1;
                  return <path className={`wire wire--${wireColor} wire-preview`} d={`M ${start.x} ${start.y} C ${start.x + bend * direction} ${start.y}, ${wireDrag.x - bend * direction} ${wireDrag.y}, ${wireDrag.x} ${wireDrag.y}`} />;
                })() : null}
              </svg>

              {devices.map((device) => {
                const definition = DEVICE_CATALOG[device.kind];
                const lightActive = device.kind === "lamp" && powerOn && isComplete;
                return (
                  <article
                    key={device.id}
                    className={`circuit-device circuit-device--${device.kind} ${lightActive ? "is-powered" : ""}`}
                    style={{ "--x": `${(device.x / CANVAS_WIDTH) * 100}%`, "--y": `${(device.y / CANVAS_HEIGHT) * 100}%` } as CSSProperties}
                    onPointerDown={(event) => startDeviceDrag(event, device)}
                    aria-label={`${device.label}, draggable device`}
                  >
                    <div className="device-card">
                      <span className="device-kicker">{definition.short}</span>
                      <DeviceGlyph kind={device.kind} active={lightActive} />
                      <strong>{device.label}</strong>
                      <small>{definition.description}</small>
                    </div>
                    {definition.terminals.map((terminal) => {
                      const ref = { deviceId: device.id, terminalId: terminal.id };
                      const selected = selectedTerminal && terminalKey(selectedTerminal) === terminalKey(ref);
                      return (
                        <button
                          key={terminal.id}
                          type="button"
                          className={`terminal terminal--${terminal.tone} ${selected ? "is-selected" : ""}`}
                          style={{ left: `${(terminal.x / 116) * 100}%`, top: `${(terminal.y / 96) * 100}%` }}
                          data-terminal={terminal.id}
                          data-device={device.id}
                          aria-label={`${device.label} ${terminal.label} terminal`}
                          title={`${device.label}: ${terminal.label}`}
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            const point = terminalPoint(ref);
                            setWireDrag({ from: ref, ...point });
                          }}
                          onClick={(event) => { event.stopPropagation(); handleTerminalClick(ref); }}
                        ><span>{terminal.label}</span></button>
                      );
                    })}
                  </article>
                );
              })}

              {!connections.length ? (
                <div className="start-callout">
                  <span>1</span>
                  <p><strong>Start here</strong>Select black wire, then drag from <b>PANEL HOT</b> to the first device.</p>
                </div>
              ) : null}

              <div className={`circuit-status ${powerOn && isComplete ? "is-live" : powerOn ? "is-open" : ""}`}>
                <span className="status-bolt">ϟ</span>
                <div>
                  <small>SIMULATION</small>
                  <strong>{powerOn ? (isComplete ? "Current flowing" : "Open / incorrect circuit") : "Power is off"}</strong>
                </div>
              </div>
            </div>

            <div className="bench-footer">
              <button className="library-toggle" type="button" onClick={() => setLibraryOpen((value) => !value)} aria-expanded={libraryOpen}>
                <span className="plus">+</span> DEVICE LIBRARY <span>{libraryOpen ? "⌃" : "⌄"}</span>
              </button>
              <p><span className="key-cap">TIP</span> Devices can be dragged anywhere on the board.</p>
            </div>
            {libraryOpen ? (
              <div className="device-library">
                {(Object.keys(DEVICE_CATALOG) as DeviceKind[]).map((kind) => {
                  const device = DEVICE_CATALOG[kind];
                  return (
                    <button
                      key={kind}
                      className="library-item"
                      type="button"
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("application/wirewise-device", kind);
                        event.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => placeDevice(kind)}
                    >
                      <DeviceGlyph kind={kind} />
                      <span><strong>{device.name}</strong><small>{device.description}</small></span>
                      <span className="drag-grip">⠿</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </section>

        <aside className="coach-panel">
          <div className="coach-heading">
            <span className="coach-avatar">W</span>
            <div><small>LIVE COACH</small><strong>Circuit check</strong></div>
            <span className="live-dot">LIVE</span>
          </div>

          <div className="score-card">
            <div className="score-ring" style={{ "--progress": `${progress * 3.6}deg` } as CSSProperties}>
              <span>{progress}<small>%</small></span>
            </div>
            <div><small>CIRCUIT SCORE</small><strong>{isComplete ? "Ready to test" : mistakes ? "Needs attention" : "Keep wiring"}</strong><p>{correctCount} of {activeLesson.expected.length} paths verified</p></div>
          </div>

          <div className={`coach-message ${mistakes ? "has-warning" : ""}`}>
            <span>{mistakes ? "!" : "i"}</span>
            <p>{mistakes ? `${mistakes} connection${mistakes > 1 ? "s" : ""} use the wrong terminals or conductor color. Remove the marked row and try again.` : nextExpected ? `Next: ${nextExpected.note}. Use the ${WIRE_NAMES[nextExpected.color].toLowerCase()} conductor.` : "Every required path checks out. Turn on virtual power to observe the circuit."}</p>
          </div>

          <div className="checklist">
            <div className="section-label"><span>LESSON CHECKLIST</span><span>{correctCount}/{activeLesson.expected.length}</span></div>
            {activeLesson.expected.map((expected) => {
              const done = correctKeys.has(pairKey(expected.from, expected.to));
              return (
                <div className={`check-row ${done ? "is-done" : ""}`} key={`${expected.from}-${expected.to}`}>
                  <span className="check-box">{done ? "✓" : ""}</span>
                  <span>{expected.note}<small className={`mini-wire mini-wire--${expected.color}`} /></span>
                </div>
              );
            })}
          </div>

          {connections.length ? (
            <div className="connection-list">
              <div className="section-label"><span>YOUR WIRES</span><span>{connections.length}</span></div>
              {connectionResults.map(({ connection, valid }) => (
                <div className="connection-row" key={connection.id}>
                  <span className={`connection-swatch connection-swatch--${connection.color}`} />
                  <span><strong>{connection.from.deviceId}</strong> → <strong>{connection.to.deviceId}</strong><small>{valid ? "Correct path" : "Check this connection"}</small></span>
                  <button type="button" onClick={() => removeConnection(connection.id)} aria-label="Remove connection">×</button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="step-guide">
            <div className="section-label"><span>BUILD SEQUENCE</span><span>{activeLesson.steps.length} STEPS</span></div>
            {activeLesson.steps.map((step, index) => (
              <div className="guide-step" key={step}><span>{index + 1}</span><p>{step}</p></div>
            ))}
          </div>

          <button className={`test-button ${isComplete ? "is-ready" : ""}`} type="button" onClick={() => setPowerOn(true)}>
            <span>ϟ</span> RUN CIRCUIT TEST
          </button>
          <p className="coach-disclaimer">Virtual training only · Always de-energize and verify before real work.</p>
        </aside>
      </div>

      {toast ? <div className="toast" role="status"><span>✓</span>{toast}</div> : null}
    </main>
  );
}
