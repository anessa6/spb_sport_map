import "ol/ol.css";
import Feature from "ol/Feature";
import Map from "ol/Map";
import View from "ol/View";
import { fromLonLat } from "ol/proj";
import { boundingExtent } from "ol/extent";
import Point from "ol/geom/Point";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import Cluster from "ol/source/Cluster";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import CircleStyle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import Text from "ol/style/Text";
import Overlay from "ol/Overlay";

const distanceInput = document.getElementById("distance");
const minDistanceInput = document.getElementById("min-distance");
const distanceValue = document.getElementById("distance-value");
const minDistanceValue = document.getElementById("min-distance-value");
const totalCountEl = document.getElementById("total-count");
const visibleCountEl = document.getElementById("visible-count");
const districtFilter = document.getElementById("district-filter");
const sportFilter = document.getElementById("sport-filter");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const resetBtn = document.getElementById("reset-btn");
const searchSuggestions = document.getElementById("search-suggestions");

let allSportsObjects = [];
let vectorSource;
let clusterSource;
let map;
let statsChart = null;

function showLoading() {
  const loading = document.createElement('div');
  loading.className = 'loading-spinner';
  loading.id = 'loading';
  loading.innerHTML = '<div class="spinner"></div>Загрузка данных...';
  document.body.appendChild(loading);
}

function hideLoading() {
  const loading = document.getElementById('loading');
  if (loading) loading.remove();
}

async function loadData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Ошибка: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error("Ошибка загрузки данных:", error);
    return null;
  }
}

function getColorByType(type) {
  if (!type) return "#e74c3c";
  
  const typeStr = type.toLowerCase();
  if (typeStr.includes("каток")) return "#f39c12";
  if (typeStr.includes("комплекс") || typeStr.includes("центр")) return "#27ae60";
  if (typeStr.includes("площадка") || typeStr.includes("поле")) return "#3498db";
  return "#e74c3c";
}

function createPopupContent(sportsObject) {
  const getFieldValue = (value, defaultText = 'Сведения отсутствуют') => {
    return value && value.trim() ? value : defaultText;
  };

  const getPhoneLink = (phone) => {
    if (!phone || !phone.trim()) return '<span style="color: #999;">Сведения отсутствуют</span>';
    return `<a href="tel:${phone}" style="color: #2c5aa0;">${phone}</a>`;
  };

  const getEmailLink = (email) => {
    if (!email || !email.trim()) return '<span style="color: #999;">Сведения отсутствуют</span>';
    return `<a href="mailto:${email}" style="color: #2c5aa0;">${email}</a>`;
  };

  const getWebsiteLink = (website) => {
    if (!website || !website.trim()) return '<span style="color: #999;">Сведения отсутствуют</span>';
    
    let url = website.trim();
    // Добавляем протокол, если его нет
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    return `<a href="${url}" target="_blank" style="color: #2c5aa0;">Перейти на сайт</a>`;
  };

  return `
    <div style="max-width: 300px; font-family: 'Segoe UI', sans-serif;">
      <div style="background: linear-gradient(135deg, #2c5aa0 0%, #3498db 100%); color: white; padding: 12px; margin: -12px -12px 12px -12px; border-radius: 8px 8px 0 0;">
        <h6 style="margin: 0; font-weight: 600; font-size: 14px;">${getFieldValue(sportsObject.name, 'Без названия')}</h6>
      </div>
      
      <div style="font-size: 13px; line-height: 1.4;">
        <p style="margin: 6px 0;"><i class="fas fa-map-marker-alt" style="color: #e74c3c; width: 14px; font-size: 11px;"></i> <strong>Адрес:</strong> ${getFieldValue(sportsObject.address)}</p>
        <p style="margin: 6px 0;"><i class="fas fa-building" style="color: #3498db; width: 14px; font-size: 11px;"></i> <strong>Район:</strong> ${getFieldValue(sportsObject.district)}</p>
        <p style="margin: 6px 0;"><i class="fas fa-tag" style="color: #27ae60; width: 14px; font-size: 11px;"></i> <strong>Тип:</strong> ${getFieldValue(sportsObject.type)}</p>
        <p style="margin: 6px 0;"><i class="fas fa-running" style="color: #f39c12; width: 14px; font-size: 11px;"></i> <strong>Спорт:</strong> ${getFieldValue(sportsObject.sports)}</p>
        
        <p style="margin: 6px 0;"><i class="fas fa-phone" style="color: #27ae60; width: 14px; font-size: 11px;"></i> <strong>Телефон:</strong> ${getPhoneLink(sportsObject.phone)}</p>
        <p style="margin: 6px 0;"><i class="fas fa-envelope" style="color: #3498db; width: 14px; font-size: 11px;"></i> <strong>Email:</strong> ${getEmailLink(sportsObject.email)}</p>
        <p style="margin: 6px 0;"><i class="fas fa-globe" style="color: #9b59b6; width: 14px; font-size: 11px;"></i> <strong>Сайт:</strong> ${getWebsiteLink(sportsObject.website)}</p>
        
        <div style="background: #f8f9fa; padding: 8px; border-radius: 6px; margin-top: 8px; font-size: 12px;">
          <p style="margin: 3px 0;"><strong>Статус:</strong> <span style="color: ${sportsObject.status && sportsObject.status.includes('Работающий') ? '#27ae60' : '#e74c3c'};">${getFieldValue(sportsObject.status)}</span></p>
          <p style="margin: 3px 0;"><strong>Стоимость:</strong> ${getFieldValue(sportsObject.cost)}</p>
        </div>
        
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #666;"><strong>Оборудование:</strong> ${getFieldValue(sportsObject.facilities)}</p>
      </div>
    </div>
  `;
}

function createClusterStyle(feature) {
  const size = feature.get('features').length;
  let style = new Style({
    image: new CircleStyle({
      radius: size > 1 ? Math.min(Math.max(size * 1.5 + 8, 12), 30) : 8,
      stroke: new Stroke({
        color: '#fff',
        width: 2,
      }),
      fill: new Fill({
        color: size > 1 ? '#2c5aa0' : getColorByType(feature.get('features')[0].get('type')),
      }),
    }),
    text: size > 1 ? new Text({
      text: size.toString(),
      fill: new Fill({
        color: '#fff',
      }),
      font: 'bold 11px sans-serif',
    }) : null,
  });
  
  return style;
}

function filterObjects() {
  const districtValue = districtFilter.value.toLowerCase();
  const sportValue = sportFilter.value.toLowerCase();
  const searchValue = searchInput.value.toLowerCase();
  
  const filtered = allSportsObjects.filter(sport => {
    const matchDistrict = !districtValue || (sport.district && sport.district.toLowerCase().includes(districtValue));
    const matchSport = !sportValue || (sport.sports && sport.sports.toLowerCase().includes(sportValue));
    const matchSearch = !searchValue || 
      (sport.name && sport.name.toLowerCase().includes(searchValue)) ||
      (sport.address && sport.address.toLowerCase().includes(searchValue)) ||
      (sport.sports && sport.sports.toLowerCase().includes(searchValue));
    
    return matchDistrict && matchSport && matchSearch;
  });
  
  updateMapWithFilteredData(filtered);
  visibleCountEl.textContent = filtered.length;
}

function liveSearch(query) {
  if (!query || query.length < 2) {
    searchSuggestions.classList.remove('active');
    return;
  }

  const searchLower = query.toLowerCase();
  const matches = allSportsObjects.filter(sport => {
    return (sport.name && sport.name.toLowerCase().includes(searchLower)) ||
           (sport.address && sport.address.toLowerCase().includes(searchLower)) ||
           (sport.sports && sport.sports.toLowerCase().includes(searchLower));
  }).slice(0, 5);

  if (matches.length === 0) {
    searchSuggestions.classList.remove('active');
    return;
  }

  const highlightText = (text, query) => {
    if (!text) return '';
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span class="suggestion-highlight">$1</span>');
  };

  searchSuggestions.innerHTML = matches.map(sport => `
    <div class="suggestion-item" data-id="${sport.id}">
      <div class="suggestion-name">${highlightText(sport.name || 'Без названия', query)}</div>
      <div class="suggestion-details">
        ${highlightText(sport.address || '', query)} • ${sport.district || ''}
      </div>
    </div>
  `).join('');

  searchSuggestions.classList.add('active');

  document.querySelectorAll('.suggestion-item').forEach(item => {
    item.addEventListener('click', function() {
      const sportId = parseInt(this.dataset.id);
      const sport = allSportsObjects.find(s => s.id === sportId);
      if (sport && sport.latitude && sport.longitude) {
        const coords = fromLonLat([sport.longitude, sport.latitude]);
        map.getView().animate({
          center: coords,
          zoom: 16,
          duration: 1000
        });
        searchInput.value = sport.name || '';
        searchSuggestions.classList.remove('active');
      }
    });
  });
}

function createStatsChart() {
  const ctx = document.getElementById('stats-chart');
  if (!ctx) return;

  const districtCounts = {};
  allSportsObjects.forEach(sport => {
    const district = sport.district || 'Не указан';
    districtCounts[district] = (districtCounts[district] || 0) + 1;
  });

  const sortedDistricts = Object.entries(districtCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const labels = sortedDistricts.map(d => d[0]);
  const data = sortedDistricts.map(d => d[1]);

  if (statsChart) {
    statsChart.destroy();
  }

  statsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Количество объектов',
        data: data,
        backgroundColor: [
          '#3498db',
          '#27ae60',
          '#f39c12',
          '#e74c3c',
          '#9b59b6'
        ],
        borderRadius: 6,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          padding: 12,
          cornerRadius: 8,
          titleFont: {
            size: 13
          },
          bodyFont: {
            size: 12
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            font: {
              size: 11
            }
          },
          grid: {
            color: '#f0f0f0'
          }
        },
        x: {
          ticks: {
            font: {
              size: 10
            },
            maxRotation: 45,
            minRotation: 45
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}

function updateMapWithFilteredData(filteredObjects) {
  const features = filteredObjects.map((sport) => {
    if (!sport.latitude || !sport.longitude) return null;
    
    const coords = fromLonLat([sport.longitude, sport.latitude]);
    const feature = new Feature(new Point(coords));
    
    Object.keys(sport).forEach(key => {
      feature.set(key, sport[key]);
    });
    feature.set("objectType", "sport");
    
    return feature;
  }).filter(feature => feature !== null);
  
  vectorSource.clear();
  vectorSource.addFeatures(features);
}

async function loadFilters() {
  try {
    const districtsData = await loadData("http://localhost:5000/api/districts");
    if (districtsData && districtsData.districts) {
      districtsData.districts.forEach(district => {
        const option = document.createElement('option');
        option.value = district;
        option.textContent = district;
        districtFilter.appendChild(option);
      });
    }
    
    const sportsData = await loadData("http://localhost:5000/api/sport-types");
    if (sportsData && sportsData.sport_types) {
      sportsData.sport_types.forEach(sport => {
        const option = document.createElement('option');
        option.value = sport;
        option.textContent = sport;
        sportFilter.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Ошибка загрузки фильтров:", error);
  }
}

async function initMap() {
  showLoading();
  
  totalCountEl.innerHTML = '<div class="spinner" style="width: 16px; height: 16px;"></div>';
  visibleCountEl.innerHTML = '<div class="spinner" style="width: 16px; height: 16px;"></div>';
  
  const sportsData = await loadData("http://localhost:5000/api/sports");
  if (!sportsData || !sportsData.sports) {
    totalCountEl.textContent = "Ошибка";
    visibleCountEl.textContent = "Ошибка";
    hideLoading();
    return;
  }

  allSportsObjects = Object.values(sportsData.sports);
  totalCountEl.textContent = allSportsObjects.length;
  visibleCountEl.textContent = allSportsObjects.length;

  vectorSource = new VectorSource();
  
  clusterSource = new Cluster({
    distance: parseInt(distanceInput.value, 10),
    minDistance: parseInt(minDistanceInput.value, 10),
    source: vectorSource,
  });

  const clusters = new VectorLayer({
    source: clusterSource,
    style: createClusterStyle,
  });

  map = new Map({
    target: "map",
    layers: [
      new TileLayer({
        source: new OSM(),
      }),
      clusters,
    ],
    view: new View({
      center: fromLonLat([30.3141, 59.9386]),
      zoom: 11,
    }),
  });

  const popup = new Overlay({
    element: document.createElement('div'),
    positioning: 'bottom-center',
    stopEvent: false,
    offset: [0, -10],
  });
  map.addOverlay(popup);

  const popupElement = popup.getElement();
  popupElement.style.cssText = `
    background: white;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    padding: 12px;
    max-width: 320px;
    border: 1px solid #e0e0e0;
    position: relative;
    font-size: 13px;
  `;

  const arrow = document.createElement('div');
  arrow.style.cssText = `
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid white;
  `;
  popupElement.appendChild(arrow);

  map.on('click', function (evt) {
    const feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
      return feature;
    });

    if (feature) {
      const features = feature.get('features');
      if (features && features.length === 1) {
        const sportsObject = features[0].getProperties();
        popup.setPosition(evt.coordinate);
        popupElement.innerHTML = createPopupContent(sportsObject) + arrow.outerHTML;
      } else if (features && features.length > 1) {
        const extent = boundingExtent(
          features.map(f => f.getGeometry().getCoordinates())
        );
        map.getView().fit(extent, { duration: 500, padding: [50, 50, 50, 50] });
      }
    } else {
      popup.setPosition(undefined);
    }
  });

  map.on('pointermove', function (evt) {
    const hit = map.hasFeatureAtPixel(evt.pixel);
    map.getTarget().style.cursor = hit ? 'pointer' : '';
  });

  updateMapWithFilteredData(allSportsObjects);
  await loadFilters();
  createStatsChart();
  hideLoading();
}

function initPanelToggles() {
  document.querySelectorAll('.panel-toggle').forEach(toggle => {
    toggle.addEventListener('click', function() {
      const target = this.dataset.target;
      const content = document.getElementById(target);
      const isCollapsed = content.classList.contains('collapsed');
      
      if (isCollapsed) {
        content.classList.remove('collapsed');
        this.classList.remove('collapsed');
      } else {
        content.classList.add('collapsed');
        this.classList.add('collapsed');
      }
    });
  });
}

searchInput.addEventListener("input", function() {
  liveSearch(this.value);
});

document.addEventListener('click', function(e) {
  if (!searchSuggestions.contains(e.target) && e.target !== searchInput) {
    searchSuggestions.classList.remove('active');
  }
});

distanceInput.addEventListener("input", function () {
  clusterSource.setDistance(parseInt(this.value, 10));
  distanceValue.textContent = this.value;
});

minDistanceInput.addEventListener("input", function () {
  clusterSource.setMinDistance(parseInt(this.value, 10));
  minDistanceValue.textContent = this.value;
});

districtFilter.addEventListener("change", filterObjects);
sportFilter.addEventListener("change", filterObjects);
searchBtn.addEventListener("click", filterObjects);
searchInput.addEventListener("keypress", function(e) {
  if (e.key === 'Enter') {
    filterObjects();
  }
});

resetBtn.addEventListener("click", function() {
  districtFilter.value = "";
  sportFilter.value = "";
  searchInput.value = "";
  filterObjects();
});

initPanelToggles();
initMap();

const dataSourceBtn = document.getElementById('data-source-btn');
const dataSourceModal = document.getElementById('data-source-modal');
const modalClose = document.getElementById('modal-close');

dataSourceBtn.addEventListener('click', function() {
  dataSourceModal.classList.add('active');
});

modalClose.addEventListener('click', function() {
  dataSourceModal.classList.remove('active');
});

dataSourceModal.addEventListener('click', function(e) {
  if (e.target === dataSourceModal) {
    dataSourceModal.classList.remove('active');
  }
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && dataSourceModal.classList.contains('active')) {
    dataSourceModal.classList.remove('active');
  }
});
