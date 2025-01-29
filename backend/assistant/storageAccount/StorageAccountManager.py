from azure.mgmt.storage import StorageManagementClient

class StorageAccountManager:
    def __init__(self, credential, subscription_id):
        self.client = StorageManagementClient(credential, subscription_id)

    def create_storage_account(self, resource_group_name, storage_account_name, location) -> str:
        try:
            storage_async_operation = self.client.storage_accounts.begin_create(
                resource_group_name,
                storage_account_name,
                {
                    'sku': {'name': 'Standard_LRS'},
                    'kind': 'StorageV2',
                    'location': location,
                    'encryption': {
                        'services': {
                            'file': {
                                'key_type': 'Account',
                                'enabled': True
                            },
                            'blob': {
                                'key_type': 'Account',
                                'enabled': True
                            }
                        },
                        'key_source': 'Microsoft.Storage'
                    }
                }
            )

            storage_async_operation.result()
            return f"Storage account {storage_account_name} was created."
        except Exception as e:
            return f"Error creating storage account: {str(e)}"
    
    def delete_storage_account(self, resource_group_name, storage_account_name) -> str:
        try:
            self.client.storage_accounts.delete(
                resource_group_name,
                storage_account_name
            )

            return f"Storage account {storage_account_name} was deleted."
        except Exception as e:
            return f"Error deleting storage account: {str(e)}"
        
    def create_blob_container(self, resource_group_name, storage_account_name, container_name) -> str:
        try:
            self.client.blob_containers.create(
                resource_group_name,
                storage_account_name,
                container_name,
                {}
            )

            return f"Blob container {container_name} was created."
        except Exception as e:
            return f"Error creating blob container: {str(e)}"
        
    def delete_blob_container(self, resource_group_name, storage_account_name, container_name) -> str:
        try:
            self.client.blob_containers.delete(
                resource_group_name,
                storage_account_name,
                container_name
            )

            return f"Blob container {container_name} was deleted."
        except Exception as e:
            return f"Error deleting blob container: {str(e)}"
        
    def get_storage_account_info(self, resource_group_name, storage_account_name) -> str:
        try:
            storage_account = self.client.storage_accounts.get_properties(
                resource_group_name,
                storage_account_name
            )

            return str(storage_account.as_dict())
        except Exception as e:
            return f"Error getting storage account info: {str(e)}"
    
    def get_available_functions(self) -> dict:
        return {func: getattr(self, func) for func in dir(self) if callable(getattr(self, func)) and not func.startswith("__")}
