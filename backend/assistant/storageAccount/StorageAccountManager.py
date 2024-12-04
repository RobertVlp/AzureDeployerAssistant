from azure.mgmt.storage import StorageManagementClient

class StorageAccountManager:
    def __init__(self, credential, subscription_id):
        self.credential = credential
        self.subscription_id = subscription_id

    def create_storage_account(self, resource_group_name, storage_account_name, location) -> str:
        storage_client = StorageManagementClient(self.credential, self.subscription_id)

        storage_async_operation = storage_client.storage_accounts.begin_create(
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
