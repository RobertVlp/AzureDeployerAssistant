from assistant.redis.RedisManager import RedisManager
from assistant.keyVault.KeyVaultManager import KeyVaultManager
from assistant.functionApp.FunctionAppManager import FunctionAppManager
from assistant.resourceGroup.ResourceGroupManager import ResourceGroupManager
from assistant.virtualMachine.VirtualMachineManager import VirtualMachineManager
from assistant.storageAccount.StorageAccountManager import StorageAccountManager

class Assistant:
    def __init__(self, credential, subscription_id):
        self.key_vault_manager = KeyVaultManager(credential, subscription_id)
        self.function_app_manager = FunctionAppManager(credential, subscription_id)
        self.resource_group_manager = ResourceGroupManager(credential, subscription_id)
        self.storage_account_manager = StorageAccountManager(credential, subscription_id)
        self.virtual_machine_manager = VirtualMachineManager(credential, subscription_id)
        self.redis_manager = RedisManager(credential, subscription_id)
        
    def get_available_functions(self):
        key_vault_functions = self.key_vault_manager.get_available_functions()
        function_app_functions = self.function_app_manager.get_available_functions()
        resource_group_functions = self.resource_group_manager.get_available_functions()
        storage_account_functions = self.storage_account_manager.get_available_functions()
        virtual_machine_functions = self.virtual_machine_manager.get_available_functions()
        redis_functions = self.redis_manager.get_available_functions()

        return {
            **key_vault_functions,
            **function_app_functions,
            **resource_group_functions,
            **storage_account_functions,
            **virtual_machine_functions,
            **redis_functions
        }
