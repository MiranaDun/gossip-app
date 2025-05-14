FROM python:3.10-slim

WORKDIR /app

COPY app/gossip_node.py /app/
RUN pip install flask requests pytz prometheus_client

CMD ["python", "gossip_node.py"] 