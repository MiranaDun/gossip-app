# Gossip Protocol Network Visualizer

A distributed system that implements the gossip protocol with real-time visualization of message propagation across a network of nodes.

## Overview

This application demonstrates how information spreads through a network using the gossip protocol. It consists of 5 nodes that communicate with each other, sharing messages until all nodes receive the same information. The system includes real-time visualization of the network state, message propagation times, and various metrics.

## Architecture

The application consists of several components:

### 1. Nodes (5 instances)
- Each node is a separate service running in its own container
- Nodes communicate with each other using HTTP
- Each node maintains its own state and logs
- Nodes use the gossip protocol to spread messages

### 2. Log Viewer
- Web interface for visualization and control
- Real-time network graph
- Message propagation time histogram
- Message count chart
- Message sending interface

### 3. Nginx
- Reverse proxy server
- Routes requests between components
- Load balancing for node communication

### 4. Prometheus
- Metrics collection and monitoring
- Tracks message counts and propagation times
- Provides data for visualization

## Features

- **Real-time Network Visualization**
  - Interactive network graph
  - Node status indication (has message/doesn't have message)
  - Connection visualization between nodes

- **Message Propagation Monitoring**
  - Time histogram showing how long it takes for messages to reach each node
  - Message count tracking
  - Detailed logging of message transfers

- **User Interface**
  - Simple message sending interface
  - Real-time updates
  - Error handling and notifications

## Technical Details

### Gossip Protocol Implementation
- Nodes randomly select neighbors to share messages with
- Messages are propagated until all nodes receive them
- System tracks start and end times for message propagation
- Automatic detection of message convergence

### Metrics
- Total message count per node
- Message propagation time
- Network state
- Connection status

## Getting Started

### Prerequisites
- Docker
- Docker Compose

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd gossip-app
```

2. Start the application:
```bash
docker-compose up
```

3. Access the application:
- Web interface: http://localhost:80
- Prometheus: http://localhost:9090

### Usage

1. Open the web interface
2. Enter a message in the input field
3. Click "Send"
4. Watch the message propagate through the network
5. Observe the metrics and visualizations

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── gossip_node.py
│   │   └── log_viewer.py
│   └── nginx/
│       └── nginx.conf
├── frontend/
│   ├── static/
│   │   ├── css/
│   │   └── js/
│   └── templates/
├── docker/
│   ├── node.Dockerfile
│   ├── log-viewer.Dockerfile
│   └── prometheus.yml
└── docker-compose.yml
```

## Monitoring

The application provides several monitoring endpoints:
- `/metrics` - Prometheus metrics
- `/state` - Current state of each node
- `/log` - Detailed logs of message propagation
