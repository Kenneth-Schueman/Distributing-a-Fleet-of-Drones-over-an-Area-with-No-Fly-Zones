# sdmay25-21: Distributing a Fleet of Drones Over an Area with No-Fly Zones
*This project was migrated from GitLab*

## Teams

* **Frontend:** Kenneth Schueman, Melani Hodge, Samuel Russett
* **Backend:** Nicholas Kokott, Everett Duffy, Cole Stuedeman

## Overview

This project involves the planning and operation of drone fleets in areas with no-fly zones, using partitioning algorithms to optimize drone responses to real-time events. It is built with a React TypeScript frontend and a Django backend, utilizing PostgreSQL for data storage.

## Setup

Both the frontend and backend have their own separate setup guides:

* **Frontend Setup**: [Frontend README](https://github.com/Kenneth-Schueman/Distributing-a-Fleet-of-Drones-over-an-Area-with-No-Fly-Zones/blob/main/frontend/README.md)
* **Backend Setup**: [Backend README](https://github.com/Kenneth-Schueman/Distributing-a-Fleet-of-Drones-over-an-Area-with-No-Fly-Zones/blob/main/backend/README.md)
* **Design Document**: [Final Design Document](https://sdmay25-21.sd.ece.iastate.edu/4920%20Deliverables/Final%20Design%20Document.pdf)

## Data Sources

* [FAA Dataset on No-Fly Zones](https://udds-faa.opendata.arcgis.com/search?collection=Dataset)
* [No-Fly Zones Resource](https://catalog.data.gov/dataset/no-fly-zones/resource/18723eae-7c56-4102-9a01-deb5eb7031fd)
* [ICAO NOTAM Data](https://www.icao.int/safety/iStars/Pages/Get-NOTAM-Data.aspx)

## Exploring Data

Visualize drone no-fly zones in the U.S. with [MapScaping](https://mapscaping.com/map-of-drone-fly-zones-in-the-us/).

---

## Frontend: Drone Control System - React TypeScript Application

### Overview

This React TypeScript application allows users to plan and simulate drone operations by defining no-fly zones and applying partitioning algorithms to optimize drone responses to real-time events.

### System Requirements

* **Node.js (v16+)**
* **npm or yarn**
* **Modern web browser**
* **Backend server running at** `http://127.0.0.1:8000`

### Installation

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up environment:**

   * Create a `.env` file in the root directory and add your **Mapbox token**:

     ```bash
     VITE_MAPBOX_TOKEN=your_mapbox_token_here
     ```

3. **Start development server:**

   ```bash
   npm run dev
   ```

---

### Application Structure

#### Main Pages

1. **Plan Page (`/plan`)**

   * Set up drone operations (select drones, choose no-fly zones).
   * Features:

     * Interactive map (Mapbox) for visualizing no-fly zones.
     * Options to generate synthetic no-fly zones.
     * Data is stored in `localStorage` for use on the Operate page.

2. **Operate Page (`/operate`)**

   * Run simulations based on the planned configuration.
   * Features:

     * Visualization of no-fly zones.
     * Three partition algorithms: Regular Decomposition, Half Perimeter KD Decomposition, and Native KD Decomposition.
     * Real-time updates of drone status.

### Data Flow

1. Configure parameters on the Plan page.
2. Store planning data in `localStorage`.
3. Navigate to the Operate page to run the simulation with uploaded targets.

---

## Backend: Drone Control API (Django)

### API Endpoints

* **WebSocket Room Connector**: `127.0.0.1:8000/db/`
* **Synthetic No-Fly Zones Generation**: `127.0.0.1:8000/dbrqs/generate_synthetic_noflies/`
* **No-Fly Zones in Iowa**: `127.0.0.1:8000/dbrqs/iowa/`
* **Partitioning Algorithms**: Multiple POST endpoints for different partitioning methods.

### Docker Setup

To run the backend in a Docker container:

```bash
docker compose up --build     # Initial build
docker compose run django-web python manage.py migrate  # First-time migration
docker compose run django-web python manage.py test    # Run tests
docker compose up --build     # Run the application
```

---

### Python (Django + PostgreSQL + PostGIS)

#### Local Development Setup (Windows/MacOS)

1. **Windows**:

   ```bash
   python -m venv env
   env\Scripts\activate
   pip install -r requirements.txt
   python manage.py runserver
   ```

2. **MacOS**:

   ```bash
   python3 -m venv env
   source env/bin/activate
   brew install postgresql
   pip install -r requirements.txt
   python3 manage.py runserver
   ```

---

### Database Setup

1. Update database settings in `settings.py`.
2. Use environment variables with `django-environ` for secure handling of sensitive information like database credentials.

---

## Development and Testing

### Running Tests

To run tests:

```bash
python manage.py test
```

For specific test classes:

```bash
python manage.py test db.tests.(test_name)
```

---

## Troubleshooting

* **Generate Partitions Button Disabled**: Ensure the planning step is completed and a targets file is uploaded.
* **No-Fly Zones Not Appearing**: Refresh the no-fly zone data on the Plan page.
* **Drone Simulation Not Running**: Check API status in the control panel.

---
