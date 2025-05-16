import unittest
import requests
import time
import json
import os
import random
import string
from threading import Thread
import pytest

class TestGossipProtocol(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Set up test environment before running tests"""
        base_url = os.getenv('NODE_BASE_URL', 'http://localhost')
        ports = os.getenv('NODE_PORTS', '5001,5002,5003,5004,5005').split(',')
        
        cls.nodes = [
            f"{base_url}:{port}"
            for port in ports
        ]

    def generate_random_message(self):
        """Generate a random message for testing"""
        length = random.randint(10, 20)
        letters = string.ascii_letters + string.digits
        return ''.join(random.choice(letters) for _ in range(length))

    def test_node_health(self):
        """Test if all nodes are running and responding"""
        for node in self.nodes:
            try:
                response = requests.get(f"{node}/state", timeout=5)
                self.assertEqual(response.status_code, 200)
            except requests.exceptions.RequestException as e:
                self.fail(f"Failed to connect to {node}: {str(e)}")

    def test_message_propagation(self):
        """Test if message propagates to all nodes"""
        test_message = self.generate_random_message()

        try:
            response = requests.post(
                f"{self.nodes[0]}/data",
                json={"data": test_message},
                timeout=5
            )
            self.assertEqual(response.status_code, 200)
        except requests.exceptions.RequestException as e:
            self.fail(f"Failed to send message to {self.nodes[0]}: {str(e)}")

        max_retries = 6
        retry_interval = 5
        for _ in range(max_retries):
            time.sleep(retry_interval)
            all_nodes_received = True
            for node in self.nodes:
                try:
                    response = requests.get(f"{node}/state", timeout=5)
                    self.assertEqual(response.status_code, 200)
                    data = response.json()
                    if test_message not in data:
                        all_nodes_received = False
                        break
                except requests.exceptions.RequestException as e:
                    all_nodes_received = False
                    break
            if all_nodes_received:
                break
        self.assertTrue(all_nodes_received, f"Message '{test_message}' did not propagate to all nodes")

    def test_metrics_collection(self):
        """Test if metrics are being collected properly"""
        for node in self.nodes:
            try:
                response = requests.get(f"{node}/metrics", timeout=5)
                self.assertEqual(response.status_code, 200)
                self.assertIn("total_message_count", response.text)
            except requests.exceptions.RequestException as e:
                self.fail(f"Failed to get metrics from {node}: {str(e)}")

    def test_log_entries(self):
        """Test if log entries are created properly"""
        test_message = self.generate_random_message()
        
        try:
            requests.post(f"{self.nodes[0]}/data", json={"data": test_message}, timeout=5)
        except requests.exceptions.RequestException as e:
            self.fail(f"Failed to send test message to {self.nodes[0]}: {str(e)}")

        max_retries = 4
        retry_interval = 5
        for _ in range(max_retries):
            time.sleep(retry_interval)
            logs_found = True
            for node in self.nodes:
                try:
                    response = requests.get(f"{node}/log", timeout=5)
                    self.assertEqual(response.status_code, 200)
                    logs = response.json()
                    if not any(test_message in log["event"] for log in logs):
                        logs_found = False
                        break
                except requests.exceptions.RequestException as e:
                    logs_found = False
                    break
            if logs_found:
                break
        self.assertTrue(logs_found, f"Log entries for message '{test_message}' not found in all nodes")

    def test_message_convergence(self):
        """Test if all nodes eventually converge to the same state"""
        test_message = self.generate_random_message()
        
        try:
            requests.post(f"{self.nodes[0]}/data", json={"data": test_message}, timeout=5)
        except requests.exceptions.RequestException as e:
            self.fail(f"Failed to send convergence message to {self.nodes[0]}: {str(e)}")

        max_retries = 8
        retry_interval = 5
        for _ in range(max_retries):
            time.sleep(retry_interval)
            message_found = True
            for node in self.nodes:
                try:
                    response = requests.get(f"{node}/state", timeout=5)
                    data = response.json()
                    if test_message not in data:
                        message_found = False
                        break
                except requests.exceptions.RequestException as e:
                    message_found = False
                    break
            if message_found:
                break

        for node in self.nodes:
            try:
                response = requests.get(f"{node}/state", timeout=5)
                data = response.json()
                self.assertIn(test_message, data, f"Message '{test_message}' not found in node {node}")
            except requests.exceptions.RequestException as e:
                self.fail(f"Failed to get state from {node}: {str(e)}")

if __name__ == '__main__':
    unittest.main() 