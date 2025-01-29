from azure.mgmt.redis import RedisManagementClient
from assistant.network.NetworkManager import NetworkManager

class RedisManager:
    def __init__(self, credential, subscription_id):
        self.subscription_id = subscription_id
        self.client = RedisManagementClient(credential, subscription_id)
        self.network_manager = NetworkManager(credential, subscription_id)

    def create_redis(self, resource_group_name, redis_name, location, cache_size, consumption_plan='Basic') -> str:
        network_name = f'{redis_name}VNet'
        subnet_name = f'{redis_name}Subnet'
        consumption_plan = consumption_plan.strip()

        if consumption_plan == 'Premium':
            # Create virtual network
            self.network_manager.create_virtual_network(resource_group_name, network_name, location)
            # Create subnet
            self.network_manager.create_subnet(resource_group_name, network_name, subnet_name)

        try:
            sku = {
                'Basic': {
                    'name': 'Basic',
                    'family': 'C',
                    'capacity': cache_size
                },
                'Standard': {
                    'name': 'Standard',
                    'family': 'C',
                    'capacity': cache_size
                },
                'Premium': {
                    'name': 'Premium',
                    'family': 'P',
                    'capacity': cache_size
                }
            }

            # Create redis
            redis_params = {
                'location': location,
                'sku': sku[consumption_plan],
                # 'enable_non_ssl_port': True,
                # 'minimum_tls_version': '1.2',
                # 'redis_configuration': {
                #     'maxmemory-policy': 'allkeys-lru'
                # },
                # 'static_ip': '10.0.0.5',
                # 'subnet_id': ''
            }

            if consumption_plan == 'Premium':
                redis_params['subnet_id'] = ('/subscriptions/{}/resourceGroups/{}/providers/Microsoft.Network/virtualNetworks/{}/subnets/{}'
                                                .format(self.subscription_id, resource_group_name, network_name, subnet_name))

            self.client.redis.begin_create(
                resource_group_name,
                redis_name,
                redis_params
            ).result()
        except Exception as e:
            return f"Failed to create Redis {redis_name}: {str(e)}"
        
        return f"Redis {redis_name} created successfully"

    def delete_redis(self, resource_group_name, redis_name) -> str:
        try:
            self.client.redis.begin_delete(resource_group_name, redis_name).result()

            # Delete virtual network
            self.network_manager.delete_virtual_network(resource_group_name, f'{redis_name}VNet')
        except Exception as e:
            return f"Failed to delete Redis {redis_name}: {str(e)}"

        return f"Redis {redis_name} deleted successfully"

    def get_redis_info(self, resource_group_name, redis_name) -> str:
        try:
            return str(self.client.redis.get(resource_group_name, redis_name).as_dict())
        except Exception as e:
            return f"Failed to get Redis {redis_name} info: {str(e)}"

    def get_available_functions(self) -> dict:
        return {func: getattr(self, func) for func in dir(self) if callable(getattr(self, func)) and not func.startswith("__")}
