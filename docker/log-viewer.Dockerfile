FROM python:3.10-slim

WORKDIR /app

# Копируем все необходимые файлы
COPY app/log_viewer.py /app/
COPY templates /app/templates
COPY static /app/static

RUN pip install flask requests pytz

CMD ["python", "log_viewer.py"] 