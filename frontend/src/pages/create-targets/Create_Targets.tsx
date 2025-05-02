import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import "./Create_Targets.css";
import { useNavigate } from 'react-router-dom'; // Import useNavigate hook for navigation

function Create_Targets() {
    const mapContainerRef = useRef(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const [targets, setTargets] = useState<{id: number, lat: number, lng: number}[]>([]);
    const [markersRef, setMarkersRef] = useState<mapboxgl.Marker[]>([]);
    const navigate = useNavigate(); // Initialize the navigation hook

    useEffect(() => {
        mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

        if (mapContainerRef.current && !mapRef.current) {
            const map = new mapboxgl.Map({
                container: mapContainerRef.current,
                style: 'mapbox://styles/mapbox/streets-v11',
                center: [-93.62, 42.03],
                zoom: 9
            });

            mapRef.current = map;

            // Wait for map to load before adding click handler
            map.on('load', () => {
                map.on('click', handleMapClick);
            });

            // Clean up map instance on unmount
            return () => {
                if (mapRef.current) {
                    mapRef.current.off('click', handleMapClick);
                    mapRef.current.remove();
                    mapRef.current = null;
                }
                
                // Remove all markers
                markersRef.forEach(marker => marker.remove());
            };
        }
    }, []);  // Empty dependency array to run only once

    // Define handleMapClick outside useEffect so it doesn't depend on changing references
    const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
        const { lng, lat } = e.lngLat;
        
        // Add target to state
        const newTarget = {
            id: Date.now(), // Use timestamp as unique ID
            lat,
            lng
        };
        
        // Add marker to map
        if (mapRef.current) {
            // Create a custom HTML marker with an X shape
            const el = document.createElement('div');
            el.className = 'custom-marker';
            el.innerHTML = 'X';
            el.style.color = 'red';
            el.style.fontWeight = 'bold';
            el.style.fontSize = '24px';
            
            const marker = new mapboxgl.Marker(el)
                .setLngLat([lng, lat])
                .addTo(mapRef.current);
                
            setMarkersRef(prevMarkers => [...prevMarkers, marker]);
            setTargets(prevTargets => [...prevTargets, newTarget]);
        }
    };

    const handleGenerate = () => {
        // Create a JSON file with the targets
        const targetsData = JSON.stringify({ targets }, null, 2);
        const blob = new Blob([targetsData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create a link and trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = 'targets.json';
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    const handleReset = () => {
        // Clear all targets and remove markers
        setTargets([]);
        markersRef.forEach(marker => marker.remove());
        setMarkersRef([]);
    };

    const handleLoadExample = () => {
        // Load example targets
        const exampleTargets = [
            { id: 1, lat: 42.03, lng: -93.62 },
            { id: 2, lat: 42.05, lng: -93.65 },
            { id: 3, lat: 42.01, lng: -93.59 },
            { id: 4, lat: 42.07, lng: -93.60 },
            { id: 5, lat: 42.02, lng: -93.63 },
            { id: 6, lat: 42.06, lng: -93.66 },
            { id: 7, lat: 42.04, lng: -93.61 },
            { id: 8, lat: 42.08, lng: -93.64 },
            { id: 9, lat: 42.00, lng: -93.58 },
            { id: 10, lat: 42.09, lng: -93.67 }
        ];
        
        // Clear existing markers
        markersRef.forEach(marker => marker.remove());
        setMarkersRef([]);
        
        // Add new markers
        const newMarkers: mapboxgl.Marker[] = [];
        exampleTargets.forEach(target => {
            if (mapRef.current) {
                // Create a custom HTML marker with an X shape
                const el = document.createElement('div');
                el.className = 'custom-marker';
                el.innerHTML = 'X';
                el.style.color = 'red';
                el.style.fontWeight = 'bold';
                el.style.fontSize = '24px';
                
                const marker = new mapboxgl.Marker(el)
                    .setLngLat([target.lng, target.lat])
                    .addTo(mapRef.current);
                newMarkers.push(marker);
            }
        });
        
        setTargets(exampleTargets);
        setMarkersRef(newMarkers);
    };

    // Handler for back button click
    const handleBackClick = () => {
        navigate(-1); // Navigate to previous page in history
    };

    return (
        <div className="targets-container">
            {/* Back arrow button */}
            <div className="back-arrow" onClick={handleBackClick}>
                ← Back
            </div>
            
            <div className="info-column">
                <h2>Create Targets</h2>
                <div className="instructions">
                    <h3>How to use:</h3>
                    <ol>
                        <li>Click anywhere on the map to add a target location</li>
                        <li>Red X markers will appear at each clicked location</li>
                        <li>Click "Generate Targets File" to download a JSON file with all target locations</li>
                        <li>Click "Reset" to clear all targets</li>
                        <li>Click "Load Example" to see sample targets</li>
                    </ol>
                </div>
                
                <div className="stats">
                    <p>Total targets: {targets.length}</p>
                    {targets.length > 0 && (
                        <div className="target-list">
                            <h4>Target Coordinates:</h4>
                            <div className="coordinates-list">
                                {targets.map((target, index) => (
                                    <p key={target.id}>
                                        Target {index + 1}: [{target.lat.toFixed(4)}, {target.lng.toFixed(4)}]
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="button-group">
                    <button 
                        className="generate-button" 
                        onClick={handleGenerate}
                        disabled={targets.length === 0}
                    >
                        Generate Targets File
                    </button>
                    <button 
                        className="reset-button" 
                        onClick={handleReset}
                        disabled={targets.length === 0}
                    >
                        Reset
                    </button>
                    <button 
                        className="example-button" 
                        onClick={handleLoadExample}
                    >
                        Load Example
                    </button>
                </div>
                
                <div className="example-json">
                    <h4>Example JSON Format:</h4>
                    <pre className="json-example">
{`{
  "targets": [
    {
      "id": 1,
      "lat": 42.0300,
      "lng": -93.6200
    },
    {
      "id": 2,
      "lat": 42.0500,
      "lng": -93.6500
    }
  ]
}`}
                    </pre>
                </div>
            </div>
            <div className="map-container" ref={mapContainerRef} />
        </div>
    );
}

export default Create_Targets;