#!/usr/bin/env python3
"""
Network Utilities for ComfyUI Connections
Provides network interface detection and configuration utilities
"""

import socket
import netifaces
from typing import List, Dict, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class NetworkUtils:
    """Network utilities for detecting and configuring network interfaces."""

    @staticmethod
    def get_local_ip() -> str:
        """Get the local IP address of the machine."""
        try:
            # Get the hostname
            hostname = socket.gethostname()
            # Get the IP address
            ip_address = socket.gethostbyname(hostname)
            logger.info(f"Local IP address detected: {ip_address}")
            return ip_address
        except Exception as e:
            logger.error(f"Failed to get local IP address: {e}")
            return "127.0.0.1"

    @staticmethod
    def get_network_interfaces() -> List[Dict[str, str]]:
        """Get all available network interfaces and their IP addresses."""
        interfaces = []
        try:
            # Get all network interfaces
            all_interfaces = netifaces.interfaces()
            
            for interface in all_interfaces:
                try:
                    # Get address information for the interface
                    addrs = netifaces.ifaddresses(interface)
                    
                    # Check if the interface has an IPv4 address
                    if netifaces.AF_INET in addrs:
                        for addr_info in addrs[netifaces.AF_INET]:
                            ip_address = addr_info.get('addr')
                            if ip_address and ip_address != '127.0.0.1':
                                interfaces.append({
                                    'name': interface,
                                    'ip': ip_address,
                                    'netmask': addr_info.get('netmask', ''),
                                    'broadcast': addr_info.get('broadcast', '')
                                })
                except Exception as e:
                    logger.warning(f"Failed to get address for interface {interface}: {e}")
                    continue
            
            logger.info(f"Found {len(interfaces)} network interfaces")
            return interfaces
        except Exception as e:
            logger.error(f"Failed to get network interfaces: {e}")
            return []

    @staticmethod
    def get_interface_by_name(interface_name: str) -> Optional[Dict[str, str]]:
        """Get a specific network interface by name."""
        try:
            # Get address information for the interface
            addrs = netifaces.ifaddresses(interface_name)
            
            # Check if the interface has an IPv4 address
            if netifaces.AF_INET in addrs:
                for addr_info in addrs[netifaces.AF_INET]:
                    ip_address = addr_info.get('addr')
                    if ip_address and ip_address != '127.0.0.1':
                        return {
                            'name': interface_name,
                            'ip': ip_address,
                            'netmask': addr_info.get('netmask', ''),
                            'broadcast': addr_info.get('broadcast', '')
                        }
            
            return None
        except Exception as e:
            logger.error(f"Failed to get interface {interface_name}: {e}")
            return None

    @staticmethod
    def get_best_interface() -> Optional[Dict[str, str]]:
        """Get the best network interface for local network connections."""
        interfaces = NetworkUtils.get_network_interfaces()
        
        if not interfaces:
            return None
        
        # Prefer interfaces that are not loopback and have valid IP addresses
        for interface in interfaces:
            if interface['ip'].startswith('192.168.') or interface['ip'].startswith('10.'):
                return interface
        
        # Return the first interface if no preferred one is found
        return interfaces[0]

    @staticmethod
    def validate_ip_address(ip_address: str) -> bool:
        """Validate an IP address."""
        try:
            socket.inet_aton(ip_address)
            return True
        except socket.error:
            return False

    @staticmethod
    def get_host_config(deployment_type: str = "desktop") -> Dict[str, str]:
        """Get host configuration based on deployment type."""
        config = {
            'desktop': {
                'host': '127.0.0.1',
                'description': 'Local connections only'
            },
            'portable': {
                'host': '0.0.0.0',
                'description': 'Allow incoming connections'
            },
            'server': {
                'host': NetworkUtils.get_local_ip(),
                'description': 'Local network connections'
            }
        }
        
        return config.get(deployment_type, config['desktop'])

# Test the network utilities
if __name__ == "__main__":
    print("Testing Network Utilities")
    print("=" * 50)
    
    # Get local IP address
    local_ip = NetworkUtils.get_local_ip()
    print(f"Local IP: {local_ip}")
    
    # Get all network interfaces
    interfaces = NetworkUtils.get_network_interfaces()
    print(f"Network Interfaces: {len(interfaces)}")
    for interface in interfaces:
        print(f"  - {interface['name']}: {interface['ip']}")
    
    # Get best interface
    best_interface = NetworkUtils.get_best_interface()
    if best_interface:
        print(f"Best Interface: {best_interface['name']} ({best_interface['ip']})")
    
    # Test deployment configurations
    print("\nDeployment Configurations:")
    for deployment_type in ['desktop', 'portable', 'server']:
        config = NetworkUtils.get_host_config(deployment_type)
        print(f"  {deployment_type}: {config['host']} - {config['description']}")