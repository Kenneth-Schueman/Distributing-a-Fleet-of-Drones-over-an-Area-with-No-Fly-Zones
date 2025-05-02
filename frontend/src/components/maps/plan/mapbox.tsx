import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const Mapbox = () => {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);

    useEffect(() => {
        mapboxgl.accessToken = 'pk.eyJ1Ijoic2RtYXkyNS0yMSIsImEiOiJjbTJjZGxsdWkxMTZxMmtweXc3d2hmOTUxIn0.dq7FVg7sWMLb37I0LMfhLw';

        if (mapContainerRef.current) {
            mapRef.current = new mapboxgl.Map({
                container: mapContainerRef.current,
                center: [-74.5, 40], // starting position [lng, lat]
                zoom: 9 // starting zoom
            });
        }
    });

    return (
        <div
            className="map-container"
            ref={mapContainerRef}
        />
    );
};

export default Mapbox;