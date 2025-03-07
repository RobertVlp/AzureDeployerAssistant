from azure.mgmt.resourcegraph import ResourceGraphClient
from azure.mgmt.resourcegraph.models import QueryRequest

class ResourceGraphManager:
    def __init__(self, credential):
        self.client = ResourceGraphClient(credential)

    def run_kql_script(self, kql_script: str) -> str:
        request = QueryRequest(query=kql_script)
        response = self.client.resources(request)

        return str(response.data)
    
    def get_available_functions(self):
        return {func: getattr(self, func) for func in dir(self) if callable(getattr(self, func)) and not func.startswith("__")}
