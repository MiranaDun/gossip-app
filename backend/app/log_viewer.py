from flask import Flask, render_template, request, jsonify
import requests
from datetime import datetime
import pytz  # Добавляем импорт pytz
from prometheus_api_client import PrometheusConnect

prom = PrometheusConnect(url="http://prometheus:9090", disable_ssl=True)

app = Flask(__name__)

# Список всех узлов
NODES = ["node1", "node2", "node3", "node4", "node5"]

# Функция для получения текущего времени в нужной временной зоне
def get_current_time():
    moscow_tz = pytz.timezone('Europe/Moscow')
    return datetime.now(moscow_tz).strftime("%Y-%m-%d %H:%M:%S")

# Функция для получения состояния узла
def get_node_state(node):
    try:
        response = requests.get(f"http://nginx/state/{node}", timeout=1)
        return response.json()
    except:
        return []

# Функция для получения логов узла
def get_node_logs(node):
    try:
        response = requests.get(f"http://nginx/log/{node}", timeout=1)
        return response.json()
    except:
        return []

@app.route('/')
def view_logs():
    
    return render_template('logs.html')

@app.route('/metrics')
def get_metrics():
    nodes_data = []
    total_messages = 0
    start_times = {}
    end_times = {}

    for node in NODES:
        state = get_node_state(node)
        logs = get_node_logs(node)

        try:
            metric_data = prom.get_current_metric_value(
                metric_name="total_message_count_total",
                label_config={"instance": f"{node}:5000"}
            )
            node_messages = float(metric_data[0]['value'][1]) if metric_data else 0
        except Exception as e:
            print(f"Ошибка получения метрики с {node}: {e}")
            node_messages = 0

        total_messages += node_messages

        try:
            end_time_data = prom.get_current_metric_value(
                metric_name="end_time",
                label_config={"instance": f"{node}:5000", "node": node}
            )
            end_time_value = float(end_time_data[0]['value'][1]) if end_time_data else 0
        except Exception as e:
            print(f"Ошибка получения метрики end_time с {node}: {e}")
            end_time_value = 0

        try:
            start_time_data = prom.get_current_metric_value(
                metric_name="start_time",
                label_config={"instance": f"{node}:5000", "node": node}
            )
            start_time_value = float(start_time_data[0]['value'][1]) if start_time_data else 0
        except Exception as e:
            print(f"Ошибка получения метрики start_time с {node}: {e}")
            start_time_value = 0

        start_times[node] = start_time_value
        end_times[node] = end_time_value

        connections = set()
        for log in logs:
            if "→" in log.get("event", ""):
                target = log["event"].split("→")[1].strip().split("/")[2].split(":")[0]
                if target in NODES:
                    connections.add(target)

        nodes_data.append({
            "id": node,
            "has_message": len(state) > 0,
            "connections": list(connections)
        })

    return jsonify({
        "message_count": total_messages,
        "nodes": nodes_data,
        "start_times": start_times,
        "end_times": end_times
    })

@app.route('/send-message', methods=['POST'])
def send_message():
    data = request.json
    message = data.get('message')
    
    if not message:
        return jsonify({"error": "Message is required"}), 400
    
    try:
        # Отправляем сообщение через nginx
        print(f"Sending message: {message}")
        response = requests.post(
            "http://nginx/data",
            json={"data": message},
            timeout=2
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response content: {response.text}")
        
        if response.status_code == 200:
            return jsonify({"status": "success"})
        else:
            return jsonify({"error": f"Server returned status {response.status_code}"}), 500
    except Exception as e:
        print(f"Error sending message: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5006) 