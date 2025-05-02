import { useState } from 'react';
import './input.css';
import { useNavigate } from 'react-router-dom';

function Input() {
  const navigate = useNavigate();

  const [noFlyZones, setNoFlyZones] = useState(['']);
  const [drones, setDrones] = useState('');

  const handleAddNoFlyZone = () => {
    setNoFlyZones([...noFlyZones, '']);
  };

  const handleCoordinateChange = (zoneIndex: number, value: string) => {
    const updatedZones = [...noFlyZones];
    updatedZones[zoneIndex] = value;
    setNoFlyZones(updatedZones);
  };

  const handleCreateNewInstance = () => {
    console.log("Create New Instance");
    navigate('/');
  };

  return (
    <div className="container">
      {/* Heading Section */}
      <div className="heading-section">
        <h2>Create New Instance</h2>
        <p>Please enter input values for the map, no-fly zones, and number of drones.</p>
      </div>

      {/* Map Section */}
      <div className="map-section">
        <div><h3>Map</h3></div>
        <div className="dimensions-section">
          <input type="text" placeholder="Coordinate" />
          <input type="text" placeholder="Length" />
          <input type="text" placeholder="Width" />
        </div>
      </div>

      {/* No-Fly Zones Section */}
      <div className="no-fly-section">
        <h3>No-Fly Zones</h3>
        <div className="no-fly-coordinates">
          {noFlyZones.map((zone, index) => (
            <input
              key={index}
              type="text"
              onChange={(e) => handleCoordinateChange(index, e.target.value)}
              placeholder={'No-Fly Zone'}
              value={zone}
            />
          ))}
          <button onClick={handleAddNoFlyZone}>+ No-Fly Zone</button>
        </div>
      </div>

      {/* Number of Drones Section */}
      <div className="drones-section">
        <h3>Number of Drones</h3>
        <div className="drones-section-grid">
          <input
            type="number"
            value={drones}
            onChange={(e) => setDrones(e.target.value)}
            placeholder="Enter number of drones"
          />
        </div>
      </div>

      <div className="button-section">
        <div>
          <button onClick={handleCreateNewInstance}>+ New Instance</button>
        </div>
      </div>

    </div>
  );
}

export default Input;
