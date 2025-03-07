import re

from azure.mgmt.compute import ComputeManagementClient
from azure.mgmt.network import NetworkManagementClient
from azure.mgmt.compute.models import DiskCreateOptionTypes
from assistant.network.NetworkManager import NetworkManager
from concurrent.futures import ThreadPoolExecutor, wait
from azure.core.exceptions import ResourceNotFoundError

class VirtualMachineManager:
    def __init__(self, credential, subscription_id):
        self.subscription_id = subscription_id
        self.client = ComputeManagementClient(credential, subscription_id)
        self.network_manager = NetworkManager(credential, subscription_id)
        self.network_client = NetworkManagementClient(credential, subscription_id)

    def create_virtual_machine(
            self,
            resource_group_name,
            vm_name,
            location,
            admin_username,
            authentication_type,
            ssh_public_key = '',
            admin_password='',
            vm_size="Standard_D1_v2",
            publisher='MicrosoftWindowsServer',
            offer='WindowsServer',
            sku='2022-Datacenter'
        ):
        if authentication_type == 'ssh':
            ssh_key_pattern = re.compile(r'''
                    ^(ssh-rsa|ssh-dss|ssh-ed25519|ecdsa-sha2-nistp256)\s+  # Key type
                    [A-Za-z0-9+/]+[=]{0,2}\s*                              # Base64 encoded key
                    (.*)?$                                                 # Optional comment
                ''', re.VERBOSE)
             
            if not ssh_key_pattern.match(ssh_public_key.strip()):
                return "Invalid SSH public key format. Please provide a valid SSH public key."

        try:
            # Create virtual network
            self.network_manager.create_virtual_network(resource_group_name, f'{vm_name}VNet', location)
            # Create subnet
            self.network_manager.create_subnet(resource_group_name, f'{vm_name}VNet', f'{vm_name}Subnet')
            subnet = self.network_client.subnets.get(resource_group_name, f'{vm_name}VNet', f'{vm_name}Subnet')

            # Create public IP address
            public_ip_address = self.create_public_ip_address(resource_group_name, f'{vm_name}PublicIP', location)
            # Create network interface
            network_interface = self.create_network_interface(resource_group_name, f'{vm_name}NIC', location, subnet, public_ip_address)
            # Create virtual machine
            self.client.virtual_machines.begin_create_or_update(
                resource_group_name,
                vm_name,
                {
                    'location': location,
                    'os_profile': {
                        'computer_name': vm_name,
                        'admin_username': admin_username,
                        'admin_password': admin_password if authentication_type == 'password' else None,
                        'linux_configuration': {
                            'disable_password_authentication': True,
                            'ssh': {
                                'public_keys': [
                                    {
                                        'path': f'/home/{admin_username}/.ssh/authorized_keys',
                                        'key_data': ssh_public_key
                                    }
                                ]
                            }
                        } if authentication_type == 'ssh' else None
                    },
                    'hardware_profile': {
                        'vm_size': vm_size
                    },
                    'storage_profile': {
                        'image_reference': {
                            'publisher': publisher,
                            'offer': offer,
                            'sku': sku,
                            'version': "latest"
                        },
                        'os_disk': {
                            'name': f'{vm_name}OsDisk',
                            'caching': 'ReadWrite',
                            'create_option': DiskCreateOptionTypes.FROM_IMAGE,
                            'managed_disk': {
                                'storage_account_type': 'Standard_LRS'
                            }
                        },
                    },
                    'network_profile': {
                        'network_interfaces': [{
                            'id': network_interface.id,
                            'properties': {
                                'primary': True
                            }
                        }]
                    }
                }
            ).result()

            return f"Virtual machine {vm_name} created successfully."
        except Exception as e:
            return f"Error creating virtual machine: {str(e)}"

    def create_public_ip_address(self, resource_group_name, pip_name, location):
        ip_addresses = self.network_client.public_ip_addresses.list(resource_group_name)
        found = any(ip.name == pip_name for ip in ip_addresses)

        if not found:
            public_ip_address = self.network_client.public_ip_addresses.begin_create_or_update(
                resource_group_name,
                pip_name,
                {
                    'location': location,
                    'public_ip_allocation_method': 'Dynamic',
                }
            ).result()

            return public_ip_address
        else:
            return self.network_client.public_ip_addresses.get(resource_group_name, pip_name)
        
    def create_network_interface(self, resource_group_name, nic_name, location, subnet, public_ip_address):
        nics = self.network_client.network_interfaces.list(resource_group_name)
        found = any(nic.name == nic_name for nic in nics)

        if not found:
            network_interface = self.network_client.network_interfaces.begin_create_or_update(
                resource_group_name,
                nic_name,
                {
                    'location': location,
                    'ip_configurations': [{
                        'name': 'ipconfig1',
                        'subnet': {
                            'id': subnet.id
                        },
                        'public_ip_address': {
                            'id': public_ip_address.id
                        }
                    }]
                }
            ).result()

            return network_interface
        else:
            return self.network_client.network_interfaces.get(resource_group_name, nic_name)

    def delete_virtual_machine(self, resource_group_name, vm_name):
        def delete_resource(delete_func, *args):
            try:
                delete_func(*args).wait()
            except ResourceNotFoundError:
                pass
        
        try:
            # Remove the virtual machine
            delete_resource(
                self.client.virtual_machines.begin_delete,
                resource_group_name,
                vm_name
            )

            # Remove the network interface
            delete_resource(
                self.network_client.network_interfaces.begin_delete,
                resource_group_name,
                f'{vm_name}NIC'
            )

            with ThreadPoolExecutor(max_workers=3) as executor:
                futures = [
                    executor.submit(delete_resource, self.network_client.public_ip_addresses.begin_delete, resource_group_name, f'{vm_name}PublicIP'),
                    executor.submit(delete_resource, self.network_manager.delete_virtual_network, resource_group_name, f'{vm_name}VNet'),
                    executor.submit(delete_resource, self.client.disks.begin_delete, resource_group_name, f'{vm_name}OsDisk'),
                ]

                wait(futures)

            return f"Virtual machine {vm_name} deleted."
        except Exception as e:
            return f"Error deleting virtual machine: {str(e)}"
        
    def start_virtual_machine(self, resource_group_name, vm_name):
        try:
            self.client.virtual_machines.begin_start(resource_group_name, vm_name).result()

            return f"Virtual machine {vm_name} started."
        except Exception as e:
            return f"Error starting virtual machine: {str(e)}"
        
    def stop_virtual_machine(self, resource_group_name, vm_name):
        try:
            self.client.virtual_machines.begin_deallocate(resource_group_name, vm_name).result()

            return f"Virtual machine {vm_name} stopped."
        except Exception as e:
            return f"Error stopping virtual machine: {str(e)}"
        
    def run_script_on_virtual_machine(self, resource_group_name, vm_name, script):
        try:
            run_command = self.client.virtual_machines.begin_run_command(
                resource_group_name,
                vm_name,
                parameters={
                    'command_id': 'RunShellScript',
                    'script': script.split('\n')
                }
            ).result()

            res = '\n'.join([output.message for output in run_command.value if output.message is not None])

            return f"Action ran successfully. Output: {res}"
        except Exception as e:
            return f"Error running the script on virtual machine: {str(e)}"
        
    def get_virtual_machine_info(self, resource_group_name, vm_name):
        try:
            vm = self.client.virtual_machines.get(resource_group_name, vm_name)

            return str(vm.as_dict())
        except Exception as e:
            return f"Error getting virtual machine info: {str(e)}"
        
    def get_available_functions(self) -> dict:
            return {func: getattr(self, func) for func in dir(self) if callable(getattr(self, func)) and not func.startswith("__")}
