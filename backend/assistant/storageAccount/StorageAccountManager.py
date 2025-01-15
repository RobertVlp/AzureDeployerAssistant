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
                    'location': location
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
    
    def get_available_functions(self) -> dict:
        return {func: getattr(self, func) for func in dir(self) if callable(getattr(self, func)) and not func.startswith("__")}
