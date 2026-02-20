// src/utils/geofencing.js
import haversine from "haversine-distance";

export function checkLocation(userCoords, officeCoords, allowedRadiusMeters) {
    // haversine-distance espera { latitude, longitude } (ou lat/lng)
    const user = {
        latitude: Number(userCoords.latitude ?? userCoords.lat),
        longitude: Number(userCoords.longitude ?? userCoords.lng),
    };

    const office = {
        latitude: Number(officeCoords.latitude ?? officeCoords.lat),
        longitude: Number(officeCoords.longitude ?? officeCoords.lng),
    };

    const distance = haversine(user, office); // metros
    const rounded = Math.round(distance);

    return {
        isInside: distance <= allowedRadiusMeters,
        distance: rounded,
    };
}

export function getOfficeConfig() {
    const radius = Number(import.meta.env.VITE_GEOFENCE_RADIUS_METERS || 120);

    const lat = Number(import.meta.env.VITE_OFFICE_LAT);
    const lng = Number(import.meta.env.VITE_OFFICE_LNG);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
        throw new Error(
            "Configuração do escritório inválida. Defina VITE_OFFICE_LAT e VITE_OFFICE_LNG no .env"
        );
    }

    return {
        radius,
        officeCoords: { lat, lng },
    };
}