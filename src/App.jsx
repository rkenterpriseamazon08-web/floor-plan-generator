import React, { useMemo, useRef, useState } from "react";
import "./App.css";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Text as DreiText } from "@react-three/drei";
import { Home, Plus, Trash2, LayoutGrid, RotateCcw } from "lucide-react";

const DEFAULT_SCALE = 12;
const DEFAULT_ROOM_HEIGHT = 10;
const WALL_THICKNESS_FT = 0.5;

const ROOM_COLORS = [
  "#eef4ff",
  "#f4f7ec",
  "#fff2e8",
  "#f3efff",
  "#e9fbf6",
  "#fff7db",
];
const WALL_OPTIONS = ["top", "bottom", "left", "right"];
const DEFAULT_DOOR_WIDTH = 3;
const DEFAULT_DOOR_HEIGHT = 7;
const DEFAULT_WINDOW_WIDTH = 4;
const DEFAULT_WINDOW_HEIGHT = 3;
const DEFAULT_WINDOW_SILL_HEIGHT = 3;

function getWallLength(room, wall) {
  if (wall === "top" || wall === "bottom") return Number(room.width) || 0;
  return Number(room.height) || 0;
}

function normalizeDoor(door, room) {
  const wall = WALL_OPTIONS.includes(door?.wall) ? door.wall : "top";
  const wallLength = getWallLength(room, wall);
  const width = clamp(Number(door?.width) || DEFAULT_DOOR_WIDTH, 0.5, Math.max(0.5, wallLength));
  const height = Math.max(Number(door?.height) || DEFAULT_DOOR_HEIGHT, 0.5);
  const maxOffset = Math.max(0, wallLength - width);
  const offset = clamp(Number(door?.offset) || 0, 0, maxOffset);

  return { wall, offset, width, height };
}

function normalizeWindow(windowItem, room, wallHeight) {
  const wall = WALL_OPTIONS.includes(windowItem?.wall) ? windowItem.wall : "top";
  const wallLength = getWallLength(room, wall);
  const width = clamp(
    Number(windowItem?.width) || DEFAULT_WINDOW_WIDTH,
    0.5,
    Math.max(0.5, wallLength)
  );
  const height = clamp(
    Number(windowItem?.height) || DEFAULT_WINDOW_HEIGHT,
    0.5,
    Math.max(0.5, Number(wallHeight) || DEFAULT_ROOM_HEIGHT)
  );
  const maxOffset = Math.max(0, wallLength - width);
  const offset = clamp(Number(windowItem?.offset) || 0, 0, maxOffset);

  const maxSill = Math.max(0, (Number(wallHeight) || DEFAULT_ROOM_HEIGHT) - height);
  const sillHeight = clamp(
    Number(windowItem?.sillHeight) || DEFAULT_WINDOW_SILL_HEIGHT,
    0,
    maxSill
  );

  return { wall, offset, width, height, sillHeight };
}

function getRoomOpenings(room, wallHeight) {
  const doors = Array.isArray(room.doors)
    ? room.doors.map((door) => ({ ...normalizeDoor(door, room), type: "door" }))
    : [];

  const windows = Array.isArray(room.windows)
    ? room.windows.map((windowItem) => ({
        ...normalizeWindow(windowItem, room, wallHeight),
        type: "window",
      }))
    : [];

  return { doors, windows };
}

function getOpeningLineSegment(room, opening) {
  const x = Number(room.x) || 0;
  const y = Number(room.y) || 0;
  const w = Number(room.width) || 0;
  const h = Number(room.height) || 0;
  const offset = Number(opening.offset) || 0;
  const width = Number(opening.width) || 0;

  switch (opening.wall) {
    case "top":
      return { x1: x + offset, y1: y, x2: x + offset + width, y2: y, wall: "top" };
    case "bottom":
      return { x1: x + offset, y1: y + h, x2: x + offset + width, y2: y + h, wall: "bottom" };
    case "left":
      return { x1: x, y1: y + offset, x2: x, y2: y + offset + width, wall: "left" };
    case "right":
      return { x1: x + w, y1: y + offset, x2: x + w, y2: y + offset + width, wall: "right" };
    default:
      return null;
  }
}

function rangesOverlap(a1, a2, b1, b2) {
  return Math.max(a1, b1) < Math.min(a2, b2);
}

function subtractRanges(baseStart, baseEnd, cuts) {
  let parts = [{ start: baseStart, end: baseEnd }];

  cuts.forEach((cut) => {
    const next = [];
    parts.forEach((part) => {
      if (!rangesOverlap(part.start, part.end, cut.start, cut.end)) {
        next.push(part);
        return;
      }

      if (cut.start > part.start) {
        next.push({ start: part.start, end: cut.start });
      }

      if (cut.end < part.end) {
        next.push({ start: cut.end, end: part.end });
      }
    });
    parts = next;
  });

  return parts.filter((part) => part.end - part.start > 0.01);
}

function getSegmentOpenings(segment, rooms, wallHeight) {
  const isVertical = segment.x1 === segment.x2;
  const fixed = isVertical ? segment.x1 : segment.y1;
  const segStart = isVertical ? Math.min(segment.y1, segment.y2) : Math.min(segment.x1, segment.x2);
  const segEnd = isVertical ? Math.max(segment.y1, segment.y2) : Math.max(segment.x1, segment.x2);

  const openings = [];

  rooms.forEach((room) => {
    const { doors, windows } = getRoomOpenings(room, wallHeight);
    [...doors, ...windows].forEach((opening) => {
      const line = getOpeningLineSegment(room, opening);
      if (!line) return;

      if (isVertical) {
        if (line.x1 !== line.x2 || Math.abs(line.x1 - fixed) > 0.001) return;
        const start = Math.max(segStart, Math.min(line.y1, line.y2));
        const end = Math.min(segEnd, Math.max(line.y1, line.y2));
        if (end - start <= 0.01) return;
        openings.push({ ...opening, start, end });
      } else {
        if (line.y1 !== line.y2 || Math.abs(line.y1 - fixed) > 0.001) return;
        const start = Math.max(segStart, Math.min(line.x1, line.x2));
        const end = Math.min(segEnd, Math.max(line.x1, line.x2));
        if (end - start <= 0.01) return;
        openings.push({ ...opening, start, end });
      }
    });
  });

  return openings;
}
const createRoom = (index) => ({
  id: crypto.randomUUID(),
  name: `Room ${index + 1}`,
  width: 10,
  height: 10,
  x: 0,
  y: 0,
  color: ROOM_COLORS[index % ROOM_COLORS.length],
  doors: [],
  windows: [],
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeRoom(room, totalWidth, totalHeight) {
  const width = Math.max(Number(room.width) || 0, 0);
  const height = Math.max(Number(room.height) || 0, 0);
  const x = Number(room.x) || 0;
  const y = Number(room.y) || 0;

  const baseRoom = {
    ...room,
    width,
    height,
    x: clamp(x, 0, Math.max(0, totalWidth - width)),
    y: clamp(y, 0, Math.max(0, totalHeight - height)),
  };

  return {
    ...baseRoom,
    doors: Array.isArray(baseRoom.doors)
      ? baseRoom.doors.map((door) => normalizeDoor(door, baseRoom))
      : [],
    windows: Array.isArray(baseRoom.windows)
      ? baseRoom.windows.map((windowItem) =>
          normalizeWindow(windowItem, baseRoom, DEFAULT_ROOM_HEIGHT)
        )
      : [],
  };
}
function fitRoomsInGrid(rooms, totalWidth, totalHeight) {
  if (!rooms.length) return [];

  const placed = [];
  let cursorX = 0;
  let cursorY = 0;
  let currentRowHeight = 0;

  for (const room of rooms) {
    const roomWidth = Number(room.width) || 0;
    const roomHeight = Number(room.height) || 0;

    if (cursorX + roomWidth > totalWidth) {
      cursorX = 0;
      cursorY += currentRowHeight;
      currentRowHeight = 0;
    }

    placed.push({
      ...room,
      x: cursorX,
      y: cursorY,
    });

    cursorX += roomWidth;
    currentRowHeight = Math.max(currentRowHeight, roomHeight);
  }

  return placed.map((room) => ({
    ...room,
    x: clamp(room.x, 0, Math.max(0, totalWidth - room.width)),
    y: clamp(room.y, 0, Math.max(0, totalHeight - room.height)),
  }));
}

function getDefaultRooms(totalWidth, totalHeight) {
  return fitRoomsInGrid(
    [
      { ...createRoom(0), name: "Living Room", width: 16, height: 12 },
      { ...createRoom(1), name: "Bedroom", width: 12, height: 12 },
      { ...createRoom(2), name: "Kitchen", width: 10, height: 8 },
    ],
    totalWidth,
    totalHeight
  );
}

/**
 * Build wall segments by taking the union of all room edges plus the outer plan boundary.
 * Shared boundaries are preserved as a single wall instead of being cancelled out.
 */
function buildWallSegments(rooms, totalWidth, totalHeight) {
  const grouped = new Map();

  const addSegment = (orientation, fixed, start, end) => {
    const normalizedStart = Math.min(start, end);
    const normalizedEnd = Math.max(start, end);
    const key = `${orientation}_${fixed}`;

    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push({
      orientation,
      fixed,
      start: normalizedStart,
      end: normalizedEnd,
    });
  };

  rooms.forEach((room) => {
    const x = Number(room.x);
    const y = Number(room.y);
    const w = Number(room.width);
    const h = Number(room.height);

    addSegment("H", y, x, x + w);
    addSegment("H", y + h, x, x + w);
    addSegment("V", x, y, y + h);
    addSegment("V", x + w, y, y + h);
  });

  addSegment("H", 0, 0, totalWidth);
  addSegment("H", totalHeight, 0, totalWidth);
  addSegment("V", 0, 0, totalHeight);
  addSegment("V", totalWidth, 0, totalHeight);

  const merged = [];

  for (const segments of grouped.values()) {
    segments.sort((a, b) => a.start - b.start);

    let current = { ...segments[0] };

    for (let i = 1; i < segments.length; i++) {
      const next = segments[i];

      if (next.start <= current.end) {
        current.end = Math.max(current.end, next.end);
      } else {
        merged.push(current);
        current = { ...next };
      }
    }

    merged.push(current);
  }

  return merged.map((seg) => {
    if (seg.orientation === "V") {
      return {
        x1: seg.fixed,
        y1: seg.start,
        x2: seg.fixed,
        y2: seg.end,
      };
    }

    return {
      x1: seg.start,
      y1: seg.fixed,
      x2: seg.end,
      y2: seg.fixed,
    };
  });
}

function WallMesh({ segment, wallThickness, height, rooms }) {
  const { x1, y1, x2, y2 } = segment;
  const isVertical = x1 === x2;
  const length = isVertical ? Math.abs(y2 - y1) : Math.abs(x2 - x1);

  if (!Number.isFinite(length) || length <= 0) return null;

  const openings = getSegmentOpenings(segment, rooms, height);
  const doorCuts = openings
    .filter((item) => item.type === "door")
    .map((item) => ({ start: item.start, end: item.end }));

  const fullHeightParts = subtractRanges(
    isVertical ? Math.min(y1, y2) : Math.min(x1, x2),
    isVertical ? Math.max(y1, y2) : Math.max(x1, x2),
    doorCuts
  );

  return (
    <group>
      {fullHeightParts.map((part, index) => {
        const partLength = part.end - part.start;
        if (partLength <= 0.01) return null;

        if (isVertical) {
          const centerZ = (part.start + part.end) / 2;
          return (
            <mesh
              key={`base-${index}`}
              castShadow
              receiveShadow
              position={[x1, height / 2, centerZ]}
            >
              <boxGeometry args={[wallThickness, height, partLength]} />
              <meshStandardMaterial color="#7e8da3" roughness={0.86} />
            </mesh>
          );
        }

        const centerX = (part.start + part.end) / 2;
        return (
          <mesh
            key={`base-${index}`}
            castShadow
            receiveShadow
            position={[centerX, height / 2, y1]}
          >
            <boxGeometry args={[partLength, height, wallThickness]} />
            <meshStandardMaterial color="#7e8da3" roughness={0.86} />
          </mesh>
        );
      })}

      {openings
        .filter((item) => item.type === "window")
        .map((windowItem, index) => {
          const openingLength = windowItem.end - windowItem.start;
          if (openingLength <= 0.01) return null;

          const sillHeight = clamp(
            Number(windowItem.sillHeight) || 0,
            0,
            Math.max(0, height - Number(windowItem.height || 0))
          );
          const windowHeight = clamp(
            Number(windowItem.height) || 0,
            0.1,
            Math.max(0.1, height - sillHeight)
          );
          const topHeight = Math.max(0, height - sillHeight - windowHeight);

          if (isVertical) {
            const centerZ = (windowItem.start + windowItem.end) / 2;
            return (
              <group key={`window-${index}`}>
                {sillHeight > 0.01 && (
                  <mesh castShadow receiveShadow position={[x1, sillHeight / 2, centerZ]}>
                    <boxGeometry args={[wallThickness, sillHeight, openingLength]} />
                    <meshStandardMaterial color="#7e8da3" roughness={0.86} />
                  </mesh>
                )}
                {topHeight > 0.01 && (
                  <mesh
                    castShadow
                    receiveShadow
                    position={[x1, sillHeight + windowHeight + topHeight / 2, centerZ]}
                  >
                    <boxGeometry args={[wallThickness, topHeight, openingLength]} />
                    <meshStandardMaterial color="#7e8da3" roughness={0.86} />
                  </mesh>
                )}
              </group>
            );
          }

          const centerX = (windowItem.start + windowItem.end) / 2;
          return (
            <group key={`window-${index}`}>
              {sillHeight > 0.01 && (
                <mesh castShadow receiveShadow position={[centerX, sillHeight / 2, y1]}>
                  <boxGeometry args={[openingLength, sillHeight, wallThickness]} />
                  <meshStandardMaterial color="#7e8da3" roughness={0.86} />
                </mesh>
              )}
              {topHeight > 0.01 && (
                <mesh
                  castShadow
                  receiveShadow
                  position={[centerX, sillHeight + windowHeight + topHeight / 2, y1]}
                >
                  <boxGeometry args={[openingLength, topHeight, wallThickness]} />
                  <meshStandardMaterial color="#7e8da3" roughness={0.86} />
                </mesh>
              )}
            </group>
          );
        })}
    </group>
  );
}

  const centerX = (Math.min(x1, x2) + Math.max(x1, x2)) / 2;
  return (
    <mesh castShadow receiveShadow position={[centerX, height / 2, y1]}>
      <boxGeometry args={[length, height, wallThickness]} />
      <meshStandardMaterial color="#7e8da3" roughness={0.86} />
    </mesh>
  );
}

function Floor3DScene({
  rooms,
  totalWidth,
  totalHeight,
  wallThickness,
  roomHeight,
  wallSegments,
}) {
  const centerX = totalWidth / 2;
  const centerZ = totalHeight / 2;
  const wt = Math.max(0.22, Number(wallThickness) || 0.5);
  const h = Math.max(8, Number(roomHeight) || DEFAULT_ROOM_HEIGHT);

  return (
    <>
      <ambientLight intensity={0.6} />
      <hemisphereLight intensity={0.65} groundColor="#cad4df" />
      <directionalLight
        position={[24, 30, 18]}
        intensity={1.15}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <Grid
        args={[Math.max(totalWidth + 20, 80), Math.max(totalHeight + 20, 80)]}
        cellSize={1}
        cellThickness={0.5}
        sectionSize={5}
        sectionThickness={1}
        fadeDistance={120}
        fadeStrength={1}
        position={[centerX, 0, centerZ]}
      />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centerX, -0.02, centerZ]}
        receiveShadow
      >
        <planeGeometry args={[totalWidth, totalHeight]} />
        <meshStandardMaterial color="#e7ebf0" roughness={0.93} metalness={0.04} />
      </mesh>

      {rooms.map((room) => {
        const x = Number(room.x) || 0;
        const z = Number(room.y) || 0;
        const w = Math.max(Number(room.width) || 0, 0.2);
        const d = Math.max(Number(room.height) || 0, 0.2);
        const cx = x + w / 2;
        const cz = z + d / 2;

        return (
          <group key={room.id}>
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[cx, 0.03, cz]}
              receiveShadow
            >
              <planeGeometry
                args={[Math.max(w - wt * 0.6, 0.2), Math.max(d - wt * 0.6, 0.2)]}
              />
              <meshStandardMaterial color={room.color || "#eef4ff"} roughness={0.95} />
            </mesh>

            <DreiText
              position={[cx, 0.12, cz]}
              fontSize={0.52}
              color="#162033"
              anchorX="center"
              anchorY="middle"
              rotation={[-Math.PI / 2, 0, 0]}
            >
              {room.name || "Room"}
            </DreiText>

            <DreiText
              position={[cx, 0.12, cz + 0.95]}
              fontSize={0.34}
              color="#445065"
              anchorX="center"
              anchorY="middle"
              rotation={[-Math.PI / 2, 0, 0]}
            >
              {`${w} ft × ${d} ft`}
            </DreiText>
          </group>
        );
      })}

      {(wallSegments || []).map((segment, index) => (
        <WallMesh
  key={`${segment.x1}-${segment.y1}-${segment.x2}-${segment.y2}-${index}`}
  segment={segment}
  wallThickness={wt}
  height={h}
  rooms={rooms}
/>
      ))}

      <DreiText
        position={[centerX, 0.18, -2]}
        fontSize={0.75}
        color="#0f172a"
        anchorX="center"
        anchorY="middle"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        {`Width: ${totalWidth} ft`}
      </DreiText>

      <DreiText
        position={[-2, 0.18, centerZ]}
        fontSize={0.75}
        color="#0f172a"
        anchorX="center"
        anchorY="middle"
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
      >
        {`Height: ${totalHeight} ft`}
      </DreiText>

      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        enableRotate
        minDistance={12}
        maxDistance={160}
        maxPolarAngle={Math.PI / 2.08}
        target={[centerX, 0, centerZ]}
      />
    </>
  );
}
function Opening2D({ room, opening, scale, wallThickness }) {
  const line = getOpeningLineSegment(room, opening);
  if (!line) return null;

  const strokeWidth = Math.max(4, wallThickness * scale);
  const isWindow = opening.type === "window";

  return (
    <line
      x1={line.x1 * scale}
      y1={line.y1 * scale}
      x2={line.x2 * scale}
      y2={line.y2 * scale}
      stroke={isWindow ? "#3b82f6" : "#f7f9fc"}
      strokeWidth={strokeWidth + (isWindow ? 0 : 2)}
      strokeDasharray={isWindow ? "10 6" : "0"}
      strokeLinecap="square"
    />
  );
}
export default function App() {
  const [planName, setPlanName] = useState("My Floor Plan");
  const [totalWidth, setTotalWidth] = useState(40);
  const [totalHeight, setTotalHeight] = useState(30);
  const [wallThickness, setWallThickness] = useState(WALL_THICKNESS_FT);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [roomHeight, setRoomHeight] = useState(DEFAULT_ROOM_HEIGHT);
  const [activeView, setActiveView] = useState("2d");

  const svgRef = useRef(null);

  const [rooms, setRooms] = useState(() => getDefaultRooms(40, 30));

  const placedRooms = useMemo(() => {
    return rooms.map((room) =>
      normalizeRoom(room, Number(totalWidth), Number(totalHeight))
    );
  }, [rooms, totalWidth, totalHeight]);

  const wallSegments = useMemo(() => {
    return buildWallSegments(
      placedRooms,
      Number(totalWidth),
      Number(totalHeight)
    );
  }, [placedRooms, totalWidth, totalHeight]);

  const canvasWidth = Number(totalWidth) * Number(scale);
  const canvasHeight = Number(totalHeight) * Number(scale);

  const totalRoomArea = placedRooms.reduce(
    (sum, room) => sum + Number(room.width) * Number(room.height),
    0
  );
  const totalPlanArea = Number(totalWidth) * Number(totalHeight);
  const utilization = totalPlanArea
    ? ((totalRoomArea / totalPlanArea) * 100).toFixed(1)
    : 0;

  const updateRoom = (id, key, value) => {
    setRooms((prev) =>
      prev.map((room) => (room.id === id ? { ...room, [key]: value } : room))
    );
  };
const addDoorToRoom = (roomId) => {
  setRooms((prev) =>
    prev.map((room) =>
      room.id === roomId
        ? {
            ...room,
            doors: [
              ...(room.doors || []),
              {
                wall: "top",
                offset: 0,
                width: DEFAULT_DOOR_WIDTH,
                height: DEFAULT_DOOR_HEIGHT,
              },
            ],
          }
        : room
    )
  );
};

const addWindowToRoom = (roomId) => {
  setRooms((prev) =>
    prev.map((room) =>
      room.id === roomId
        ? {
            ...room,
            windows: [
              ...(room.windows || []),
              {
                wall: "top",
                offset: 0,
                width: DEFAULT_WINDOW_WIDTH,
                height: DEFAULT_WINDOW_HEIGHT,
                sillHeight: DEFAULT_WINDOW_SILL_HEIGHT,
              },
            ],
          }
        : room
    )
  );
};

const updateDoor = (roomId, index, key, value) => {
  setRooms((prev) =>
    prev.map((room) => {
      if (room.id !== roomId) return room;
      const nextDoors = [...(room.doors || [])];
      nextDoors[index] = {
        ...nextDoors[index],
        [key]: key === "wall" ? value : Number(value) || 0,
      };
      return { ...room, doors: nextDoors };
    })
  );
};

const updateWindow = (roomId, index, key, value) => {
  setRooms((prev) =>
    prev.map((room) => {
      if (room.id !== roomId) return room;
      const nextWindows = [...(room.windows || [])];
      nextWindows[index] = {
        ...nextWindows[index],
        [key]: key === "wall" ? value : Number(value) || 0,
      };
      return { ...room, windows: nextWindows };
    })
  );
};

const removeDoor = (roomId, index) => {
  setRooms((prev) =>
    prev.map((room) =>
      room.id === roomId
        ? {
            ...room,
            doors: (room.doors || []).filter((_, i) => i !== index),
          }
        : room
    )
  );
};

const removeWindow = (roomId, index) => {
  setRooms((prev) =>
    prev.map((room) =>
      room.id === roomId
        ? {
            ...room,
            windows: (room.windows || []).filter((_, i) => i !== index),
          }
        : room
    )
  );
};
  const addRoom = () => {
    setRooms((prev) => [...prev, createRoom(prev.length)]);
  };

  const removeRoom = (id) => {
    setRooms((prev) => prev.filter((room) => room.id !== id));
  };

  const autoArrangeRooms = () => {
    const arranged = fitRoomsInGrid(
      rooms.map((room) => ({
        ...room,
        width: Number(room.width),
        height: Number(room.height),
      })),
      Number(totalWidth),
      Number(totalHeight)
    );
    setRooms(arranged);
  };

  const resetPlan = () => {
    setPlanName("My Floor Plan");
    setTotalWidth(40);
    setTotalHeight(30);
    setWallThickness(0.5);
    setScale(12);
    setRoomHeight(10);
    setActiveView("2d");
    setRooms(getDefaultRooms(40, 30));
  };

  const exportSVG = () => {
    const svgEl = document.getElementById("floor-plan-svg");
    if (!svgEl) return;

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgEl);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${planName.replace(/\s+/g, "_").toLowerCase() || "floor-plan"}.svg`;
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-shell">
      <div className="app-grid">
        <aside className="left-pane">
          <div className="hero-card">
            <div className="pill">Floor Plan Builder</div>
            <h1>
              <Home size={28} />
              Interactive Floor Plan App
            </h1>
            <p>Build rooms, auto-arrange them, and preview the layout in 2D and 3D.</p>
          </div>

          <div className="input-card">
            <div className="section-header">
              <h2>Plan Inputs</h2>
              <div className="header-actions">
                <button className="primary-btn" onClick={addRoom}>
                  <Plus size={16} />
                  New Room
                </button>
              </div>
            </div>

            <div className="form-grid one-col">
              <div className="field">
                <label>Plan Name</label>
                <input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-grid two-col">
              <div className="field">
                <label>Total Width (ft)</label>
                <input
                  type="number"
                  value={totalWidth}
                  onChange={(e) => setTotalWidth(Number(e.target.value) || 0)}
                />
              </div>

              <div className="field">
                <label>Total Height (ft)</label>
                <input
                  type="number"
                  value={totalHeight}
                  onChange={(e) => setTotalHeight(Number(e.target.value) || 0)}
                />
              </div>

              <div className="field">
                <label>Wall Thickness (ft)</label>
                <input
                  type="number"
                  step="0.1"
                  value={wallThickness}
                  onChange={(e) => setWallThickness(Number(e.target.value) || 0)}
                />
              </div>

              <div className="field">
                <label>Scale (px / ft)</label>
                <input
                  type="number"
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value) || 1)}
                />
              </div>

              <div className="field">
                <label>3D Wall Height (ft)</label>
                <input
                  type="number"
                  value={roomHeight}
                  onChange={(e) => setRoomHeight(Number(e.target.value) || 10)}
                />
              </div>
            </div>

            <div className="room-section">
              <div className="section-header compact">
                <h3>Rooms</h3>
                <div className="header-actions">
                  <button className="secondary-btn" onClick={autoArrangeRooms}>
                    <LayoutGrid size={16} />
                    Auto Arrange
                  </button>
                  <button className="ghost-btn" onClick={resetPlan}>
                    <RotateCcw size={16} />
                    Reset
                  </button>
                </div>
              </div>

              <div className="room-list">
                {rooms.map((room, index) => (
                  <div className="room-card" key={room.id}>
                    <div className="room-card-header">
                      <span>Room {index + 1}</span>
                      <button
                        className="icon-btn"
                        onClick={() => removeRoom(room.id)}
                        disabled={rooms.length === 1}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="form-grid one-col">
                      <div className="field">
                        <label>Name</label>
                        <input
                          value={room.name}
                          onChange={(e) => updateRoom(room.id, "name", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-grid two-col">
                      <div className="field">
                        <label>Width (ft)</label>
                        <input
                          type="number"
                          value={room.width}
                          onChange={(e) =>
                            updateRoom(room.id, "width", Number(e.target.value) || 0)
                          }
                        />
                      </div>

                      <div className="field">
                        <label>Height (ft)</label>
                        <input
                          type="number"
                          value={room.height}
                          onChange={(e) =>
                            updateRoom(room.id, "height", Number(e.target.value) || 0)
                          }
                        />
                      </div>
                    </div>
{rooms.map((room, index) => (
  <div className="room-card" key={room.id}>
    <div className="room-card-header">
      <span>Room {index + 1}</span>
      <button
        className="icon-btn"
        onClick={() => removeRoom(room.id)}
        disabled={rooms.length === 1}
      >
        <Trash2 size={16} />
      </button>
    </div>

    <div className="form-grid one-col">
      <div className="field">
        <label>Name</label>
        <input
          value={room.name}
          onChange={(e) => updateRoom(room.id, "name", e.target.value)}
        />
      </div>
    </div>

    <div className="form-grid two-col">
      <div className="field">
        <label>Width (ft)</label>
        <input
          type="number"
          value={room.width}
          onChange={(e) =>
            updateRoom(room.id, "width", Number(e.target.value) || 0)
          }
        />
      </div>

      <div className="field">
        <label>Height (ft)</label>
        <input
          type="number"
          value={room.height}
          onChange={(e) =>
            updateRoom(room.id, "height", Number(e.target.value) || 0)
          }
        />
      </div>
    </div>

    <div className="form-grid two-col">
      <div className="field">
        <label>X Position (ft)</label>
        <input
          type="number"
          value={room.x}
          onChange={(e) =>
            updateRoom(room.id, "x", Number(e.target.value) || 0)
          }
        />
      </div>

      <div className="field">
        <label>Y Position (ft)</label>
        <input
          type="number"
          value={room.y}
          onChange={(e) =>
            updateRoom(room.id, "y", Number(e.target.value) || 0)
          }
        />
      </div>
    </div>

    {/* PASTE DOORS + WINDOWS BLOCK HERE */}
  </div>
))}
                    <div className="form-grid two-col">
                      <div className="field">
                        <label>X Position (ft)</label>
                        <input
                          type="number"
                          value={room.x}
                          onChange={(e) =>
                            updateRoom(room.id, "x", Number(e.target.value) || 0)
                          }
                        />
                      </div>

                      <div className="field">
                        <label>Y Position (ft)</label>
                        <input
                          type="number"
                          value={room.y}
                          onChange={(e) =>
                            updateRoom(room.id, "y", Number(e.target.value) || 0)
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="right-pane">
          <div className="top-summary">
            <div className="summary-box">
              <span>Total Plan Area</span>
              <strong>{totalPlanArea} sq ft</strong>
            </div>
            <div className="summary-box">
              <span>Room Area Used</span>
              <strong>{totalRoomArea} sq ft</strong>
            </div>
            <div className="summary-box">
              <span>Space Utilization</span>
              <strong>{utilization}%</strong>
            </div>
            <div className="summary-box actions-box">
              <div className="view-switch">
  <button
    className={activeView === "2d" ? "active" : ""}
    onClick={() => setActiveView("2d")}
  >
    2D
  </button>
  <button
    className={activeView === "3d" ? "active" : ""}
    onClick={() => setActiveView("3d")}
  >
    3D
  </button>
</div>
              <button className="primary-btn" onClick={exportSVG}>
                Export SVG
              </button>
            </div>
          </div>

    {activeView === "2d" && (
            <section className="preview-card">
              <div className="section-header">
                <h2>2D Floor Plan</h2>
              </div>

              <div className="svg-wrap">
              <svg
                viewBox={`0 0 ${Number(totalWidth)} ${Number(totalHeight)}`}
                width="100%"
                height="100%"
              >
                  <defs>
                    <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path
                        d="M 10 0 L 0 0 0 10"
                        fill="none"
                        stroke="#dbe3ec"
                        strokeWidth="1"
                      />
                    </pattern>
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                      <rect width="50" height="50" fill="url(#smallGrid)" />
                      <path
                        d="M 50 0 L 0 0 0 50"
                        fill="none"
                        stroke="#bdd0e8"
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>

                  <rect width="100%" height="100%" fill="#f7f9fc" />
                  <rect
                    x="30"
                    y="30"
                    width={canvasWidth + 60}
                    height={canvasHeight + 60}
                    fill="url(#grid)"
                  />

                  <g transform="translate(60,60)">
                    {placedRooms.map((room) => {
                      const x = room.x * scale;
                      const y = room.y * scale;
                      const w = room.width * scale;
                      const h = room.height * scale;

                      return (
                        <g key={room.id}>
                          <rect
                            x={x}
                            y={y}
                            width={w}
                            height={h}
                            fill={room.color}
                            rx="3"
                           
                          />
                          <text
                            x={x + w / 2}
                            y={y + h / 2 - 8}
                            textAnchor="middle"
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              fill: "#172033",
                              pointerEvents: "none",
                            }}
                          >
                            {room.name}
                          </text>
                          <text
                            x={x + w / 2}
                            y={y + h / 2 + 14}
                            textAnchor="middle"
                            style={{
                              fontSize: 12,
                              fill: "#56637a",
                              pointerEvents: "none",
                            }}
                          >
                            {room.width} ft × {room.height} ft
                          </text>
                        </g>
                      );
                    })}
                    {getRoomOpenings(room, roomHeight).doors.map((door, idx) => (
  <Opening2D
    key={`door-${room.id}-${idx}`}
    room={room}
    opening={door}
    scale={Number(scale)}
    wallThickness={Number(wallThickness)}
  />
))}

{getRoomOpenings(room, roomHeight).windows.map((windowItem, idx) => (
  <Opening2D
    key={`window-${room.id}-${idx}`}
    room={room}
    opening={windowItem}
    scale={Number(scale)}
    wallThickness={Number(wallThickness)}
  />
))}
                    {wallSegments.map((seg, index) => (
                      <line
                        key={index}
                        x1={seg.x1 * scale}
                        y1={seg.y1 * scale}
                        x2={seg.x2 * scale}
                        y2={seg.y2 * scale}
                        stroke="#4d5d75"
                        strokeWidth={Math.max(4, wallThickness * scale)}
                        strokeLinecap="square"
                      />
                    ))}

                    <text
                      x={canvasWidth / 2}
                      y={-18}
                      textAnchor="middle"
                      style={{ fontSize: 13, fontWeight: 600, fill: "#324257" }}
                    >
                      Width: {totalWidth} ft
                    </text>

                    <text
                      x={-18}
                      y={canvasHeight / 2}
                      textAnchor="middle"
                      transform={`rotate(-90, -18, ${canvasHeight / 2})`}
                      style={{ fontSize: 13, fontWeight: 600, fill: "#324257" }}
                    >
                      Height: {totalHeight} ft
                    </text>
                  </g>
                </svg>
              </div>
            </section>
          )}

        {activeView === "3d" && (
            <section className="preview-card">
              <div className="section-header">
                <h2>3D Floor Plan</h2>
              </div>

              <div className="three-wrap">
                <Canvas
                  shadows
                  camera={{
                    position: [
                      Math.max(Number(totalWidth) * 0.85, 14),
                      Math.max(Number(roomHeight) * 2.2, 16),
                      Math.max(Number(totalHeight) * 1.0, 14),
                    ],
                    fov: 42,
                  }}
                >
                  <color attach="background" args={["#f4f7fb"]} />
                  <Floor3DScene
                    rooms={placedRooms}
                    totalWidth={Number(totalWidth)}
                    totalHeight={Number(totalHeight)}
                    wallThickness={Number(wallThickness)}
                    roomHeight={Number(roomHeight)}
                    wallSegments={wallSegments}
                  />
                </Canvas>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
