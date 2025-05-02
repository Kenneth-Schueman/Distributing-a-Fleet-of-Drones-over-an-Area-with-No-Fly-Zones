# API Calls (all localhost for now)
```
127.0.0.1:8000/db/   # Currently websocket room connector

127.0.0.1:8000/db/<str:room_name>/ # Algorithm dump room for when api calls run

127.0.0.1:8000/dbrqs/generate_synthetic_noflies/ # Generates map with synthetic no fly zones (POST)

127.0.0.1:8000/dbrqs/generate_synthetic_noflies_clustering/ # Same as above, but with clustering of no fly zones (POST)

127.0.0.1:8000/dbrqs/iowa/ # Generates map of no fly zones in iowa (POST !!RUN ONLY ONCE!!)

127.0.0.1:8000/dbrqs/find_map_details/ # Gives details of a map (map data, no flies, partitions), need to give json of map_id, partition_type, num_drones (0 regular decomposition, 1 half perimeter kd decomposition, 2 native kd decomposition) (POST)

127.0.0.1:8000/dbrqs/map_details_no_partitions/ # Gives map details, allows for no partitions (POST)

127.0.0.1:8000/dbrqs/no_flies_on_map/ # Gives no fly zones of a map, need to give json of map_id (GET)

127.0.0.1:8000/dbrqs/partition_no_kd/ # Gives the partitions if you don't use a kd tree, super slow, need to give json of map_id, num_drones (POST)

127.0.0.1:8000/dbrqs/partition_kd_half/ # Gives partitions of a map based on half perimeters of no-fly zones with a kd tree, need to give json of map_id, num_drones (POST)

127.0.0.1:8000/dbrqs/partition_kd_native/ # Gives partitions of a map based on native kd generation, need to give json of map_id, num_drones (POST)

127.0.0.1:8000/dbrqs/respond_to_event/ # Given a valid event within partitions, routes the corresponding drone to the event. Requires parameters: map_id, partition_type, num_drones, event_long, event_lat (POST)

127.0.0.1:8000/dbrqs/get_drone_number/ # Meant to be used in cohesion with the respond_to_event to determine if a drone is moving on the frontend. Requires parameters: map_id, partition_type, num_drones, event_long, event_lat (POST)

127.0.0.1:8000/dbrqs/load_faa/ # Loads all FAA data (Post)
    MAP ID 1 = Iowa specific no fly zones
    MAP ID 2 = FAA recognized ID areas
    MAP ID 3 = FAA UAS Facililty Map
    MAP ID 4 = Iowa Boundary
    MAP ID 5 = National Security UAS Flight Zones
    MAP ID 6 = Part time National Security Flight zones
    MAP ID 7 = Prohibited Areas
    MAP ID 8 = Recreational Flyer Sites
```
# JSON send examples
```
{
    "map_id": (int id here, should be returned from any generation. Will have our data sets preloaded and to be given here: )
    "partition_type": (char type here, just an int of 0, 1, 2 for storage sake)
}
```

# Dockerized Version (WORKS BEST)
- You will need an env file in backend/dronecontrol and backend/dronecontrol/dronecontrol. 
- It will be the same file found here [env-file](https://drive.google.com/drive/u/2/folders/1anXl2_ohDmIr829HUEVQrobxA3JQmhjj)
``` To run the docker
docker compose run django-web python manage.py migrate //for first time running
docker compose run django-web python manage.py test //runs tests
docker compose up --build //to run whenever
```

# Python (Django + PostgreSQL + PostGIS)
- [Installation-Guide](https://stackpython.medium.com/how-to-start-django-project-with-a-database-postgresql-aaa1d74659d8)

## Set up commands (DO INSIDE OF backend -> dronecontrol)

```commands (Windows)
python -m venv env
env/scripts/activate //activates the environment
pip install -r requrements.txt //gets all installs in your environmen. ~From backend dir
pip freeze //checks versions to ensure you have what you need
python manage.py runserver //hosts the backend
```
- If using MacOS:
```commands (MacOS)
python3 -m venv env           
source env/bin/activate   
brew install postgresql
brew link postgresql
export PATH="/opt/homebrew/opt/postgresql/bin:$PATH"  # Adjust if using Intel Mac: /usr/local/opt/postgresql/bin
pip install -r requirements.txt 
pip freeze                       
python3 manage.py runserver      
```

# Install PostgreSQl if not done already

- [PostgreSQL](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads) and select the operating system that you are utilizing. 
- We are currently utilizing version 17.2
- Allow all parts to be installed
- Utilize port 5432
- Locale: English, United States
- ***Todo: Figure out PostGIS***

# Setup DB
- Go to dronecontrol -> dronecontrol -> settings.py and look at line 76

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': 'your_db_name',
        'USER': 'your_user',
        'PASSWORD': 'your_db_password',
        'HOST': 'your_host'
        'PORT': 'your_port',
    }
}
```
- To keep this secure we do:
```cmd
pip install django-environ
```
- This allows for you to store your env variables in a .env file
- Create under dronecontrol -> dronecontrol ->.env and create environment variables for your SECRET_KEY (line 27 in settings.py), and all database variables.

```variables
//Change the values to whatever you have
SECRET_KEY=key
DB_NAME=database_name
DB_USER=database_user
DB_PASSWORD=database_password
DB_HOST=database_host
DB_PORT=database_port
```
- The actual key values are in the google drive under Backend -> keys
- In each spot in the settings.py file replace the values with env("ENV_VAR"); the '' is not needed

# Create and use tables
- First off we need another module
```command
pip install psycopg2
```
- Go to dronecontrol -> db -> models.py
- In here you can add code like:

```python
class Teacher(models.Model):
    name = models.CharField(max_length=80)
    age = models.IntegerField()
```
- This will automatically be translated to SQL code

Now we need to update database models
- This will need to be done every time we make new tables

```commands
python manage.py makemigrations # Stages migrations
python manage.py migrate        # Sets migrations
python manage.py flush          # Wipes database (DO NOT DO IN PROD)
```

- If you receive a "No changes detected" on the makemigrations, you may just be forgetting to add the database in settings.py.

```python
INSTALLED_APPS = [
    "add_database_here",
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]
```

- If it doesn't display in pgAdmin4 right away just reboot it, sometimes it doesn't push through properly

# Download and utilize Docker for REDIS
- We need to utilize this server to store key pairs between the user and the backend for websocket communication.

- If you don't have docker: [Docker Desktop](https://www.docker.com/products/docker-desktop/)

- Following that installation, you will need to run the following to launch a REDIS container:

```cmd
docker run --rm -p 6379:6379 redis:7
```
# Testing
- To run tests, cd into ./backend/dronecontrol.

- Make sure the environment is created in this directory and activated and requirements are installed.
```
python install -r requirements.txt

python manage.py test                         # runs all tests

python manage.py test db.tests.(nameoftest)   # runs individual test from class name
```
