import type { StyleSpecification } from "maplibre-gl";

/**
 * MixChat Custom Social Map Style Configuration
 * Built upon OpenFreeMap vector tile infrastructure with heavily customized dark/glass aesthetics,
 * desaturated land, deep muted teal/blue water, suppressed POI noise, and subtle 3D building extrusions.
 */

export const MAP_CONFIG = {
  TILE_URL:
    process.env.NEXT_PUBLIC_MAP_TILE_URL ||
    "https://tiles.openfreemap.org/planet",
  STYLE_URL:
    process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
    "https://tiles.openfreemap.org/styles/dark",
  ATTRIBUTION: "",
  DEFAULT_CENTER: [-122.4194, 37.7749] as [number, number], // Default San Francisco fallback
  DEFAULT_ZOOM: 13,
  MIN_ZOOM: 2,
  MAX_ZOOM: 18,
};

/**
 * Custom MixChat vector style JSON adhering to MapLibre GL Style Specification.
 * Features optimized color tokens matching MixChat dark mode palette (#070913 base).
 */
export const MIXCHAT_MAP_STYLE: StyleSpecification = {
  version: 8,
  name: "MixChat Dark Social Map",
  metadata: {
    "mixchat:version": "1.0.0",
  },
  sources: {
    openmaptiles: {
      type: "vector",
      url: "https://tiles.openfreemap.org/planet",
    },
  },
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  layers: [
    // 1. Base Dark Desaturated Background
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#070913",
      },
    },

    // 2. Landcover & Subtle Greenery / Parks
    {
      id: "landcover",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landcover",
      filter: [
        "match",
        ["get", "class"],
        ["grass", "wood", "forest", "park"],
        true,
        false,
      ],
      paint: {
        "fill-color": "#0a171c",
        "fill-opacity": 0.6,
      },
    },
    {
      id: "park",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "park",
      paint: {
        "fill-color": "#0b1920",
        "fill-opacity": 0.5,
      },
    },

    // 3. Deep Muted Blue/Teal Water Bodies
    {
      id: "water",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "water",
      paint: {
        "fill-color": "#091224",
        "fill-opacity": 1,
      },
    },
    {
      id: "waterway",
      type: "line",
      source: "openmaptiles",
      "source-layer": "waterway",
      paint: {
        "line-color": "#0b162c",
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1, 16, 4],
      },
    },

    // 4. Subtle Boundaries
    {
      id: "boundary_state",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      filter: ["==", ["get", "admin_level"], 4],
      paint: {
        "line-color": "#1f293d",
        "line-width": 1,
        "line-dasharray": [3, 2],
        "line-opacity": 0.4,
      },
    },
    {
      id: "boundary_country",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      filter: ["==", ["get", "admin_level"], 2],
      paint: {
        "line-color": "#2a3b59",
        "line-width": 1.5,
        "line-opacity": 0.6,
      },
    },

    // 5. Roads - Subdued to let Social Markers visually dominate
    {
      id: "road_minor",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: [
        "match",
        ["get", "class"],
        ["minor", "service", "track"],
        true,
        false,
      ],
      minzoom: 13,
      paint: {
        "line-color": "#111827",
        "line-width": ["interpolate", ["linear"], ["zoom"], 13, 0.8, 18, 2],
        "line-opacity": 0.5,
      },
    },
    {
      id: "road_secondary_tertiary",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: [
        "match",
        ["get", "class"],
        ["secondary", "tertiary"],
        true,
        false,
      ],
      minzoom: 10,
      paint: {
        "line-color": "#1a2336",
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 16, 3],
        "line-opacity": 0.7,
      },
    },
    {
      id: "road_primary_motorway",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: [
        "match",
        ["get", "class"],
        ["motorway", "trunk", "primary"],
        true,
        false,
      ],
      paint: {
        "line-color": "#24324f",
        "line-width": ["interpolate", ["linear"], ["zoom"], 6, 1.2, 16, 5],
        "line-opacity": 0.8,
      },
    },

    // 6. 3D Building Extrusions (Active at Zoom >= 15 for subtle depth)
    {
      id: "building_3d",
      type: "fill-extrusion",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 15,
      paint: {
        "fill-extrusion-color": "#0d1527",
        "fill-extrusion-height": [
          "interpolate",
          ["linear"],
          ["zoom"],
          15,
          0,
          16,
          ["coalesce", ["get", "render_height"], ["get", "height"], 12],
        ],
        "fill-extrusion-base": [
          "coalesce",
          ["get", "render_min_height"],
          ["get", "min_height"],
          0,
        ],
        "fill-extrusion-opacity": 0.65,
      },
    },

    // 7. Muted Place & Neighborhood Labels
    {
      id: "place_suburb_neighbourhood",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      filter: [
        "match",
        ["get", "class"],
        ["suburb", "neighbourhood", "quarter"],
        true,
        false,
      ],
      minzoom: 11,
      layout: {
        "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": 11,
        "text-transform": "uppercase",
        "text-letter-spacing": 0.1,
      },
      paint: {
        "text-color": "#64748b",
        "text-halo-color": "#070913",
        "text-halo-width": 1.5,
      },
    },
    {
      id: "place_city",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      filter: ["==", ["get", "class"], "city"],
      layout: {
        "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
        "text-font": ["Noto Sans Bold"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 6, 12, 14, 16],
        "text-transform": "uppercase",
        "text-letter-spacing": 0.08,
      },
      paint: {
        "text-color": "#94a3b8",
        "text-halo-color": "#070913",
        "text-halo-width": 2,
      },
    },
  ],
};
