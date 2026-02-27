import haversine from 'haversine-distance';

const target = 6752847;

// Let's assume office is correct or user is correct
const beloHorizonte = { lat: -19.9440459, lng: -43.9147834 };
const configs = [
    { lat: 43.9147834, lng: 19.9440459 },
    { lat: -43.9147834, lng: -19.9440459 },
    { lat: 43.9147834, lng: -19.9440459 },
    { lat: -43.9147834, lng: 19.9440459 },
    { lat: 0, lng: -43.9147834 },
    { lat: -19.9440459, lng: 0 },
    { lat: 0, lng: -19.9440459 },
    { lat: -43.9147834, lng: 0 },
    { lat: 19.9440459, lng: 43.9147834 },
];

for (const c of configs) {
    const dist1 = haversine(beloHorizonte, c);
    const dist2 = haversine(c, beloHorizonte);
    console.log(c, "=>", dist1, dist2);
}
