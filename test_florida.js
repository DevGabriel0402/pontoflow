import haversine from 'haversine-distance';

const bh = { lat: -19.9440459, lng: -43.9147834 };

const mocks = {
    orlando: { lat: 28.538336, lng: -81.379234 },
    tampa: { lat: 27.9506, lng: -82.4572 },
    jacksonville: { lat: 30.3322, lng: -81.6557 },
    miami: { lat: 25.7617, lng: -80.1918 },
    capeCanaveral: { lat: 28.3922, lng: -80.6077 },
    daytona: { lat: 29.2108, lng: -81.0228 }
};

for (const [name, loc] of Object.entries(mocks)) {
    const d = haversine(bh, loc);
    console.log(name, d);
}
