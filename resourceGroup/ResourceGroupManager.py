from azure.mgmt.resource import ResourceManagementClient

class ResourceGroupManager:
    def __init__(self, credential, subscription_id):
        self.credential = credential
        self.subscription_id = subscription_id

    def create_resource_group(self, resource_group_name, location) -> str:
        resource_client = ResourceManagementClient(self.credential, self.subscription_id)

        resource_group = resource_client.resource_groups.create_or_update(
            resource_group_name,
            {'location': location}
        )

        return f"Resource group {resource_group.name} created successfully."
