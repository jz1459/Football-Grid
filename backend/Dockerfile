FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code
COPY . .

ENV FLASK_APP=app.py

EXPOSE 5000

# Create tables then start Flask (inline to avoid entrypoint script line-ending issues)
CMD ["sh", "-c", "python -c \"from app import app, db; app.app_context().push(); db.create_all()\" && exec flask run --host=0.0.0.0 --port=5000"]
