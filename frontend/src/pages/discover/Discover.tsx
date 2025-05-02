import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import axios from 'axios';
import 'mapbox-gl/dist/mapbox-gl.css';
import './Discover.css';

const Mapbox = () => {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

    // Define fly zone options with their toggle states and map IDs
    const [flyZones, setFlyZones] = useState({
        iowa_no_fly: { active: false, mapId: 1 },            // Iowa specific no fly zones
        faa_ria: { active: false, mapId: 2 },                // FAA recognized ID areas
        faa_uas_facility: { active: false, mapId: 3 },       // FAA UAS Facility Map
        iowa_boundary: { active: false, mapId: 4 },          // Iowa Boundary
        national_security: { active: false, mapId: 5 },      // National Security UAS Flight Zones
        part_time_national_security: { active: false, mapId: 6 }, // Part time National Security Flight zones
        prohibited_areas: { active: false, mapId: 7 },       // Prohibited Areas
        recreational_flyer_sites: { active: false, mapId: 8 }, // Recreational Flyer Sites
        synthetic_noflies: { active: false, mapId: null },   // Generated data (requires special API call)
        synthetic_clusters: { active: false, mapId: null }   // Generated clusters (requires special API call)
    });

    // State to track generated synthetic data map IDs
    const [syntheticMapIds, setSyntheticMapIds] = useState({
        synthetic_noflies: null as number | null,
        synthetic_clusters: null as number | null
    });

    // Initialize map
    useEffect(() => {
        mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

        if (mapContainerRef.current) {
            mapRef.current = new mapboxgl.Map({
                container: mapContainerRef.current,
                center: [-93.62, 42.03], // starting position [lng, lat]
                zoom: 9 // starting zoom
            });
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
            }
        };
    }, []);

    // Function to add polygons to the map
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

        // Fit map to polygons
        const bounds = new mapboxgl.LngLatBounds();

        // Extend bounds to include all coordinates
        validPolygons.forEach(polygon => {
            polygon.points.forEach((point: any) => {
                bounds.extend([parseFloat(point.longitude), parseFloat(point.latitude)]);
            });
        });

        mapRef.current.fitBounds(bounds, {
            padding: 50,
            maxZoom: 15
        });
    };

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

    // Toggle a specific fly zone option
    const toggleFlyZone = (zoneName: keyof typeof flyZones) => {
        setFlyZones(prev => ({
            ...prev,
            [zoneName]: {
                ...prev[zoneName],
                active: !prev[zoneName].active
            }
        }));
    };

    // Generate synthetic data based on current map position
    const generateSyntheticData = async (type: 'synthetic_noflies' | 'synthetic_clusters') => {
        const mapData = getCurrentMapData();
        if (!mapData) return null;

        try {
            const endpoint = type === 'synthetic_noflies'
                ? 'generate_synthetic_noflies/'
                : 'generate_synthetic_noflies_clustering/';

            console.log(`API call: ${endpoint} (POST) ->`, JSON.stringify(mapData, null, 2));

            const response = await axios({
                method: 'POST',
                url: `http://127.0.0.1:8000/dbrqs/${endpoint}`,
                headers: {
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify(mapData)
            });

            console.log(`API response from ${endpoint}:`, JSON.stringify(response.data, null, 2));

            // Extract the generated map ID from the response
            if (response.data && response.data.map_id) {
                setSyntheticMapIds(prev => ({
                    ...prev,
                    [type]: response.data.map_id
                }));

                return response.data.map_id;
            } else {
                console.error(`No map_id found in response from ${endpoint}`);
                return null;
            }
        } catch (error: any) {
            console.error(`Error generating synthetic data (${type}):`, error.response?.data || error.message);
            return null;
        }
    };

    // Handle generating synthetic data when needed
    const handleSyntheticData = async () => {
        const syntheticPromises = [];

        // Generate synthetic_noflies if needed
        if (flyZones.synthetic_noflies.active) {
            syntheticPromises.push(generateSyntheticData('synthetic_noflies'));
        }

        // Generate synthetic_clusters if needed
        if (flyZones.synthetic_clusters.active) {
            syntheticPromises.push(generateSyntheticData('synthetic_clusters'));
        }

        // Wait for all synthetic data generation to complete
        if (syntheticPromises.length > 0) {
            await Promise.all(syntheticPromises);
        }
    };

    // API call function to get no-fly zones
    const fetchNoFlyZones = async () => {
        setLoading(true);

        try {
            // First, generate any synthetic data that is needed
            await handleSyntheticData();

            // Create an array of map IDs to fetch
            const mapIdsToFetch: number[] = [];

            // Add map IDs for each toggled option that has a map ID
            Object.entries(flyZones).forEach(([key, value]) => {
                if (value.active && value.mapId !== null) {
                    mapIdsToFetch.push(value.mapId as number);
                }
            });

            // Add synthetic map IDs if they're active and available
            if (flyZones.synthetic_noflies.active && syntheticMapIds.synthetic_noflies !== null) {
                mapIdsToFetch.push(syntheticMapIds.synthetic_noflies);
            }

            if (flyZones.synthetic_clusters.active && syntheticMapIds.synthetic_clusters !== null) {
                mapIdsToFetch.push(syntheticMapIds.synthetic_clusters);
            }

            // Only proceed if we have map IDs to fetch
            if (mapIdsToFetch.length === 0) {
                console.log('No map IDs to fetch, skipping API call');
                setLoading(false);
                return;
            }

            // Collect all polygon data from multiple API calls
            const allPolygons: any[] = [];

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

            // Add all collected polygons to the map
            if (allPolygons.length > 0) {
                addPolygonsToMap(allPolygons);
            }

        } catch (error: any) {
            console.error(`Error in fetchNoFlyZones:`, error.response?.data || error.message);
        } finally {
            setLoading(false);
        }
    };

    // Effect to detect when specific synthetic toggles change
    useEffect(() => {
        // Only consider active options that have changed
        if (
            flyZones.synthetic_noflies.active ||
            flyZones.synthetic_clusters.active ||
            Object.entries(flyZones).some(([key, value]) =>
                key !== 'synthetic_noflies' &&
                key !== 'synthetic_clusters' &&
                value.active
            )
        ) {
            fetchNoFlyZones();
        }
    }, [flyZones]);

    // Toggle dropdown menu
    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    // Fly zone options with display names
    const flyZoneOptions = [
        { id: 'iowa_no_fly', label: 'Iowa No-Fly Zones' },
        { id: 'faa_ria', label: 'FAA - Recognized Identification Areas' },
        // { id: 'faa_uas_facility', label: 'FAA - UAS Facility Map' },
        // { id: 'iowa_boundary', label: 'Iowa Boundary' },
        { id: 'national_security', label: 'National Security UAS Flight Zones' },
        { id: 'part_time_national_security', label: 'Part-time National Security Zones' },
        { id: 'prohibited_areas', label: 'Prohibited Areas' },
        { id: 'recreational_flyer_sites', label: 'Recreational Flyer Sites' },
        { id: 'synthetic_noflies', label: 'Generated No-Flies' },
        { id: 'synthetic_clusters', label: 'Generated Clusters' }
    ];

    return (
        <div className="map-wrapper">
            {/* Map container */}
            <div className="map-container" data-testid="map-container" ref={mapContainerRef} />

            {/* Toggle menu */}
            <div className="map-controls">
                <button
                    className={`map-menu-button ${isMenuOpen ? 'active' : ''}`}
                    onClick={toggleMenu}
                >
                    {loading ? 'Loading...' : 'No-Fly Zones'} {isMenuOpen ? '▲' : '▼'}
                </button>

                {isMenuOpen && (
                    <div className="fly-zone-menu">
                        {flyZoneOptions.map(option => (
                            <div key={option.id} className="fly-zone-option">
                                <label className="toggle-label">
                                    <input
                                        type="checkbox"
                                        checked={flyZones[option.id as keyof typeof flyZones].active}
                                        onChange={() => toggleFlyZone(option.id as keyof typeof flyZones)}
                                        disabled={loading}
                                    />
                                    <span className="toggle-text">{option.label}</span>
                                </label>
                            </div>
                        ))}

                        <button
                            className="apply-button"
                            onClick={fetchNoFlyZones}
                            disabled={loading || !Object.values(flyZones).some(value => value.active)}
                        >
                            {loading ? 'Loading...' : 'Refresh Map'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Mapbox;