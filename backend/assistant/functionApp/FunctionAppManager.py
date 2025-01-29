from azure.mgmt.web import WebSiteManagementClient
from azure.mgmt.storage import StorageManagementClient

class FunctionAppManager:
    def __init__(self, credential, subscription_id):
        self.credential = credential
        self.subscription_id = subscription_id
        self.web_client = WebSiteManagementClient(credential, subscription_id)

    def create_function_app(
            self,
            resource_group_name,
            storage_account_name,
            function_app_name, location,
            hosting_plan='consumption', 
            runtime_stack='PYTHON',
            runtime_version='3.8'
        ):
        storage_client = StorageManagementClient(self.credential, self.subscription_id)

        try:
            storage_account = storage_client.storage_accounts.get_properties(resource_group_name, storage_account_name)

            # Create an App Service Plan
            app_service_plan = self.create_app_service_plan(resource_group_name, f'{function_app_name}ServicePlan', location, hosting_plan)
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
                            {'name': 'FUNCTIONS_EXTENSION_VERSION', 'value': '~4'},
                            {'name': 'WEBSITE_RUN_FROM_PACKAGE', 'value': '1'}
                        ],
                        'linux_fx_version': f'{runtime_stack}|{runtime_version}'
                    },
                    'kind': 'functionapp'
                }
            )

            function_app = function_app_async_operation.result()

            return f"Function App {function_app.name} created successfully."

        except Exception as e:
            return f"Error creating Function App: {str(e)}"
        
    def create_app_service_plan(self, resource_group_name, app_service_plan_name, location, hosting_plan):
        app_service_plans = self.web_client.app_service_plans.list_by_resource_group(resource_group_name)
        found = any(plan.name == app_service_plan_name for plan in app_service_plans)

        if not found:
            hosting_plan = hosting_plan.strip().lower()

            skuOptions = {
                'elasticpremium': {'name': 'EP1', 'tier': 'ElasticPremium'},
                'consumption': {'name': 'Y1', 'tier': 'Consumption'},
                'basic': {'name': 'B1', 'tier': 'Basic'},
                'standard': {'name': 'S1', 'tier': 'Standard'},
                'premium': {'name': 'P1', 'tier': 'Premium'}
            }

            service_plan = self.web_client.app_service_plans.begin_create_or_update(
                resource_group_name,
                app_service_plan_name,
                {
                    'location': location,
                    'sku': skuOptions[hosting_plan],
                    'kind': 'functionapp',
                    'reserved': True
                }
            ).result()

            return service_plan
        else:
            return self.web_client.app_service_plans.get(resource_group_name, app_service_plan_name)
        
    def delete_function_app(self, resource_group_name, function_app_name):
        try:
            self.web_client.app_service_plans.delete(resource_group_name, f'{function_app_name}ServicePlan')
            self.web_client.web_apps.delete(resource_group_name, function_app_name)

            return f"Function App {function_app_name} deleted."
        except Exception as e:
            return f"Error deleting Function App: {str(e)}"
        
    def get_function_app_info(self, resource_group_name, function_app_name):
        try:
            function_app = self.web_client.web_apps.get(resource_group_name, function_app_name)

            return str(function_app.as_dict())
        except Exception as e:
            return f"Error getting Function App info: {str(e)}"
    
    def get_available_functions(self) -> dict:
        return {func: getattr(self, func) for func in dir(self) if callable(getattr(self, func)) and not func.startswith("__")}
