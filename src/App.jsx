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

const createRoom = (index) => ({
  id: crypto.randomUUID(),
  name: `Room ${index + 1}`,
  width: 10,
  height: 10,
  x: 0,
  y: 0,
  color: ROOM_COLORS[index % ROOM_COLORS.length],
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeRoom(room, totalWidth, totalHeight) {
  const width = Math.max(Number(room.width) || 0, 0);
  const height = Math.max(Number(room.height) || 0, 0);
  const x = Number(room.x) || 0;
  const y = Number(room.y) || 0;

  return {
    ...room,
    width,
    height,
    x: clamp(x, 0, Math.max(0, totalWidth - width)),
    y: clamp(y, 0, Math.max(0, totalHeight - height)),
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

function WallMesh({ segment, wallThickness, height }) {
  const { x1, y1, x2, y2 } = segment;
  const isVertical = x1 === x2;
  const length = isVertical ? Math.abs(y2 - y1) : Math.abs(x2 - x1);

  if (!Number.isFinite(length) || length <= 0) return null;

  if (isVertical) {
    const centerZ = (Math.min(y1, y2) + Math.max(y1, y2)) / 2;
    return (
      <mesh castShadow receiveShadow position={[x1, height / 2, centerZ]}>
        <boxGeometry args={[wallThickness, height, length]} />
        <meshStandardMaterial color="#7e8da3" roughness={0.86} />
      </mesh>
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

export default function App() {
  const [planName, setPlanName] = useState("My Floor Plan");
  const [totalWidth, setTotalWidth] = useState(40);
  const [totalHeight, setTotalHeight] = useState(30);
  const [wallThickness, setWallThickness] = useState(WALL_THICKNESS_FT);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [roomHeight, setRoomHeight] = useState(DEFAULT_ROOM_HEIGHT);
  const [activeView, setActiveView] = useState("both");
  const [draggingRoom, setDraggingRoom] = useState(null);

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
    setActiveView("both");
    setDraggingRoom(null);
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

  const getSvgCoordinates = (event) => {
    const svg = svgRef.current;
    if (!svg) return null;

    const rect = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;

    const svgX = ((event.clientX - rect.left) / rect.width) * viewBox.width;
    const svgY = ((event.clientY - rect.top) / rect.height) * viewBox.height;

    return { svgX, svgY };
  };

  const handleRoomMouseDown = (event, room) => {
    const point = getSvgCoordinates(event);
    if (!point) return;

    event.preventDefault();
    event.stopPropagation();

    const planX = (point.svgX - 60) / Number(scale);
    const planY = (point.svgY - 60) / Number(scale);

    setDraggingRoom({
      id: room.id,
      offsetX: planX - room.x,
      offsetY: planY - room.y,
    });
  };

  const handleSvgMouseMove = (event) => {
    if (!draggingRoom) return;

    const point = getSvgCoordinates(event);
    if (!point) return;

    const room = rooms.find((item) => item.id === draggingRoom.id);
    if (!room) return;

    const width = Number(room.width) || 0;
    const height = Number(room.height) || 0;

    const planX = (point.svgX - 60) / Number(scale);
    const planY = (point.svgY - 60) / Number(scale);

    const nextX = clamp(
      planX - draggingRoom.offsetX,
      0,
      Math.max(0, Number(totalWidth) - width)
    );
    const nextY = clamp(
      planY - draggingRoom.offsetY,
      0,
      Math.max(0, Number(totalHeight) - height)
    );

    setRooms((prev) =>
      prev.map((item) =>
        item.id === draggingRoom.id
          ? { ...item, x: Number(nextX.toFixed(2)), y: Number(nextY.toFixed(2)) }
          : item
      )
    );
  };

  const handleSvgMouseUp = () => {
    if (draggingRoom) {
      setDraggingRoom(null);
    }
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
                <button
                  className={activeView === "both" ? "active" : ""}
                  onClick={() => setActiveView("both")}
                >
                  Both
                </button>
              </div>
              <button className="primary-btn" onClick={exportSVG}>
                Export SVG
              </button>
            </div>
          </div>

          {(activeView === "2d" || activeView === "both") && (
            <section className="preview-card">
              <div className="section-header">
                <h2>2D Floor Plan</h2>
              </div>

              <div className="svg-wrap">
                <svg
                  ref={svgRef}
                  id="floor-plan-svg"
                  width={Math.max(canvasWidth + 120, 700)}
                  height={Math.max(canvasHeight + 120, 480)}
                  viewBox={`0 0 ${Math.max(canvasWidth + 120, 700)} ${Math.max(
                    canvasHeight + 120,
                    480
                  )}`}
                  onMouseMove={handleSvgMouseMove}
                  onMouseUp={handleSvgMouseUp}
                  onMouseLeave={handleSvgMouseUp}
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
                            style={{ cursor: "move" }}
                            onMouseDown={(e) => handleRoomMouseDown(e, room)}
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

          {(activeView === "3d" || activeView === "both") && (
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
