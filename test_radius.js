import haversine from 'haversine-distance';

const bh = { lat: -19.9440459, lng: -43.9147834 };
const TARGET = 6752847;
const TOLERANCE = 1000; // 1km

// Scan latitudes and longitudes
// stepping every 1 degree
let found = [];
for (let lat = -90; lat <= 90; lat += 0.5) {
    for (let lng = -180; lng <= 180; lng += 0.5) {
        const d = haversine(bh, { lat, lng });
        if (Math.abs(d - TARGET) < TOLERANCE) {
            found.push({ lat, lng, d });
        }
    }
}

console.log(`Found ${found.length} points around 6752km from BH`);
if (found.length > 0) {
    console.log(found.slice(0, 10)); // just print a few
}
