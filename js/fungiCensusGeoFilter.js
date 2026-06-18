/**
 * Check if a point (lat, lon) is inside a GeoJSON polygon
 * Uses the ray-casting algorithm for efficient point-in-polygon testing
 * 
 * @param {number} lat - Latitude of the point to test
 * @param {number} lon - Longitude of the point to test
 * @param {Object} geojson - GeoJSON FeatureCollection or Feature with Polygon geometry
 * @returns {boolean} - true if point is inside the polygon, false otherwise
 */
function isPointInPolygon(lat, lon, geojson) {
  // Extract polygon coordinates from GeoJSON
  let polygonCoords;
  
  if (geojson.type === 'FeatureCollection') {
    // Get first feature's coordinates
    polygonCoords = geojson.features[0].geometry.coordinates[0];
  } else if (geojson.type === 'Feature') {
    polygonCoords = geojson.geometry.coordinates[0];
  } else if (geojson.type === 'Polygon') {
    polygonCoords = geojson.coordinates[0];
  } else {
    throw new Error('Invalid GeoJSON format');
  }
  
  // Ray-casting algorithm
  let inside = false;
  
  for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
    const xi = polygonCoords[i][0]; // longitude
    const yi = polygonCoords[i][1]; // latitude
    const xj = polygonCoords[j][0];
    const yj = polygonCoords[j][1];
    
    const intersect = ((yi > lat) !== (yj > lat)) &&
                      (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Filter specimens that fall within a specific area defined by GeoJSON
 * 
 * @param {Array} specimens - Array of specimen objects with localityCoordinates
 * @param {Object} geojson - GeoJSON polygon defining the area
 * @returns {Array} - Filtered array of specimens within the area
 */
function filterSpecimensInArea(specimens, geojson) {
  return specimens.filter(specimen => {
    // Parse coordinates from "lat, lon" string format
    const [lat, lon] = specimen.localityCoordinates.split(',').map(s => parseFloat(s.trim()));
    return isPointInPolygon(lat, lon, geojson);
  });
}

// Example usage with your data:
/*
const geojson = {
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "geometry": {
      "type": "Polygon",
      "coordinates": [[
        [8.694094635773297, 46.120140729708],
        [8.680504018714998, 46.03911225236175],
        [8.694094635773297, 46.120140729708]
      ]]
    }
  }]
};

const specimen = {
  "localityCoordinates": "45.88196, 9.91806",
  "locality": "Pineta della Selva, Clusone"
};

const isInside = isPointInPolygon(45.88196, 9.91806, geojson);
console.log(isInside); // false (this point is outside the example polygon)

// Or filter all specimens from your species data:
const speciesData = { ... }; // your fungi data
const specimensInArea = filterSpecimensInArea(
  speciesData.campioniRaccolti, 
  geojson
);
console.log(`Found ${specimensInArea.length} specimens in the defined area`);
*/

// Export for use in Node.js or ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { isPointInPolygon, filterSpecimensInArea };
}