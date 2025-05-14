FROM python:3.10-slim

WORKDIR /app

COPY backend/app/log_viewer.py /app/
COPY frontend/templates /app/templates
COPY frontend/static /app/static

RUN pip install flask requests pytz

CMD ["python", "log_viewer.py"] 