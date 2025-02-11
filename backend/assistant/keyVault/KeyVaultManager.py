from azure.mgmt.keyvault import KeyVaultManagementClient

class KeyVaultManager:
    def __init__(self, credential, subscription_id):
        self.client = KeyVaultManagementClient(credential, subscription_id)

    def create_key_vault(self, resource_group_name: str, key_vault_name: str, location: str, 
                        tenant_id: str = "2d8cc8ba-8dda-4334-9e5c-fac2092e9bac") -> str:
        # tenant_id "2d8cc8ba-8dda-4334-9e5c-fac2092e9bac": default for UPB - Azure for Students
        
        key_vault_params = {
            'location': location,
            'properties': {
                'sku': {'family': 'A', 'name': 'standard'},
                'tenant_id': tenant_id,
                'access_policies': []
            }
        }

        try:
            key_vault = self.client.vaults.begin_create_or_update(
                resource_group_name,
                key_vault_name,
                key_vault_params
            ).result()

            return f"Key Vault {key_vault.name} created successfully."
        except Exception as e:
            return f"Error creating key vault: {str(e)}"
        
    def manage_access_policies(self, resource_group_name: str, key_vault_name: str, operation: str, 
                           policies: list) -> str:
        if operation not in ["add", "remove"]:
            return "Invalid operation. Use 'add' to add policies or 'remove' to remove policies."

        try:
            # Get the current key vault properties
            key_vault = self.client.vaults.get(resource_group_name, key_vault_name)
            current_policies = key_vault.properties.access_policies

            # Perform the operation
            if operation == "add":
                for policy in policies:
                    current_policies.append({
                        "objectId": policy["object_id"],
                        "permissions": policy["permissions"]
                    })
            elif operation == "remove":
                current_policies = [
                    p for p in current_policies
                    if p["objectId"] not in [policy["object_id"] for policy in policies]
                ]

            # Update the key vault with the modified policies
            key_vault.properties.access_policies = current_policies
            updated_key_vault = self.client.vaults.begin_create_or_update(
                resource_group_name,
                key_vault_name,
                key_vault.as_dict()
            ).result()

            return f"Access policies for Key Vault {updated_key_vault.name} updated successfully."
        except Exception as e:
            return f"Error managing access policies: {str(e)}"
    
    def delete_key_vault(self, resource_group_name: str, key_vault_name: str) -> str:
        try:
            self.client.vaults.delete(
                resource_group_name,
                key_vault_name
            )

            return f"Key Vault {key_vault_name} deleted."
        except Exception as e:
            return f"Error deleting key vault: {str(e)}"
        
    def get_key_vault_info(self, resource_group_name: str, key_vault_name: str) -> str:
        try:
            key_vault = self.client.vaults.get(
                resource_group_name,
                key_vault_name
            )

            return str(key_vault.as_dict())
        except Exception as e:
            return f"Error getting key vault information: {str(e)}"
    
    def get_available_functions(self) -> dict:
        return {func: getattr(self, func) for func in dir(self) if callable(getattr(self, func)) and not func.startswith("__")}
