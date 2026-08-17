"use client";

import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import maplibregl, { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapFriend } from "@/services/map/MapService";
import { MAP_CONFIG, MIXCHAT_MAP_STYLE } from "../styles/mixchat-map-style";
import type { UserCoordinates } from "../hooks/useGeolocationSharing";

export interface MapCanvasHandle {
  recenterOnUser: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  flyToFriend: (friend: MapFriend) => void;
}

interface MapCanvasProps {
  friends: MapFriend[];
  selectedFriend?: MapFriend | null;
  onSelectFriend: (friend: MapFriend) => void;
  onClearSelection: () => void;
  userCoords?: UserCoordinates | null;
  isGhostMode: boolean;
  currentUser?: {
    avatarUrl?: string | null;
    displayName?: string;
    username?: string;
  } | null;
}

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(
  function MapCanvas(
    {
      friends,
      selectedFriend,
      onSelectFriend,
      onClearSelection,
      userCoords,
      isGhostMode,
      currentUser,
    },
    ref,
  ) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<MapLibreMap | null>(null);
    const friendMarkersRef = useRef<Map<string, Marker>>(new Map());
    const userMarkerRef = useRef<Marker | null>(null);
    const [mapLoaded, setMapLoaded] = useState<boolean>(false);
    const [hasCenteredInitial, setHasCenteredInitial] =
      useState<boolean>(false);

    // Expose imperative camera controls to parent component
    useImperativeHandle(ref, () => ({
      recenterOnUser: () => {
        const map = mapInstanceRef.current;
        if (!map) return;

        if (userCoords) {
          map.flyTo({
            center: [userCoords.longitude, userCoords.latitude],
            zoom: 14.5,
            duration: 900,
            essential: true,
          });
        } else {
          map.flyTo({
            center: MAP_CONFIG.DEFAULT_CENTER,
            zoom: 13,
            duration: 800,
            essential: true,
          });
        }
      },
      zoomIn: () => {
        mapInstanceRef.current?.zoomIn({ duration: 300 });
      },
      zoomOut: () => {
        mapInstanceRef.current?.zoomOut({ duration: 300 });
      },
      flyToFriend: (friend: MapFriend) => {
        mapInstanceRef.current?.easeTo({
          center: [friend.location.longitude, friend.location.latitude],
          zoom: Math.max(mapInstanceRef.current.getZoom(), 14.5),
          duration: 700,
          essential: true,
        });
      },
    }));

    // 1. Initialize MapLibre GL Map
    useEffect(() => {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const initialCenter: [number, number] = userCoords
        ? [userCoords.longitude, userCoords.latitude]
        : MAP_CONFIG.DEFAULT_CENTER;

      try {
        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: MIXCHAT_MAP_STYLE,
          center: initialCenter,
          zoom: MAP_CONFIG.DEFAULT_ZOOM,
          minZoom: MAP_CONFIG.MIN_ZOOM,
          maxZoom: MAP_CONFIG.MAX_ZOOM,
          pitch: 25,
          attributionControl: { compact: true },
        });

        map.on("load", () => {
          mapInstanceRef.current = map;
          setMapLoaded(true);
        });

        map.on("click", (e) => {
          // If clicked on background map canvas, clear friend selection
          const target = e.originalEvent.target as HTMLElement;
          if (target && target.tagName === "CANVAS") {
            onClearSelection();
          }
        });
      } catch {
        // MapLibre WebGL fallback handled gracefully
      }

      return () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // 2. Initial Center on User when first fixed
    useEffect(() => {
      if (
        mapLoaded &&
        userCoords &&
        !hasCenteredInitial &&
        mapInstanceRef.current
      ) {
        mapInstanceRef.current.easeTo({
          center: [userCoords.longitude, userCoords.latitude],
          zoom: 14,
          duration: 1000,
        });
        setHasCenteredInitial(true);
      }
    }, [mapLoaded, userCoords, hasCenteredInitial]);

    // 3. Render and sync "You" User Marker
    useEffect(() => {
      const map = mapInstanceRef.current;
      if (!map || !mapLoaded) return;

      if (!userCoords || isGhostMode) {
        if (userMarkerRef.current) {
          userMarkerRef.current.remove();
          userMarkerRef.current = null;
        }
        return;
      }

      // Create or update "You" marker element
      if (!userMarkerRef.current) {
        const el = document.createElement("div");
        el.className =
          "group relative flex flex-col items-center cursor-pointer select-none";

        // Pulse halo
        const halo = document.createElement("div");
        halo.className =
          "absolute -inset-2 rounded-full bg-purple-500/25 animate-ping pointer-events-none";
        el.appendChild(halo);

        // Bubble container
        const bubble = document.createElement("div");
        bubble.className =
          "relative w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-cyan-400 to-purple-600 shadow-xl shadow-purple-500/30 flex items-center justify-center";

        const imgWrapper = document.createElement("div");
        imgWrapper.className =
          "w-full h-full rounded-full overflow-hidden bg-[#0b0f19]";

        const img = document.createElement("img");
        img.src =
          currentUser?.avatarUrl ||
          "/mixchat-icon.png";
        img.alt = "You";
        img.className = "w-full h-full object-cover";
        imgWrapper.appendChild(img);
        bubble.appendChild(imgWrapper);
        el.appendChild(bubble);

        // "You" Pill Tag
        const tag = document.createElement("div");
        tag.className =
          "mt-1 px-2 py-0.5 rounded-full bg-[#0b0f19]/90 border border-purple-400/40 text-[10px] font-black text-cyan-300 tracking-wider shadow-lg uppercase";
        tag.innerText = "YOU";
        el.appendChild(tag);

        userMarkerRef.current = new maplibregl.Marker({
          element: el,
          anchor: "bottom",
        })
          .setLngLat([userCoords.longitude, userCoords.latitude])
          .addTo(map);
      } else {
        userMarkerRef.current.setLngLat([
          userCoords.longitude,
          userCoords.latitude,
        ]);
      }
    }, [mapLoaded, userCoords, isGhostMode, currentUser]);

    // 4. Render and synchronize Friend Social Avatar Markers
    useEffect(() => {
      const map = mapInstanceRef.current;
      if (!map || !mapLoaded) return;

      const currentFriendIds = new Set(friends.map((f) => f.user.id));

      // Remove markers that are no longer present
      friendMarkersRef.current.forEach((marker, id) => {
        if (!currentFriendIds.has(id)) {
          marker.remove();
          friendMarkersRef.current.delete(id);
        }
      });

      // Add or update markers
      friends.forEach((friend) => {
        const isSelected = selectedFriend?.user.id === friend.user.id;
        const existing = friendMarkersRef.current.get(friend.user.id);

        if (!existing) {
          const el = createFriendMarkerElement(friend, isSelected, () => {
            onSelectFriend(friend);
            map.easeTo({
              center: [friend.location.longitude, friend.location.latitude],
              zoom: Math.max(map.getZoom(), 14),
              duration: 600,
            });
          });

          const marker = new maplibregl.Marker({
            element: el,
            anchor: "bottom",
          })
            .setLngLat([friend.location.longitude, friend.location.latitude])
            .addTo(map);

          friendMarkersRef.current.set(friend.user.id, marker);
        } else {
          // Update coordinates
          existing.setLngLat([
            friend.location.longitude,
            friend.location.latitude,
          ]);
          // Update selection visual classes
          updateMarkerVisual(
            existing.getElement(),
            isSelected,
            friend.hasActiveStory,
          );
        }
      });
    }, [mapLoaded, friends, selectedFriend, onSelectFriend]);

    return (
      <div className="relative w-full h-full flex-1 overflow-hidden bg-[#070913]">
        {/* MapLibre DOM Container */}
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Loading Surface Overlay */}
        {!mapLoaded && (
          <div className="absolute inset-0 bg-[#070913] flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
              <p className="text-xs font-semibold text-white/50 tracking-wider uppercase">
                Loading MixChat Map...
              </p>
            </div>
          </div>
        )}
      </div>
    );
  },
);

/**
 * DOM Marker Generator: Creates a high-fidelity Snapchat-grade social avatar bubble
 */
function createFriendMarkerElement(
  friend: MapFriend,
  isSelected: boolean,
  onClick: () => void,
): HTMLDivElement {
  const el = document.createElement("div");
  el.className =
    "group relative flex flex-col items-center cursor-pointer select-none transition-transform duration-200 active:scale-95";

  el.onclick = (e) => {
    e.stopPropagation();
    onClick();
  };

  // Avatar Bubble Container
  const bubble = document.createElement("div");
  bubble.className = `relative w-12 h-12 rounded-full p-[2px] transition-all duration-200 ${
    isSelected
      ? "scale-115 shadow-2xl shadow-purple-500/50 ring-2 ring-purple-400"
      : "shadow-lg shadow-black/60 hover:scale-105"
  } ${
    friend.hasActiveStory
      ? "bg-gradient-to-tr from-pink-500 via-purple-500 to-amber-400"
      : "bg-white/20"
  }`;

  const imgWrapper = document.createElement("div");
  imgWrapper.className =
    "w-full h-full rounded-full overflow-hidden bg-[#0b0f19]";

  const avatarSrc =
    typeof friend.user.avatarUrl === "string" && friend.user.avatarUrl
      ? friend.user.avatarUrl
      : "/mixchat-icon.png";
  const displayName = String(friend.user.displayName || friend.user.username);

  const img = document.createElement("img");
  img.src = avatarSrc;
  img.alt = displayName;
  img.className = "w-full h-full object-cover";
  imgWrapper.appendChild(img);
  bubble.appendChild(imgWrapper);

  // Online indicator dot
  if (friend.isOnline) {
    const onlineDot = document.createElement("span");
    onlineDot.className =
      "absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#0b0f19] shadow-sm";
    bubble.appendChild(onlineDot);
  }

  el.appendChild(bubble);

  // Name Pill Tag below avatar
  const tag = document.createElement("div");
  tag.className =
    "mt-1 px-2 py-0.5 rounded-full bg-[#0b0f19]/90 border border-white/15 text-[10px] font-bold text-white tracking-wide shadow-md max-w-[80px] truncate";
  tag.innerText = displayName.split(" ")[0] || String(friend.user.username);
  el.appendChild(tag);

  return el;
}

/**
 * Updates DOM marker classes dynamically without recreating elements
 */
function updateMarkerVisual(
  el: HTMLElement,
  isSelected: boolean,
  hasActiveStory?: boolean,
) {
  const bubble = el.querySelector("div") as HTMLElement;
  if (!bubble) return;

  if (isSelected) {
    bubble.classList.add(
      "scale-115",
      "shadow-2xl",
      "shadow-purple-500/50",
      "ring-2",
      "ring-purple-400",
    );
    bubble.classList.remove("hover:scale-105");
  } else {
    bubble.classList.remove(
      "scale-115",
      "shadow-2xl",
      "shadow-purple-500/50",
      "ring-2",
      "ring-purple-400",
    );
    bubble.classList.add("hover:scale-105");
  }

  if (hasActiveStory) {
    bubble.classList.remove("bg-white/20");
    bubble.classList.add(
      "bg-gradient-to-tr",
      "from-pink-500",
      "via-purple-500",
      "to-amber-400",
    );
  } else {
    bubble.classList.add("bg-white/20");
    bubble.classList.remove(
      "bg-gradient-to-tr",
      "from-pink-500",
      "via-purple-500",
      "to-amber-400",
    );
  }
}
