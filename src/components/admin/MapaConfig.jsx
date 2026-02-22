import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

/**
 * Componente de Mapa para Configuração
 * @param {number} lat - Latitude central/marcador
 * @param {number} lng - Longitude central/marcador
 * @param {number} raio - Raio do geofencing (para desenhar um círculo se desejado)
 * @param {function} onMove - Callback ao mover o marcador ou clicar no mapa
 */
export default function MapaConfig({ lat, lng, raio, onMove }) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const marker = useRef(null);

    useEffect(() => {
        if (map.current) return;

        // Garante que temos números válidos antes de iniciar
        const startLat = Number(lat) || -19.9440459;
        const startLng = Number(lng) || -43.9147834;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: "https://tiles.openfreemap.org/styles/dark",
            center: [startLng, startLat],
            zoom: 17,
        });

        map.current.addControl(new maplibregl.NavigationControl(), "top-right");

        map.current.on("load", () => {
            // Tenta silenciar erros de ícones ausentes (comum em estilos externos)
            map.current.on('styleimagemissing', (e) => {
                console.warn(`Map icon missing: ${e.id}`);
                // Podemos adicionar um placeholder aqui se necessário
            });

            map.current.addSource("raio-source", {
                type: "geojson",
                data: createGeoJSONCircle([startLng, startLat], (raio || 120) / 1000)
            });

            map.current.addLayer({
                id: "raio-layer",
                type: "fill",
                source: "raio-source",
                layout: {},
                paint: {
                    "fill-color": "#2F81F7",
                    "fill-opacity": 0.2,
                    "fill-outline-color": "#2F81F7"
                }
            });

            const el = document.createElement('div');
            el.className = 'custom-marker';
            el.style.width = '20px';
            el.style.height = '20px';
            el.style.backgroundColor = '#2f81f7';
            el.style.borderRadius = '50%';
            el.style.border = '3px solid #fff';
            el.style.boxShadow = '0 0 15px rgba(0,0,0,0.5)';
            el.style.cursor = 'move';

            marker.current = new maplibregl.Marker({
                element: el,
                draggable: true,
            })
                .setLngLat([startLng, startLat])
                .addTo(map.current);

            marker.current.on("dragend", () => {
                const lngLat = marker.current.getLngLat();
                onMove({ lat: lngLat.lat, lng: lngLat.lng });
            });

            map.current.on("click", (e) => {
                marker.current.setLngLat(e.lngLat);
                onMove({ lat: e.lngLat.lat, lng: e.lngLat.lng });
            });
        });

    }, []);

    // Helper para criar círculo GeoJSON
    function createGeoJSONCircle(center, radiusInKm, points = 64) {
        if (!center || isNaN(center[0]) || isNaN(center[1])) {
            return { type: "FeatureCollection", features: [] };
        }
        const coords = {
            latitude: center[1],
            longitude: center[0]
        };
        const km = radiusInKm || 0.12;
        const ret = [];
        const distanceX = km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180));
        const distanceY = km / 110.574;

        for (let i = 0; i < points; i++) {
            const theta = (i / points) * (2 * Math.PI);
            const x = distanceX * Math.cos(theta);
            const y = distanceY * Math.sin(theta);
            ret.push([coords.longitude + x, coords.latitude + y]);
        }
        ret.push(ret[0]);

        return {
            type: "FeatureCollection",
            features: [{
                type: "Feature",
                geometry: {
                    type: "Polygon",
                    coordinates: [ret]
                }
            }]
        };
    }

    // Atualiza posição do marcador e círculo quando as props mudam externamente
    useEffect(() => {
        if (marker.current && map.current) {
            const currentPos = marker.current.getLngLat();
            const nLat = Number(lat);
            const nLng = Number(lng);
            const nRaio = Number(raio);

            if (isNaN(nLat) || isNaN(nLng)) return;

            if (Math.abs(currentPos.lat - nLat) > 0.0001 || Math.abs(currentPos.lng - nLng) > 0.0001) {
                marker.current.setLngLat([nLng, nLat]);
                map.current.flyTo({ center: [nLng, nLat], zoom: 17 });
            }

            const source = map.current.getSource("raio-source");
            if (source) {
                source.setData(createGeoJSONCircle([nLng, nLat], nRaio / 1000));
            }
        }
    }, [lat, lng, raio]);

    return (
        <ContainerMapa>
            <div ref={mapContainer} className="map-container" />
            <Legenda>
                Arraste o marcador azul para definir a localização da empresa.
            </Legenda>
        </ContainerMapa>
    );
}

const ContainerMapa = styled.div`
  width: 100%;
  height: 350px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;

  @media (max-width: 480px) {
    height: 250px;
  }

  .map-container {
    width: 100%;
    height: 100%;
  }

  /* O estilo dark-matter já é dark, não precisa de filtro */
  .maplibregl-canvas {
    outline: none;
  }

  .custom-marker {
    transform: translate(-50%, -50%);
    transition: transform 0.2s ease;
    &:hover {
      transform: translate(-50%, -50%) scale(1.2);
    }
  }
`;

const Legenda = styled.div`
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  background: rgba(18, 18, 20, 0.85);
  backdrop-filter: blur(8px);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 11px;
  color: #8d8d99;
  border: 1px solid rgba(255, 255, 255, 0.05);
  pointer-events: none;
  z-index: 10;

  @media (max-width: 480px) {
    font-size: 10px;
    padding: 6px 10px;
    bottom: 8px;
    left: 8px;
    right: 8px;
  }
`;
