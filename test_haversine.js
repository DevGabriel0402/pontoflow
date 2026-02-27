const haversine = require('haversine-distance');

const office1 = { latitude: -19.9440459, longitude: -43.9147834 };
const user1 = { latitude: -19.9440459, longitude: -43.9147834 };

console.log("Same:", haversine(user1, office1));

const user_empty = { latitude: 0, longitude: 0 };
console.log("User 0,0:", haversine(user_empty, office1));

const office_empty = { latitude: 0, longitude: 0 };
console.log("Office 0,0:", haversine(user1, office_empty));

const swapped_office = { latitude: -43.9147834, longitude: -19.9440459 };
console.log("Swapped Office:", haversine(user1, swapped_office));

console.log("Office undefined fallback:", haversine(user1, { latitude: Number(undefined), longitude: Number(undefined) }));

console.log("Swapped user:", haversine({ latitude: -43.9147834, longitude: -19.9440459 }, office1));
