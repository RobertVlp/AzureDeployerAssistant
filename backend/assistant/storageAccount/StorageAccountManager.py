from azure.mgmt.storage import StorageManagementClient

class StorageAccountManager:
    def __init__(self, credential, subscription_id):
        self.client = StorageManagementClient(credential, subscription_id)

    def create_storage_account(self, resource_group_name, storage_account_name, location) -> str:
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
    
    def delete_storage_account(self, resource_group_name, storage_account_name) -> str:
        self.client.storage_accounts.delete(
            resource_group_name,
            storage_account_name
        )

        return f"Storage account {storage_account_name} was deleted."
    
    def get_available_functions(self) -> dict:
        return {func: getattr(self, func) for func in dir(self) if callable(getattr(self, func)) and not func.startswith("__")}
