import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

/**
 * Componente de Visualização do Local do Ponto
 * @param {number} lat - Latitude do registro
 * @param {number} lng - Longitude do registro
 * @param {boolean} dentroDoRaio - Para mudar a cor do marcador se necessário
 */
export default function MapaVisualizacao({ lat, lng, dentroDoRaio = true }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);

  useEffect(() => {
    const nLat = Number(lat);
    const nLng = Number(lng);
    if (isNaN(nLat) || isNaN(nLng)) return;

    if (!map.current) {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: "https://tiles.openfreemap.org/styles/dark",
        center: [nLng, nLat],
        zoom: 16,
      });

      map.current.addControl(new maplibregl.NavigationControl(), "top-right");

      map.current.on("load", () => {
        const el = document.createElement('div');
        el.className = 'marker-container';
        const dot = document.createElement('div');
        dot.className = 'custom-marker';
        dot.style.backgroundColor = '#2f81f7';
        dot.style.width = '20px';
        dot.style.height = '20px';
        dot.style.borderRadius = '50%';
        dot.style.border = `3px solid #fff`;
        dot.style.boxShadow = '0 0 15px rgba(0,0,0,0.5)';
        el.appendChild(dot);

        marker.current = new maplibregl.Marker({ element: el })
          .setLngLat([nLng, nLat])
          .addTo(map.current);
      });
    } else {
      // Se o mapa já existe, apenas atualiza posição e centro
      if (marker.current) {
        marker.current.setLngLat([nLng, nLat]);
      }
      map.current.flyTo({ center: [nLng, nLat], speed: 1.5 });
    }

    return () => {
      // Não removemos o mapa em cada render se ele existir, 
      // apenas se o componente desmontar completamente (isso é tratado pelo React se o useEffect não tivesse o "else")
    };
  }, [lat, lng]);

  // UseEffect separado para limpeza real no desmonte
  useEffect(() => {
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  return (
    <ContainerMapa>
      <div ref={mapContainer} className="map-container" />
    </ContainerMapa>
  );
}

const ContainerMapa = styled.div`
  width: 100%;
  height: 300px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;

  .map-container {
    width: 100%;
    height: 100%;
  }

  /* O estilo dark-matter já é dark, não precisa de filtro */
  .maplibregl-canvas {
    outline: none;
  }

  .marker-container {
    cursor: pointer;
  }

  .custom-marker {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 0 0 rgba(47, 129, 247, 0.7); }
    70% { transform: translate(-50%, -50%) scale(1.1); box-shadow: 0 0 0 10px rgba(47, 129, 247, 0); }
    100% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 0 0 rgba(47, 129, 247, 0); }
  }
`;
