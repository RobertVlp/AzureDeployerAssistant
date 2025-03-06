from azure.mgmt.keyvault import KeyVaultManagementClient
from azure.mgmt.keyvault.models import AccessPolicyEntry
from azure.mgmt.keyvault.models import Permissions

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
        
    def add_access_policies(self, resource_group_name: str, key_vault_name: str, policies: list) -> str:
        try:
            key_vault = self.client.vaults.get(resource_group_name, key_vault_name)
            current_policies = key_vault.properties.access_policies

            for policy in policies:
                policyEntry = AccessPolicyEntry(
                    object_id=policy["object_id"],
                    tenant_id=policy["tenant_id"],
                    permissions=Permissions(
                        keys=policy["keys"] if "keys" in policy else None,
                        secrets=policy["secrets"] if "secrets" in policy else None,
                        certificates=policy["certificates"] if "certificates" in policy else None
                    )
                )
                current_policies.append(policyEntry)

            # Update the key vault with the modified policies
            key_vault.properties.access_policies = current_policies
            updated_key_vault = self.client.vaults.begin_create_or_update(
                resource_group_name,
                key_vault_name,
                key_vault
            ).result()

            return f"Access policies for Key Vault {updated_key_vault.name} updated successfully."
        except Exception as e:
            return f"Error adding access policies: {str(e)}"
        
    def remove_access_policies(self, resource_group_name: str, key_vault_name: str, policies: list) -> str:
        if not policies:
            return "Policies list is empty. No changes made."
        
        response = ""
        
        try:
            key_vault = self.client.vaults.get(resource_group_name, key_vault_name)
            current_policies = key_vault.properties.access_policies

            for policy in policies:
                isChanged = False
                existing_policies = [
                    p for p in current_policies
                    if p.object_id == policy["object_id"] and p.tenant_id == policy["tenant_id"]
                ]

                if not existing_policies:
                    response += f"No policies found for object_id {policy['object_id']} and tenant_id {policy['tenant_id']}.\n"
                    continue

                for existing_policy in existing_policies:
                    if "keys" in policy and policy["keys"]:
                        isChanged = True
                        existing_policy.permissions.keys = [p for p in existing_policy.permissions.keys
                                                            if p not in policy["keys"]]
                    if "secrets" in policy and policy["secrets"]:
                        isChanged = True
                        existing_policy.permissions.secrets = [p for p in existing_policy.permissions.secrets
                                                               if p not in policy["secrets"]]
                    if "certificates" in policy and policy["certificates"]:
                        isChanged = True
                        existing_policy.permissions.certificates = [p for p in existing_policy.permissions.certificates
                                                                    if p not in policy["certificates"]]

                    if not existing_policy.permissions.keys and not existing_policy.permissions.secrets and not existing_policy.permissions.certificates:
                        current_policies.remove(existing_policy)

                if not isChanged:
                    response += f"No changes made for object_id {policy['object_id']} and tenant_id {policy['tenant_id']}.
                                    Please specify which permissions to remove.\n"
                else:
                    response += f"Permissions removed for object_id {policy['object_id']} and tenant_id {policy['tenant_id']}.\n"

            key_vault.properties.access_policies = current_policies
            updated_key_vault = self.client.vaults.begin_create_or_update(
                resource_group_name,
                key_vault_name,
                key_vault
            ).result()

            return f"Remove access policies for Key Vault {updated_key_vault.name} ended with:\n{response}"
        except Exception as e:
            return f"Error removing access policies: {str(e)}"
    
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
