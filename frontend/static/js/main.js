// Глобальные переменные для сети и графика
let network = null;
let metricsChart = null;
let lastLogTimestamp = '';

// Фиксированные позиции для узлов
const nodePositions = {
    'node1': { x: -200, y: 0 },
    'node2': { x: 0, y: -100 },
    'node3': { x: 200, y: 0 }
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
    initNetwork();
    initMetricsChart();
    startMetricsPolling();
    startLogsPolling();
});

// Инициализация визуализации сети
function initNetwork() {
    const container = document.getElementById('network-container');

    // Создаем начальные узлы с фиксированными позициями
    const nodes = new vis.DataSet([
        { id: 'node1', label: 'Node 1', fixed: true, physics: false, ...nodePositions['node1'] },
        { id: 'node2', label: 'Node 2', fixed: true, physics: false, ...nodePositions['node2'] },
        { id: 'node3', label: 'Node 3', fixed: true, physics: false, ...nodePositions['node3'] }
    ]);

    const edges = new vis.DataSet([]);

    const data = {
        nodes: nodes,
        edges: edges
    };

    const options = {
        nodes: {
            shape: 'dot',
            size: 30,
            font: {
                size: 14
            },
            borderWidth: 2,
            shadow: true
        },
        edges: {
            width: 2,
            arrows: {
                to: { enabled: true, scaleFactor: 1 }
            },
            smooth: {
                type: 'curvedCW',
                roundness: 0.2
            },
            shadow: true
        },
        physics: false
    };

    network = new vis.Network(container, data, options);
}

// Инициализация графика метрик
function initMetricsChart() {
    const ctx = document.getElementById('metricsChart').getContext('2d');
    metricsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Количество сообщений',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(75, 192, 192, 0.2)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Опрос метрик каждые 5 секунд
function startMetricsPolling() {
    updateMetrics();
    setInterval(updateMetrics, 5000);
}

// Обновление метрик и визуализации сети
async function updateMetrics() {
    try {
        const response = await fetch('/metrics');
        const data = await response.json();

        // Обновляем график
        const timestamp = new Date().toLocaleTimeString();
        metricsChart.data.labels.push(timestamp);
        metricsChart.data.datasets[0].data.push(data.message_count);

        // Ограничиваем количество точек на графике
        if (metricsChart.data.labels.length > 20) {
            metricsChart.data.labels.shift();
            metricsChart.data.datasets[0].data.shift();
        }

        metricsChart.update('active');

        // Обновляем визуализацию сети
        updateNetwork(data.nodes);

        const timesDiv = document.getElementById('times-output');
        if (timesDiv && data.start_times && data.end_times) {
            let text = 'Время передачи сообщения по узлам:\n';
            for (const nodeId in data.start_times) {
                if (data.end_times[nodeId] !== 0) {
                    const durationMs = data.end_times[nodeId] - data.start_times[nodeId];
                    const durationSec = (durationMs / 1000).toFixed(3);
                    text += `${nodeId}: ${durationSec} sec\n`;
                } else {
                    text += `${nodeId}: no end_time\n`;
                }
            }
            timesDiv.textContent = text;
        }
    } catch (error) {
        console.error('Error fetching metrics:', error);
    }
}

// Обновление визуализации сети
function updateNetwork(nodes) {
    const networkData = network.body.data;

    // Обновляем цвета узлов
    nodes.forEach(node => {
        networkData.nodes.update({
            id: node.id,
            color: {
                background: node.has_message ? '#4CAF50' : '#2196F3',
                border: '#1976D2',
                highlight: {
                    background: node.has_message ? '#81C784' : '#64B5F6',
                    border: '#1976D2'
                }
            }
        });
    });

    // Обновляем связи между узлами
    const currentEdges = new Set(networkData.edges.getIds());

    nodes.forEach(node => {
        node.connections.forEach(targetId => {
            const edgeId = `${node.id}-${targetId}`;
            const reverseEdgeId = `${targetId}-${node.id}`;

            if (!currentEdges.has(edgeId) && !currentEdges.has(reverseEdgeId)) {
                networkData.edges.add({
                    id: edgeId,
                    from: node.id,
                    to: targetId,
                    color: {
                        color: '#2196F3',
                        highlight: '#64B5F6',
                        opacity: 0.0
                    }
                });

                // Анимируем появление связи
                setTimeout(() => {
                    networkData.edges.update({
                        id: edgeId,
                        color: {
                            color: '#2196F3',
                            highlight: '#64B5F6',
                            opacity: 1.0
                        }
                    });
                }, 100);
            }
        });
    });
}

// Функция для отправки сообщения
async function sendMessage(event) {
    event.preventDefault();
    const messageInput = document.getElementById('message');
    const message = messageInput.value;

    if (!message) return;

    try {
        const response = await fetch('/send-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message })
        });

        if (response.ok) {
            messageInput.value = '';
            const button = document.querySelector('.input-form button');
            button.textContent = 'Отправлено!';
            setTimeout(() => {
                button.textContent = 'Отправить';
            }, 2000);

            // Принудительно обновляем метрики и логи после отправки сообщения
            updateMetrics();
        } else {
            const data = await response.json();
            showError(data.error || 'Ошибка при отправке сообщения');
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Ошибка при отправке сообщения: ' + error);
    }
}

// Функция для отображения ошибок
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.opacity = '0';
    document.querySelector('.input-section').appendChild(errorDiv);

    // Анимируем появление ошибки
    setTimeout(() => {
        errorDiv.style.transition = 'all 0.5s ease-out';
        errorDiv.style.opacity = '1';
    }, 50);

    // Анимируем исчезновение ошибки
    setTimeout(() => {
        errorDiv.style.opacity = '0';
        errorDiv.style.transform = 'translateY(-20px)';
        setTimeout(() => errorDiv.remove(), 500);
    }, 3000);
}


