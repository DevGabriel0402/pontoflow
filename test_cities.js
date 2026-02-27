import haversine from 'haversine-distance';

const bh = { lat: -19.9440459, lng: -43.9147834 };

const mocks = {
    miami: { lat: 25.761680, lng: -80.191790 },
    orlando: { lat: 28.538336, lng: -81.379234 },
    austin: { lat: 30.267153, lng: -97.743061 },
    boston: { lat: 42.360082, lng: -71.058880 },
    madrid: { lat: 40.4168, lng: -3.7038 },
    lisbon: { lat: 38.7223, lng: -9.1393 },
    paris: { lat: 48.8566, lng: 2.3522 },
};

for (const [name, loc] of Object.entries(mocks)) {
    const d = haversine(bh, loc);
    console.log(name, d);
}
