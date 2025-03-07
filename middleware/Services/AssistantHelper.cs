using OpenAI.Assistants;
using Newtonsoft.Json.Linq;

namespace AIAssistant.Services;

public class AssistantHelper
{
    public static void InitializeAssistant()
    {
        var apiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY") 
            ?? throw new InvalidOperationException("OPENAI_API_KEY is not set.");

        if (Environment.GetEnvironmentVariable("ASSISTANT_ID") is null)
        {
            #pragma warning disable OPENAI001
            string[] files = Directory.GetFiles("..\\..\\functions");

            if (files.Length == 0)
            {
                throw new InvalidOperationException("No assistant configuration files found.");
            }

            var assistantOptions = ConfigureAssistantOptions(files);
            var client = new AssistantClient(apiKey);
            var assistant = client.CreateAssistant("gpt-4o-mini", assistantOptions).Value;

            var settingsPath = "..\\..\\local.settings.json";
            var settings = JObject.Parse(File.ReadAllText(settingsPath));

            settings["Values"]!["ASSISTANT_ID"] = assistant.Id;
            File.WriteAllText(settingsPath, settings.ToString());
            Environment.SetEnvironmentVariable("ASSISTANT_ID", assistant.Id);
        }
    }

    private static AssistantCreationOptions ConfigureAssistantOptions(string[] files)
    {
        AssistantCreationOptions assistantOptions = new()
        {
            Name = "Azure Deployer Assistant V2",
            Instructions = "You are an AI assistant designed to help users deploy, manage, and optimize resources in Microsoft Azure.\n" +
                "Your role is to guide users through the process of creating, configuring, and monitoring Azure resources by" +
                "utilizing the available functions. Always ensure that the solutions you propose are secure, cost-effective," +
                "and aligned with best practices. If additional information is needed to proceed, ask clarifying questions" +
                "before taking any action.\n Don't perform the tool calls in parallel if dependencies exist: for example, if" +
                "the query is \"Create a Function App in a new Resource Group\", create a resource group first and then proceed" +
                "with the function app.\n Determine whether you can generate a KQL script that can be used to fulfill the user's" +
                "request (e.g., \"List all resource groups in my subscription.\" or \"Give me a list of all VMs ordered by OS\""+
                "type\"). If so, generate the script and ask if you should run it using the available tool.",
            Temperature = 1.0f
        };

        foreach (string file in files)
        {
            string jsonContent = File.ReadAllText(file);
            var tool = JObject.Parse(jsonContent);

            assistantOptions.Tools.Add(new FunctionToolDefinition()
            {
                FunctionName = tool["name"]!.ToString(),
                Description = tool["description"]!.ToString(),
                Parameters = BinaryData.FromString(tool["parameters"]!.ToString())
            });
        }

        return assistantOptions;
    }
}
