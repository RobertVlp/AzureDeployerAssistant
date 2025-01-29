from azure.mgmt.network import NetworkManagementClient

class NetworkManager:
    def __init__(self, credential, subscription_id):
        self.client = NetworkManagementClient(credential, subscription_id)

    def create_virtual_network(self, resource_group_name, virtual_network_name, location, address_space=['10.0.0.0/16']) -> str:
        vmnets = self.client.virtual_networks.list(resource_group_name)
        found = any(vnet.name == virtual_network_name for vnet in vmnets)

        if not found:
            try:
                self.client.virtual_networks.begin_create_or_update(
                    resource_group_name,
                    virtual_network_name,
                    {
                        'location': location,
                        'address_space': {
                            'address_prefixes': address_space
                        }
                    }
                ).result()
            except Exception as e:
                return f"Failed to create Virtual Network {virtual_network_name}: {str(e)}"

        return f"Virtual Network {virtual_network_name} created successfully."

    def delete_virtual_network(self, resource_group_name, virtual_network_name) -> str:
        try:
            self.client.virtual_networks.begin_delete(resource_group_name, virtual_network_name).result()
        except Exception as e:
            return f"Failed to delete Virtual Network {virtual_network_name}: {str(e)}"

        return f"Virtual Network {virtual_network_name} deleted successfully"

    def create_subnet(self, resource_group_name, virtual_network_name, subnet_name, subnet_address_prefix='10.0.0.0/24') -> str:
        subnets = self.client.subnets.list(resource_group_name, virtual_network_name)
        found = any(subnet.name == subnet_name for subnet in subnets)

        if not found:
            try:
                self.client.subnets.begin_create_or_update(
                    resource_group_name,
                    virtual_network_name,
                    subnet_name,
                    {
                        'address_prefix': subnet_address_prefix
                    }
                ).result()
            except Exception as e:
                return f"Failed to create Subnet {subnet_name}: {str(e)}"

        return f"Subnet {subnet_name} created successfully"

    def delete_subnet(self, resource_group_name, virtual_network_name, subnet_name) -> str:
        try:
            self.client.subnets.begin_delete(resource_group_name, virtual_network_name, subnet_name).result()
        except Exception as e:
            return f"Failed to delete Subnet {subnet_name}: {str(e)}"

        return f"Subnet {subnet_name} deleted successfully"

    def get_virtual_network_info(self, resource_group_name, virtual_network_name) -> str:
        try:
            return str(self.client.virtual_networks.get(resource_group_name, virtual_network_name).as_dict())
        except Exception as e:
            return f"Failed to get Virtual Network {virtual_network_name} info: {str(e)}"
    
    def get_subnet_info(self, resource_group_name, virtual_network_name, subnet_name) -> str:
        try:
            return str(self.client.subnets.get(resource_group_name, virtual_network_name, subnet_name).as_dict())
        except Exception as e:
            return f"Failed to get Subnet {subnet_name} info: {str(e)}"
        
    def get_available_functions(self) -> dict:
        return {func: getattr(self, func) for func in dir(self) if callable(getattr(self, func)) and not func.startswith("__")}
