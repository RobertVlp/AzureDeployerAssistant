from azure.mgmt.keyvault import KeyVaultManagementClient

class KeyVaultManager:
    def __init__(self, credential, subscription_id):
        self.client = KeyVaultManagementClient(credential, subscription_id)

    def create_key_vault(self, resource_group_name, key_vault_name, location, access_policies=[]):
        tenantId = "2d8cc8ba-8dda-4334-9e5c-fac2092e9bac" # UPB - Azure for Students
        
        key_vault_params = {
            'location': location,
            'properties': {
                'sku': {'family': 'A', 'name': 'standard'},
                'tenant_id': tenantId,
                'access_policies': []
            }
        }

        for policy in access_policies:
            key_vault_params["properties"]["access_policies"].append(
                {
                    'tenant_id': tenantId,
                    "object_id": policy["object_id"],
                    "permissions": policy["permissions"]
                }
            )

        key_vault = self.client.vaults.begin_create_or_update(
            resource_group_name,
            key_vault_name,
            key_vault_params
        ).result()

        return f"Key Vault {key_vault.name} created successfully."
    
    def delete_key_vault(self, resource_group_name, key_vault_name):
        self.client.vaults.delete(
            resource_group_name,
            key_vault_name
        )

        return f"Key Vault {key_vault_name} deleted."
    
    def get_available_functions(self) -> dict:
        return {func: getattr(self, func) for func in dir(self) if callable(getattr(self, func)) and not func.startswith("__")}
