FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY apps/api/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/api /app/apps/api
COPY data /app/data

EXPOSE 8001

CMD ["uvicorn", "apps.api.app.main:app", "--host", "0.0.0.0", "--port", "8001"]
