import haversine from 'haversine-distance';

const bh = { lat: -19.9440459, lng: -43.9147834 };

const mocks = {
    london: { lat: 51.5073509, lng: -0.1277583 },
    berlin: { lat: 52.5200066, lng: 13.404954 },
    sf: { lat: 37.7749295, lng: -122.4194155 },
    tokyo: { lat: 35.689487, lng: 139.691706 },
    shanghai: { lat: 31.230416, lng: 121.473701 },
    mountainView: { lat: 37.3861, lng: -122.0839 },
};

for (const [name, loc] of Object.entries(mocks)) {
    const d = haversine(bh, loc);
    console.log(name, d);
}
