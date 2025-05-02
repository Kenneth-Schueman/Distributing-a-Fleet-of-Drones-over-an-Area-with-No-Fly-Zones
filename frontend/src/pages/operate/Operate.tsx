import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { useLocation } from 'react-router-dom';
import 'mapbox-gl/dist/mapbox-gl.css';
import './Operate.css';
import FileUploadPopup from '../../components/popup/FileUploadPopup';

interface PlanData {
  mapPosition: {
    lng: number;
    lat: number;
    zoom: number;
  };
  droneCount: string;
  selectedZone: string;
  polygons: any[];
  fileData: {
    name: string;
    type: string;
    content: string;
    size: number;
  };
  mapIds: number | null;
  timestamp: number;
  seed?: string;
  coverage?: string;
  sizeVariation?: string;
  partitionType?: string;
}

interface NoFlyZone {
  id: number;
  map: number;
  zone_type: string;
  points: { latitude: string; longitude: string }[];
}

interface Partition {
  id: number;
  map: number;
  partition_type: number;
  points: { latitude: number; longitude: number }[];
  drone?: { latitude: number; longitude: number };
}

interface Drone {
  id: number;
  location: {
    lat: number;
    lng: number;
  };
  status: 'idle' | 'responding' | 'returning';
  partitionId: number;
  path?: [number, number][];
}

interface Event {
  lat: number;
  lng: number;
  timestamp: number;
  status: 'pending' | 'responding' | 'resolved';
  respondingDroneId?: number;
  failedAttempt?: boolean;
}

interface Target {
  id: number;
  lat: number;
  lng: number;
}

interface TargetsFile {
  targets: Target[];
}

interface DronePathResponse {
  map_id: number;
  points_visited: {
    latitude: number;
    longitude: number;
  }[];
}

interface DroneNumberResponse {
  map_id: number;
  drone_number: number;
}

const PARTITION_TYPES = [
  { id: 0, name: "Regular Decomposition", endpoint: "partition_no_kd" },
  { id: 1, name: "Half Perimeter KD Decomposition", endpoint: "partition_kd_half" },
  { id: 2, name: "Native KD Decomposition", endpoint: "partition_kd_native" }
];

const BASE_API_URL = 'http://127.0.0.1:8000/dbrqs';

const Operate = () => {
  const location = useLocation();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partitionType, setPartitionType] = useState<number>(1); // Default to half perimeter KD
  const [partitions, setPartitions] = useState<Partition[]>([]);
  const [noFlyZones, setNoFlyZones] = useState<NoFlyZone[]>([]);
  const [drones, setDrones] = useState<Drone[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<number | null>(null);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [isPartitionLoading, setIsPartitionLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<string>('');
  const [showFileUploadPopup, setShowFileUploadPopup] = useState(true);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [currentTargetIndex, setCurrentTargetIndex] = useState<number>(-1);
  const [isProcessingTarget, setIsProcessingTarget] = useState<boolean>(false);
  const [targetMarkers, setTargetMarkers] = useState<mapboxgl.Marker[]>([]);
  const [currentPathMarker, setCurrentPathMarker] = useState<mapboxgl.Marker | null>(null);

  // Load plan data and partition type from localStorage
  useEffect(() => {
    try {
      // Load plan data
      const storedData = localStorage.getItem('dronePlanData');
      if (storedData) {
        const parsed = JSON.parse(storedData);
        setPlanData(parsed);
        
        // Ensure mapIds is properly set
        if (parsed.mapIds !== undefined && parsed.mapIds !== null) {
          console.log('Setting selectedMapId to:', parsed.mapIds);
          setSelectedMapId(parsed.mapIds);
        } else {
          console.warn('No mapIds found in planData:', parsed);
          setError('No map ID found in planning data. Please return to the planning page.');
        }
        
        // Check if partitionType was stored in the plan data
        if (parsed.partitionType) {
          // Map the string partition type to the numeric index
          const partitionIndex = PARTITION_TYPES.findIndex(type => 
            type.name.toLowerCase().includes(parsed.partitionType.toLowerCase())
          );
          if (partitionIndex !== -1) {
            setPartitionType(partitionIndex);
          }
        }
      } else {
        setError('No planning data found. Please return to the planning page.');
      }
    } catch (err) {
      console.error('Error loading plan data:', err);
      setError('Error loading planning data. Please return to the planning page.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Parse the target file when it's uploaded
  useEffect(() => {
    if (!targetFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (e.target && e.target.result) {
          const content = e.target.result as string;
          const parsedData = JSON.parse(content) as TargetsFile;
          
          if (parsedData.targets && Array.isArray(parsedData.targets)) {
            setTargets(parsedData.targets);
            console.log(`Loaded ${parsedData.targets.length} targets from file`);
            setApiStatus(`Loaded ${parsedData.targets.length} targets from file`);
          } else {
            console.error('Invalid targets file format: missing targets array');
            setApiStatus('Error: Invalid targets file format');
          }
        }
      } catch (error) {
        console.error('Error parsing targets file:', error);
        setApiStatus('Error parsing targets file');
      }
    };
    
    reader.onerror = () => {
      console.error('Error reading targets file');
      setApiStatus('Error reading targets file');
    };
    
    reader.readAsText(targetFile);
  }, [targetFile]);

  // Process the next target when simulation is running
  useEffect(() => {
    if (!isSimulationRunning || targets.length === 0 || isProcessingTarget) return;
    
    // If we haven't started processing targets yet, or if we've finished all targets
    if (currentTargetIndex === -1 || currentTargetIndex >= targets.length) {
      // Start from the beginning or reset
      if (currentTargetIndex === -1) {
        // Starting fresh
        setCurrentTargetIndex(0);
      } else {
        // We've processed all targets, stop the simulation
        setIsSimulationRunning(false);
        setApiStatus('All targets processed. Simulation complete.');
      }
      return;
    }
    
    // Process the current target
    const currentTarget = targets[currentTargetIndex];
    processTarget(currentTarget);
    
  }, [isSimulationRunning, currentTargetIndex, targets, isProcessingTarget]);

  // Function to process a target
  const processTarget = async (target: Target) => {
    if (!selectedMapId) {
      setApiStatus('No map selected, cannot process target');
      return;
    }
    
    setIsProcessingTarget(true);
    setApiStatus(`Processing target ${target.id} at [${target.lng.toFixed(4)}, ${target.lat.toFixed(4)}]...`);
    
    try {
      // First API call to get the drone number
      const dronePayload = {
        map_id: selectedMapId,
        partition_type: partitionType,
        event_long: target.lng,
        event_lat: target.lat,
        num_drones: Math.log2(drones.length)
      };
      
      console.log('Sending drone number request payload:', dronePayload);
      
      const droneResponse = await fetch(`${BASE_API_URL}/get_drone_number/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dronePayload),
      });
      
      if (!droneResponse.ok) {
        const errorText = await droneResponse.text();
        throw new Error(`Failed to get drone number (${droneResponse.status}): ${errorText || droneResponse.statusText}`);
      }
      
      const droneData: DroneNumberResponse = await droneResponse.json();
      console.log('Drone number response:', droneData);
      
      if (droneData.drone_number === undefined) {
        throw new Error('Invalid drone number response: missing drone_number');
      }
      
      // Make sure drone number is valid (exists in our drones array)
      // The API returns 0-indexed drone numbers (0 to drones.length-1)
      // If the API returns a drone number that's out of range, use drone 0 as a fallback
      let droneToUse = droneData.drone_number;
      if (droneToUse < 0 || droneToUse > drones.length) {
        console.warn(`API returned drone number ${droneToUse} which is out of range. We only have ${drones.length} drones (indices -${drones.length}). Using drone 0 as fallback.`);
        droneToUse = 0; // Use the first drone as a fallback
      }
      
      // Second API call to get the drone path, now with the drone number
      const pathPayload = {
        map_id: selectedMapId,
        partition_type: partitionType,
        event_long: target.lng,
        event_lat: target.lat,
        num_drones: Math.log2(drones.length) // Pass the drone number from the first API call
      };
      
      console.log('Sending drone path request payload:', pathPayload);
      
      const pathResponse = await fetch(`${BASE_API_URL}/respond_to_event/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pathPayload),
      });
      
      if (!pathResponse.ok) {
        const errorText = await pathResponse.text();
        throw new Error(`Failed to get drone path (${pathResponse.status}): ${errorText || pathResponse.statusText}`);
      }
      
      const pathData: DronePathResponse = await pathResponse.json();
      console.log('Drone path response:', pathData);
      
      if (!pathData.points_visited || !Array.isArray(pathData.points_visited) || pathData.points_visited.length === 0) {
        throw new Error('Invalid drone path response: missing or empty points_visited array');
      }
      
      // Create a new event from the target
      const newEvent: Event = {
        lat: target.lat,
        lng: target.lng,
        timestamp: Date.now(),
        status: 'pending',
        respondingDroneId: droneToUse + 1 // 1-based ID
      };
      
      setEvents(prev => [...prev, newEvent]);
      
      // Add target marker to map
      if (mapRef.current) {
        const el = document.createElement('div');
        el.className = 'event-marker';
        el.innerHTML = `🎯`;
        
        const marker = new mapboxgl.Marker(el)
          .setLngLat([target.lng, target.lat])
          .addTo(mapRef.current);
          
        setTargetMarkers(prev => [...prev, marker]);
      }
      
      // Add destination marker (final point in the path)
      if (mapRef.current) {
        // Remove previous path marker if exists
        if (currentPathMarker) {
          currentPathMarker.remove();
        }
        
        const finalPoint = pathData.points_visited[pathData.points_visited.length - 1];
        const el = document.createElement('div');
        el.className = 'destination-marker';
        el.innerHTML = '🟢';
        
        const marker = new mapboxgl.Marker(el)
          .setLngLat([finalPoint.longitude, finalPoint.latitude])
          .addTo(mapRef.current);
          
        setCurrentPathMarker(marker);
      }
      
      // Convert the path to the format expected by animateDrone
      const dronePath: [number, number][] = pathData.points_visited.map(point => 
        [point.longitude, point.latitude]
      );
      
      // Log which drone is responding
      console.log(`Drone ${droneToUse} (ID: ${drones[droneToUse]?.id}) is responding to target ${target.id}`);
      
      // Update drone status and path
      setDrones(prev => prev.map(d => 
        d.id === droneToUse
          ? { ...d, status: 'responding', path: dronePath }
          : d
      ));
      
      // Animate drone along path
      await animateDroneWithPromise(droneToUse, dronePath);
      
      // Move to the next target
      setCurrentTargetIndex(prev => prev + 1);
      
    } catch (err) {
      console.error('Error processing target:', err);
      setApiStatus(`Error: ${err instanceof Error ? err.message : 'Failed to process target'}`);
      
      // Move to the next target despite the error
      setCurrentTargetIndex(prev => prev + 1);
    } finally {
      setIsProcessingTarget(false);
    }
  };

  // Animate drone along path and return a promise that resolves when animation is complete
  const animateDroneWithPromise = (droneId: number, path: [number, number][]): Promise<void> => {
    return new Promise((resolve) => {
      // Convert to 1-based ID for consistency with our drone data structure
      const droneOneBasedId = droneId;
      
      // Find the drone by its 1-based ID
      const droneIndex = drones.findIndex(d => d.id === droneOneBasedId);
      if (droneIndex === -1) {
        console.error(`No drone data found for ID ${droneOneBasedId}`);
        resolve();
        return;
      }
      
      // Ensure marker index is valid
      if (droneIndex < 0 || droneIndex >= markersRef.current.length) {
        console.error(`Invalid drone index ${droneIndex}. We only have ${markersRef.current.length} drone markers (indices 0-${markersRef.current.length-1})`);
        resolve();
        return;
      }
      
      const marker = markersRef.current[droneIndex];
      if (!marker) {
        console.error(`No marker found for drone index ${droneIndex}`);
        resolve();
        return;
      }
      
      const drone = drones[droneIndex];
      console.log(`Animating drone ${droneOneBasedId} (partition ${drone.partitionId}) using marker at index ${droneIndex}`);
      
      // Convert path to mapbox format
      const mapboxPath = path.map(point => ({ lng: point[0], lat: point[1] }));
      
      // Function to move drone marker along path
      let i = 0;
      // Slow down animation by increasing the interval time
      const interval = setInterval(() => {
        // Update drone position
        if (i < mapboxPath.length) {
          marker.setLngLat([mapboxPath[i].lng, mapboxPath[i].lat]);
          i++;
        }
        
        // Check if we've reached the end of the path
        if (i >= mapboxPath.length) {
          clearInterval(interval);
          
          // Ensure the drone is exactly at the final position
          if (mapboxPath.length > 0) {
            const finalPosition = mapboxPath[mapboxPath.length - 1];
            marker.setLngLat([finalPosition.lng, finalPosition.lat]);
          }
          
          // Update drone status to idle when it reaches the destination
          setDrones(prev => prev.map(d => 
            d.id === droneOneBasedId
              ? { ...d, status: 'idle', path: undefined }
              : d
          ));
          
          // Update event status
          setEvents(prev => prev.map(e => 
            e.respondingDroneId === droneOneBasedId
              ? { ...e, status: 'resolved' }
              : e
          ));
          
          setApiStatus(`Drone ${droneOneBasedId} reached the target`);
          resolve(); // Resolve the promise when animation is complete
        }
      }, 1000); // Animation speed
    });
  };

  // Initialize the map
  useEffect(() => {
    if (!planData || !mapContainerRef.current || mapRef.current) return;

    console.log('Initializing map with planData:', planData);
    
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';
    
    // Get map position from planData
    const { lng, lat, zoom } = planData.mapPosition;
    
    console.log('Map position:', { lng, lat, zoom });
    
    // Initialize map
    try {
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [lng, lat],
        zoom: zoom
      });

      // Add map controls
      mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      
      // Log when map is loaded
      mapRef.current.on('load', () => {
        console.log('Map loaded successfully');
        setApiStatus('Map loaded successfully. Please generate partitions.');
        
        // If we have a selectedMapId, fetch no-fly zones once map is loaded
        if (selectedMapId) {
          console.log('Fetching no-fly zones for map ID:', selectedMapId);
          fetchNoFlyZones(selectedMapId);
        }
      });

      // Log any map errors
      mapRef.current.on('error', (e) => {
        console.error('Map error:', e);
        setApiStatus('Error loading map. Please refresh the page.');
      });
    } catch (error) {
      console.error('Error initializing map:', error);
      setApiStatus('Error initializing map. Please refresh the page.');
    }
    
    // Clean up map on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [planData]);

  // Load no-fly zones when map and selectedMapId are ready
  useEffect(() => {
    if (!mapRef.current || !selectedMapId) {
      console.log('Map or selectedMapId not ready yet:', { 
        mapReady: !!mapRef.current, 
        selectedMapId 
      });
      return;
    }
    
    // Only fetch no-fly zones if the map is fully loaded
    if (mapRef.current.loaded()) {
      console.log('Map loaded and selectedMapId ready, fetching no-fly zones');
      fetchNoFlyZones(selectedMapId);
    } else {
      console.log('Map not fully loaded yet, waiting for load event');
      // The map's load event will trigger the fetchNoFlyZones
    }
  }, [selectedMapId, mapRef.current]);

  // Function to fetch no-fly zones from API
  const fetchNoFlyZones = async (mapId: number) => {
    try {
      setApiStatus('Fetching no-fly zones...');
      const response = await fetch(`${BASE_API_URL}/no_flies_on_map/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ map_id: mapId }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch no-fly zones (${response.status}): ${errorText || response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.no_fly_zones || !Array.isArray(data.no_fly_zones)) {
        console.warn('No no-fly zones found in API response:', data);
        setApiStatus('No no-fly zones found for this map');
        return;
      }
      
      setNoFlyZones(data.no_fly_zones);
      
      // Add no-fly zones to map
      addNoFlyZonesToMap(data.no_fly_zones);
      setApiStatus(`Loaded ${data.no_fly_zones.length} no-fly zones successfully`);
    } catch (err) {
      console.error('Error fetching no-fly zones:', err);
      setApiStatus(`Error: ${err instanceof Error ? err.message : 'Failed to fetch no-fly zones'}`);
    }
  };

  // Function to add no-fly zones to map
  const addNoFlyZonesToMap = (zones: NoFlyZone[]) => {
    if (!mapRef.current) return;
    
    // Remove existing no-fly layers if they exist
    if (mapRef.current.getLayer('no-fly-zones-fill')) {
      mapRef.current.removeLayer('no-fly-zones-fill');
    }
    if (mapRef.current.getLayer('no-fly-zones-outline')) {
      mapRef.current.removeLayer('no-fly-zones-outline');
    }
    if (mapRef.current.getSource('no-fly-zones')) {
      mapRef.current.removeSource('no-fly-zones');
    }

    // Create GeoJSON data for the polygons
    const geojsonData = {
      type: 'FeatureCollection',
      features: zones.map(zone => {
        // Convert points to coordinate arrays [longitude, latitude]
        const coordinates = zone.points.map((point) => [
          parseFloat(point.longitude),
          parseFloat(point.latitude)
        ]);

        // Ensure polygon is closed
        if (coordinates.length > 0 &&
            (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
             coordinates[0][1] !== coordinates[coordinates.length - 1][1])) {
          coordinates.push(coordinates[0]);
        }

        return {
          type: 'Feature',
          properties: {
            id: zone.id,
            map: zone.map,
            zone_type: zone.zone_type || 'unknown'
          },
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates]
          }
        };
      })
    };

    try {
      // Add source and layers for no-fly zones
      mapRef.current.addSource('no-fly-zones', {
        type: 'geojson',
        data: geojsonData as any
      });

      // Add fill layer
      mapRef.current.addLayer({
        id: 'no-fly-zones-fill',
        type: 'fill',
        source: 'no-fly-zones',
        paint: {
          'fill-color': '#ff0000',
          'fill-opacity': 0.1
        }
      });

      // Add outline layer
      mapRef.current.addLayer({
        id: 'no-fly-zones-outline',
        type: 'line',
        source: 'no-fly-zones',
        paint: {
          'line-color': '#ff0000',
          'line-width': 2
        }
      });

      console.log('No-fly zones added to map successfully');
    } catch (error) {
      console.error('Error adding no-fly zones to map:', error);
      setApiStatus('Error adding no-fly zones to map. Try refreshing the page.');
    }
  };

  // Function to fetch partitions based on selected partition type
  const fetchPartitions = async () => {
    if (!selectedMapId) {
      setApiStatus('No map selected. Please return to the planning page.');
      return;
    }
    
    setIsPartitionLoading(true);
    setApiStatus(`Generating ${PARTITION_TYPES[partitionType].name}...`);
    
    try {
      console.log(`Fetching partitions for map ID ${selectedMapId} with partition type ${partitionType}`);
      
      const endpoint = PARTITION_TYPES[partitionType].endpoint;
      const numDrones = parseInt(planData?.droneCount || '2', 10);
      const payload = { 
        map_id: selectedMapId,
        num_drones: numDrones
      };
      
      console.log(`API call: ${endpoint} (POST) ->`, JSON.stringify(payload, null, 2));
      
      const response = await fetch(`${BASE_API_URL}/${endpoint}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch partitions (${response.status}): ${errorText || response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`API response from ${endpoint}:`, JSON.stringify(data, null, 2));
      
      // Extract partitions based on partition type
      let extractedPartitions: Partition[] = [];
      if (partitionType === 0 && data.partitions&& Array.isArray(data.partitions)) {
        extractedPartitions = data.partitions;
      } else if (partitionType === 1 && data.partitions && Array.isArray(data.partitions)) {
        extractedPartitions = data.partitions;
      } else if (partitionType === 2 && data.partitions && Array.isArray(data.partitions)) {
        extractedPartitions = data.partitions;
      } else if (data.partitions && Array.isArray(data.partitions)) {
        // Fallback if the specific partition type isn't found
        extractedPartitions = data.partitions;
      } else {
        console.warn('No partitions found in API response:', data);
        setApiStatus(`No ${PARTITION_TYPES[partitionType].name} partitions found. The API may not have generated partitions for this map.`);
        setIsPartitionLoading(false);
        return;
      }
      
      if (extractedPartitions.length === 0) {
        setApiStatus(`No partitions were returned. Try a different partition type.`);
        setIsPartitionLoading(false);
        return;
      }
      
      console.log(`Found ${extractedPartitions.length} partitions of type ${partitionType}`);
      setPartitions(extractedPartitions);
      
      // Add partitions to map
      addPartitionsToMap(extractedPartitions);
      
      // Initialize drones based on partitions
      initializeDrones(extractedPartitions);
      
      setApiStatus(`${PARTITION_TYPES[partitionType].name} generated successfully with ${extractedPartitions.length} partitions`);
    } catch (err) {
      console.error('Error fetching partitions:', err);
      setApiStatus(`Error: ${err instanceof Error ? err.message : 'Failed to fetch partitions'}`);
    } finally {
      setIsPartitionLoading(false);
    }
  };

  // Function to add partitions to map
  const addPartitionsToMap = (partitions: Partition[]) => {
    if (!mapRef.current) return;
    
    // Remove existing partition layers if they exist
    if (mapRef.current.getLayer('partitions-fill')) {
      mapRef.current.removeLayer('partitions-fill');
    }
    if (mapRef.current.getLayer('partitions-outline')) {
      mapRef.current.removeLayer('partitions-outline');
    }
    if (mapRef.current.getSource('partitions')) {
      mapRef.current.removeSource('partitions');
    }

    // Create GeoJSON data for the partitions
    const geojsonData = {
      type: 'FeatureCollection',
      features: partitions.map((partition, index) => {
        // Convert points to coordinate arrays [longitude, latitude]
        const coordinates = partition.points.map(point => [
          point.longitude,
          point.latitude
        ]);

        // Ensure polygon is closed
        if (coordinates.length > 0 &&
            (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
             coordinates[0][1] !== coordinates[coordinates.length - 1][1])) {
          coordinates.push(coordinates[0]);
        }

        return {
          type: 'Feature',
          properties: {
            id: partition.id,
            partitionId: index,
            map: partition.map,
            partition_type: partition.partition_type
          },
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates]
          }
        };
      })
    };

    // Add source and layers for partitions
    mapRef.current.addSource('partitions', {
      type: 'geojson',
      data: geojsonData as any
    });

    // Add fill layer with random colors
    mapRef.current.addLayer({
      id: 'partitions-fill',
      type: 'fill',
      source: 'partitions',
      paint: {
        'fill-color': [
          'case',
          ['==', ['get', 'partitionId'], ['%', ['id'], partitions.length]],
          'rgba(255, 255, 255, 0.1)',
          'rgba(0, 255, 0, 0.1)'
        ],
        'fill-opacity': 0.3
      }
    });

    // Add outline layer
    mapRef.current.addLayer({
      id: 'partitions-outline',
      type: 'line',
      source: 'partitions',
      paint: {
        'line-color': '#0000ff',
        'line-width': 2,
        'line-dasharray': [3, 3]
      }
    });
  };

  // Initialize drones based on partitions
  const initializeDrones = (partitions: Partition[]) => {
    // Clear existing drone markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    
    // Create drones based on partition data
    const newDrones: Drone[] = [];
    
    // Use the first points from each partition for drone placement
    partitions.forEach((partition, index) => {
      // Check if partition has a drone property with coordinates
      if (partition.drone) {
        const position = {
          lat: partition.drone.latitude,
          lng: partition.drone.longitude
        };
        
        // Create the drone with 1-based ID
        const drone: Drone = {
          id: index + 1, // 1-based ID
          location: position,
          status: 'idle',
          partitionId: index
        };
        
        newDrones.push(drone);
        
        // Add drone marker to map
        if (mapRef.current) {
          const el = document.createElement('div');
          el.className = 'drone-marker';
          el.innerHTML = `<div class="drone-icon">🚁</div><div class="drone-label">Drone ${index + 1}</div>`;
          
          const marker = new mapboxgl.Marker(el)
            .setLngLat([position.lng, position.lat])
            .addTo(mapRef.current);
            
          markersRef.current.push(marker);
        }
      } else {
        // Fallback to the first point of the partition if no drone property
        if (partition.points && partition.points.length > 0) {
          const firstPoint = partition.points[0];
          const position = {
            lat: firstPoint.latitude,
            lng: firstPoint.longitude
          };
          
          // Create the drone with 1-based ID
          const drone: Drone = {
            id: index + 1, // 1-based ID
            location: position,
            status: 'idle',
            partitionId: index
          };
          
          newDrones.push(drone);
          
          // Add drone marker to map
          if (mapRef.current) {
            const el = document.createElement('div');
            el.className = 'drone-marker';
            el.innerHTML = `<div class="drone-icon">🚁</div><div class="drone-label">Drone ${index + 1}</div>`;
            
            const marker = new mapboxgl.Marker(el)
              .setLngLat([position.lng, position.lat])
              .addTo(mapRef.current);
              
            markersRef.current.push(marker);
          }
        }
      }
    });
    
    setDrones(newDrones);
    console.log(`Initialized ${newDrones.length} drones with IDs: ${newDrones.map(d => d.id).join(', ')}`);
  };

  // Calculate centroid of a polygon
  const calculateCentroid = (points: {latitude: number, longitude: number}[]) => {
    let sumLat = 0;
    let sumLng = 0;
    
    points.forEach(point => {
      sumLat += point.latitude;
      sumLng += point.longitude;
    });
    
    return {
      lat: sumLat / points.length,
      lng: sumLng / points.length
    };
  };

  // Start simulation
  const startSimulation = () => {
    if (!selectedMapId || partitions.length === 0) {
      setApiStatus('Please generate partitions first');
      return;
    }
    
    if (targets.length === 0) {
      setApiStatus('No targets loaded. Please upload a targets file.');
      return;
    }
    
    // Clear previous target markers
    targetMarkers.forEach(marker => marker.remove());
    setTargetMarkers([]);
    
    // Reset target processing state
    setCurrentTargetIndex(-1);
    
    setIsSimulationRunning(true);
    setApiStatus('Simulation started. Processing targets from file.');
  };

  // Stop simulation
  const stopSimulation = () => {
    setIsSimulationRunning(false);
    setApiStatus('Simulation stopped');
  };

  // Handle file upload popup close
  const handleFileUploadPopupClose = (file?: File) => {
    if (file) {
      setTargetFile(file);
      // We'll parse the file in the useEffect hook
      setApiStatus('Target file uploaded: ' + file.name);
    } else {
      // User canceled, but we still need to close the popup
      console.log('File upload canceled');
      setApiStatus('Target file upload canceled');
    }
    setShowFileUploadPopup(false);
  };

  // Render loading/error states or map
  if (isLoading) {
    return <div className="loading">Loading operation data...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="operate-container">      
      <div className="operate-main">
        <div className="map-container" ref={mapContainerRef} />
        
        <div className="control-panel">
          <div className="panel-section">
            <h3>Partitioning</h3>
            <div className="partition-controls">
              <select 
                value={partitionType}
                onChange={(e) => setPartitionType(parseInt(e.target.value, 10))}
                disabled={isPartitionLoading || isSimulationRunning}
              >
                {PARTITION_TYPES.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
              
              <button 
                onClick={fetchPartitions}
                disabled={isPartitionLoading || isSimulationRunning || !selectedMapId || !targetFile}
                className="btn primary"
              >
                {isPartitionLoading ? 'Generating...' : 'Generate Partitions'}
              </button>
            </div>
          </div>
          
          <div className="panel-section">
            <h3>Simulation</h3>
            <div className="simulation-controls">
              <button
                onClick={isSimulationRunning ? stopSimulation : startSimulation}
                disabled={partitions.length === 0 || !targetFile}
                className={`btn ${isSimulationRunning ? 'danger' : 'success'}`}
              >
                {isSimulationRunning ? 'Stop Simulation' : 'Start Simulation'}
              </button>
              
              {isSimulationRunning && (
                <p className="click-instruction">Processing targets from file...</p>
              )}
            </div>
          </div>
          
          <div className="panel-section">
            <h3>Status</h3>
            <div className="status-display">
              <p className="api-status">{apiStatus}</p>
              
              <div className="drone-status">
                <h4>Drones</h4>
                <ul>
                  {drones.map(drone => (
                    <li key={drone.id} className={`drone-status-item ${drone.status}`}>
                      Drone {drone.id}: {drone.status.charAt(0).toUpperCase() + drone.status.slice(1)}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="no-fly-zones-status">
                <h4>No-Fly Zones</h4>
                {noFlyZones.length === 0 ? (
                  <p>No no-fly zones loaded</p>
                ) : (
                  <p>{noFlyZones.length} no-fly zones loaded</p>
                )}
              </div>
              
              <div className="event-status">
                <h4>Events</h4>
                {events.length === 0 ? (
                  <p>No events recorded</p>
                ) : (
                  <ul>
                    {events.slice(-5).map((event, index) => (
                      <li key={index} className={`event-status-item ${event.status}`}>
                        Event at [{event.lng.toFixed(4)}, {event.lat.toFixed(4)}]: {event.status}
                        {event.respondingDroneId !== undefined && ` (Drone ${event.respondingDroneId})`}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              {targetFile && (
                <div className="target-file-status">
                  <h4>Target File</h4>
                  <p>{targetFile.name}</p>
                  <p>Targets: {targets.length}</p>
                  {currentTargetIndex >= 0 && (
                    <p>Progress: {currentTargetIndex} / {targets.length}</p>
                  )}
                  <button 
                    className="btn secondary"
                    onClick={() => setShowFileUploadPopup(true)}
                    disabled={isSimulationRunning}
                  >
                    Change Target File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* File Upload Popup */}
      <FileUploadPopup 
        isOpen={showFileUploadPopup} 
        onClose={handleFileUploadPopupClose} 
      />
    </div>
  );
};

export default Operate;