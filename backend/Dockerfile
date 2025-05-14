FROM python:3.10-slim

WORKDIR /app

# Копируем все файлы приложения
COPY app/*.py /app/
COPY templates /app/templates

RUN pip install flask requests

# Определяем команду запуска в зависимости от сервиса
CMD ["python", "gossip_node.py"]