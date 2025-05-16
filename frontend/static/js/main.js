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

function startMetricsPolling() {
    updateMetrics();
    setInterval(updateMetrics, 1000);
}

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

function updateNetwork(nodes) {
    const networkData = network.body.data;

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

    timeHistogram.data.labels = [];
    timeHistogram.data.datasets[0].data = [];

    for (let i = 1; i <= 5; i++) {
        const nodeId = `node${i}`;
        timeHistogram.data.labels.push(nodeId);

        if (startTimes[nodeId] && endTimes[nodeId]) {
            let durationSec = endTimes[nodeId] - startTimes[nodeId];
            if (durationSec < 1) durationSec = 1;
            timeHistogram.data.datasets[0].data.push(parseFloat(durationSec.toFixed(3)));
        } else {
            timeHistogram.data.datasets[0].data.push(0);
        }
    }
    timeHistogram.update();
}

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

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.opacity = '0';
    document.querySelector('.input-section').appendChild(errorDiv);

    setTimeout(() => {
        errorDiv.style.transition = 'all 0.5s ease-out';
        errorDiv.style.opacity = '1';
    }, 50);

    setTimeout(() => {
        errorDiv.style.opacity = '0';
        errorDiv.style.transform = 'translateY(-20px)';
        setTimeout(() => errorDiv.remove(), 500);
    }, 3000);
}


