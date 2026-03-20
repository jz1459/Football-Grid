#!/bin/sh
set -e
# Create tables if they don't exist (safe when using flask run instead of python app.py)
python -c "
from app import app, db
with app.app_context():
    db.create_all()
"
exec flask run --host=0.0.0.0 --port=5000
