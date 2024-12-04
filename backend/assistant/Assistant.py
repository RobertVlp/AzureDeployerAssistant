from assistant.keyVault.KeyVaultManager import KeyVaultManager
from assistant.functionApp.FunctionAppManager import FunctionAppManager
from assistant.resourceGroup.ResourceGroupManager import ResourceGroupManager
from assistant.storageAccount.StorageAccountManager import StorageAccountManager

class Assistant:
    def __init__(self, credential, subscription_id):
        self.credential = credential
        self.subscription_id = subscription_id
        self.key_vault_manager = KeyVaultManager(credential, subscription_id)
        self.function_app_manager = FunctionAppManager(credential, subscription_id)
        self.resource_group_manager = ResourceGroupManager(credential, subscription_id)
        self.storage_account_manager = StorageAccountManager(credential, subscription_id)

    def create_resource_group(self, params):
        return self.resource_group_manager.create_resource_group(**params)
    
    def create_storage_account(self, params):
        return self.storage_account_manager.create_storage_account(**params)
    
    def create_key_vault(self, params):
        return self.key_vault_manager.create_key_vault(**params)
    
    def create_function_app(self, params):
        return self.function_app_manager.create_function_app(**params)
        
    def get_available_functions(self):
        return {
            "create_resource_group": self.create_resource_group,
            "create_storage_account": self.create_storage_account,
            "create_key_vault": self.create_key_vault,
            "create_function_app": self.create_function_app
        }
