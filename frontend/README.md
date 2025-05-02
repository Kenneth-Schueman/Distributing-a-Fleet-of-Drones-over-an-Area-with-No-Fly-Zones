# Drone Control System - Frontend

## Overview
This is a React TypeScript application for planning and operating drone missions. The system allows users to define no-fly zones, plan drone operations, and simulate drone responses to events using various partition algorithms.

## System Requirements
- Node.js (v16+)
- npm or yarn
- Modern web browser with JavaScript enabled
- Backend server running on http://127.0.0.1:8000

## Setup and Installation
1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the root directory with your Mapbox token:
   ```
   VITE_MAPBOX_TOKEN=your_mapbox_token_here
   ```

3. Start the development server:
   ```
   npm run dev
   ```

## Application Structure

### Main Pages

#### 1. Plan Page (`/plan`)
The Plan page is used to set up drone operations by:
- Selecting the number of drones (2^x drones)
- Choosing a no-fly zone option (FAA zones or generated zones)
- Viewing and interacting with the map
- Setting parameters for generated no-fly zones (optional)

**Features:**
- Interactive Mapbox map for visualizing no-fly zones
- Options to generate synthetic no-fly zones with customizable parameters
- Ability to refresh and update no-fly zone data
- Stores planning data in localStorage for use in the Operate page

#### 2. Operate Page (`/operate`)
The Operate page is used to run simulations with the planned configuration:
- Visualizes the no-fly zones from the Plan page
- Generates partitions using different algorithms
- Simulates drone responses to events
- Tracks drone status and event history

**Features:**
- Three partition algorithms:
  - Regular Decomposition
  - Half Perimeter KD Decomposition
  - Native KD Decomposition
- Upload targets file (JSON format) for simulation
- Visualize drone movements and responses to events
- Real-time status updates for drones and events

### Data Flow
1. User configures parameters in the Plan page
2. Data is stored in localStorage
3. User navigates to the Operate page
4. Operate page loads the stored plan data
5. User uploads a targets file and generates partitions
6. User runs the simulation to see drones respond to events

## User Guide

### Planning a Mission
1. Navigate to the Plan page
2. Enter the number of drones (2-5, which will be 2^x drones)
3. Select a no-fly zone option:
   - FAA - Iowa: Pre-defined no-fly zones in Iowa
   - Generated: Randomly generated no-fly zones
   - Generated (Clustered): Clustered random no-fly zones
   - Other FAA options: Various pre-defined no-fly zones
4. For generated zones, you can optionally set:
   - Seed: For reproducible random generation
   - Coverage: Percentage of area covered by no-fly zones
   - Size Variation: Variation in the size of no-fly zones
5. The map will display the selected no-fly zones
6. Click "Continue to Operation" to proceed

### Operating Drones
1. Navigate to the Operate page (automatically after planning)
2. Upload a targets file (JSON format with target coordinates)
3. Select a partition algorithm:
   - Regular Decomposition
   - Half Perimeter KD Decomposition
   - Native KD Decomposition
4. Click "Generate Partitions" to create drone operation areas
5. Click "Start Simulation" to begin the drone simulation
6. Watch as drones respond to targets from the file
7. View real-time status updates in the control panel

### Target File Format
The target file should be a JSON file with the following structure:
```json
{
  "targets": [
    {
      "id": 1,
      "lat": 42.0308,
      "lng": -93.6319
    },
    {
      "id": 2,
      "lat": 42.0254,
      "lng": -93.6465
    }
  ]
}
```

## Troubleshooting
- If the "Generate Partitions" button is disabled, ensure:
  - You have completed the planning step
  - You have uploaded a targets file
  - The map has fully loaded
- If no-fly zones don't appear, try refreshing the zones in the Plan page
- If drones don't respond to events, check the API status in the control panel

## Development
- Built with React, TypeScript, and Vite
- Uses Mapbox GL for map visualization
- Communicates with a Django backend API
