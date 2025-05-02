FROM python:3.11-slim AS base

RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /senior_design

RUN pip install --upgrade pip

COPY requirements.txt /senior_design/

RUN pip install --no-cache-dir -r requirements.txt

COPY . /senior_design/

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

