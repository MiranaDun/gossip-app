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

// Опрос логов каждую секунду
function startLogsPolling() {
    updateLogs();
    setInterval(updateLogs, 1000);
}

// Обновление логов
async function updateLogs() {
    try {
        const response = await fetch('/');
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const newLogs = doc.querySelectorAll('.log-entry');
        const logContainer = document.getElementById('logContainer');

        // Проверяем только новые логи
        newLogs.forEach(log => {
            const timestamp = log.querySelector('.timestamp').textContent;
            if (timestamp > lastLogTimestamp) {
                const clone = log.cloneNode(true);
                clone.style.opacity = '0';
                clone.style.transform = 'translateY(-20px)';
                logContainer.insertBefore(clone, logContainer.firstChild);

                // Анимируем появление нового лога
                setTimeout(() => {
                    clone.style.transition = 'all 0.5s ease-out';
                    clone.style.opacity = '1';
                    clone.style.transform = 'translateY(0)';
                }, 50);

                lastLogTimestamp = timestamp;
            }
        });

        // Ограничиваем количество отображаемых логов
        const allLogs = logContainer.querySelectorAll('.log-entry');
        if (allLogs.length > 50) {
            for (let i = 50; i < allLogs.length; i++) {
                allLogs[i].remove();
            }
        }
    } catch (error) {
        console.error('Error updating logs:', error);
    }
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
            updateLogs();
        } else {
            const data = await response.json();
            showError(data.error || 'Ошибка при отправке сообщения');
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Ошибка при отправке сообщения: ' + error);
    }
}

// Функция для скрытия старых логов
function hideOldLogs() {
    const logContainer = document.getElementById('logContainer');
    const logEntries = logContainer.getElementsByClassName('log-entry');
    const now = new Date();

    // Скрываем логи старше 5 минут
    Array.from(logEntries).forEach(entry => {
        const timestamp = entry.querySelector('.timestamp').textContent;
        const logTime = new Date(timestamp);
        const diffMinutes = (now - logTime) / (1000 * 60);

        if (diffMinutes > 5) {
            entry.style.transition = 'all 0.5s ease-out';
            entry.style.opacity = '0';
            entry.style.transform = 'translateY(20px)';
            setTimeout(() => entry.style.display = 'none', 500);
        }
    });

    // Показываем сообщение о скрытых логах
    const message = document.createElement('div');
    message.className = 'info-message';
    message.textContent = 'Старые логи скрыты. Нажмите "Обновить" чтобы увидеть все логи.';
    message.style.opacity = '0';
    logContainer.insertBefore(message, logContainer.firstChild);

    // Анимируем появление сообщения
    setTimeout(() => {
        message.style.transition = 'opacity 0.5s ease-out';
        message.style.opacity = '1';
    }, 50);

    // Меняем текст кнопки
    const clearButton = document.querySelector('.clear-button');
    clearButton.textContent = 'Показать все логи';
    clearButton.onclick = showAllLogs;
}

// Функция для показа всех логов
function showAllLogs() {
    const logContainer = document.getElementById('logContainer');
    const logEntries = logContainer.getElementsByClassName('log-entry');

    // Показываем все скрытые логи с анимацией
    Array.from(logEntries).forEach((entry, index) => {
        if (entry.style.display === 'none') {
            entry.style.display = '';
            entry.style.opacity = '0';
            entry.style.transform = 'translateY(20px)';

            setTimeout(() => {
                entry.style.transition = 'all 0.5s ease-out';
                entry.style.opacity = '1';
                entry.style.transform = 'translateY(0)';
            }, index * 50);
        }
    });

    // Удаляем информационное сообщение с анимацией
    const infoMessage = logContainer.querySelector('.info-message');
    if (infoMessage) {
        infoMessage.style.transition = 'all 0.5s ease-out';
        infoMessage.style.opacity = '0';
        infoMessage.style.transform = 'translateY(-20px)';
        setTimeout(() => infoMessage.remove(), 500);
    }

    // Возвращаем текст кнопки
    const clearButton = document.querySelector('.clear-button');
    clearButton.textContent = 'Скрыть старые логи';
    clearButton.onclick = hideOldLogs;
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


