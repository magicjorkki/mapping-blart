// Application State
let map;
let csvData = [];
let currentLayer;
let markerGroup;
let hiddenClasses = new Set();

const colorMap = {
  blue: "#2590d7",
  pink: "#ea33bf",
  black: "#111111",
  red: "#d43a3a",
  green: "#11be7f",
  yellow: "#e6cb18",
  white: "#f4f4f4",
};

const tileLayers = {
  osm: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"),
  satellite: L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  ),
};

// Initialization
window.addEventListener("load", initializeApp);

function initializeApp() {
  map = L.map("map").setView([62.6006023, 29.7621209], 13);
  currentLayer = tileLayers.satellite.addTo(map);
  markerGroup = L.layerGroup().addTo(map);

  setupEventListeners();
  fetchData();
}

function setupEventListeners() {
  document
    .getElementById("map-selector")
    .addEventListener("change", function (event) {
      map.removeLayer(currentLayer);
      currentLayer = tileLayers[event.target.value];
      currentLayer.addTo(map);
    });

  document
    .getElementById("point-coloring-selector")
    .addEventListener("change", function () {
      hiddenClasses.clear();
      renderMapPoints();
    });

  document
    .getElementById("unsure-toggle")
    .addEventListener("change", function () {
      renderMapPoints();
    });
}

// Data Handling
function fetchData() {
  Papa.parse("data/csv/blart.csv", {
    download: true,
    header: true,
    complete: function (results) {
      csvData = results.data;
      renderMapPoints();
    },
  });
}

// Rendering Logic
function renderMapPoints() {
  markerGroup.clearLayers();

  const styleMode = document.getElementById("point-coloring-selector").value;
  const showUnsure = document.getElementById("unsure-toggle").checked;

  let classCounts = {};
  let totalVisibleCount = 0;

  for (const row of csvData) {
    const lat = parseFloat(row.lat);
    const lon = parseFloat(row.lon);
    const isUnsure = String(row.unsure).trim().toLowerCase() === "true";

    if ((isUnsure && !showUnsure) || isNaN(lat) || isNaN(lon)) {
      continue;
    }

    const styleData = determinePointStyle(row, styleMode);

    classCounts[styleData.pointId] = (classCounts[styleData.pointId] || 0) + 1;

    if (hiddenClasses.has(styleData.pointId)) {
      continue;
    }

    totalVisibleCount++;

    const customIcon = L.divIcon({
      className: "custom-marker",
      html: `<div class="${styleData.className}" style="${styleData.inlineStyle}"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const popupContent = createPopupContent(row, isUnsure, lat, lon);

    L.marker([lat, lon], { icon: customIcon })
      .bindPopup(popupContent, {
        className: "leaflet-custom-container",
        maxWidth: 300,
      })
      .addTo(markerGroup);
  }

  updateLegendUI(styleMode, classCounts, totalVisibleCount);
}

// Helper: Determine appearance based on drop down
function determinePointStyle(row, styleMode) {
  let className = "marker-inner";
  let inlineStyle = "";
  let pointId = "";

  if (styleMode === "view_direction") {
    className = "marker-arrow";
    pointId = "view_direction";
    const dir = row.dir || 0;
    inlineStyle = `transform: rotate(${dir}deg);`;
  } else if (styleMode === "main_col") {
    const csvColor = (row.main_col || "").toString().trim().toLowerCase();
    const mappedHex = colorMap[csvColor] || "#878c8c38";
    pointId = mappedHex;
    const borderColor = mappedHex === "#ffffff" ? "#ccc" : "#fff";
    inlineStyle = `background-color: ${mappedHex}; border-color: ${borderColor};`;
  } else if (styleMode === "simple") {
    pointId = "#3498db";
  } else {
    const isTrue =
      String(
        row[
          styleMode === "not_spray"
            ? "spray"
            : styleMode === "blart_txt"
              ? "blart_txt"
              : styleMode === "private_prop"
                ? "private_prop"
                : styleMode
        ],
      ).toLowerCase() === "true";

    let baseName = styleMode;
    if (styleMode === "not_spray") baseName = "spray";
    if (styleMode === "blart_txt") baseName = "blart";
    if (styleMode === "private_prop") baseName = "private";

    pointId = isTrue ? `${baseName}-true` : `${baseName}-false`;
    className += " " + pointId;
  }

  return { className, inlineStyle, pointId };
}

// Helper: Generate HTML for popups
function createPopupContent(row, isUnsure, lat, lon) {
  let displayDate = "Unknown date";
  if (row.time) {
    const datePart = row.time.split(" ")[0];
    const [year, month, day] = datePart.split(":");
    if (year && month && day) {
      displayDate = `${parseInt(day)}.${parseInt(month)}.${year}`;
    }
  }

  const imgName = row.img ? row.img : "Unknown image";
  const unsureTag = isUnsure ? `<span class="category-tag">UNSURE</span>` : "";

  return `
    <div class="point-popup">
        <div class="popup-header">
            <img src="data/img/${row.img}" class="popup-img" alt="Location image">
        </div>
        <div class="popup-body">
            ${unsureTag}
            <p>${imgName}</p>
            <p>Photographed on ${displayDate}</p>
            <p>Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}</p>
            <button class="popup-btn" onclick="map.closePopup()">Close</button>
        </div>
    </div>
  `;
}

// UI & Legend
function updateLegendUI(styleMode, classCounts, totalVisibleCount) {
  const legendContent = document.getElementById("legend-content");
  let html = "";

  if (styleMode === "simple") {
    html += createLegendRow("#3498db", "Blart Point", classCounts, true);
  } else if (styleMode === "view_direction") {
    html += createLegendRow(
      "view_direction",
      "Camera Direction",
      classCounts,
      false,
      true,
    );
  } else if (styleMode === "blart_txt") {
    html += createLegendRow("blart-true", "Has Blart Text", classCounts);
    html += createLegendRow("blart-false", "No Blart Text", classCounts);
  } else if (styleMode === "eyes") {
    html += createLegendRow("eyes-true", "Has Eyes", classCounts);
    html += createLegendRow("eyes-false", "No Eyes", classCounts);
  } else if (styleMode === "nose") {
    html += createLegendRow("nose-true", "Has Nose", classCounts);
    html += createLegendRow("nose-false", "No Nose", classCounts);
  } else if (styleMode === "simpson") {
    html += createLegendRow("simpson-true", "Simpson Design", classCounts);
    html += createLegendRow("simpson-false", "Other", classCounts);
  } else if (styleMode === "not_spray") {
    html += createLegendRow("spray-true", "Is Spray", classCounts);
    html += createLegendRow("spray-false", "Other (marker)", classCounts);
  } else if (styleMode === "private_prop") {
    html += createLegendRow("private-true", "Private Property", classCounts);
    html += createLegendRow("private-false", "Public / Other", classCounts);
  } else if (styleMode === "main_col") {
    for (const colorName in colorMap) {
      const hexCode = colorMap[colorName];
      const label = colorName.charAt(0).toUpperCase() + colorName.slice(1);
      html += createLegendRow(hexCode, label, classCounts, true);
    }
    html += createLegendRow("#878c8c38", "Other / Missing", classCounts, true);
  }

  html += `
    <div style="margin-top: 15px; display: flex; justify-content: space-between; align-items: center; color: var(--light-blue); font-size: 15px;">
        <span>Total Visible:</span>
        <span>${totalVisibleCount}</span>
    </div>
  `;

  legendContent.innerHTML = html;
}

function createLegendRow(
  id,
  label,
  classCounts,
  isHex = false,
  isArrow = false,
) {
  const count = classCounts[id] || 0;
  const isHidden = hiddenClasses.has(id);
  const styleStr = isHex ? `background-color: ${id};` : "";
  const classStr = isArrow ? "legend-arrow" : `legend-shape ${isHex ? "" : id}`;
  const eyeOpacity = isHidden ? "0.3" : "1";

  return `
    <div class="legend-item">
      <div style="display: flex; align-items: center; gap: 10px;">
          <div class="${classStr}" style="${styleStr}"></div>
          <span>${label} (${count})</span>
      </div>
      <svg onclick="toggleLegendVisibility('${id}')" style="width: 18px; cursor: pointer; opacity: ${eyeOpacity}; fill: var(--light-blue); transition: 0.2s;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
        <path d="M288 80c-65.2 0-118.8 29.6-159.9 67.7C89.6 183.5 63 226 49.4 256c13.6 30 40.2 72.5 78.6 108.3C169.2 402.4 222.8 432 288 432s118.8-29.6 159.9-67.7C486.4 328.5 513 286 526.6 256c-13.6-30-40.2-72.5-78.6-108.3C406.8 109.6 353.2 80 288 80zM95.4 112.6C142.5 68.8 207.2 32 288 32s145.5 36.8 192.6 80.6c46.8 43.5 78.1 95.4 93 131.1c3.3 7.9 3.3 16.7 0 24.6c-14.9 35.7-46.2 87.7-93 131.1C433.5 443.2 368.8 480 288 480s-145.5-36.8-192.6-80.6C48.6 356 17.3 304 2.5 268.3c-3.3-7.9-3.3-16.7 0-24.6C17.3 208 48.6 156 95.4 112.6zM288 336c44.2 0 80-35.8 80-80s-35.8-80-80-80c-.7 0-1.3 0-2 0c1.3 5.1 2 10.5 2 16c0 35.3-28.7 64-64 64c-5.5 0-10.9-.7-16-2c0 .7 0 1.3 0 2c0 44.2 35.8 80 80 80zm0-208a128 128 0 1 1 0 256 128 128 0 1 1 0-256z"/>
      </svg>
    </div>`;
}

function toggleLegendVisibility(classId) {
  if (hiddenClasses.has(classId)) {
    hiddenClasses.delete(classId);
  } else {
    hiddenClasses.add(classId);
  }
  renderMapPoints();
}
