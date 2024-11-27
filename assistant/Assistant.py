from azure.mgmt.storage import StorageManagementClient
from azure.mgmt.keyvault import KeyVaultManagementClient
from azure.mgmt.web import WebSiteManagementClient
from azure.mgmt.resource import ResourceManagementClient
from azure.core.exceptions import ResourceExistsError

class Assistant:
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

    def create_key_vault(self, resource_group_name, key_vault_name, location, access_policies=[]):
        key_vault_client = KeyVaultManagementClient(self.credential, self.subscription_id)
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

        key_vault = key_vault_client.vaults.begin_create_or_update(
            resource_group_name,
            key_vault_name,
            key_vault_params
        ).result()

        return f"Key Vault {key_vault.name} created successfully."
    
    def create_function_app(self, resource_group_name, storage_account_name, function_app_name, location):
        web_client = WebSiteManagementClient(self.credential, self.subscription_id)
        storage_client = StorageManagementClient(self.credential, self.subscription_id)

        storage_account = storage_client.storage_accounts.get_properties(resource_group_name, storage_account_name)

        # Create an App Service Plan
        app_service_plan_async_operation = web_client.app_service_plans.begin_create_or_update(
            resource_group_name,
            'myAppServicePlan',
            {
                'location': location,
                'sku': {
                    'name': 'Y1',  # Y1 is the SKU for the Consumption plan
                    'tier': 'Consumption'
                },
                'kind': 'functionapp',
                'reserved': True
            }
        )

        app_service_plan = app_service_plan_async_operation.result()

        try:
            function_app_async_operation = web_client.web_apps.begin_create_or_update(
                resource_group_name,
                function_app_name,
                {
                    'location': location,
                    'server_farm_id': '/subscriptions/{}/resourceGroups/{}/providers/Microsoft.Web/serverfarms/{}'
                                        .format(self.subscription_id, resource_group_name, app_service_plan.name),
                    'site_config': {
                        'app_settings': [
                            {
                                'name': 'AzureWebJobsStorage', 
                                'value': 'DefaultEndpointsProtocol=https;AccountName={};AccountKey={};EndpointSuffix=core.windows.net'
                                            .format(storage_account.name, storage_account.primary_endpoints.blob)
                            },
                            {'name': 'FUNCTIONS_EXTENSION_VERSION', 'value': '~3'},
                            {'name': 'WEBSITE_RUN_FROM_PACKAGE', 'value': '1'}
                        ],
                        'linux_fx_version': 'PYTHON|3.8'
                    },
                    'kind': 'functionapp'
                }
            )

            function_app = function_app_async_operation.result()

            return f"Function App {function_app.name} created successfully."

        except ResourceExistsError as e:
            return f"Error: {e.message}"
        
    def get_available_functions(self):
        return {
            "create_resource_group": self.create_resource_group,
            "create_storage_account": self.create_storage_account,
            "create_key_vault": self.create_key_vault,
            "create_function_app": self.create_function_app
        }
