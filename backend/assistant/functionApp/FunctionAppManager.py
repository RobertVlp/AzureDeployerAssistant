from azure.mgmt.web import WebSiteManagementClient
from azure.mgmt.storage import StorageManagementClient

class FunctionAppManager:
    def __init__(self, credential, subscription_id):
        self.credential = credential
        self.subscription_id = subscription_id
        self.web_client = WebSiteManagementClient(credential, subscription_id)

    def create_function_app(self, resource_group_name, storage_account_name, function_app_name, location):
        storage_client = StorageManagementClient(self.credential, self.subscription_id)

        storage_account = storage_client.storage_accounts.get_properties(resource_group_name, storage_account_name)

        try:
            # Create an App Service Plan
            app_service_plan_async_operation = self.web_client.app_service_plans.begin_create_or_update(
                resource_group_name,
                f'{function_app_name}ServicePlan',
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
        except Exception as e:
            return f"Error creating App Service Plan required for function app: {str(e)}"

        try:
            function_app_async_operation = self.web_client.web_apps.begin_create_or_update(
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

        except Exception as e:
            return f"Error creating Function App: {str(e)}"
        
    def delete_function_app(self, resource_group_name, function_app_name):
        try:
            self.web_client.app_service_plans.delete(resource_group_name, f'{function_app_name}ServicePlan')
            self.web_client.web_apps.delete(resource_group_name, function_app_name)

            return f"Function App {function_app_name} deleted."
        except Exception as e:
            return f"Error deleting Function App: {str(e)}"
    
    def get_available_functions(self) -> dict:
        return {func: getattr(self, func) for func in dir(self) if callable(getattr(self, func)) and not func.startswith("__")}
