let network = null;
let metricsChart = null;
let timeHistogram = null;
let lastMessageTimestamp = 0;

const nodePositions = {
    'node1': { x: -200, y: -150 },
    'node2': { x: 200, y: -150 },
    'node3': { x: 250, y: 100 },
    'node4': { x: -250, y: 100 },
    'node5': { x: 0, y: 200 }
};

document.addEventListener('DOMContentLoaded', function () {
    initNetwork();
    initMetricsChart();
    initTimeHistogram();
    startMetricsPolling();
});

function initNetwork() {
    const container = document.getElementById('network-container');

    const nodes = new vis.DataSet([
        { id: 'node1', label: 'Node 1', fixed: true, physics: false, ...nodePositions['node1'] },
        { id: 'node2', label: 'Node 2', fixed: true, physics: false, ...nodePositions['node2'] },
        { id: 'node3', label: 'Node 3', fixed: true, physics: false, ...nodePositions['node3'] },
        { id: 'node4', label: 'Node 4', fixed: true, physics: false, ...nodePositions['node4'] },
        { id: 'node5', label: 'Node 5', fixed: true, physics: false, ...nodePositions['node5'] }
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
        physics: false,
        interaction: {
            zoomView: false,
            dragView: false
        }
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
                label: 'Message Count',
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

function initTimeHistogram() {
    const ctx = document.getElementById('timeHistogram').getContext('2d');
    timeHistogram = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Message Propagation Time (sec)',
                data: [],
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgb(54, 162, 235)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Time (seconds)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Nodes'
                    }
                }
            }
        }
    });
}

// Опрос метрик каждые 1 секунд
function startMetricsPolling() {
    updateMetrics();
    setInterval(updateMetrics, 1000);
}

// Обновление метрик и визуализации сети
async function updateMetrics() {
    try {
        const response = await fetch('/metrics');
        const data = await response.json();

        const timestamp = new Date().toLocaleTimeString();

        if (data.message_count === 0) {
            lastMessageTimestamp = 0;
        } else if (lastMessageTimestamp === 0) {
            lastMessageTimestamp = Date.now();
            metricsChart.data.datasets[0].data = [];
            metricsChart.data.labels = [];
        }

        metricsChart.data.labels.push(timestamp);
        metricsChart.data.datasets[0].data.push(data.message_count);

        if (metricsChart.data.labels.length > 20) {
            metricsChart.data.labels.shift();
            metricsChart.data.datasets[0].data.shift();
        }

        metricsChart.update('active');
        updateNetwork(data.nodes);
        updateTimeHistogram(data.start_times, data.end_times);
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

function updateTimeHistogram(startTimes, endTimes) {
    if (!startTimes || !endTimes) return;

    const labels = [];
    const data = [];

    // Обрабатываем все узлы в правильном порядке
    for (let i = 1; i <= 5; i++) {
        const nodeId = `node${i}`;
        labels.push(nodeId);

        if (startTimes[nodeId] && endTimes[nodeId] !== 0) {
            const durationMs = endTimes[nodeId] - startTimes[nodeId];
            const durationSec = (durationMs / 1000).toFixed(3);
            data.push(parseFloat(durationSec));
        } else {
            // Если узел еще не получил сообщение или не завершил обработку,
            // показываем нулевое время
            data.push(0);
        }
    }

    timeHistogram.data.labels = labels;
    timeHistogram.data.datasets[0].data = data;
    timeHistogram.update();
}

// Функция для сброса всех визуализаций
function resetVisualizations() {
    // Сброс графика сообщений
    metricsChart.data.labels = [];
    metricsChart.data.datasets[0].data = [];
    metricsChart.update();

    // Сброс гистограммы времени
    timeHistogram.data.labels = [];
    timeHistogram.data.datasets[0].data = [];
    timeHistogram.update();

    // Сброс сети (удаление всех связей и сброс цветов узлов)
    const networkData = network.body.data;
    networkData.edges.clear();
    const nodes = networkData.nodes.get();
    nodes.forEach(node => {
        networkData.nodes.update({
            id: node.id,
            color: {
                background: '#2196F3',
                border: '#1976D2',
                highlight: {
                    background: '#64B5F6',
                    border: '#1976D2'
                }
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
            button.textContent = 'Sent!';
            setTimeout(() => {
                button.textContent = 'Send';
            }, 2000);

            // Полностью пересоздаем все визуализации
            if (network) network.destroy();
            if (metricsChart) metricsChart.destroy();
            if (timeHistogram) timeHistogram.destroy();

            // Заново инициализируем все
            initNetwork();
            initMetricsChart();
            initTimeHistogram();
            lastMessageTimestamp = 0;

            // Запускаем обновление
            updateMetrics();
        } else {
            const data = await response.json();
            showError(data.error || 'Message sending error');
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Message sending error: ' + error);
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


