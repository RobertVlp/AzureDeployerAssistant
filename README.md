# Azure Deployer Assistant
This repository containes the code for the *Azure Deployer Assistant* project, which was developed as part of my bachelor's thesis at University POLITEHNICA of Bucharest. A complete description and other important details can be found in the [written thesis report](TODO). The project is not affiliated with Microsoft or Azure, and it is not an official product of Microsoft.

## Overview
Rapid advancements in the field of Large Language Models (LLMs) enabled new opportunities to simplify and automate repetitive tasks. The integration of LLMs with cloud platforms like *Microsoft Azure* represents a new area of research and development, with potential to change the way users employ and manage cloud computing services. This project comes as an extension of the existing *Copilot in Azure*, which is currently in the preview phase. A primary limitation of this system is that it does not allow users to effectively interact with their Azure environments, being more focused on providing general information and guidance. The *Azure Deployer Assistant* is a tool designed to overcome this drawback, helping with the deployment of key Azure resources. The main purpose is to simplify the process of creating, deleting or getting information about resources that are deployed on Azure. This is done by leveraging the power of LLMs, which have the ability to perform complex tasks using different augmentation techniques (e.g. function calling). Users can perform these actions by simply describing the desired configuration of the resources in natural language.

## Features
The *Azure Deployer Assistant* is a standalone application that can be used to interact with an Azure environment (i.e. Azure subscription). It allows users to perform the following actions:

- **Create resources**: Create several Azure resources such as virtual machines, storage accounts, blob containers, key vaults, function apps, virtual networks, redis caches, and resource groups by providing a descriptions of their configuration.
- **Delete resources**: Delete the previously mentioned Azure resources.
- **Get information about resources**: Retrieve information about their Azure resources, such as their status, configuration, and usage statistics.
- **General questions answering**: Provide answers to queries like "List all resources deployed in my subscription." or "How many virtual machines are currently running?", 
  allowing users to gain insights into their environment.

The LLMs used in this project are `gpt-4o-mini` and `o3-mini`. You have the option to choose which of these models to use, depending on the complexity of the task that you want to perform. The `gpt-4o-mini` model is faster and more cost-effective for simpler tasks, while the `o3-mini` model is more capable and can handle more complex queries.

## Usage
This project requires you to have an active Azure subscription, an OpenAI API key and Docker installed on your system. To enable the assistant to interact with your Azure resources, you will need to create a service principal and assign it the necessary permissions. The service principal will be used to authenticate the assistant and allow it to perform actions on your environment.
You can create a service principal using the Azure CLI with the following command:
```bash
az ad sp create-for-rbac --name "azure-deployer-assistant" --role Contributor --scopes /subscriptions/<your-azure-subscription-id>
```

To use the *Azure Deployer Assistant*, you can follow these steps:
1. Clone the repository
2. Create a `.env` file in the root directory of the project. The `.env` file should look like this:
   ```
    # Standard environment variables
    DB_CONNECTION_STRING=Host=postgres-container;Port=5432;Username=admin;Password=admin;Database=ChatMessages
    BACKEND_ENDPOINT=http://backend:5000/api/v1/tools
    VITE_API_URL=http://localhost:8000/api

    # OpenAI API key
    OPENAI_API_KEY=<your-openai-api-key>

    # Subscription id
    AZURE_SUBSCRIPTION_ID=<your-azure-subscription-id>

    # Credential configuration (service principal)
    AZURE_TENANT_ID=<azure-tenant-id>
    AZURE_CLIENT_ID=<azure-client-id>
    AZURE_CLIENT_SECRET=<azure-client-secret>
   ```
3. Build and run the Docker containers using Docker Compose:
   ```bash
   docker-compose up -d
   ```
4. Open your web browser and navigate to `http://localhost:3000` to access the application.

## Future Work
The *Azure Deployer Assistant* is open for contributions, and there are several areas for future development and improvement:
- **Support for more Azure resources**: The current version supports a limited set of Azure resources. Future versions can add support for additional ones, such as Azure SQL databases, Azure Event Hubs, Azure Kubernetes Service etc.
- **Adding additional features**: The assistant can be extended with more features, such as the ability to update existing resources or perform more complex operations.
- **Integration with other cloud providers**: The assistant can be extended to support integration with other cloud providers, such as AWS and Google Cloud Platform, allowing users to manage resources across multiple cloud environments.
- **Using other LLMs**: This implementation uses `gpt-4o-mini` and `o3-mini` models. There are many open-source alternatives that can be tested, such as those from the xLAM-2, LLama-3 or Qwen families.
