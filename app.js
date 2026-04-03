// --- GLOBAL VARIABLES ---
let map;
let csvData = [];
let currentLayer;
let markerGroup; // Holds all markers so we can clear them easily

const tileLayers = {
  osm: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"),
  satellite: L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  ),
};

// --- 1. MAP INITIALIZATION ---
function initMap() {
  map = L.map("map").setView([62.6006023, 29.7621209], 13);
  currentLayer = tileLayers.satellite.addTo(map);

  // Initialize the LayerGroup for markers
  markerGroup = L.layerGroup().addTo(map);

  // Map Tile Switcher
  document.getElementById("tile-selector").addEventListener("change", (e) => {
    map.removeLayer(currentLayer);
    currentLayer = tileLayers[e.target.value];
    currentLayer.addTo(map);
  });

  // Point Style Switcher
  document
    .getElementById("point-coloring-selector")
    .addEventListener("change", () => {
      renderMarkers(); // Re-draw points when selection changes
    });

  loadCSV();
}

// --- 2. DATA HANDLING ---
function loadCSV() {
  Papa.parse("data/csv/blart.csv", {
    download: true,
    header: true,
    complete: function (results) {
      csvData = results.data;
      renderMarkers();
    },
  });
}

// --- 3. RENDERING LOGIC ---
function renderMarkers() {
  // Clear existing markers before drawing new ones
  markerGroup.clearLayers();

  // Find out what the user selected in the dropdown
  const styleMode = document.getElementById("point-coloring-selector").value;

  csvData.forEach((row) => {
    const lat = parseFloat(row.lat);
    const lon = parseFloat(row.lon);

    if (!isNaN(lat) && !isNaN(lon)) {
      let className = "marker-inner"; // The default round shape
      let inlineStyle = ""; // Used for dynamic colors or rotations

      // --- LOGIC FOR POINT DESIGN ---
      if (styleMode === "view_direction") {
        className = "marker-arrow";
        const dir = row.dir || 0;
        inlineStyle = `transform: rotate(${dir}deg);`;
      } else if (styleMode === "blart_txt") {
        const isTrue = String(row.blart_txt).toLowerCase() === "true";
        className += isTrue ? " blart-true" : " blart-false";
      } else if (styleMode === "eyes") {
        const isTrue = String(row.eyes).toLowerCase() === "true";
        className += isTrue ? " eyes-true" : " eyes-false";
      } else if (styleMode === "nose") {
        const isTrue = String(row.nose).toLowerCase() === "true";
        className += isTrue ? " nose-true" : " nose-false";
      } else if (styleMode === "simpson") {
        const isTrue = String(row.simpson).toLowerCase() === "true";
        className += isTrue ? " simpson-true" : " simpson-false";
      } else if (styleMode === "not_spray") {
        const isTrue = String(row.spray).toLowerCase() === "true";
        className += isTrue ? " spray-true" : " spray-false";
      } else if (styleMode === "main_col") {
        // Define your custom hex codes for each possible CSV value
        const colorMap = {
          blue: "#2590d7",
          pink: "#ea338b",
          black: "#111111",
          red: "#d4493a",
          green: "#1fcf8f",
          yellow: "#e6cb18",
          white: "#f4f4f4",
        };

        // Clean the CSV string (make lowercase and remove extra spaces) to ensure it matches
        const csvColor = (row.main_col || "").toString().trim().toLowerCase();

        // Look up the hex code. If the color isn't in the list, default to grey (#95a5a6)
        const mappedHex = colorMap[csvColor] || "#878c8c38";

        inlineStyle = `background-color: ${mappedHex}; border-color: ${mappedHex === "#ffffff" ? "#ccc" : "#fff"};`;
      } else if (styleMode === "private_prop") {
        const isTrue = String(row.private_prop).toLowerCase() === "true";
        className += isTrue ? " private-true" : " private-false";
      }

      // Define the custom icon
      const customIcon = L.divIcon({
        className: "custom-marker",
        html: `<div class="${className}" style="${inlineStyle}"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      let displayDate = "Unknown date";
      if (row.time) {
        const datePart = row.time.split(" ")[0]; // Grabs just the "YYYY:MM:DD" half
        const [year, month, day] = datePart.split(":");

        if (year && month && day) {
          // parseInt removes leading zeros (e.g., changes "01" to "1")
          displayDate = `${parseInt(day)}.${parseInt(month)}.${year}`;
        }
      }

      // HTML content for the popup
      // --- CONDITIONAL TAGS ---
      // Check if the "unsure" column is True
      const isUnsure = String(row.unsure).trim().toLowerCase() === "true";
      const unsureTag = isUnsure
        ? `<span class="category-tag">UNSURE</span>`
        : "";

      // HTML content for the popup
      let popupContent = `
        <div class="my-custom-popup">
            <div class="popup-header">
                <img src="data/img/${row.img}" class="popup-img" alt="Location image">
            </div>
            <div class="popup-body">
                ${unsureTag}
                <p>Photographed on ${displayDate}</p>
                <p>Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}</p>
                <button class="popup-btn" onclick="map.closePopup()">Close</button>
            </div>
        </div>
      `;

      // Attach marker to the LAYER GROUP, not directly to the map
      L.marker([lat, lon], { icon: customIcon })
        .bindPopup(popupContent, {
          className: "leaflet-custom-container",
          maxWidth: 300,
        })
        .addTo(markerGroup);
    }
  });
}

// --- STARTUP ---
window.addEventListener("load", initMap);
