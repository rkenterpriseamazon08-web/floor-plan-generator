import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Text as DreiText } from "@react-three/drei";
import {
  Home,
  Plus,
  Trash2,
  RotateCcw,
  Sofa,
  Save,
  FolderOpen,
  FilePlus2,
  X,
  MessageSquare,
  Mic,
  Send,
  Sparkles,
  Bot,
  Image as ImageIcon,
  Loader2,
  ExternalLink,
  Sun,
  Moon,
} from "lucide-react";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz9CTljUpeTfyytXH6HDLYG_Qjah7anxSSaWlvFCX8j82szBuYLci_sVGms7MfbbAuV0A/exec";
const MAX_SYNC_ROOMS = 8;
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

// boundary clamp logic
const FURNITURE_WALL_CLEARANCE = 0.18;
const DEFAULT_KITCHEN_SLAB_DEPTH = 2;
const DEFAULT_KITCHEN_SLAB_HEIGHT = 3;

const PRODUCT_CATEGORIES = [
  "storage",
  "office",
  "cafe",
  "house",
  "public toilet",
  "security cabin",
];

const PROJECTS_STORAGE_KEY = "floor-plan-generator-projects";
const FLOOR_PLAN_OPENAI_KEY_STORAGE = "floor-plan-openai-api-key";
const THEME_STORAGE_KEY = "floor-plan-generator-theme";
const OPENAI_MODEL = "gpt-4.1-mini";
const OPENAI_IMAGE_MODEL = "gpt-image-1";

const FURNITURE_PRODUCT_RECOMMENDATIONS = {
  "bed (single / double)": [
    {
      id: "tree-mart-bed",
      title: "TREE MART Wooden King Size Bed with Storage",
      price: "₹25,999",
      url: "https://www.amazon.in/TREE-MART-Sheesham-Recommended-Mattress/dp/B0F3P9LWTY",
      image: "products/bed-wooden.jpg",
    },
    {
      id: "designfit-bed",
      title: "DesignFit Engineered Wood King Size Bed with Box Storage",
      price: "₹19,497",
      url: "https://www.amazon.in/DesignFit-Engineered-Storage-Furniture-Warranty/dp/B0DXF3G56S",
      image: "products/bed-black.jpg",
    },
    {
      id: "royaloak-bed",
      title: "Royaloak Luxe Queen Size Bed with Hydraulic Storage",
      price: "₹38,999",
      url: "https://www.amazon.in/dp/B0DSG85S7V",
      image: "products/bed-ash.jpg",
    },
  ],
};


/**
 * Furniture preset map with realistic sizes (feet).
 * width = X span
 * depth = Y span
 * height = 3D height
 */
const FURNITURE_PRESETS = {
  storage: [
    { type: "Storage Rack", width: 6, depth: 2, height: 7, color: "#c9d4e5" },
    { type: "Pallet Stack", width: 4, depth: 4, height: 4, color: "#d9c3a2" },
    { type: "Small Shelf Unit", width: 3, depth: 1.5, height: 5, color: "#cfd8c8" },
    { type: "Heavy Duty Shelf", width: 8, depth: 2.5, height: 8, color: "#b8c4d7" },
    { type: "Utility Table", width: 5, depth: 2.5, height: 3, color: "#ddd4c8" },
  ],
  office: [
    { type: "Workstation Desk", width: 5, depth: 2.5, height: 2.5, color: "#d4dde8" },
    { type: "Office Chair", width: 2, depth: 2, height: 3, color: "#bcc7d9" },
    { type: "Conference Table", width: 8, depth: 4, height: 2.5, color: "#d8d1c5" },
    { type: "Storage Cabinet", width: 4, depth: 1.5, height: 6, color: "#c7d0c0" },
    { type: "Reception Desk", width: 7, depth: 3, height: 3.5, color: "#d7c8bf" },
  ],
  cafe: [
    { type: "2-Seater Table", width: 2.5, depth: 2.5, height: 2.5, color: "#dfd2c2" },
    { type: "4-Seater Table", width: 4, depth: 4, height: 2.5, color: "#d7cab8" },
    { type: "Chair", width: 1.8, depth: 1.8, height: 3, color: "#c7b9ab" },
    { type: "Service Counter / Cash Desk", width: 6, depth: 2.5, height: 3.5, color: "#d8c3b8" },
    { type: "Display Unit", width: 4, depth: 2, height: 5, color: "#d3ddd5" },
  ],
  house: [
    { type: "Bed (Single / Double)", width: 6.5, depth: 7, height: 2, color: "#d5dce8" },
    { type: "Wardrobe", width: 5, depth: 2, height: 7, color: "#c7d0bf" },
    { type: "Sofa", width: 7, depth: 3, height: 3, color: "#c8d6ea" },
    { type: "Center Table", width: 4, depth: 2, height: 1.5, color: "#ddd3c5" },
    { type: "Kitchen Counter", width: 8, depth: 2, height: 3, color: "#d4d8dc" },
    { type: "Kitchen Slab", width: 8, depth: 2, height: 3, color: "#cfd6de", wallAttached: true },
    { type: "Stove / Cooktop", width: 2.5, depth: 2, height: 2.8, color: "#c9c9cf" },
    { type: "Sink", width: 2.5, depth: 2, height: 3, color: "#c5dbe5" },
    { type: "Dining Table", width: 6, depth: 3.5, height: 2.5, color: "#d8ccb9" },
  ],
  "public toilet": [
    { type: "Toilet Seat (WC)", width: 2.5, depth: 4, height: 3, color: "#dbe7f2" },
    { type: "Urinal", width: 2, depth: 1.5, height: 3.5, color: "#d8e7ef" },
    { type: "Wash Basin", width: 2, depth: 1.5, height: 3, color: "#d9eef5" },
    { type: "Mirror Panel", width: 3, depth: 0.3, height: 4, color: "#d3e7f8" },
    { type: "Partition Wall", width: 3, depth: 0.3, height: 6.5, color: "#cfd4dd" },
  ],
  "security cabin": [
    { type: "Guard Chair", width: 2, depth: 2, height: 3, color: "#bfc9d7" },
    { type: "Small Desk", width: 4, depth: 2, height: 2.5, color: "#d7cdbf" },
    { type: "Storage Shelf", width: 3, depth: 1.5, height: 6, color: "#c8d1c2" },
    { type: "CCTV Monitor Unit", width: 3, depth: 1.5, height: 4, color: "#c9d3e4" },
    { type: "Barrier Control Panel", width: 2.5, depth: 1.5, height: 3.5, color: "#d2c9be" },
  ],
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getWallLength(room, wall) {
  if (wall === "top" || wall === "bottom") return Number(room.width) || 0;
  return Number(room.height) || 0;
}

function isKitchenSlab(item) {
  return String(item?.type || "").toLowerCase() === "kitchen slab";
}

function normalizeDoor(door, room) {
  const wall = WALL_OPTIONS.includes(door?.wall) ? door.wall : "top";
  const wallLength = getWallLength(room, wall);
  const width = clamp(
    Number(door?.width) || DEFAULT_DOOR_WIDTH,
    0.5,
    Math.max(0.5, wallLength)
  );
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

/**
 * kitchen slab + wall attachment
 * Returns derived geometry for wall-attached slab.
 */
function getKitchenSlabGeometry(furnitureItem, room) {
  const wall = WALL_OPTIONS.includes(furnitureItem?.attachedWall)
    ? furnitureItem.attachedWall
    : "bottom";

  const roomWidth = Number(room.width) || 0;
  const roomHeight = Number(room.height) || 0;
  const depth = Math.max(Number(furnitureItem?.slabDepth) || DEFAULT_KITCHEN_SLAB_DEPTH, 0.4);
  const height = Math.max(Number(furnitureItem?.height) || DEFAULT_KITCHEN_SLAB_HEIGHT, 0.4);

  const wallLength = wall === "top" || wall === "bottom" ? roomWidth : roomHeight;
  const length = clamp(
    Number(furnitureItem?.slabLength) || Number(furnitureItem?.width) || 4,
    1,
    Math.max(1, wallLength - FURNITURE_WALL_CLEARANCE * 2)
  );

  const maxOffset = Math.max(0, wallLength - length - FURNITURE_WALL_CLEARANCE * 2);
  const offset = clamp(
    Number(furnitureItem?.offset) || 0,
    0,
    maxOffset
  );

  if (wall === "top") {
    return {
      ...furnitureItem,
      attachedWall: wall,
      slabLength: length,
      slabDepth: depth,
      offset,
      width: length,
      depth,
      height,
      x: FURNITURE_WALL_CLEARANCE + offset,
      y: FURNITURE_WALL_CLEARANCE,
    };
  }

  if (wall === "bottom") {
    return {
      ...furnitureItem,
      attachedWall: wall,
      slabLength: length,
      slabDepth: depth,
      offset,
      width: length,
      depth,
      height,
      x: FURNITURE_WALL_CLEARANCE + offset,
      y: Math.max(FURNITURE_WALL_CLEARANCE, roomHeight - depth - FURNITURE_WALL_CLEARANCE),
    };
  }

  if (wall === "left") {
    return {
      ...furnitureItem,
      attachedWall: wall,
      slabLength: length,
      slabDepth: depth,
      offset,
      width: depth,
      depth: length,
      height,
      x: FURNITURE_WALL_CLEARANCE,
      y: FURNITURE_WALL_CLEARANCE + offset,
    };
  }

  return {
    ...furnitureItem,
    attachedWall: wall,
    slabLength: length,
    slabDepth: depth,
    offset,
    width: depth,
    depth: length,
    height,
    x: Math.max(FURNITURE_WALL_CLEARANCE, roomWidth - depth - FURNITURE_WALL_CLEARANCE),
    y: FURNITURE_WALL_CLEARANCE + offset,
  };
}

/**
 * boundary clamp logic
 * x and y are LOCAL to the room, not global plan coordinates.
 */
function normalizeFurniture(furnitureItem, room) {
  if (isKitchenSlab(furnitureItem)) {
    return getKitchenSlabGeometry(furnitureItem, room);
  }

  const width = Math.max(Number(furnitureItem?.width) || 0.5, 0.3);
  const depth = Math.max(Number(furnitureItem?.depth) || 0.5, 0.3);
  const height = Math.max(Number(furnitureItem?.height) || 0.5, 0.3);

  const roomWidth = Number(room.width) || 0;
  const roomHeight = Number(room.height) || 0;

  const minX = FURNITURE_WALL_CLEARANCE;
  const minY = FURNITURE_WALL_CLEARANCE;
  const maxX = Math.max(minX, roomWidth - width - FURNITURE_WALL_CLEARANCE);
  const maxY = Math.max(minY, roomHeight - depth - FURNITURE_WALL_CLEARANCE);

  return {
    ...furnitureItem,
    width,
    depth,
    height,
    x: clamp(Number(furnitureItem?.x) || minX, minX, maxX),
    y: clamp(Number(furnitureItem?.y) || minY, minY, maxY),
  };
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
      return { x1: x + offset, y1: y, x2: x + offset + width, y2: y };
    case "bottom":
      return { x1: x + offset, y1: y + h, x2: x + offset + width, y2: y + h };
    case "left":
      return { x1: x, y1: y + offset, x2: x, y2: y + offset + width };
    case "right":
      return { x1: x + w, y1: y + offset, x2: x + w, y2: y + offset + width };
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
  const segStart = isVertical
    ? Math.min(segment.y1, segment.y2)
    : Math.min(segment.x1, segment.x2);
  const segEnd = isVertical
    ? Math.max(segment.y1, segment.y2)
    : Math.max(segment.x1, segment.x2);

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
  furniture: [],
});

function normalizeRoom(room, totalWidth, totalHeight, wallHeight = DEFAULT_ROOM_HEIGHT) {
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
          normalizeWindow(windowItem, baseRoom, wallHeight)
        )
      : [],
    furniture: Array.isArray(baseRoom.furniture)
      ? baseRoom.furniture.map((item) => normalizeFurniture(item, baseRoom))
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

  const openings = getSegmentOpenings(segment, rooms, height).map((opening) => {
    if (opening.type === "door") {
      return {
        ...opening,
        bottom: 0,
        top: clamp(Number(opening.height) || DEFAULT_DOOR_HEIGHT, 0.1, height),
      };
    }

    const sillHeight = clamp(
      Number(opening.sillHeight) || 0,
      0,
      Math.max(0, height - 0.1)
    );

    const openingHeight = clamp(
      Number(opening.height) || DEFAULT_WINDOW_HEIGHT,
      0.1,
      Math.max(0.1, height - sillHeight)
    );

    return {
      ...opening,
      bottom: sillHeight,
      top: Math.min(height, sillHeight + openingHeight),
    };
  });

  const verticalBreaks = Array.from(
    new Set([0, height, ...openings.flatMap((opening) => [opening.bottom, opening.top])])
  )
    .filter((value) => value >= 0 && value <= height)
    .sort((a, b) => a - b);

  const wallStart = isVertical ? Math.min(y1, y2) : Math.min(x1, x2);
  const wallEnd = isVertical ? Math.max(y1, y2) : Math.max(x1, x2);

  const bands = [];

  for (let i = 0; i < verticalBreaks.length - 1; i++) {
    const bandBottom = verticalBreaks[i];
    const bandTop = verticalBreaks[i + 1];
    const bandHeight = bandTop - bandBottom;

    if (bandHeight <= 0.01) continue;

    const cuts = openings
      .filter((opening) => opening.bottom < bandTop && opening.top > bandBottom)
      .map((opening) => ({
        start: opening.start,
        end: opening.end,
      }));

    const horizontalParts = subtractRanges(wallStart, wallEnd, cuts);

    horizontalParts.forEach((part) => {
      const partLength = part.end - part.start;
      if (partLength <= 0.01) return;

      bands.push({
        start: part.start,
        end: part.end,
        bottom: bandBottom,
        top: bandTop,
        bandHeight,
        partLength,
      });
    });
  }

  return (
    <group>
      {bands.map((band, index) => {
        if (isVertical) {
          const centerZ = (band.start + band.end) / 2;
          const centerY = (band.bottom + band.top) / 2;

          return (
            <mesh
              key={`band-${index}`}
              castShadow
              receiveShadow
              position={[x1, centerY, centerZ]}
            >
              <boxGeometry args={[wallThickness, band.bandHeight, band.partLength]} />
              <meshStandardMaterial color="#7e8da3" roughness={0.86} />
            </mesh>
          );
        }

        const centerX = (band.start + band.end) / 2;
        const centerY = (band.bottom + band.top) / 2;

        return (
          <mesh
            key={`band-${index}`}
            castShadow
            receiveShadow
            position={[centerX, centerY, y1]}
          >
            <boxGeometry args={[band.partLength, band.bandHeight, wallThickness]} />
            <meshStandardMaterial color="#7e8da3" roughness={0.86} />
          </mesh>
        );
      })}
    </group>
  );
}

function FurnitureMaterial({ color }) {
  return (
    <meshStandardMaterial
      color={color || "#cfd8e3"}
      roughness={0.88}
      metalness={0.04}
    />
  );
}

function FurnitureLabel({ x, y, z, text }) {
  return (
    <DreiText
      position={[x, y, z]}
      fontSize={0.22}
      color="#243246"
      anchorX="center"
      anchorY="middle"
    >
      {text}
    </DreiText>
  );
}

/**
 * improved 3D shapes
 * Lightweight recognizable geometry only.
 */
function Furniture3D({ room, furnitureItem, isSelected = false, onSelect }) {
  const roomX = Number(room.x) || 0;
  const roomY = Number(room.y) || 0;

  const width = Number(furnitureItem.width) || 1;
  const depth = Number(furnitureItem.depth) || 1;
  const height = Number(furnitureItem.height) || 1;

  const x = roomX + (Number(furnitureItem.x) || 0) + width / 2;
  const z = roomY + (Number(furnitureItem.y) || 0) + depth / 2;
  const color = furnitureItem.color || "#cfd8e3";
  const labelY = height + 0.35;

  const type = String(furnitureItem.type || "").toLowerCase();
  const hasRecommendations = getFurnitureRecommendationItems(furnitureItem.type).length > 0;
  const outlineColor = isSelected ? "#0f3b72" : "#8ea0b5";

  const handleSelect = (event) => {
    if (!hasRecommendations || typeof onSelect !== "function") return;
    event?.stopPropagation?.();
    onSelect(furnitureItem);
  };

  const legWidth = Math.max(0.12, Math.min(width, depth) * 0.12);

  if (type.includes("sofa")) {
    return (
      <group onClick={handleSelect}>
        <mesh castShadow receiveShadow position={[x, 0.55, z]}>
          <boxGeometry args={[width, 1.1, depth]} />
          <FurnitureMaterial color={color} />
        </mesh>
        <mesh castShadow receiveShadow position={[x, 1.55, z - depth * 0.32]}>
          <boxGeometry args={[width, 1.1, Math.max(0.3, depth * 0.22)]} />
          <FurnitureMaterial color={color} />
        </mesh>
        <mesh castShadow receiveShadow position={[x - width * 0.42, 1.05, z]}>
          <boxGeometry args={[Math.max(0.25, width * 0.12), 1, depth]} />
          <FurnitureMaterial color={color} />
        </mesh>
        <mesh castShadow receiveShadow position={[x + width * 0.42, 1.05, z]}>
          <boxGeometry args={[Math.max(0.25, width * 0.12), 1, depth]} />
          <FurnitureMaterial color={color} />
        </mesh>
        {hasRecommendations && (
          <mesh position={[x, height + 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[Math.max(Math.min(width, depth) * 0.24, 0.22), Math.max(Math.min(width, depth) * 0.3, 0.3), 32]} />
            <meshBasicMaterial color={outlineColor} transparent opacity={0.95} />
          </mesh>
        )}
        <FurnitureLabel x={x} y={labelY} z={z} text={furnitureItem.type} />
      </group>
    );
  }

  if (
    type.includes("table") ||
    type.includes("desk") ||
    type.includes("workstation") ||
    type.includes("counter")
  ) {
    const topThickness = Math.max(0.14, height * 0.15);
    const legHeight = Math.max(0.35, height - topThickness);

    return (
      <group onClick={handleSelect}>
        <mesh castShadow receiveShadow position={[x, legHeight + topThickness / 2, z]}>
          <boxGeometry args={[width, topThickness, depth]} />
          <FurnitureMaterial color={color} />
        </mesh>

        {[
          [-width / 2 + legWidth / 2, legHeight / 2, -depth / 2 + legWidth / 2],
          [width / 2 - legWidth / 2, legHeight / 2, -depth / 2 + legWidth / 2],
          [-width / 2 + legWidth / 2, legHeight / 2, depth / 2 - legWidth / 2],
          [width / 2 - legWidth / 2, legHeight / 2, depth / 2 - legWidth / 2],
        ].map((pos, idx) => (
          <mesh
            key={idx}
            castShadow
            receiveShadow
            position={[x + pos[0], pos[1], z + pos[2]]}
          >
            <boxGeometry args={[legWidth, legHeight, legWidth]} />
            <FurnitureMaterial color={color} />
          </mesh>
        ))}

        {hasRecommendations && (
          <mesh position={[x, height + 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[Math.max(Math.min(width, depth) * 0.24, 0.22), Math.max(Math.min(width, depth) * 0.3, 0.3), 32]} />
            <meshBasicMaterial color={outlineColor} transparent opacity={0.95} />
          </mesh>
        )}
        <FurnitureLabel x={x} y={labelY} z={z} text={furnitureItem.type} />
      </group>
    );
  }

  if (type.includes("chair")) {
    return (
      <group onClick={handleSelect}>
        <mesh castShadow receiveShadow position={[x, 1.1, z]}>
          <boxGeometry args={[width, 0.25, depth]} />
          <FurnitureMaterial color={color} />
        </mesh>
        <mesh castShadow receiveShadow position={[x, 2.1, z - depth * 0.34]}>
          <boxGeometry args={[width, 1.8, Math.max(0.12, depth * 0.16)]} />
          <FurnitureMaterial color={color} />
        </mesh>
        {[
          [-width / 2 + legWidth / 2, 0.55, -depth / 2 + legWidth / 2],
          [width / 2 - legWidth / 2, 0.55, -depth / 2 + legWidth / 2],
          [-width / 2 + legWidth / 2, 0.55, depth / 2 - legWidth / 2],
          [width / 2 - legWidth / 2, 0.55, depth / 2 - legWidth / 2],
        ].map((pos, idx) => (
          <mesh
            key={idx}
            castShadow
            receiveShadow
            position={[x + pos[0], pos[1], z + pos[2]]}
          >
            <boxGeometry args={[legWidth, 1.1, legWidth]} />
            <FurnitureMaterial color={color} />
          </mesh>
        ))}
        {hasRecommendations && (
          <mesh position={[x, height + 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[Math.max(Math.min(width, depth) * 0.24, 0.22), Math.max(Math.min(width, depth) * 0.3, 0.3), 32]} />
            <meshBasicMaterial color={outlineColor} transparent opacity={0.95} />
          </mesh>
        )}
        <FurnitureLabel x={x} y={labelY} z={z} text={furnitureItem.type} />
      </group>
    );
  }

  if (type.includes("bed")) {
    return (
      <group onClick={handleSelect}>
        <mesh castShadow receiveShadow position={[x, 0.35, z]}>
          <boxGeometry args={[width, 0.7, depth]} />
          <FurnitureMaterial color={color} />
        </mesh>
        <mesh castShadow receiveShadow position={[x, 0.9, z]}>
          <boxGeometry args={[width * 0.92, 0.4, depth * 0.92]} />
          <meshStandardMaterial color="#f3f5f8" roughness={0.9} metalness={0.02} />
        </mesh>
        <mesh castShadow receiveShadow position={[x, 1.2, z - depth * 0.39]}>
          <boxGeometry args={[width, 0.6, Math.max(0.25, depth * 0.12)]} />
          <FurnitureMaterial color={color} />
        </mesh>
        {hasRecommendations && (
          <mesh position={[x, height + 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[Math.max(Math.min(width, depth) * 0.24, 0.22), Math.max(Math.min(width, depth) * 0.3, 0.3), 32]} />
            <meshBasicMaterial color={outlineColor} transparent opacity={0.95} />
          </mesh>
        )}
        <FurnitureLabel x={x} y={labelY} z={z} text={furnitureItem.type} />
      </group>
    );
  }

  if (
    type.includes("cabinet") ||
    type.includes("wardrobe") ||
    type.includes("rack") ||
    type.includes("shelf") ||
    type.includes("display unit")
  ) {
    return (
      <group onClick={handleSelect}>
        <mesh castShadow receiveShadow position={[x, height / 2, z]}>
          <boxGeometry args={[width, height, depth]} />
          <FurnitureMaterial color={color} />
        </mesh>
        <mesh castShadow receiveShadow position={[x - width * 0.24, height / 2, z + depth / 2 + 0.01]}>
          <boxGeometry args={[0.06, height * 0.72, 0.06]} />
          <meshStandardMaterial color="#7a8797" roughness={0.7} metalness={0.15} />
        </mesh>
        <mesh castShadow receiveShadow position={[x + width * 0.24, height / 2, z + depth / 2 + 0.01]}>
          <boxGeometry args={[0.06, height * 0.72, 0.06]} />
          <meshStandardMaterial color="#7a8797" roughness={0.7} metalness={0.15} />
        </mesh>
        {hasRecommendations && (
          <mesh position={[x, height + 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[Math.max(Math.min(width, depth) * 0.24, 0.22), Math.max(Math.min(width, depth) * 0.3, 0.3), 32]} />
            <meshBasicMaterial color={outlineColor} transparent opacity={0.95} />
          </mesh>
        )}
        <FurnitureLabel x={x} y={labelY} z={z} text={furnitureItem.type} />
      </group>
    );
  }

  if (type.includes("kitchen slab")) {
    return (
      <group>
        <mesh castShadow receiveShadow position={[x, height / 2, z]}>
          <boxGeometry args={[width, height, depth]} />
          <FurnitureMaterial color={color} />
        </mesh>
        <mesh castShadow receiveShadow position={[x, height + 0.05, z]}>
          <boxGeometry args={[width, 0.1, depth]} />
          <meshStandardMaterial color="#9aa6b4" roughness={0.55} metalness={0.12} />
        </mesh>
        {hasRecommendations && (
          <mesh position={[x, height + 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[Math.max(Math.min(width, depth) * 0.24, 0.22), Math.max(Math.min(width, depth) * 0.3, 0.3), 32]} />
            <meshBasicMaterial color={outlineColor} transparent opacity={0.95} />
          </mesh>
        )}
        <FurnitureLabel x={x} y={labelY} z={z} text={furnitureItem.type} />
      </group>
    );
  }

  return (
    <group onClick={handleSelect}>
      <mesh castShadow receiveShadow position={[x, height / 2, z]}>
        <boxGeometry args={[width, height, depth]} />
        <FurnitureMaterial color={color} />
      </mesh>
      {hasRecommendations && (
        <mesh position={[x, height + 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(Math.min(width, depth) * 0.24, 0.22), Math.max(Math.min(width, depth) * 0.3, 0.3), 32]} />
          <meshBasicMaterial color={outlineColor} transparent opacity={0.95} />
        </mesh>
      )}
      <FurnitureLabel x={x} y={labelY} z={z} text={furnitureItem.type} />
    </group>
  );
}

function Floor3DScene({
  rooms,
  totalWidth,
  totalHeight,
  wallThickness,
  roomHeight,
  wallSegments,
  selectedFurnitureKey,
  onFurnitureSelect,
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
        const { windows } = getRoomOpenings(room, h);

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

            {windows.map((windowItem, idx) => {
              const line = getOpeningLineSegment(room, windowItem);
              if (!line) return null;

              const isVertical = line.x1 === line.x2;
              const centerPos = isVertical
                ? [
                    line.x1,
                    windowItem.sillHeight + windowItem.height / 2,
                    (line.y1 + line.y2) / 2,
                  ]
                : [
                    (line.x1 + line.x2) / 2,
                    windowItem.sillHeight + windowItem.height / 2,
                    line.y1,
                  ];

              return (
                <mesh key={`glass-${room.id}-${idx}`} position={centerPos}>
                  <boxGeometry
                    args={
                      isVertical
                        ? [Math.max(wt * 0.18, 0.04), windowItem.height, windowItem.width]
                        : [windowItem.width, windowItem.height, Math.max(wt * 0.18, 0.04)]
                    }
                  />
                  <meshStandardMaterial
                    color="#b9e3ff"
                    transparent
                    opacity={0.45}
                    roughness={0.08}
                    metalness={0.1}
                  />
                </mesh>
              );
            })}

            {(room.furniture || []).map((item) => (
              <Furniture3D
                key={item.id}
                room={room}
                furnitureItem={item}
                isSelected={selectedFurnitureKey === `${room.id}-${item.id}`}
                onSelect={(selectedItem) => onFurnitureSelect?.(room, selectedItem)}
              />
            ))}
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
      strokeDasharray={isWindow ? "10 6" : undefined}
      strokeLinecap="square"
    />
  );
}

/**
 * 2D corner fix
 * Furniture only: no rounded corners.
 * kitchen slab + wall attachment
 */
function Furniture2D({ room, furnitureItem, scale, isSelected = false, onSelect }) {
  const roomX = Number(room.x) || 0;
  const roomY = Number(room.y) || 0;

  const localX = Number(furnitureItem.x) || 0;
  const localY = Number(furnitureItem.y) || 0;
  const width = Number(furnitureItem.width) || 1;
  const depth = Number(furnitureItem.depth) || 1;

  const x = (roomX + localX) * scale;
  const y = (roomY + localY) * scale;
  const w = width * scale;
  const h = depth * scale;
  const isSlab = isKitchenSlab(furnitureItem);
  const hasRecommendations = getFurnitureRecommendationItems(furnitureItem.type).length > 0;

  const centerX = x + w / 2;
  const centerY = y + h / 2;

  const nameFontSize = Math.max(5.5, Math.min(8, Math.min(w, h) * 0.09));
  const dimFontSize = Math.max(4.75, Math.min(6.5, Math.min(w, h) * 0.075));

  const labelOffsetY = h >= 42 ? -3 : -1;
  const dimOffsetY = h >= 42 ? 10 : 8;

  const handleSelect = (event) => {
    if (!hasRecommendations || typeof onSelect !== "function") return;
    event?.stopPropagation?.();
    onSelect(furnitureItem);
  };

  return (
    <g
      onClick={handleSelect}
      style={hasRecommendations ? { cursor: "pointer" } : undefined}
    >
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="0"
        fill={furnitureItem.color || "#cfd8e3"}
        stroke={isSelected ? "#0f3b72" : isSlab ? "#4f5f74" : "#5b6a81"}
        strokeWidth={isSelected ? "2.4" : isSlab ? "1.8" : "1.4"}
      />
      {isSlab && (
        <line
          x1={x}
          y1={y}
          x2={
            furnitureItem.attachedWall === "left" || furnitureItem.attachedWall === "right"
              ? x
              : x + w
          }
          y2={
            furnitureItem.attachedWall === "top" || furnitureItem.attachedWall === "bottom"
              ? y
              : y + h
          }
          stroke="#8a98a8"
          strokeWidth="2"
        />
      )}

      <text
        x={centerX}
        y={centerY + labelOffsetY}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontSize: nameFontSize,
          fontWeight: 600,
          fill: "#243246",
          pointerEvents: "none",
        }}
      >
        {furnitureItem.type}
      </text>

      <text
        x={centerX}
        y={centerY + dimOffsetY}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontSize: dimFontSize,
          fontWeight: 500,
          fill: "#5b677c",
          pointerEvents: "none",
        }}
      >
        {`${width} ft × ${depth} ft`}
      </text>
    </g>
  );
}

function getFurnitureOptionsForCategory(category) {
  return FURNITURE_PRESETS[category] || [];
}

function getDefaultFurnitureSelection(category) {
  return getFurnitureOptionsForCategory(category)[0]?.type || "";
}

function getFurnitureRecommendationItems(furnitureType) {
  const normalizedType = String(furnitureType || "").trim().toLowerCase();
  return FURNITURE_PRODUCT_RECOMMENDATIONS[normalizedType] || [];
}


function createProjectId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `project-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getDefaultProjectState() {
  return {
    planName: "My Floor Plan",
    totalWidth: 40,
    totalHeight: 30,
    wallThickness: WALL_THICKNESS_FT,
    scale: DEFAULT_SCALE,
    roomHeight: DEFAULT_ROOM_HEIGHT,
    activeView: "2d",
    selectedCategory: "office",
    rooms: getDefaultRooms(40, 30),
    furnitureSelections: {},
  };
}

function readProjectsFromStorage() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to read saved projects:", error);
    return [];
  }
}

function writeProjectsToStorage(projects) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error("Failed to save projects:", error);
  }
}

async function svgElementToPngDataUrl(svgEl, outputWidth = 1600) {
  if (!svgEl) return "";

  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svgEl);
  const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
    });

    const bbox = svgEl.getBoundingClientRect();
    const aspectRatio = bbox.width && bbox.height ? bbox.height / bbox.width : 0.6;

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = Math.round(outputWidth * aspectRatio);

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function createChatMessage(role, content) {
  return {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
  };
}

function getSavedOpenAIApiKey() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(FLOOR_PLAN_OPENAI_KEY_STORAGE) || "";
  } catch (error) {
    console.error("Failed to read OpenAI API key:", error);
    return "";
  }
}

function persistOpenAIApiKey(apiKey) {
  if (typeof window === "undefined" || !apiKey) return;
  try {
    window.localStorage.setItem(FLOOR_PLAN_OPENAI_KEY_STORAGE, apiKey);
  } catch (error) {
    console.error("Failed to persist OpenAI API key:", error);
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
async function analyzeFloorPlanWithOpenAI(file) {
  const apiKey = localStorage.getItem("floor-plan-openai-api-key");
  if (!apiKey) {
    throw new Error("OpenAI API key not found in localStorage.");
  }

  const base64 = await fileToBase64(file);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-5.4-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Analyze this floor plan image and extract rooms, doors, windows, totalWidth, and totalHeight.
Return only valid JSON matching the schema.`,
            },
            {
              type: "input_image",
              image_url: `data:${file.type};base64,${base64}`,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "floor_plan_extraction",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              planName: { type: "string" },
              totalWidth: { type: "number" },
              totalHeight: { type: "number" },
              rooms: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    name: { type: "string" },
                    x: { type: "number" },
                    y: { type: "number" },
                    width: { type: "number" },
                    height: { type: "number" }
                  },
                  required: ["name", "x", "y", "width", "height"]
                }
              },
              doors: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    room: { type: "string" },
                    wall: { type: "string" },
                    position: { type: "number" },
                    width: { type: "number" },
                    height: { type: "number" }
                  },
                  required: ["room", "wall", "position"]
                }
              },
              windows: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    room: { type: "string" },
                    wall: { type: "string" },
                    position: { type: "number" },
                    width: { type: "number" },
                    height: { type: "number" },
                    sillHeight: { type: "number" }
                  },
                  required: ["room", "wall", "position"]
                }
              }
            },
            required: ["planName", "totalWidth", "totalHeight", "rooms", "doors", "windows"]
          }
        }
      }
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("OpenAI error payload:", data);
    throw new Error(data?.error?.message || `OpenAI request failed with status ${response.status}`);
  }

const rawText = data?.output_text?.trim?.() || "";

if (!rawText) {
  console.error("Full OpenAI response:", data);
  throw new Error(
    "OpenAI returned an empty response. Open console and inspect the full payload."
  );
}
  return JSON.parse(rawText);
}
function normalizeVisionWallName(wall) {
  const value = String(wall || "").toLowerCase().trim();
  if (value === "north" || value === "top") return "top";
  if (value === "south" || value === "bottom") return "bottom";
  if (value === "west" || value === "left") return "left";
  if (value === "east" || value === "right") return "right";
  return "top";
}

async function resizeImageFileForVision(file, maxDimension = 1600, quality = 0.82) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });

  const originalWidth = Number(image.width) || maxDimension;
  const originalHeight = Number(image.height) || maxDimension;
  const scaleRatio = Math.min(1, maxDimension / Math.max(originalWidth, originalHeight));
  const width = Math.max(1, Math.round(originalWidth * scaleRatio));
  const height = Math.max(1, Math.round(originalHeight * scaleRatio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const outputMimeType = "image/jpeg";
  const outputDataUrl = canvas.toDataURL(outputMimeType, quality);
  return {
    mimeType: outputMimeType,
    dataUrl: outputDataUrl,
    base64: outputDataUrl.split(",")[1] || "",
  };
}

function derivePlanSizeFromVision(rooms, fallbackWidth = 40, fallbackHeight = 30) {
  if (!Array.isArray(rooms) || !rooms.length) {
    return { totalWidth: fallbackWidth, totalHeight: fallbackHeight };
  }

  const maxX = Math.max(...rooms.map((room) => (Number(room.x) || 0) + (Number(room.width) || 0)));
  const maxY = Math.max(...rooms.map((room) => (Number(room.y) || 0) + (Number(room.height) || 0)));

  return {
    totalWidth: Math.max(10, Math.ceil(maxX || fallbackWidth)),
    totalHeight: Math.max(10, Math.ceil(maxY || fallbackHeight)),
  };
}

function sanitizeVisionFloorPlanResponse(aiResponse, currentState) {
  if (!aiResponse || typeof aiResponse !== "object") return null;

  const rawRooms = Array.isArray(aiResponse.rooms) ? aiResponse.rooms : [];
  const rawDoors = Array.isArray(aiResponse.doors) ? aiResponse.doors : [];
  const rawWindows = Array.isArray(aiResponse.windows) ? aiResponse.windows : [];

  if (!rawRooms.length) return null;

  const colorizedRooms = rawRooms.map((room, index) => ({
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `room-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    name: String(room?.name || `Room ${index + 1}`),
    x: Math.max(0, Number(room?.x) || 0),
    y: Math.max(0, Number(room?.y) || 0),
    width: Math.max(4, Number(room?.width) || 10),
    height: Math.max(4, Number(room?.height) || 10),
    color: ROOM_COLORS[index % ROOM_COLORS.length],
    doors: [],
    windows: [],
    furniture: [],
  }));

  const inferredPlan = derivePlanSizeFromVision(
    colorizedRooms,
    Number(currentState?.totalWidth) || 40,
    Number(currentState?.totalHeight) || 30
  );

  const totalWidth = Math.max(10, Number(aiResponse.totalWidth) || inferredPlan.totalWidth);
  const totalHeight = Math.max(10, Number(aiResponse.totalHeight) || inferredPlan.totalHeight);

  const positionedRooms = colorizedRooms.some((room) => Number(room.x) || Number(room.y))
    ? colorizedRooms
    : fitRoomsInGrid(colorizedRooms, totalWidth, totalHeight);

  const roomMap = new Map(positionedRooms.map((room) => [String(room.name || "").toLowerCase().trim(), room]));

  rawDoors.forEach((door) => {
    const room = roomMap.get(String(door?.room || "").toLowerCase().trim());
    if (!room) return;

    const wall = normalizeVisionWallName(door?.wall);
    const wallLength = getWallLength(room, wall);
    const width = clamp(Number(door?.width) || DEFAULT_DOOR_WIDTH, 1, Math.max(1, wallLength));
    const maxOffset = Math.max(0, wallLength - width);

    room.doors.push({
      wall,
      offset: clamp(Number(door?.position) || 0, 0, maxOffset),
      width,
      height: Math.max(1, Number(door?.height) || DEFAULT_DOOR_HEIGHT),
    });
  });

  rawWindows.forEach((windowItem) => {
    const room = roomMap.get(String(windowItem?.room || "").toLowerCase().trim());
    if (!room) return;

    const wall = normalizeVisionWallName(windowItem?.wall);
    const wallLength = getWallLength(room, wall);
    const width = clamp(Number(windowItem?.width) || DEFAULT_WINDOW_WIDTH, 1, Math.max(1, wallLength));
    const maxOffset = Math.max(0, wallLength - width);

    room.windows.push({
      wall,
      offset: clamp(Number(windowItem?.position) || 0, 0, maxOffset),
      width,
      height: Math.max(1, Number(windowItem?.height) || DEFAULT_WINDOW_HEIGHT),
      sillHeight: Math.max(0, Number(windowItem?.sillHeight) || DEFAULT_WINDOW_SILL_HEIGHT),
    });
  });

  return {
    planName: String(aiResponse.planName || currentState?.planName || "Uploaded Floor Plan"),
    selectedCategory: currentState?.selectedCategory || "office",
    totalWidth,
    totalHeight,
    rooms: positionedRooms,
    responseText: aiResponse.responseText || `Uploaded floor plan analyzed with ${positionedRooms.length} rooms.`,
  };
}

function getFriendlyCategoryName(category) {
  return String(category || "")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function extractPlanDimensions(prompt) {
  const text = String(prompt || "");
  const multiNumberMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:x|by|\*)\s*(\d+(?:\.\d+)?)/i);
  if (multiNumberMatch) {
    return {
      totalWidth: Number(multiNumberMatch[1]) || 40,
      totalHeight: Number(multiNumberMatch[2]) || 30,
    };
  }

  const feetNumbers = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(?:ft|feet)/gi)].map((match) =>
    Number(match[1])
  );

  if (feetNumbers.length >= 2) {
    return {
      totalWidth: feetNumbers[0] || 40,
      totalHeight: feetNumbers[1] || 30,
    };
  }

  return null;
}

function makeDefaultDoorForRoom(room) {
  const width = clamp(Math.max(2.5, Math.min((Number(room.width) || 8) * 0.28, 4)), 2.5, Math.max(2.5, Number(room.width) || 4));
  return [
    {
      wall: "bottom",
      offset: Math.max(0, ((Number(room.width) || width) - width) / 2),
      width,
      height: DEFAULT_DOOR_HEIGHT,
    },
  ];
}

function makeDefaultWindowForRoom(room) {
  const useTopWall = (Number(room.width) || 0) >= (Number(room.height) || 0);
  const wall = useTopWall ? "top" : "right";
  const wallLength = useTopWall ? Number(room.width) || 6 : Number(room.height) || 6;
  const width = clamp(Math.max(2.5, Math.min(wallLength * 0.32, 5)), 2.5, Math.max(2.5, wallLength));
  return [
    {
      wall,
      offset: Math.max(0, (wallLength - width) / 2),
      width,
      height: DEFAULT_WINDOW_HEIGHT,
      sillHeight: DEFAULT_WINDOW_SILL_HEIGHT,
    },
  ];
}

function createFurnitureFromPreset(preset, category, overrides = {}) {
  if (!preset) return null;

  const baseId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `furniture-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const isSlab = isKitchenSlab(preset) || isKitchenSlab({ type: preset.type });

  if (isSlab) {
    return {
      id: baseId,
      type: preset.type,
      category,
      width: preset.width,
      depth: preset.depth,
      height: preset.height,
      slabLength: preset.width,
      slabDepth: preset.depth,
      attachedWall: "bottom",
      offset: 0,
      color: preset.color,
      ...overrides,
    };
  }

  return {
    id: baseId,
    type: preset.type,
    category,
    width: preset.width,
    depth: preset.depth,
    height: preset.height,
    x: FURNITURE_WALL_CLEARANCE,
    y: FURNITURE_WALL_CLEARANCE,
    color: preset.color,
    ...overrides,
  };
}

function getDefaultFurnitureForRoomName(roomName, category) {
  const options = getFurnitureOptionsForCategory(category);
  const label = String(roomName || "").toLowerCase();

  const matchByIncludes = (terms) =>
    options.find((item) => terms.some((term) => String(item.type).toLowerCase().includes(term)));

  const selected = (() => {
    if (category === "house") {
      if (label.includes("bed")) {
        return [
          matchByIncludes(["bed"]),
          matchByIncludes(["wardrobe"]),
        ].filter(Boolean);
      }

      if (label.includes("living")) {
        return [
          matchByIncludes(["sofa"]),
          matchByIncludes(["center table"]),
        ].filter(Boolean);
      }

      if (label.includes("kitchen")) {
        return [
          matchByIncludes(["kitchen slab"]),
          matchByIncludes(["stove"]),
          matchByIncludes(["sink"]),
        ].filter(Boolean);
      }

      if (label.includes("dining")) {
        return [matchByIncludes(["dining table"])].filter(Boolean);
      }

      if (label.includes("bath") || label.includes("toilet")) {
        return [];
      }
    }

    if (category === "office") {
      if (label.includes("meeting") || label.includes("conference")) {
        return [matchByIncludes(["conference table"])].filter(Boolean);
      }
      if (label.includes("reception")) {
        return [matchByIncludes(["reception"])].filter(Boolean);
      }
      return [
        matchByIncludes(["workstation"]),
        matchByIncludes(["chair"]),
      ].filter(Boolean);
    }

    if (category === "cafe") {
      if (label.includes("counter")) {
        return [matchByIncludes(["service counter"])].filter(Boolean);
      }
      return [
        matchByIncludes(["4-seater table"]) || matchByIncludes(["2-seater table"]),
        matchByIncludes(["chair"]),
      ].filter(Boolean);
    }

    if (category === "storage") {
      return [options[0], options[2]].filter(Boolean);
    }

    if (category === "security cabin") {
      return [
        matchByIncludes(["guard chair"]),
        matchByIncludes(["small desk"]),
      ].filter(Boolean);
    }

    if (category === "public toilet") {
      return [
        matchByIncludes(["toilet seat"]),
        matchByIncludes(["wash basin"]),
      ].filter(Boolean);
    }

    return [options[0]].filter(Boolean);
  })();

  return selected
    .map((preset, index) =>
      createFurnitureFromPreset(preset, category, {
        x: FURNITURE_WALL_CLEARANCE + index * 0.8,
        y: FURNITURE_WALL_CLEARANCE + index * 0.8,
      })
    )
    .filter(Boolean);
}

function createTemplateRoom(index, name, width, height, category, overrides = {}) {
  const room = {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `room-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    width,
    height,
    x: 0,
    y: 0,
    color: ROOM_COLORS[index % ROOM_COLORS.length],
    doors: [],
    windows: [],
    furniture: [],
    ...overrides,
  };

  return {
    ...room,
    doors: Array.isArray(room.doors) && room.doors.length ? room.doors : makeDefaultDoorForRoom(room),
    windows:
      Array.isArray(room.windows) && room.windows.length ? room.windows : makeDefaultWindowForRoom(room),
    furniture:
      Array.isArray(room.furniture) && room.furniture.length
        ? room.furniture
        : getDefaultFurnitureForRoomName(name, category),
  };
}

function buildPresetTemplate(kind, totalWidth, totalHeight) {
  const normalizedKind = String(kind || "").toLowerCase();

  if (normalizedKind === "1bhk") {
    return {
      planName: "1BHK Floor Plan",
      selectedCategory: "house",
      totalWidth,
      totalHeight,
      rooms: [
        createTemplateRoom(0, "Living Room", 14, 12, "house"),
        createTemplateRoom(1, "Bedroom 1", 12, 12, "house"),
        createTemplateRoom(2, "Kitchen", 10, 8, "house"),
        createTemplateRoom(3, "Bathroom", 6, 8, "house", { furniture: [] }),
      ],
    };
  }

  if (normalizedKind === "2bhk") {
    return {
      planName: "2BHK Floor Plan",
      selectedCategory: "house",
      totalWidth,
      totalHeight,
      rooms: [
        createTemplateRoom(0, "Living Room", 14, 12, "house"),
        createTemplateRoom(1, "Bedroom 1", 12, 11, "house"),
        createTemplateRoom(2, "Bedroom 2", 11, 10, "house"),
        createTemplateRoom(3, "Kitchen", 10, 8, "house"),
        createTemplateRoom(4, "Bathroom 1", 6, 7, "house", { furniture: [] }),
        createTemplateRoom(5, "Bathroom 2", 6, 7, "house", { furniture: [] }),
      ],
    };
  }

  if (normalizedKind === "office") {
    return {
      planName: "Office Layout",
      selectedCategory: "office",
      totalWidth,
      totalHeight,
      rooms: [
        createTemplateRoom(0, "Reception", 10, 10, "office"),
        createTemplateRoom(1, "Workspace", 16, 14, "office"),
        createTemplateRoom(2, "Meeting Room", 12, 10, "office"),
      ],
    };
  }

  if (normalizedKind === "cafe") {
    return {
      planName: "Cafe Layout",
      selectedCategory: "cafe",
      totalWidth,
      totalHeight,
      rooms: [
        createTemplateRoom(0, "Seating Area", 16, 14, "cafe"),
        createTemplateRoom(1, "Service Counter", 10, 8, "cafe"),
        createTemplateRoom(2, "Kitchen / Prep", 10, 8, "cafe"),
      ],
    };
  }

  if (normalizedKind === "storage") {
    return {
      planName: "Storage Layout",
      selectedCategory: "storage",
      totalWidth,
      totalHeight,
      rooms: [createTemplateRoom(0, "Storage Area", Math.max(18, totalWidth - 4), Math.max(14, totalHeight - 4), "storage")],
    };
  }

  if (normalizedKind === "security cabin") {
    return {
      planName: "Security Cabin Layout",
      selectedCategory: "security cabin",
      totalWidth,
      totalHeight,
      rooms: [createTemplateRoom(0, "Security Cabin", Math.max(8, totalWidth - 2), Math.max(8, totalHeight - 2), "security cabin")],
    };
  }

  if (normalizedKind === "public toilet") {
    return {
      planName: "Public Toilet Layout",
      selectedCategory: "public toilet",
      totalWidth,
      totalHeight,
      rooms: [
        createTemplateRoom(0, "Male Toilet", 10, 8, "public toilet"),
        createTemplateRoom(1, "Female Toilet", 10, 8, "public toilet"),
        createTemplateRoom(2, "Wash Area", 8, 6, "public toilet"),
      ],
    };
  }

  return null;
}

function normalizeGeneratedRooms(rooms, totalWidth, totalHeight, category) {
  const nextRooms = Array.isArray(rooms) ? rooms : [];
  const baseRooms = nextRooms.map((room, index) =>
    createTemplateRoom(
      index,
      room.name || `Room ${index + 1}`,
      Math.max(6, Number(room.width) || 10),
      Math.max(6, Number(room.height) || 10),
      category,
      {
        ...room,
        furniture:
          Array.isArray(room.furniture) && room.furniture.length
            ? room.furniture.map((item, itemIndex) =>
                createFurnitureFromPreset(
                  {
                    type: item.type || `Furniture ${itemIndex + 1}`,
                    width: Number(item.width) || 3,
                    depth: Number(item.depth) || 2,
                    height: Number(item.height) || 3,
                    color: item.color || "#d4dde8",
                  },
                  category,
                  {
                    x: Number(item.x) || FURNITURE_WALL_CLEARANCE,
                    y: Number(item.y) || FURNITURE_WALL_CLEARANCE,
                    attachedWall: item.attachedWall,
                    slabLength: item.slabLength,
                    slabDepth: item.slabDepth,
                    offset: Number(item.offset) || 0,
                  }
                )
              )
            : getDefaultFurnitureForRoomName(room.name, category),
        doors:
          Array.isArray(room.doors) && room.doors.length
            ? room.doors.map((door) => ({
                wall: WALL_OPTIONS.includes(door.wall) ? door.wall : "bottom",
                offset: Number(door.offset) || 0,
                width: Number(door.width) || DEFAULT_DOOR_WIDTH,
                height: Number(door.height) || DEFAULT_DOOR_HEIGHT,
              }))
            : makeDefaultDoorForRoom(room),
        windows:
          Array.isArray(room.windows) && room.windows.length
            ? room.windows.map((windowItem) => ({
                wall: WALL_OPTIONS.includes(windowItem.wall) ? windowItem.wall : "top",
                offset: Number(windowItem.offset) || 0,
                width: Number(windowItem.width) || DEFAULT_WINDOW_WIDTH,
                height: Number(windowItem.height) || DEFAULT_WINDOW_HEIGHT,
                sillHeight: Number(windowItem.sillHeight) || DEFAULT_WINDOW_SILL_HEIGHT,
              }))
            : makeDefaultWindowForRoom(room),
      }
    )
  );

  return fitRoomsInGrid(baseRooms, Number(totalWidth), Number(totalHeight));
}

function parseRuleBasedPlanCommand(prompt, currentState) {
  const text = String(prompt || "").trim();
  if (!text) return null;

  const lower = text.toLowerCase();
  const dimensions = extractPlanDimensions(text) || {};
  const totalWidth = Number(dimensions.totalWidth) || Number(currentState.totalWidth) || 40;
  const totalHeight = Number(dimensions.totalHeight) || Number(currentState.totalHeight) || 30;

  const presetChecks = [
    { terms: ["2bhk", "2 bhk", "two bedroom"], preset: "2bhk" },
    { terms: ["1bhk", "1 bhk", "one bedroom"], preset: "1bhk" },
    { terms: ["office"], preset: "office" },
    { terms: ["cafe", "coffee shop"], preset: "cafe" },
    { terms: ["storage", "warehouse"], preset: "storage" },
    { terms: ["security cabin", "guard room"], preset: "security cabin" },
    { terms: ["public toilet", "restroom", "washroom"], preset: "public toilet" },
  ];

  for (const presetCheck of presetChecks) {
    if (presetCheck.terms.some((term) => lower.includes(term))) {
      const preset = buildPresetTemplate(presetCheck.preset, totalWidth, totalHeight);
      if (!preset) return null;

      return {
        ...preset,
        totalWidth,
        totalHeight,
        rooms: normalizeGeneratedRooms(
          preset.rooms,
          totalWidth,
          totalHeight,
          preset.selectedCategory
        ),
        responseText:
          `Created a ${preset.planName} with ${preset.rooms.length} rooms in ${totalWidth} ft × ${totalHeight} ft.`,
      };
    }
  }

  const addRoomsMatch = lower.match(/add\s+(\d+)\s+rooms?/);
  if (addRoomsMatch) {
    const category = PRODUCT_CATEGORIES.includes(currentState.selectedCategory)
      ? currentState.selectedCategory
      : "office";
    const roomCount = Math.max(1, Number(addRoomsMatch[1]) || 1);
    const generatedRooms = Array.from({ length: roomCount }, (_, index) =>
      createTemplateRoom(index, `Room ${index + 1}`, 10, 10, category)
    );

    return {
      planName: currentState.planName,
      selectedCategory: category,
      totalWidth,
      totalHeight,
      rooms: normalizeGeneratedRooms(generatedRooms, totalWidth, totalHeight, category),
      responseText: `Added ${roomCount} rooms and arranged them inside the current plan.`,
    };
  }

  return null;
}

function sanitizeOpenAIPlanResponse(aiResponse, currentState) {
  if (!aiResponse || typeof aiResponse !== "object") return null;

  const category = PRODUCT_CATEGORIES.includes(aiResponse.selectedCategory)
    ? aiResponse.selectedCategory
    : currentState.selectedCategory;

  const totalWidth = Number(aiResponse.totalWidth) || Number(currentState.totalWidth) || 40;
  const totalHeight = Number(aiResponse.totalHeight) || Number(currentState.totalHeight) || 30;
  const rooms = normalizeGeneratedRooms(
    Array.isArray(aiResponse.rooms) ? aiResponse.rooms : [],
    totalWidth,
    totalHeight,
    category
  );

  if (!rooms.length) return null;

  return {
    planName: aiResponse.planName || currentState.planName || "AI Floor Plan",
    selectedCategory: category,
    totalWidth,
    totalHeight,
    rooms,
    responseText:
      aiResponse.responseText ||
      `Created a ${getFriendlyCategoryName(category)} layout with ${rooms.length} rooms.`,
  };
}

async function generatePlanFromOpenAI(apiKey, userPrompt, currentState) {
  const safeApiKey = String(apiKey || "").trim();
  if (!safeApiKey) {
    throw new Error("OpenAI API key is missing.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${safeApiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {
          role: "system",
          content:
            "You are an assistant for a React floor plan generator. Return structured JSON only and keep room dimensions practical.",
        },
        {
          role: "user",
          content: `Current plan context:
${JSON.stringify(currentState, null, 2)}

User request:
${userPrompt}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "floor_plan_response",
          strict: true,
          schema: {
            type: "object",
            properties: {
              planName: { type: "string" },
              selectedCategory: { type: "string", enum: PRODUCT_CATEGORIES },
              totalWidth: { type: "number" },
              totalHeight: { type: "number" },
              responseText: { type: "string" },
              rooms: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    width: { type: "number" },
                    height: { type: "number" },
                  },
                  required: ["name", "width", "height"],
                  additionalProperties: false,
                },
              },
            },
            required: ["planName", "selectedCategory", "totalWidth", "totalHeight", "responseText", "rooms"],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const result = await response.json();
  const rawText = result?.output_text || "";
  if (!rawText) {
    throw new Error("OpenAI returned an empty response.");
  }

  const parsed = JSON.parse(rawText);
  return sanitizeOpenAIPlanResponse(parsed, currentState);
}

async function analyzeFloorPlanImageWithOpenAI(apiKey, file, currentState) {
  const safeApiKey = String(apiKey || "").trim();
  if (!safeApiKey) {
    throw new Error("OpenAI API key is missing.");
  }

  const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Invalid image format. Please upload a PNG or JPG file.");
  }

  const preparedImage = await resizeImageFileForVision(file, 1600, 0.82);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${safeApiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You analyze architectural floor plan images and extract rooms, doors, and windows into clean JSON for a React floor plan generator.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Analyze this uploaded floor plan image and return the room layout. Use practical dimensions and include x/y coordinates when possible. Current app context:
${JSON.stringify(currentState, null, 2)}` ,
            },
            {
              type: "input_image",
              image_url: preparedImage.dataUrl,
              detail: "high",
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "floor_plan_image_response",
          strict: true,
          schema: {
            type: "object",
            properties: {
              planName: { type: "string" },
              totalWidth: { type: "number" },
              totalHeight: { type: "number" },
              responseText: { type: "string" },
              rooms: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    x: { type: "number" },
                    y: { type: "number" },
                    width: { type: "number" },
                    height: { type: "number" },
                  },
                  required: ["name", "x", "y", "width", "height"],
                  additionalProperties: false,
                },
              },
              doors: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    room: { type: "string" },
                    wall: { type: "string", enum: ["north", "south", "east", "west", "top", "bottom", "left", "right"] },
                    position: { type: "number" },
                    width: { type: "number" },
                    height: { type: "number" },
                  },
                  required: ["room", "wall", "position", "width", "height"],
                  additionalProperties: false,
                },
              },
              windows: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    room: { type: "string" },
                    wall: { type: "string", enum: ["north", "south", "east", "west", "top", "bottom", "left", "right"] },
                    position: { type: "number" },
                    width: { type: "number" },
                    height: { type: "number" },
                    sillHeight: { type: "number" },
                  },
                  required: ["room", "wall", "position", "width", "height", "sillHeight"],
                  additionalProperties: false,
                },
              },
            },
            required: ["planName", "totalWidth", "totalHeight", "responseText", "rooms", "doors", "windows"],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  if (!response.ok) {
    let errorMessage = `OpenAI vision request failed with status ${response.status}`;
    if (response.status === 401 || response.status === 403) {
      errorMessage = "OpenAI API key is invalid or does not have permission for this project.";
    } else if (response.status === 429) {
      errorMessage = "OpenAI rate limit or quota exceeded. Please wait a minute and try again.";
    }
    throw new Error(errorMessage);
  }

  const result = await response.json();
  const rawText = result?.output_text || "";
  if (!rawText) {
    throw new Error("OpenAI vision returned an empty response.");
  }

  const parsed = JSON.parse(rawText);
  return sanitizeVisionFloorPlanResponse(parsed, currentState);
}


async function generatePlanRendersWithOpenAI(apiKey, payload) {
  const safeApiKey = String(apiKey || "").trim();
  if (!safeApiKey) {
    throw new Error("OpenAI API key is missing.");
  }

  const {
    planName,
    selectedCategory,
    totalWidth,
    totalHeight,
    rooms,
    image2D,
    image3D,
  } = payload;

  const roomSummary = Array.isArray(rooms)
    ? rooms.map((room) => ({
        name: room?.name || "Room",
        x: Number(room?.x) || 0,
        y: Number(room?.y) || 0,
        width: Number(room?.width) || 0,
        height: Number(room?.height) || 0,
        color: room?.color || "",
        doors: Array.isArray(room?.doors) ? room.doors : [],
        windows: Array.isArray(room?.windows) ? room.windows : [],
        furniture: Array.isArray(room?.furniture)
          ? room.furniture.map((item) => ({
              type: item?.type || "",
              x: Number(item?.x) || 0,
              y: Number(item?.y) || 0,
              width: Number(item?.width) || 0,
              depth: Number(item?.depth) || 0,
              height: Number(item?.height) || 0,
            }))
          : [],
      }))
    : [];

  const prompt = `
Create a highly realistic architectural visualization collage based on this floor plan.

Project:
- Name: ${planName || "My Floor Plan"}
- Category: ${selectedCategory || "office"}
- Total size: ${Number(totalWidth) || 0} ft x ${Number(totalHeight) || 0} ft

Strict requirements:
- Return one single high-quality wide collage image
- The collage must show 4 different camera angles of the same exact plan
- Keep layout, room positions, wall placements, doors, windows, and furniture faithful to the provided references
- Do not invent additional rooms
- Do not change the geometry of the plan
- Use realistic lighting, shadows, materials, flooring, wall finishes, and furniture styling
- Make the result look like a premium architectural render
- Camera angles should include:
  1. angled isometric overview
  2. living/front interior perspective
  3. opposite corner perspective
  4. close interior detail perspective

Room data:
${JSON.stringify(roomSummary, null, 2)}
  `.trim();

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${safeApiKey}`,
    },
    body: JSON.stringify({
  model: OPENAI_IMAGE_MODEL,
  prompt,
  size: "1536x1024",
  quality: "high",
}),
  });

  const result = await response.json();

  if (!response.ok) {
    console.error("OpenAI image generation error payload:", result);
    throw new Error(
      result?.error?.message ||
        `Image generation failed with status ${response.status}`
    );
  }

  const b64 = result?.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI did not return an image.");
  }

  return `data:image/png;base64,${b64}`;
}


export default function App() {
  const [planName, setPlanName] = useState("My Floor Plan");
  const [totalWidth, setTotalWidth] = useState(40);
  const [totalHeight, setTotalHeight] = useState(30);
  const [wallThickness, setWallThickness] = useState(WALL_THICKNESS_FT);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [roomHeight, setRoomHeight] = useState(DEFAULT_ROOM_HEIGHT);
  const [activeView, setActiveView] = useState("2d");
  const [selectedCategory, setSelectedCategory] = useState("office");
  const [rooms, setRooms] = useState(() => getDefaultRooms(40, 30));
  const [furnitureSelections, setFurnitureSelections] = useState({});
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return savedTheme === "dark" ? "dark" : "light";
  });

  const [savedProjects, setSavedProjects] = useState([]);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [projectStatusMessage, setProjectStatusMessage] = useState("");
  const [expandedRoomId, setExpandedRoomId] = useState(null);
  const [chatMessages, setChatMessages] = useState(() => [
    createChatMessage(
      "assistant",
      "Hi, I can help you navigate the app, create layouts like 1BHK / 2BHK / office / cafe, and apply voice commands."
    ),
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatbotBusy, setIsChatbotBusy] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isFloorPlanUploading, setIsFloorPlanUploading] = useState(false);
  const [isRenderGenerating, setIsRenderGenerating] = useState(false);
  const [generatedRenderImage, setGeneratedRenderImage] = useState("");
  const [generatedRenderProjectId, setGeneratedRenderProjectId] = useState(null);
  const [selectedFurnitureContext, setSelectedFurnitureContext] = useState(null);
  const threeContainerRef = useRef(null);
  const chatScrollRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const fileUploadInputRef = useRef(null);
const capture2DImage = async () => {
  const svgEl = document.getElementById("floor-plan-svg");
  if (!svgEl) return "";
  return await svgElementToPngDataUrl(svgEl, 1600);
};
  const capture3DImage = async () => {
  const canvas = threeContainerRef.current?.querySelector("canvas");
  if (!canvas) return "";

  try {
    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error("Failed to capture 3D image:", error);
    return "";
  }
};

  useEffect(() => {
    if (generatedRenderProjectId !== currentProjectId) {
      setGeneratedRenderImage("");
    }
  }, [currentProjectId, generatedRenderProjectId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);


  const placedRooms = useMemo(() => {
    return rooms.map((room) =>
      normalizeRoom(room, Number(totalWidth), Number(totalHeight), Number(roomHeight))
    );
  }, [rooms, totalWidth, totalHeight, roomHeight]);

  const wallSegments = useMemo(() => {
    return buildWallSegments(placedRooms, Number(totalWidth), Number(totalHeight));
  }, [placedRooms, totalWidth, totalHeight]);

  const selectedFurnitureDetails = useMemo(() => {
    if (!selectedFurnitureContext?.roomId || !selectedFurnitureContext?.furnitureId) return null;

    const room = placedRooms.find((item) => item.id === selectedFurnitureContext.roomId);
    const furniture = room?.furniture?.find((item) => item.id === selectedFurnitureContext.furnitureId);

    if (!room || !furniture) return null;

    return {
      room,
      furniture,
    };
  }, [placedRooms, selectedFurnitureContext]);

  const selectedFurnitureRecommendations = useMemo(() => {
    if (!selectedFurnitureDetails?.furniture?.type) return [];
    return getFurnitureRecommendationItems(selectedFurnitureDetails.furniture.type);
  }, [selectedFurnitureDetails]);

  const selectedFurnitureKey = selectedFurnitureContext
    ? `${selectedFurnitureContext.roomId}-${selectedFurnitureContext.furnitureId}`
    : null;

  const handleFurnitureSelection = useCallback((room, furnitureItem) => {
    if (!room?.id || !furnitureItem?.id) return;

    const recommendationItems = getFurnitureRecommendationItems(furnitureItem.type);
    if (!recommendationItems.length) {
      setSelectedFurnitureContext(null);
      return;
    }

    const nextKey = `${room.id}-${furnitureItem.id}`;

    setSelectedFurnitureContext((prev) => {
      const prevKey = prev ? `${prev.roomId}-${prev.furnitureId}` : null;
      if (prevKey === nextKey) return null;

      return {
        roomId: room.id,
        furnitureId: furnitureItem.id,
      };
    });
  }, []);

  const clearSelectedFurniture = useCallback(() => {
    setSelectedFurnitureContext(null);
  }, []);

const buildGoogleSheetsPayload = async ({
  projectId,
  safeName,
  image2D,
  image3D,
}) => {
  const syncedRooms = placedRooms.slice(0, MAX_SYNC_ROOMS);

  return {
    projectId,
    planName: safeName,
    savedAt: new Date().toISOString(),
    selectedCategory,
    totalWidth,
    totalHeight,
    wallThickness,
    scale,
    roomHeight,
    planSizeLabel: `${totalWidth} × ${totalHeight}`,
    totalRooms: placedRooms.length,
    totalRoomArea: Number(totalRoomArea.toFixed(2)),
    spaceUtilization: utilization,
    currentProjectId: currentProjectId || projectId,
    quotationValue: "",
    quotationNotes: "",
    image2D,
    image3D,
    ai_render_image_base64: generatedRenderImage || "",
    rooms: syncedRooms.map((room) => ({
      id: room.id || "",
      name: room.name || "",
      x: Number(room.x) || 0,
      y: Number(room.y) || 0,
      width: Number(room.width) || 0,
      height: Number(room.height) || 0,
      color: room.color || "",
      doors: Array.isArray(room.doors) ? room.doors : [],
      windows: Array.isArray(room.windows) ? room.windows : [],
      furniture: Array.isArray(room.furniture) ? room.furniture : [],
    })),
  };
};
  const syncProjectToGoogleSheets = async (payload) => {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Google Sheets sync failed.");
  }

  return result;
};
  const numericScale = Math.max(1, Number(scale) || 1);
  const numericWallThickness = Math.max(0.1, Number(wallThickness) || WALL_THICKNESS_FT);
  const canvasWidth = Number(totalWidth) * numericScale;
  const canvasHeight = Number(totalHeight) * numericScale;
  const svgWidth = canvasWidth + 120;
  const svgHeight = canvasHeight + 120;

  const totalRoomArea = placedRooms.reduce(
    (sum, room) => sum + Number(room.width) * Number(room.height),
    0
  );
  const totalPlanArea = Number(totalWidth) * Number(totalHeight);
  const utilization = totalPlanArea ? ((totalRoomArea / totalPlanArea) * 100).toFixed(1) : 0;

  const renderFurnitureRecommendations = () => {
    if (!selectedFurnitureDetails || !selectedFurnitureRecommendations.length) return null;

    return (
      <div className="furniture-recommendation-panel">
        <div className="section-header compact furniture-recommendation-header">
          <div>
            <h3>Selected Furniture Recommendations</h3>
            <p>Showing Amazon options for {selectedFurnitureDetails.furniture.type} in {selectedFurnitureDetails.room.name || "Room"}.</p>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={clearSelectedFurniture}
            aria-label="Close product recommendations"
          >
            <X size={16} />
          </button>
        </div>

        <div className="furniture-recommendation-grid">
          {selectedFurnitureRecommendations.map((product) => (
            <a
              key={product.id}
              className="furniture-product-card"
              href={product.url}
              target="_blank"
              rel="noreferrer"
            >
              <div className="furniture-product-image-wrap">
                <img
                  src={product.image}
                  alt={product.title}
                  className="furniture-recommendation-image"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = "/products/bed-wooden.jpg";
                  }}
                />
              </div>
              <div className="furniture-product-body">
                <span className="furniture-product-label">Amazon Option</span>
                <strong>{product.title}</strong>
                <span className="furniture-product-price">{product.price}</span>
                <span className="furniture-product-link">Open on Amazon <ExternalLink size={14} /></span>
              </div>
            </a>
          ))}
        </div>
      </div>
    );
  };

  const applyProjectState = (projectState) => {
    const defaults = getDefaultProjectState();
    const nextState = {
      ...defaults,
      ...(projectState || {}),
    };

    setPlanName(nextState.planName);
    setTotalWidth(Number(nextState.totalWidth) || defaults.totalWidth);
    setTotalHeight(Number(nextState.totalHeight) || defaults.totalHeight);
    setWallThickness(Number(nextState.wallThickness) || defaults.wallThickness);
    setScale(Number(nextState.scale) || defaults.scale);
    setRoomHeight(Number(nextState.roomHeight) || defaults.roomHeight);
    setActiveView(nextState.activeView === "3d" ? "3d" : "2d");
    setSelectedCategory(
      PRODUCT_CATEGORIES.includes(nextState.selectedCategory)
        ? nextState.selectedCategory
        : defaults.selectedCategory
    );

    const nextRooms =
      Array.isArray(nextState.rooms) && nextState.rooms.length ? nextState.rooms : defaults.rooms;

    setRooms(nextRooms);
    setExpandedRoomId(nextRooms[0]?.id || null);
    setFurnitureSelections(
      nextState.furnitureSelections && typeof nextState.furnitureSelections === "object"
        ? nextState.furnitureSelections
        : defaults.furnitureSelections
    );
  };

  const buildCurrentProjectData = () => ({
    planName,
    ai_render_image_base64: generatedRenderImage || "",
    totalWidth,
    totalHeight,
    wallThickness,
    scale,
    roomHeight,
    activeView,
    selectedCategory,
    rooms,
    furnitureSelections,
  });

  const refreshSavedProjects = () => {
    const projects = readProjectsFromStorage().sort(
      (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
    setSavedProjects(projects);
    return projects;
  };

  const formatProjectTimestamp = (value) => {
    if (!value) return "Saved just now";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Saved just now";

    return date.toLocaleString();
  };

  const appendChatMessage = (role, content) => {
    setChatMessages((prev) => [...prev, createChatMessage(role, content)]);
  };

  const applyGeneratedPlan = (nextPlan, sourceLabel = "assistant") => {
    if (!nextPlan) return;

    const mergedState = {
      ...buildCurrentProjectData(),
      ...nextPlan,
      activeView,
      wallThickness,
      scale,
      roomHeight,
      furnitureSelections: {},
    };

    applyProjectState(mergedState);
    setProjectStatusMessage(
      `Applied ${sourceLabel} layout: ${nextPlan.planName || getFriendlyCategoryName(nextPlan.selectedCategory)}`
    );
  };

  const handleUploadFloorPlanClick = useCallback(() => {
    if (isFloorPlanUploading) return;
    fileUploadInputRef.current?.click();
  }, [isFloorPlanUploading]);

  const handleFloorPlanImageSelected = async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (!file) return;

      try {
        setIsFloorPlanUploading(true);
        setProjectStatusMessage(`Analyzing "${file.name}" with ChatGPT...`);

        const openAIApiKey = getSavedOpenAIApiKey();
        if (!openAIApiKey) {
          throw new Error(
            "OpenAI API key not found in localStorage. Save it under floor-plan-openai-api-key first."
          );
        }

        persistOpenAIApiKey(openAIApiKey);

        const currentState = buildCurrentProjectData();
        const aiPlan = await analyzeFloorPlanImageWithOpenAI(openAIApiKey, file, currentState);

        if (!aiPlan || !Array.isArray(aiPlan.rooms) || !aiPlan.rooms.length) {
          throw new Error("ChatGPT could not detect any rooms from this image.");
        }

        applyGeneratedPlan(
          {
            ...aiPlan,
            activeView: "2d",
          },
          "ChatGPT"
        );
        setExpandedRoomId(aiPlan.rooms[0]?.id || null);
        setActiveView("2d");
        setProjectStatusMessage(`Floor plan uploaded successfully from "${file.name}".`);
      } catch (error) {
        console.error("Floor plan upload failed:", error);
        setProjectStatusMessage(
          error?.message || "Failed to analyze floor plan image. Please try another image."
        );
      } finally {
        setIsFloorPlanUploading(false);
      }
  };

  const handleStartVoiceInput = () => {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      appendChatMessage(
        "assistant",
        "Voice input is not supported in this browser. Text commands will still work."
      );
      return;
    }

    if (isListening && speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      appendChatMessage("assistant", "I could not capture the voice command. Please try again.");
    };
    recognition.onresult = (event) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || "";
      setChatInput(transcript);
    };

    speechRecognitionRef.current = recognition;
    recognition.start();
  };

  const handleChatSubmit = async (event) => {
    event?.preventDefault?.();

    const trimmedInput = String(chatInput || "").trim();
    if (!trimmedInput || isChatbotBusy) return;

    appendChatMessage("user", trimmedInput);
    setChatInput("");
    setIsChatbotBusy(true);

    try {
      const currentPlanState = buildCurrentProjectData();
      const ruleBasedPlan = parseRuleBasedPlanCommand(trimmedInput, currentPlanState);

      if (ruleBasedPlan) {
        applyGeneratedPlan(ruleBasedPlan, "chatbot");
        appendChatMessage("assistant", ruleBasedPlan.responseText);
        return;
      }

      const openAIApiKey = getSavedOpenAIApiKey();
      if (!openAIApiKey) {
        appendChatMessage(
          "assistant",
          "I can handle preset commands right now. For free-form AI planning, save your OpenAI key in localStorage under floor-plan-openai-api-key."
        );
        return;
      }

      persistOpenAIApiKey(openAIApiKey);
      const aiPlan = await generatePlanFromOpenAI(openAIApiKey, trimmedInput, currentPlanState);

      if (!aiPlan) {
        appendChatMessage(
          "assistant",
          "I understood the request only partially. Please try a more specific command like 'Create a 2BHK in 40 by 30 feet'."
        );
        return;
      }

      applyGeneratedPlan(aiPlan, "ChatGPT");
      appendChatMessage("assistant", aiPlan.responseText);
    } catch (error) {
      console.error("Chatbot command failed:", error);
      appendChatMessage(
        "assistant",
        "I could not apply that command. Please try a simpler instruction like 'Create a cafe layout 30 by 20'."
      );
    } finally {
      setIsChatbotBusy(false);
    }
  };

  useEffect(() => {
    refreshSavedProjects();
  }, []);

  useEffect(() => {
    if (!expandedRoomId && rooms.length) {
      setExpandedRoomId(rooms[0].id);
    }
  }, [expandedRoomId, rooms]);

  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMessages, isChatbotBusy]);

  const updateRoom = (id, key, value) => {
    setRooms((prev) => prev.map((room) => (room.id === id ? { ...room, [key]: value } : room)));
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

  const addFurnitureToRoom = (roomId) => {
    const room = rooms.find((item) => item.id === roomId);
    if (!room) return;

    const categoryOptions = getFurnitureOptionsForCategory(selectedCategory);
    if (!categoryOptions.length) return;

    const selectedType =
      furnitureSelections[roomId] || getDefaultFurnitureSelection(selectedCategory);

    const preset =
      categoryOptions.find((item) => item.type === selectedType) || categoryOptions[0];

    const isSlab = String(preset.type).toLowerCase() === "kitchen slab";

    setRooms((prev) =>
      prev.map((item) =>
        item.id === roomId
          ? {
              ...item,
              furniture: [
                ...(item.furniture || []),
                isSlab
                  ? {
                      id: crypto.randomUUID(),
                      type: preset.type,
                      category: selectedCategory,
                      width: preset.width,
                      depth: preset.depth,
                      height: preset.height,
                      slabLength: preset.width,
                      slabDepth: preset.depth,
                      attachedWall: "bottom",
                      offset: 0,
                      color: preset.color,
                    }
                  : {
                      id: crypto.randomUUID(),
                      type: preset.type,
                      category: selectedCategory,
                      width: preset.width,
                      depth: preset.depth,
                      height: preset.height,
                      x: FURNITURE_WALL_CLEARANCE,
                      y: FURNITURE_WALL_CLEARANCE,
                      color: preset.color,
                    },
              ],
            }
          : item
      )
    );
  };

  const updateFurniture = (roomId, furnitureId, key, value) => {
    setRooms((prev) =>
      prev.map((room) => {
        if (room.id !== roomId) return room;

        const nextFurniture = (room.furniture || []).map((item) => {
          if (item.id !== furnitureId) return item;

          if (isKitchenSlab(item)) {
            if (key === "attachedWall") {
              return { ...item, attachedWall: value };
            }

            if (key === "slabLength") {
              const wall = WALL_OPTIONS.includes(item.attachedWall) ? item.attachedWall : "bottom";
              const roomWallLength =
                wall === "top" || wall === "bottom" ? Number(room.width) : Number(room.height);
              const length = clamp(
                Number(value) || 1,
                1,
                Math.max(1, roomWallLength - FURNITURE_WALL_CLEARANCE * 2)
              );
              return { ...item, slabLength: length };
            }

            if (key === "offset") {
              const wall = WALL_OPTIONS.includes(item.attachedWall) ? item.attachedWall : "bottom";
              const roomWallLength =
                wall === "top" || wall === "bottom" ? Number(room.width) : Number(room.height);
              const currentLength = Number(item.slabLength) || Number(item.width) || 1;
              const maxOffset = Math.max(
                0,
                roomWallLength - currentLength - FURNITURE_WALL_CLEARANCE * 2
              );
              return {
                ...item,
                offset: clamp(Number(value) || 0, 0, maxOffset),
              };
            }

            return item;
          }

          if (key === "x" || key === "y") {
            const numericValue = Number(value) || 0;
            const minX = FURNITURE_WALL_CLEARANCE;
            const minY = FURNITURE_WALL_CLEARANCE;
            const maxX = Math.max(
              minX,
              Number(room.width) - Number(item.width) - FURNITURE_WALL_CLEARANCE
            );
            const maxY = Math.max(
              minY,
              Number(room.height) - Number(item.depth) - FURNITURE_WALL_CLEARANCE
            );

            return {
              ...item,
              [key]:
                key === "x"
                  ? clamp(numericValue, minX, maxX)
                  : clamp(numericValue, minY, maxY),
            };
          }

          return item;
        });

        return { ...room, furniture: nextFurniture };
      })
    );
  };

  const removeFurniture = (roomId, furnitureId) => {
    setRooms((prev) =>
      prev.map((room) =>
        room.id === roomId
          ? {
              ...room,
              furniture: (room.furniture || []).filter((item) => item.id !== furnitureId),
            }
          : room
      )
    );
  };

  const addRoom = () => {
    const newRoom = createRoom(rooms.length);
    setRooms((prev) => [...prev, newRoom]);
    setExpandedRoomId(newRoom.id);
  };

  const removeRoom = (id) => {
    const remainingRooms = rooms.filter((room) => room.id !== id);
    setRooms(remainingRooms);
    setFurnitureSelections((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (expandedRoomId === id) {
      setExpandedRoomId(remainingRooms[0]?.id || null);
    }
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
    applyProjectState(getDefaultProjectState());
    setCurrentProjectId(null);
    setGeneratedRenderImage("");
    setGeneratedRenderProjectId(null);
    setProjectStatusMessage("");
  };

  const handleSaveProject = async () => {
    const existingProjects = readProjectsFromStorage();
    const projectId = currentProjectId || createProjectId();
    const fallbackName = `Project ${existingProjects.length + 1}`;
    const safeName = String(planName || "").trim() || fallbackName;

    const projectRecord = {
      id: projectId,
      name: safeName,
      updatedAt: new Date().toISOString(),
      version: 1,
      data: {
        ...buildCurrentProjectData(),
        planName: safeName,
      },
    };

    const nextProjects = currentProjectId
      ? existingProjects.map((project) => (project.id === projectId ? projectRecord : project))
      : [projectRecord, ...existingProjects];

    writeProjectsToStorage(nextProjects);
    setCurrentProjectId(projectId);
    setPlanName(safeName);
    setSavedProjects(
      nextProjects.sort(
        (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      )
    );
    try {
  setProjectStatusMessage(`Saving "${safeName}" locally and syncing to Google Sheets...`);

  const previousView = activeView;

  let image2D = "";
  let image3D = "";

  // Capture 2D image
  if (previousView !== "2d") {
    setActiveView("2d");
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  image2D = await capture2DImage();

  // Capture 3D image
  if (previousView !== "3d") {
    setActiveView("3d");
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  image3D = await capture3DImage();

  // Restore original view
  setActiveView(previousView);

  const payload = await buildGoogleSheetsPayload({
    projectId: projectRecord.id,
    safeName,
    image2D,
    image3D,
  });

  await syncProjectToGoogleSheets(payload);

  setProjectStatusMessage(`Saved "${safeName}" locally and synced to Google Sheets`);
} catch (error) {
  console.error("Google Sheets sync failed:", error);
  setProjectStatusMessage(
    `Saved "${safeName}" locally, but Google Sheets sync failed`
  );
}
  };

  const handleOpenProjectClick = () => {
    refreshSavedProjects();
    setIsProjectModalOpen(true);
    setProjectStatusMessage("");
  };

 const handleOpenSavedProject = (projectId) => {
  const projects = readProjectsFromStorage();
  const selectedProject = projects.find((project) => project.id === projectId);
  if (!selectedProject?.data) return;

  applyProjectState(selectedProject.data);
  setCurrentProjectId(selectedProject.id);
  setGeneratedRenderImage(selectedProject.data.ai_render_image_base64 || "");
  setGeneratedRenderProjectId(selectedProject.id);
  setIsProjectModalOpen(false);
  setProjectStatusMessage(`Opened "${selectedProject.name}"`);
};

  const handleNewProject = () => {
    const shouldContinue = window.confirm(
      "Start a new project? Unsaved changes in the current design may be lost."
    );

    if (!shouldContinue) return;

    resetPlan();
    setIsProjectModalOpen(false);
  };

  const handleGenerateRenderImages = async () => {
    if (isRenderGenerating) return;

    if (!currentProjectId) {
      setProjectStatusMessage("Please save the project first before generating AI renders.");
      return;
    }

    try {
      setIsRenderGenerating(true);
      setProjectStatusMessage("Generating realistic AI renders from your saved floor plan...");

      const openAIApiKey = getSavedOpenAIApiKey();
      if (!openAIApiKey) {
        throw new Error(
          "OpenAI API key not found in localStorage. Save it under floor-plan-openai-api-key first."
        );
      }

      persistOpenAIApiKey(openAIApiKey);

      const previousView = activeView;

      let image2D = "";
      let image3D = "";

      if (previousView !== "2d") {
        setActiveView("2d");
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
      image2D = await capture2DImage();

      if (previousView !== "3d") {
        setActiveView("3d");
        await new Promise((resolve) => setTimeout(resolve, 700));
      }
      image3D = await capture3DImage();

      setActiveView(previousView);

      const generatedImage = await generatePlanRendersWithOpenAI(openAIApiKey, {
        planName,
        selectedCategory,
        totalWidth,
        totalHeight,
        rooms: placedRooms,
        image2D,
        image3D,
      });

      setGeneratedRenderImage(generatedImage);
      setGeneratedRenderProjectId(currentProjectId);
      setProjectStatusMessage("AI render generated successfully.");
    } catch (error) {
      console.error("AI render generation failed:", error);
      setProjectStatusMessage(
        error?.message || "Failed to generate AI render. Please try again."
      );
    } finally {
      setIsRenderGenerating(false);
      setActiveView("3d");
    }
  };

  const exportSVG = () => {
    const svgEl = document.getElementById("floor-plan-svg");
    if (!svgEl) return;

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgEl);
    const blob = new Blob([source], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${planName.replace(/\s+/g, "_").toLowerCase() || "floor-plan"}.svg`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const furnitureOptions = getFurnitureOptionsForCategory(selectedCategory);

  return (
    <div className={`app-shell ${theme === "dark" ? "dark-theme" : "light-theme"}`}>
      <input
        ref={fileUploadInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        style={{ display: "none" }}
        onChange={handleFloorPlanImageSelected}
      />
      {isProjectModalOpen && (
        <div className="project-modal-overlay" onClick={() => setIsProjectModalOpen(false)}>
          <div className="project-modal" onClick={(e) => e.stopPropagation()}>
            <div className="project-modal-header">
              <div>
                <h3>Open Project</h3>
                <p>Select a saved project to restore your design.</p>
              </div>

              <button
                className="icon-btn"
                onClick={() => setIsProjectModalOpen(false)}
                aria-label="Close project modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="project-modal-body">
              {savedProjects.length === 0 ? (
                <div className="project-empty-state">
                  No saved projects yet. Save your current design to see it here.
                </div>
              ) : (
                <div className="project-list">
                  {savedProjects.map((project) => (
                    <button
                      key={project.id}
                      className="project-item"
                      onClick={() => handleOpenSavedProject(project.id)}
                    >
                      <div className="project-item-meta">
                        <strong className="project-item-title">{project.name}</strong>
                        <span className="project-item-subtext">
                          {project.data?.rooms?.length || 0} rooms • {" "}
                          {project.data?.selectedCategory || "office"} • {" "}
                          {formatProjectTimestamp(project.updatedAt)}
                        </span>
                      </div>
                      <span className="project-item-open">Open</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* top input section */}
      <section className="top-control-card">
        <div className="top-control-grid">
          <div className="input-card top-input-card">
            <div className="top-input-meta-row">
              <div className="top-input-brand">
                <span className="pill">Floor Plan Builder</span>
                <div className="top-input-brand-copy">
                  <div className="top-input-title-row">
                    <h1>
                      <Home size={20} />
                      Interactive Floor Plan App
                    </h1>

                    <button
                      type="button"
                      className="theme-toggle"
                      onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
                      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                    >
                      <span className={`theme-toggle-option ${theme === "light" ? "is-active" : ""}`}>
                        <Sun size={14} />
                        Light
                      </span>
                      <span className={`theme-toggle-option ${theme === "dark" ? "is-active" : ""}`}>
                        <Moon size={14} />
                        Dark
                      </span>
                    </button>
                  </div>
                  <p>Configure plan inputs, then edit rooms from the side panel.</p>
                </div>
              </div>

              {/* header/top-section layout fix + moved “opened project” placement */}
              {projectStatusMessage && (
                <div className="project-status-banner project-status-banner--inline">
                  {projectStatusMessage}
                </div>
              )}
            </div>

            <div className="form-grid plan-top-grid">
              {/* removed extra top whitespace + top input row layout kept compact via CSS */}
                <div className="field field--compact-plan-name">
                  <label>Plan Name</label>
                  <input value={planName} onChange={(e) => setPlanName(e.target.value)} />
                </div>

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

                <div className="field">
                  <label>Product Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    {PRODUCT_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
          </div>

          {/* project action button area */}
          <aside className="project-actions-card input-card">
            <button className="ghost-btn project-stack-btn" onClick={handleNewProject}>
              <FilePlus2 size={16} />
              New Project
            </button>
            <button className="secondary-btn project-stack-btn" onClick={handleOpenProjectClick}>
              <FolderOpen size={16} />
              Open Project
            </button>
            <button className="primary-btn project-stack-btn" onClick={handleSaveProject}>
              <Save size={16} />
              Save Project
            </button>
          </aside>
        </div>
      </section>


      <div className="workspace-grid">
        {/* preview/stats section */}
        <main className="workspace-main">
          <section className="preview-stats-row">
            <div className="summary-box stat-box">
              <span>Plan Size</span>
              <strong>
                {totalWidth} × {totalHeight}
              </strong>
            </div>
            <div className="summary-box stat-box">
              <span>Total Rooms</span>
              <strong>{placedRooms.length}</strong>
            </div>
            <div className="summary-box stat-box">
              <span>Room Area</span>
              <strong>{totalRoomArea.toFixed(0)} sq ft</strong>
            </div>
            <div className="summary-box stat-box">
              <span>Space Utilization</span>
              <strong>{utilization}%</strong>
            </div>
          </section>


          <div className="workspace-content-grid">
            <div className="workspace-preview-column">
              {activeView === "2d" && (
                <section className="preview-card preview-card--dominant">
                  <div className="section-header section-header--preview">
                    <h2>2D Floor Plan</h2>
                    <div className="preview-toolbar">
                      <button
                        className="view-toolbar-btn upload-floor-plan-btn"
                        onClick={handleUploadFloorPlanClick}
                        disabled={isFloorPlanUploading}
                      >
                        {isFloorPlanUploading ? "Uploading..." : "Upload Floor Plan"}
                      </button>
                      <button
                        className={`view-toolbar-btn ${activeView === "2d" ? "active" : ""}`}
                        onClick={() => setActiveView("2d")}
                      >
                        2D
                      </button>
                      <button
                        className={`view-toolbar-btn ${activeView === "3d" ? "active" : ""}`}
                        onClick={() => setActiveView("3d")}
                      >
                        3D
                      </button>
                      <button className="view-toolbar-btn view-toolbar-btn--dark" onClick={exportSVG}>
                        Export SVG
                      </button>
                    </div>
                  </div>

                  <div className="svg-wrap svg-wrap--dominant" onClick={clearSelectedFurniture}>
                    <svg
                      id="floor-plan-svg"
                      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                      width="100%"
                      height="100%"
                    >
                      <defs>
                        <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#dbe3ec" strokeWidth="1" />
                        </pattern>

                        <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                          <rect width="50" height="50" fill="url(#smallGrid)" />
                          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#bdd0e8" strokeWidth="1" />
                        </pattern>
                      </defs>

                      <rect width={svgWidth} height={svgHeight} fill="#ffffff" />
                      <g transform="translate(60,60)">
                        <rect width={canvasWidth} height={canvasHeight} fill="url(#grid)" />
                        <rect
                          x={0}
                          y={0}
                          width={canvasWidth}
                          height={canvasHeight}
                          fill="none"
                          stroke="#5f6f86"
                          strokeWidth={Math.max(3, numericWallThickness * numericScale)}
                        />

                        {placedRooms.map((room) => {
                          const x = room.x * numericScale;
                          const y = room.y * numericScale;
                          const w = room.width * numericScale;
                          const h = room.height * numericScale;

                          return (
                            <g key={room.id}>
                              <rect
                                x={x}
                                y={y}
                                width={w}
                                height={h}
                                fill={room.color || "#eef4ff"}
                                stroke="#7e8da3"
                                strokeWidth={Math.max(2, numericWallThickness * numericScale)}
                              />
                            </g>
                          );
                        })}

                        {placedRooms.map((room) => {
                          const { doors, windows } = getRoomOpenings(room, Number(roomHeight));

                          return (
                            <g key={`openings-${room.id}`}>
                              {doors.map((door, idx) => (
                                <Opening2D
                                  key={`door-${room.id}-${idx}`}
                                  room={room}
                                  opening={door}
                                  scale={numericScale}
                                  wallThickness={numericWallThickness}
                                />
                              ))}

                              {windows.map((windowItem, idx) => (
                                <Opening2D
                                  key={`window-${room.id}-${idx}`}
                                  room={room}
                                  opening={windowItem}
                                  scale={numericScale}
                                  wallThickness={numericWallThickness}
                                />
                              ))}
                            </g>
                          );
                        })}

                        {placedRooms.map((room) => (
                          <g key={`furniture-${room.id}`}>
                            {(room.furniture || []).map((item) => (
                              <Furniture2D
                                key={item.id}
                                room={room}
                                furnitureItem={item}
                                scale={numericScale}
                                isSelected={selectedFurnitureKey === `${room.id}-${item.id}`}
                                onSelect={(selectedItem) => handleFurnitureSelection(room, selectedItem)}
                              />
                            ))}
                          </g>
                        ))}

                        {placedRooms.map((room) => {
                          const x = room.x * numericScale;
                          const y = room.y * numericScale;
                          const w = room.width * numericScale;
                          const h = room.height * numericScale;

                          const roomNameFontSize = Math.max(7, Math.min(10, Math.min(w, h) * 0.11));
                          const roomDimFontSize = Math.max(5.5, Math.min(7.5, Math.min(w, h) * 0.085));

                          return (
                            <g key={`labels-${room.id}`}>
                              <text
                                x={x + w / 2}
                                y={y + h / 2 - 12}
                                textAnchor="middle"
                                style={{
                                  fontSize: roomNameFontSize,
                                  fontWeight: 700,
                                  fill: "#172033",
                                  opacity: 0.68,
                                  pointerEvents: "none",
                                }}
                              >
                                {room.name}
                              </text>

                              <text
                                x={x + w / 2}
                                y={y + h / 2 + 12}
                                textAnchor="middle"
                                style={{
                                  fontSize: roomDimFontSize,
                                  fill: "#56637a",
                                  opacity: 0.82,
                                  pointerEvents: "none",
                                }}
                              >
                                {room.width} ft × {room.height} ft
                              </text>
                            </g>
                          );
                        })}

                        <text
                          x={canvasWidth / 2}
                          y={-18}
                          textAnchor="middle"
                          style={{
                            fontSize: 7,
                            fontWeight: 600,
                            fill: "#324257",
                            opacity: 0.88,
                            letterSpacing: "0.2px",
                          }}
                        >
                          Width: {totalWidth} ft
                        </text>

                        <text
                          x={-18}
                          y={canvasHeight / 2}
                          textAnchor="middle"
                          transform={`rotate(-90, -18, ${canvasHeight / 2})`}
                          style={{
                            fontSize: 7,
                            fontWeight: 600,
                            fill: "#324257",
                            opacity: 0.88,
                            letterSpacing: "0.2px",
                          }}
                        >
                          Height: {totalHeight} ft
                        </text>
                      </g>
                    </svg>
                  </div>

                  {renderFurnitureRecommendations()}
                </section>
              )}

              {activeView === "3d" && (
                <section className="preview-card preview-card--dominant">
                  <div className="section-header section-header--preview">
                    <h2>3D Floor Plan</h2>
                    <div className="preview-toolbar">
                      <button
                        className="view-toolbar-btn upload-floor-plan-btn"
                        onClick={handleUploadFloorPlanClick}
                        disabled={isFloorPlanUploading}
                      >
                        {isFloorPlanUploading ? "Uploading..." : "Upload Floor Plan"}
                      </button>
                      <button
                        className={`view-toolbar-btn ${activeView === "2d" ? "active" : ""}`}
                        onClick={() => setActiveView("2d")}
                      >
                        2D
                      </button>
                      <button
                        className={`view-toolbar-btn ${activeView === "3d" ? "active" : ""}`}
                        onClick={() => setActiveView("3d")}
                      >
                        3D
                      </button>
                      <button className="view-toolbar-btn view-toolbar-btn--dark" onClick={exportSVG}>
                        Export SVG
                      </button>
                      <button
                        className="view-toolbar-btn view-toolbar-btn--dark ai-render-btn"
                        onClick={handleGenerateRenderImages}
                        disabled={!currentProjectId || isRenderGenerating}
                        title={!currentProjectId ? "Save the project first" : "Generate realistic AI renders"}
                      >
                        {isRenderGenerating ? (
                          <>
                            <Loader2 size={16} className="spin-icon" />
                            Rendering...
                          </>
                        ) : (
                          <>
                            <ImageIcon size={16} />
                            AI Render
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="three-wrap three-wrap--dominant" ref={threeContainerRef}>
                    <Canvas
                      shadows
                      onPointerMissed={clearSelectedFurniture}
                      gl={{ preserveDrawingBuffer: true }}
                      camera={{
                        position: [
                          Math.max(Number(totalWidth) * 0.85, 14),
                          Math.max(Number(roomHeight) * 2.2, 16),
                          Math.max(Number(totalHeight) * 1.0, 14),
                        ],
                        fov: 42,
                      }}
                    >
                      <Floor3DScene
                        rooms={placedRooms}
                        totalWidth={Number(totalWidth)}
                        totalHeight={Number(totalHeight)}
                        wallThickness={Number(wallThickness)}
                        roomHeight={Number(roomHeight)}
                        wallSegments={wallSegments}
                        selectedFurnitureKey={selectedFurnitureKey}
                        onFurnitureSelect={handleFurnitureSelection}
                      />
                    </Canvas>

                    {isRenderGenerating && (
                      <div className="ai-render-overlay">
                        <div className="ai-render-loader-card">
                          <Loader2 size={22} className="spin-icon" />
                          <strong>Generating realistic render...</strong>
                          <span>Please wait while ChatGPT creates multiple camera-angle visuals.</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {renderFurnitureRecommendations()}
                 
                  {generatedRenderImage && generatedRenderProjectId === currentProjectId && (
                    <div className="ai-render-result-card">
                      <div className="section-header compact">
                        <h3>
                          <ImageIcon size={16} />
                          AI Generated Realistic Render
                        </h3>
                      </div>
                      <div className="ai-render-result-image-wrap">
                        <img
                          src={generatedRenderImage}
                          alt={`${planName} AI realistic render`}
                          className="ai-render-result-image"
                        />
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>

            <aside className="chatbot-card input-card">
              <div className="section-header chatbot-header">
                <div className="chatbot-header-copy">
                  <h2>
                    <MessageSquare size={16} />
                    Floor Plan Assistant
                  </h2>
                  <p>Ask for layouts, guidance, or use voice commands.</p>
                </div>
                <span className="chatbot-badge">
                  <Sparkles size={14} />
                  Phase 1 + 2
                </span>
              </div>

              <div className="chatbot-quick-actions">
                {[
                  "Create a 2BHK in 40 by 30 feet",
                  "Create an office layout 32 by 24",
                  "Create a cafe layout",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="chatbot-chip"
                    onClick={() => setChatInput(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="chatbot-messages" ref={chatScrollRef}>
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`chatbot-message chatbot-message--${message.role}`}
                  >
                    <div className="chatbot-message-icon">
                      {message.role === "assistant" ? <Bot size={14} /> : <span>You</span>}
                    </div>
                    <div className="chatbot-message-bubble">{message.content}</div>
                  </div>
                ))}

                {isChatbotBusy && (
                  <div className="chatbot-message chatbot-message--assistant">
                    <div className="chatbot-message-icon">
                      <Bot size={14} />
                    </div>
                    <div className="chatbot-message-bubble">Working on your layout...</div>
                  </div>
                )}
              </div>

              <form className="chatbot-form" onSubmit={handleChatSubmit}>
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Try: Create a 2BHK, create an office layout, or ask how to use the app."
                  rows={4}
                />
                <div className="chatbot-form-actions">
                  <button
                    type="button"
                    className={`secondary-btn chatbot-voice-btn ${isListening ? "is-listening" : ""}`}
                    onClick={handleStartVoiceInput}
                  >
                    <Mic size={16} />
                    {isListening ? "Listening..." : "Voice"}
                  </button>
                  <button type="submit" className="primary-btn" disabled={isChatbotBusy}>
                    <Send size={16} />
                    Apply
                  </button>
                </div>
              </form>
            </aside>
          </div>        </main>

        {/* collapsible room cards / accordion behavior */}
        <aside className="rooms-sidebar input-card">
          <div className="section-header rooms-sidebar-header">
            <h2>Rooms</h2>
            <div className="header-actions rooms-sidebar-actions">
              <button className="ghost-btn" onClick={resetPlan}>
                <RotateCcw size={16} />
                Reset
              </button>
              <button className="primary-btn" onClick={addRoom}>
                <Plus size={16} />
                New Room
              </button>
            </div>
          </div>

          <div className="room-list room-list--sidebar">
            {/* rooms panel scroll/overflow fix handled via CSS */}
            {rooms.map((room, index) => {
              const roomFurnitureSelection =
                furnitureSelections[room.id] || getDefaultFurnitureSelection(selectedCategory);
              const isExpanded = expandedRoomId === room.id;

              return (
                <div className={`room-card accordion-room-card ${isExpanded ? "expanded" : "collapsed"}`} key={room.id}>
                  <button
                    type="button"
                    className="room-accordion-trigger"
                    onClick={() => setExpandedRoomId(isExpanded ? null : room.id)}
                  >
                    <div className="room-accordion-title-wrap">
                      <span className="room-accordion-arrow">{isExpanded ? "▾" : "▸"}</span>
                      <span className="room-accordion-title">{room.name || `Room ${index + 1}`}</span>
                    </div>
                    <span className="room-accordion-meta">
                      {room.width} × {room.height}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="room-accordion-content">
                      {/* rooms panel scroll/overflow fix */}
                      <div className="room-card-header room-card-header--inner">
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
                            onChange={(e) => updateRoom(room.id, "width", Number(e.target.value) || 0)}
                          />
                        </div>

                        <div className="field">
                          <label>Height (ft)</label>
                          <input
                            type="number"
                            value={room.height}
                            onChange={(e) => updateRoom(room.id, "height", Number(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      <div className="form-grid two-col">
                        <div className="field">
                          <label>X Position (ft)</label>
                          <input
                            type="number"
                            value={room.x}
                            onChange={(e) => updateRoom(room.id, "x", Number(e.target.value) || 0)}
                          />
                        </div>

                        <div className="field">
                          <label>Y Position (ft)</label>
                          <input
                            type="number"
                            value={room.y}
                            onChange={(e) => updateRoom(room.id, "y", Number(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      <div className="section-header compact">
                        <h3>Doors</h3>
                        <div className="header-actions">
                          <button type="button" className="secondary-btn" onClick={() => addDoorToRoom(room.id)}>
                            <Plus size={16} />
                            Add Door
                          </button>
                        </div>
                      </div>

                      {(room.doors || []).map((door, doorIndex) => (
                        <div className="opening-card" key={`door-${doorIndex}`}>
                          <div className="room-card-header">
                            <span>Door {doorIndex + 1}</span>
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => removeDoor(room.id, doorIndex)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="form-grid two-col">
                            <div className="field">
                              <label>Wall</label>
                              <select
                                value={door.wall}
                                onChange={(e) => updateDoor(room.id, doorIndex, "wall", e.target.value)}
                              >
                                {WALL_OPTIONS.map((wall) => (
                                  <option key={wall} value={wall}>
                                    {wall}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="field">
                              <label>Offset (ft)</label>
                              <input
                                type="number"
                                value={door.offset}
                                onChange={(e) => updateDoor(room.id, doorIndex, "offset", e.target.value)}
                              />
                            </div>

                            <div className="field">
                              <label>Width (ft)</label>
                              <input
                                type="number"
                                value={door.width}
                                onChange={(e) => updateDoor(room.id, doorIndex, "width", e.target.value)}
                              />
                            </div>

                            <div className="field">
                              <label>Height (ft)</label>
                              <input
                                type="number"
                                value={door.height}
                                onChange={(e) => updateDoor(room.id, doorIndex, "height", e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="section-header compact">
                        <h3>Windows</h3>
                        <div className="header-actions">
                          <button type="button" className="secondary-btn" onClick={() => addWindowToRoom(room.id)}>
                            <Plus size={16} />
                            Add Window
                          </button>
                        </div>
                      </div>

                      {(room.windows || []).map((windowItem, windowIndex) => (
                        <div className="opening-card" key={`window-${windowIndex}`}>
                          <div className="room-card-header">
                            <span>Window {windowIndex + 1}</span>
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => removeWindow(room.id, windowIndex)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="form-grid two-col">
                            <div className="field">
                              <label>Wall</label>
                              <select
                                value={windowItem.wall}
                                onChange={(e) => updateWindow(room.id, windowIndex, "wall", e.target.value)}
                              >
                                {WALL_OPTIONS.map((wall) => (
                                  <option key={wall} value={wall}>
                                    {wall}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="field">
                              <label>Offset (ft)</label>
                              <input
                                type="number"
                                value={windowItem.offset}
                                onChange={(e) => updateWindow(room.id, windowIndex, "offset", e.target.value)}
                              />
                            </div>

                            <div className="field">
                              <label>Width (ft)</label>
                              <input
                                type="number"
                                value={windowItem.width}
                                onChange={(e) => updateWindow(room.id, windowIndex, "width", e.target.value)}
                              />
                            </div>

                            <div className="field">
                              <label>Height (ft)</label>
                              <input
                                type="number"
                                value={windowItem.height}
                                onChange={(e) => updateWindow(room.id, windowIndex, "height", e.target.value)}
                              />
                            </div>

                            <div className="field field--span-2">
                              <label>Sill Height (ft)</label>
                              <input
                                type="number"
                                value={windowItem.sillHeight}
                                onChange={(e) => updateWindow(room.id, windowIndex, "sillHeight", e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="section-header compact furniture-section-header">
                        <h3>
                          <Sofa size={16} />
                          Furniture
                        </h3>
                        <div className="header-actions">
                          <button type="button" className="secondary-btn" onClick={() => addFurnitureToRoom(room.id)}>
                            <Plus size={16} />
                            Add Furniture
                          </button>
                        </div>
                      </div>

                      <div className="opening-card furniture-panel">
                        <div className="form-grid one-col">
                          <div className="field">
                            <label>Furniture Type</label>
                            <select
                              value={roomFurnitureSelection}
                              onChange={(e) =>
                                setFurnitureSelections((prev) => ({
                                  ...prev,
                                  [room.id]: e.target.value,
                                }))
                              }
                            >
                              {furnitureOptions.map((item) => (
                                <option key={item.type} value={item.type}>
                                  {item.type}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {(room.furniture || []).map((item) => {
                          const slab = isKitchenSlab(item);

                          return (
                            <div className="furniture-card" key={item.id}>
                              <div className="room-card-header">
                                <div className="furniture-meta">
                                  <strong>{item.type}</strong>
                                  <span>
                                    {slab
                                      ? `${item.attachedWall || "bottom"} wall attached`
                                      : `${item.width} ft × ${item.depth} ft`}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  className="icon-btn"
                                  onClick={() => removeFurniture(room.id, item.id)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>

                              {!slab ? (
                                <div className="form-grid two-col">
                                  <div className="field">
                                    <label>X Position (ft)</label>
                                    <input
                                      type="number"
                                      value={item.x}
                                      onChange={(e) => updateFurniture(room.id, item.id, "x", e.target.value)}
                                    />
                                  </div>

                                  <div className="field">
                                    <label>Y Position (ft)</label>
                                    <input
                                      type="number"
                                      value={item.y}
                                      onChange={(e) => updateFurniture(room.id, item.id, "y", e.target.value)}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="form-grid two-col">
                                  <div className="field">
                                    <label>Wall</label>
                                    <select
                                      value={item.attachedWall || "bottom"}
                                      onChange={(e) => updateFurniture(room.id, item.id, "attachedWall", e.target.value)}
                                    >
                                      {WALL_OPTIONS.map((wall) => (
                                        <option key={wall} value={wall}>
                                          {wall}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="field">
                                    <label>Length (ft)</label>
                                    <input
                                      type="number"
                                      value={item.slabLength || item.width}
                                      onChange={(e) => updateFurniture(room.id, item.id, "slabLength", e.target.value)}
                                    />
                                  </div>

                                  <div className="field field--span-2">
                                    <label>Offset (ft)</label>
                                    <input
                                      type="number"
                                      value={item.offset || 0}
                                      onChange={(e) => updateFurniture(room.id, item.id, "offset", e.target.value)}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
