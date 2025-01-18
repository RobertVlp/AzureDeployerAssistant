from azure.mgmt.compute import ComputeManagementClient
from azure.mgmt.network import NetworkManagementClient
from azure.mgmt.compute.models import DiskCreateOptionTypes

class VirtualMachineManager:
    def __init__(self, credential, subscription_id):
        self.subscription_id = subscription_id
        self.client = ComputeManagementClient(credential, subscription_id)
        self.network_client = NetworkManagementClient(credential, subscription_id)

    def create_virtual_machine(
            self,
            resource_group_name,
            vm_name,
            location,
            admin_username,
            admin_password,
            vm_size="Standard_D1_v2",
            publisher='MicrosoftWindowsServer',
            offer='WindowsServer',
            sku='2022-Datacenter'
        ):
        try:
            # Create virtual network
            self.network_client.virtual_networks.begin_create_or_update(
                resource_group_name,
                f'{vm_name}VNet',
                {
                    'location': location,
                    'address_space': {
                        'address_prefixes': ['10.0.0.0/16']
                    },
                }
            ).result()

            subnet = self.network_client.subnets.begin_create_or_update(
                resource_group_name,
                f'{vm_name}VNet',
                f'{vm_name}Subnet',
                {'address_prefix': '10.0.0.0/24'}
            ).result()

            network_interface = self.network_client.network_interfaces.begin_create_or_update(
                resource_group_name,
                f'{vm_name}NIC',
                {
                    'location': location,
                    'ip_configurations': [{
                        'name': 'ipconfig1',
                        'subnet': {
                            'id': subnet.id
                        }
                    }]
                }
            ).result()

            self.client.virtual_machines.begin_create_or_update(
                resource_group_name,
                vm_name,
                {
                    'location': location,
                    'os_profile': {
                        'computer_name': vm_name,
                        'admin_username': admin_username,
                        'admin_password': admin_password
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
        
    def delete_virtual_machine(self, resource_group_name, vm_name):
        try:
            # Remove the virtual machine
            self.client.virtual_machines.begin_delete(resource_group_name, vm_name).result()
            # Remove the network interface
            self.network_client.network_interfaces.begin_delete(resource_group_name, f'{vm_name}NIC').result()
            # Remove the virtual network
            self.network_client.virtual_networks.begin_delete(resource_group_name, f'{vm_name}VNet').result()
            # Remove the disk
            self.client.disks.begin_delete(resource_group_name, f'{vm_name}OsDisk').result()

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
        
    def run_script_on_virtual_machine(self, resource_group_name, vm_name, instructions):
        try:
            run_command = self.client.virtual_machines.begin_run_command(
                resource_group_name,
                vm_name,
                parameters={
                    'command_id': 'RunShellScript',
                    'script': [instructions]
                }
            ).result()

            res = '\n'.join([output.message for output in run_command.value])

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
