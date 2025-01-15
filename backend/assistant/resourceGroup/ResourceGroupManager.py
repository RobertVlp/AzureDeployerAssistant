from azure.mgmt.resource import ResourceManagementClient

class ResourceGroupManager:
    def __init__(self, credential, subscription_id):
        self.credential = credential
        self.subscription_id = subscription_id
        self.client = ResourceManagementClient(credential, subscription_id)

    def create_resource_group(self, resource_group_name, location) -> str:
        try:
            resource_group = self.client.resource_groups.create_or_update(
                resource_group_name,
                {'location': location}
            )

            return f"Resource group {resource_group.name} created successfully."
        except Exception as e:
            return f"Error creating resource group: {str(e)}"
    
    def delete_resource_group(self, resource_group_name) -> str:
        try:
            resource_group_operation = self.client.resource_groups.begin_delete(resource_group_name)
            resource_group_operation.result()

            return f"Resource group {resource_group_name} deleted successfully."
        except Exception as e:
            return f"Error deleting resource group: {str(e)}"
    
    def get_resource_group_info(self, resource_group_name) -> str:
        try:
            resource_group = self.client.resource_groups.get(resource_group_name)
        except:
            return f"Resource group {resource_group_name} not found."

        resources = self.client.resources.list_by_resource_group(resource_group_name)
        resources_info = [
            {
                'name': resource.name,
                'type': resource.type,
                'location': resource.location,
                'kind': resource.kind,
                'tags': resource.tags,
            } 
            for resource in resources
        ]

        return str({
            'name': resource_group.name,
            'location': resource_group.location,
            'tags': resource_group.tags,
            'resources': resources_info
        })
    
    def get_available_functions(self) -> dict:
        return {func: getattr(self, func) for func in dir(self) if callable(getattr(self, func)) and not func.startswith("__")}
