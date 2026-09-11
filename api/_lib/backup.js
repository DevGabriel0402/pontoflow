import { GeoPoint, Timestamp } from "firebase-admin/firestore";

export const BACKUP_COLLECTIONS = [
  "users",
  "pontos",
  "justificativas",
  "banco_horas",
  "notificacoes",
  "suporte_mensagens",
];

export function serializeValue(value) {
  if (value instanceof Timestamp) {
    return { __type: "timestamp", value: value.toDate().toISOString() };
  }
  if (value instanceof GeoPoint) {
    return { __type: "geopoint", latitude: value.latitude, longitude: value.longitude };
  }
  if (value instanceof Date) {
    return { __type: "timestamp", value: value.toISOString() };
  }
  if (Array.isArray(value)) return value.map(serializeValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serializeValue(item)]));
  }
  return value;
}

export function deserializeValue(value) {
  if (Array.isArray(value)) return value.map(deserializeValue);
  if (value && typeof value === "object") {
    if (value.__type === "timestamp") return Timestamp.fromDate(new Date(value.value));
    if (value.__type === "geopoint") return new GeoPoint(value.latitude, value.longitude);
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, deserializeValue(item)]));
  }
  return value;
}

export function serializeSnapshot(snapshot) {
  return snapshot.docs.map((document) => ({ id: document.id, data: serializeValue(document.data()) }));
}
