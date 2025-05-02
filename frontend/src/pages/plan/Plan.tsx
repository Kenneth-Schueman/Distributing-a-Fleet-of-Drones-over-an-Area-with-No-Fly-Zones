import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import 'mapbox-gl/dist/mapbox-gl.css';
import "./Plan.css";

function Plan() {
    const navigate = useNavigate();
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);

    const [lng, setLng] = useState(-93.62);
    const [lat, setLat] = useState(42.03);
    const [zoom, setZoom] = useState(9);
    const [selectedZone, setSelectedZone] = useState("FAA-Iowa");
    const [seed, setSeed] = useState("");
    const [coverage, setCoverage] = useState("");
    const [sizeVariation, setSizeVariation] = useState("");
    const [droneCount, setDroneCount] = useState("");
    const [partitionType, setPartitionType] = useState("");
    const [polygons, setPolygons] = useState<any[]>([]);
    const [isComputeLoading, setIsComputeLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Map of zone options to their respective map IDs (matching the Discover page logic)
    const zoneToMapId: Record<string, number | null> = {
        "FAA-ALL": null, // Special case that will include all map IDs
        "FAA-Iowa": 1,
        "FAA-FAcility-Map": 3,
        "FAA-National-Security": 5,
        "FAA-Prohibited-Areas": 7,
        "Generated": null, // Special case, requires API call to generate
        "Generated-cluster": null // Special case, requires API call to generate
    };

    // State to track generated synthetic data map IDs
    const [syntheticMapIds, setSyntheticMapIds] = useState({
        "Generated": null as number | null,
        "Generated-cluster": null as number | null
    });

    useEffect(() => {
        mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

        if (mapContainerRef.current && !mapRef.current) {
            mapRef.current = new mapboxgl.Map({
                container: mapContainerRef.current,
                style: 'mapbox://styles/mapbox/streets-v11',
                center: [lng, lat],
                zoom: zoom
            });

            mapRef.current.on('moveend', () => {
                if (mapRef.current) {
                    const center = mapRef.current.getCenter();
                    setLng(Number(center.lng.toFixed(4)));
                    setLat(Number(center.lat.toFixed(4)));
                    setZoom(Number(mapRef.current.getZoom().toFixed(2)));
                }
            });

            // Clean up map instance on unmount
            return () => {
                if (mapRef.current) {
                    mapRef.current.remove();
                    mapRef.current = null;
                }
            };
        }
    }, []);

    // Get current map bounds and center for API payloads
    const getCurrentMapData = () => {
        if (!mapRef.current) return null;

        const bounds = mapRef.current.getBounds();
        if (!bounds) return null;

        const center = mapRef.current.getCenter();

        return {
            center_latitude: Math.round(center.lat),
            center_longitude: Math.round(center.lng),
            region_height: Math.round(bounds.getNorth() - bounds.getSouth()),
            region_width: Math.round(bounds.getEast() - bounds.getWest()),
        };
    };

    // Validate synthetic data parameters
    const validateSyntheticParams = () => {
        const errors = [];

        // Validate seed if provided
        if (seed && !/^\d+$/.test(seed)) {
            errors.push('Seed must be a positive number');
        }

        // Validate coverage if provided
        if (coverage) {
            const coverageNum = parseFloat(coverage);
            if (isNaN(coverageNum) || coverageNum < 0 || coverageNum > 100) {
                errors.push('Coverage must be between 0 and 100');
            }
        }

        // Validate size variation if provided
        if (sizeVariation) {
            const sizeVariationNum = parseFloat(sizeVariation);
            if (isNaN(sizeVariationNum) || sizeVariationNum < 0 || sizeVariationNum > 1) {
                errors.push('Size variation must be between 0 and 1');
            }
        }

        return errors;
    };

    // Generate synthetic data based on current map position
    const generateSyntheticData = async (type: 'Generated' | 'Generated-cluster') => {
        const mapData = getCurrentMapData();
        if (!mapData) return null;

        // Validate parameters before making API call
        const validationErrors = validateSyntheticParams();
        if (validationErrors.length > 0) {
            alert(`Please fix the following errors:\n${validationErrors.join('\n')}`);
            return null;
        }

        try {
            // Map the type to the correct endpoint
            const endpoint = type === 'Generated'
                ? 'generate_synthetic_noflies/'
                : 'generate_synthetic_noflies_clustering/';

            // Add optional parameters if provided
            const additionalParams = {
                ...(seed && { seed: parseInt(seed) }),
                ...(coverage && { obstacle_percentage: parseFloat(coverage) / 100 }), // Convert percentage to decimal
                ...(sizeVariation && { size_variation: parseFloat(sizeVariation) })
            };

            const payload = {
                ...mapData,
                ...additionalParams
            };

            console.log(`API call: ${endpoint} (POST) ->`, JSON.stringify(payload, null, 2));

            const response = await axios({
                method: 'POST',
                url: `http://127.0.0.1:8000/dbrqs/${endpoint}`,
                headers: {
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify(payload)
            });

            console.log(`API response from ${endpoint}:`, JSON.stringify(response.data, null, 2));

            // Extract the generated map ID and no-fly zones from the response
            if (response.data && response.data.map_id) {
                setSyntheticMapIds(prev => ({
                    ...prev,
                    [type]: response.data.map_id
                }));

                // Return both the map ID and the no-fly zones if available
                return {
                    mapId: response.data.map_id,
                    noFlyZones: response.data.no_fly_zones || []
                };
            } else {
                console.error(`No map_id found in response from ${endpoint}`);
                return null;
            }
        } catch (error: any) {
            console.error(`Error generating synthetic data (${type}):`, error.response?.data || error.message);
            alert(`Error generating synthetic data: ${error.response?.data?.error || error.message}`);
            return null;
        }
    };

    // Add polygons to the map
    const addPolygonsToMap = (polygons: any[]) => {
        if (!mapRef.current) return;

        // Filter out polygons with invalid latitude values
        const validPolygons = polygons.filter(polygon => {
            // Check if any point has latitude outside the valid range
            return !polygon.points.some((point: any) => {
                const lat = parseFloat(point.latitude);
                return lat < -90 || lat > 90;
            });
        });

        // Log how many polygons were filtered out
        if (validPolygons.length !== polygons.length) {
            console.warn(`Filtered out ${polygons.length - validPolygons.length} polygons with invalid latitude values`);
        }

        // Remove any existing polygon layers
        if (mapRef.current.getLayer('polygons-fill')) {
            mapRef.current.removeLayer('polygons-fill');
        }
        if (mapRef.current.getLayer('polygons-outline')) {
            mapRef.current.removeLayer('polygons-outline');
        }
        if (mapRef.current.getSource('polygons')) {
            mapRef.current.removeSource('polygons');
        }

        // Only proceed if we have valid polygons
        if (validPolygons.length === 0) {
            console.warn('No valid polygons to display on the map');
            return;
        }

        // Create GeoJSON data from the polygons
        const geojsonData = {
            type: 'FeatureCollection',
            features: validPolygons.map(polygon => {
                // Convert points to coordinate arrays, ensuring they're in [longitude, latitude] format
                const coordinates = polygon.points.map((point: any) => [
                    parseFloat(point.longitude),
                    parseFloat(point.latitude)
                ]);

                // Ensure the polygon is closed by adding the first point at the end if needed
                if (coordinates.length > 0 &&
                    (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
                        coordinates[0][1] !== coordinates[coordinates.length - 1][1])) {
                    coordinates.push(coordinates[0]);
                }

                return {
                    type: 'Feature',
                    properties: {
                        id: polygon.id,
                        map: polygon.map,
                        zone_type: polygon.zone_type || 'unknown'
                    },
                    geometry: {
                        type: 'Polygon',
                        coordinates: [coordinates]
                    }
                };
            })
        };

        // Add the polygons source to the map
        mapRef.current.addSource('polygons', {
            type: 'geojson',
            data: geojsonData as any
        });

        // Add fill layer
        mapRef.current.addLayer({
            id: 'polygons-fill',
            type: 'fill',
            source: 'polygons',
            layout: {},
            paint: {
                'fill-color': '#ff8800',
                'fill-opacity': 0.5
            }
        });
        // Add outline layer
        mapRef.current.addLayer({
            id: 'polygons-outline',
            type: 'line',
            source: 'polygons',
            layout: {},
            paint: {
                'line-color': '#000',
                'line-width': 2
            }
        });

        // Store the polygons in state
        setPolygons(validPolygons);
    };

    // Fetch no-fly zones based on the selected zone
    const fetchNoFlyZones = async () => {
        try {
            // Determine which map IDs to fetch based on the selected zone
            let mapIdsToFetch: number[] = [];
            let directPolygons: any[] = [];

            // Handle special cases
            if (selectedZone === "FAA-ALL") {
                // Include all valid map IDs except synthetic ones
                mapIdsToFetch = Object.values(zoneToMapId)
                    .filter(id => id !== null) as number[];
            } else if (selectedZone === "Generated") {
                // Generate synthetic data and use the response directly
                const result = await generateSyntheticData('Generated');
                if (result) {
                    if (result.noFlyZones && result.noFlyZones.length > 0) {
                        // Use the no-fly zones directly from the response
                        directPolygons = result.noFlyZones;
                    } else if (result.mapId !== null) {
                        // Fallback to using the map ID if no direct no-fly zones
                        mapIdsToFetch.push(result.mapId);
                    }
                }
            } else if (selectedZone === "Generated-cluster") {
                // Generate synthetic clustered data and use the response directly
                const result = await generateSyntheticData('Generated-cluster');
                if (result) {
                    if (result.noFlyZones && result.noFlyZones.length > 0) {
                        // Use the no-fly zones directly from the response
                        directPolygons = result.noFlyZones;
                    } else if (result.mapId !== null) {
                        // Fallback to using the map ID if no direct no-fly zones
                        mapIdsToFetch.push(result.mapId);
                    }
                }
            } else {
                // Regular zone - get the corresponding map ID
                const mapId = zoneToMapId[selectedZone];
                if (mapId !== null) mapIdsToFetch.push(mapId);
            }

            // Collect all polygon data
            const allPolygons: any[] = [...directPolygons];

            // Only make API calls if we have map IDs to fetch and no direct polygons
            if (mapIdsToFetch.length > 0) {
                console.log('Fetching no-fly zones for map IDs:', mapIdsToFetch);

                // Make separate API calls for each map ID
                for (const mapId of mapIdsToFetch) {
                    const mapData = getCurrentMapData() || {};
                    const payload = {
                        ...mapData,
                        map_id: mapId // Single integer, not an array
                    };

                    console.log(`API call: no_flies_on_map/ (POST) ->`, JSON.stringify(payload, null, 2));

                    try {
                        const response = await axios({
                            method: 'POST',
                            url: 'http://127.0.0.1:8000/dbrqs/no_flies_on_map/',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            data: JSON.stringify(payload)
                        });

                        const data = response.data;
                        console.log(`API response from no_flies_on_map/ for map_id ${mapId}:`, JSON.stringify(data, null, 2));

                        // Check if no_fly_zones exists in the response and add them to allPolygons
                        if (data && data.no_fly_zones && Array.isArray(data.no_fly_zones)) {
                            allPolygons.push(...data.no_fly_zones);
                        } else {
                            console.error(`Invalid response format for no_flies_on_map/ with map_id ${mapId}:`, data);
                        }
                    } catch (error: any) {
                        console.error(`Error calling no_flies_on_map/ API for map_id ${mapId}:`, error.response?.data || error.message);
                    }
                }
            } else if (directPolygons.length === 0) {
                console.log('No map IDs to fetch and no direct polygons, skipping API call');
                return;
            }

            // Add all collected polygons to the map
            if (allPolygons.length > 0) {
                addPolygonsToMap(allPolygons);
            }

        } catch (error: any) {
            console.error(`Error in fetchNoFlyZones:`, error.response?.data || error.message);
        }
    };

    // Handle zone change - automatically fetch no-fly zones when the zone changes
    const handleZoneChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newZone = e.target.value;
        
        // Clear existing polygons from the map when changing zones
        if (mapRef.current) {
            // Remove any existing polygon layers
            if (mapRef.current.getLayer('polygons-fill')) {
                mapRef.current.removeLayer('polygons-fill');
            }
            if (mapRef.current.getLayer('polygons-outline')) {
                mapRef.current.removeLayer('polygons-outline');
            }
            if (mapRef.current.getSource('polygons')) {
                mapRef.current.removeSource('polygons');
            }
            
            // Clear polygons state
            setPolygons([]);
        }

        // Clear synthetic map IDs if switching away from synthetic options
        if (newZone !== "Generated" && newZone !== "Generated-cluster") {
            setSyntheticMapIds({
                "Generated": null,
                "Generated-cluster": null
            });
        }

        // Set the selected zone after clearing everything
        setSelectedZone(newZone);
        
        // Fetch no-fly zones for the new selection
        await fetchNoFlyZones();
    };

    // Handle refresh button click
    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            // Clear existing polygons from the map
            if (mapRef.current) {
                if (mapRef.current.getLayer('polygons-fill')) {
                    mapRef.current.removeLayer('polygons-fill');
                }
                if (mapRef.current.getLayer('polygons-outline')) {
                    mapRef.current.removeLayer('polygons-outline');
                }
                if (mapRef.current.getSource('polygons')) {
                    mapRef.current.removeSource('polygons');
                }
                
                // Clear polygons state
                setPolygons([]);
            }
            
            // Re-fetch no-fly zones
            await fetchNoFlyZones();
        } catch (error) {
            console.error('Error refreshing no-fly zones:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    // Handle compute button click - collect data and navigate to Operate
    const handleCompute = async () => {
        if (!droneCount) {
            alert('Please enter the number of drones');
            return;
        }

        if (polygons.length === 0) {
            alert('Please select and load a no-fly zone option');
            return;
        }

        setIsComputeLoading(true);

        try {
            // Determine the correct map ID to use
            let mapId: number | null = null;

            if (selectedZone === "Generated" || selectedZone === "Generated-cluster") {
                mapId = syntheticMapIds[selectedZone];
                console.log(`Using synthetic map ID for ${selectedZone}:`, mapId);
            } else {
                mapId = zoneToMapId[selectedZone];
                console.log(`Using predefined map ID for ${selectedZone}:`, mapId);
            }

            if (mapId === null) {
                throw new Error(`No map ID available for the selected zone: ${selectedZone}`);
            }

            // Store planning data in localStorage
            const planData = {
                mapPosition: { lng, lat, zoom },
                droneCount,
                selectedZone,
                polygons,
                mapIds: mapId, // Ensure this is a single number, not null
                partitionType,
                timestamp: Date.now()
            };

            console.log('Storing plan data:', JSON.stringify(planData, null, 2));

            localStorage.setItem('dronePlanData', JSON.stringify(planData));

            // Navigate to operate page
            navigate('/operate');

        } catch (error) {
            console.error('Error preparing data for operation:', error);
            alert(`Error preparing data: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setIsComputeLoading(false);
        } finally {
            setIsComputeLoading(false);
        }
    };

    // Effect to fetch no-fly zones when component mounts
    useEffect(() => {
        // Initial fetch of no-fly zones for default selection only if the default zone is selected
        if (selectedZone === "FAA-Iowa") {
            fetchNoFlyZones();
        }
    }, []);

    return (
        <div className="plan-container">
            <div className="input-column">
                <div className="input-group">
                    <label htmlFor="drone-number">Number of Drones:</label>
                    <input
                        id="drone-number"
                        type="number"
                        className="number-input"
                        placeholder="Number of Drones"
                        value={droneCount}
                        onChange={(e) => setDroneCount(e.target.value)}
                        min="2"
                        max="5"
                        required
                    />
                    <div className="input-hint">This is 2^x drones!</div>
                </div>
                <div className="input-group">
                    <label htmlFor="algorithm-select">Fly-Zones:</label>
                    <select
                        id="algorithm-select"
                        className="dropdown-selector"
                        value={selectedZone}
                        onChange={handleZoneChange}>
                        <option value="FAA-Iowa">FAA - Iowa</option>
                        <option value="Generated">Generated</option>
                        <option value="Generated-cluster">Generated (Clustered)</option>
                        <option value="FAA-Facility-Map" disabled>FAA - Facility Map</option>
                        <option value="FAA-National-Security">FAA - National Security</option>
                        <option value="FAA-Prohibited-Areas">FAA - Prohibited Areas</option>
                        <option value="FAA-ALL" disabled>FAA (All)</option>
                    </select>
                    <button 
                        className="refresh-button"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                    >
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
                {(selectedZone === "Generated" || selectedZone === "Generated-cluster") && (
                    <div className="generated-options">
                        <div className="input-group">
                            <label htmlFor="seed">Seed (Optional):</label>
                            <input
                                id="seed"
                                type="text"
                                className="text-input"
                                placeholder="Enter seed"
                                value={seed}
                                onChange={(e) => setSeed(e.target.value)}
                            />
                        </div>
                        <div className="input-group">
                            <label htmlFor="coverage">Percentage of Coverage (Optional):</label>
                            <input
                                id="coverage"
                                type="number"
                                className="number-input"
                                placeholder="Enter percentage"
                                value={coverage}
                                onChange={(e) => setCoverage(e.target.value)}
                                min="0"
                                max="100"
                            />
                        </div>
                        <div className="input-group">
                            <label htmlFor="size-variation">Size Variation (Optional):</label>
                            <input
                                id="size-variation"
                                type="number"
                                className="number-input"
                                placeholder="Enter variation"
                                value={sizeVariation}
                                onChange={(e) => setSizeVariation(e.target.value)}
                                min="0"
                            />
                        </div>
                    </div>
                )}
                <div className="input-group">
                    <label htmlFor="latitude-input">Starting Position (Lat, Long):</label>
                    <div className="coordinate-inputs">
                        <input
                            id="latitude-input"
                            type="text"
                            className="coordinate-input"
                            value={lat}
                            readOnly
                        />
                        <input
                            id="longitude-input"
                            type="text"
                            className="coordinate-input"
                            value={lng}
                            readOnly
                        />
                    </div>
                </div>
                <div className="input-group">
                    <label htmlFor="zoom-input">Zoom Level:</label>
                    <input
                        id="zoom-input"
                        type="text"
                        className="zoom-input"
                        value={zoom}
                        readOnly
                    />
                </div>
                <button
                    className="compute-button"
                    onClick={handleCompute}
                    disabled={!droneCount || isComputeLoading || polygons.length === 0}
                >
                    {isComputeLoading ? 'Preparing...' : 'Continue to Operation'}
                </button>
            </div>
            {/* Map container */}
            <div className="map-container" ref={mapContainerRef} />
        </div>
    );
}

export default Plan;