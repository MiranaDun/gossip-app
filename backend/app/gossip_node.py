import random
from datetime import datetime
import requests
import os
import time
from flask import Flask, request, jsonify, Response
from threading import Thread
import pytz
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST, Gauge

app = Flask(__name__)

my_data = []
log_data = []

total_message_count = Counter('total_message_count', 'Total number of messages sent by this node')
start_time = Gauge("start_time", "Start time", ["node"])
end_time = Gauge("end_time", "End time", ["node"])

NEIGHBORS = [
    "http://node1:5000",
    "http://node2:5000",
    "http://node3:5000",
    "http://node4:5000",
    "http://node5:5000"
]

THIS_NODE = os.getenv("THIS_NODE", "node1")

gossip_thread = None

max_size = 0

def get_current_time():
    moscow_tz = pytz.timezone('Europe/Moscow')
    return datetime.now(moscow_tz).strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]

@app.route('/data', methods=['POST'])
def receive_data():
    global gossip_thread
    content = request.json.get("data")
    if content and content not in [d["value"] for d in my_data]:
        my_data.append({"value": content})
        log_entry = {
            "event": f"Recieve: {content}",
            "timestamp": get_current_time(),
            "node": THIS_NODE
        }
        log_data.append(log_entry)
        time.sleep(0.2)
        if gossip_thread is None or not gossip_thread.is_alive():
            start_time.labels(node=THIS_NODE).set(time.time())
            gossip_thread = Thread(target=gossip_loop, daemon=True)
            gossip_thread.start()
    return jsonify({"status": "ok"})

@app.route('/state', methods=['GET'])
def get_state():
    return jsonify([d["value"] for d in my_data])

def gossip_loop():
    global gossip_thread
    global max_size
    end_time.labels(node=THIS_NODE).set(0)
    while True:
        if not my_data or len(my_data) == max_size:
            time.sleep(5)
            continue
        current_values = set(d["value"] for d in my_data)
        all_same = True
        for neighbor in NEIGHBORS:
            if THIS_NODE in neighbor:
                continue
            try:
                resp = requests.get(f"{neighbor}/state", timeout=2)
                neighbor_values = set(resp.json())
                if neighbor_values != current_values or not neighbor_values:
                    all_same = False
                    break
            except:
                all_same = False
                break
        if all_same:
            end_time.labels(node=THIS_NODE).set(time.time())
            max_size = len(my_data)
            break
        data = my_data[-1]["value"]
        neighbor = random.choice([n for n in NEIGHBORS if THIS_NODE not in n])
        try:
            log_data.append({
                "node": THIS_NODE,
                "event": f"Send: {data} → {neighbor}",
                "timestamp": get_current_time()
            })
            time.sleep(0.2)
            total_message_count.inc()
            requests.post(f"{neighbor}/data", json={"data": data}, timeout=2)
        except Exception as e:
            log_data.append({
                "event": f"Error {data} → {neighbor}: {str(e)}",
                "timestamp": get_current_time()
            })
        time.sleep(5)
    gossip_thread = None 

@app.route('/log', methods=['GET'])
def get_log():
    return jsonify(sorted(log_data, key=lambda x: x["timestamp"], reverse=True))

@app.route('/metrics')
def metrics():
    return Response(generate_latest(), mimetype=CONTENT_TYPE_LATEST)

if __name__ == '__main__':
    my_data.clear()
    log_data.clear()
    start_time.labels(node=THIS_NODE).set(time.time())
    gossip_thread = Thread(target=gossip_loop, daemon=True)
    gossip_thread.start()
    app.run(host="0.0.0.0", port=5000)