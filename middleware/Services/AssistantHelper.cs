using OpenAI.Assistants;
using Newtonsoft.Json.Linq;
using System.Text.Json;

namespace AIAssistant.Services;

public class AssistantHelper
{
    public static string? CurrentModel { get; private set; }

    public static void InitializeAssistant()
    {
        #pragma warning disable OPENAI001
        var apiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY") 
            ?? throw new InvalidOperationException("OPENAI_API_KEY is not set.");

        var client = new AssistantClient(apiKey);

        if (Environment.GetEnvironmentVariable("ASSISTANT_ID") is null)
        {
            string[] files = Directory.GetFiles("..\\..\\functions");

            if (files.Length == 0)
            {
                throw new InvalidOperationException("No assistant configuration files found.");
            }

            var assistantOptions = ConfigureAssistantOptions(files);
            var assistant = client.CreateAssistant("gpt-4o-mini", assistantOptions).Value;

            CurrentModel = assistant.Model;

            var settingsPath = "..\\..\\local.settings.json";
            var settings = JObject.Parse(File.ReadAllText(settingsPath));

            settings["Values"]!["ASSISTANT_ID"] = assistant.Id;
            File.WriteAllText(settingsPath, settings.ToString());
            Environment.SetEnvironmentVariable("ASSISTANT_ID", assistant.Id);
        }
        else
        {
            CurrentModel = client.GetAssistant(Environment.GetEnvironmentVariable("ASSISTANT_ID")).Value.Model;

            if (CurrentModel != "gpt-4o-mini")
            {
                UpdateAssistantModelAsync("gpt-4o-mini").Wait();
            }
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

    public static async Task UpdateAssistantModelAsync(string model)
    {
        var apiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY") 
            ?? throw new InvalidOperationException("OPENAI_API_KEY is not set.");

        var assistantId = Environment.GetEnvironmentVariable("ASSISTANT_ID") 
            ?? throw new InvalidOperationException("ASSISTANT_ID is not set.");

        // If this is a reasoning model
        var httpClient = new HttpClient();
        httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");
        httpClient.DefaultRequestHeaders.Add("OpenAI-Beta", "assistants=v2");
        var reasoning_effort = model.StartsWith('o') ? "high" : null;
        
        var content = new StringContent(
            JsonSerializer.Serialize(new { model, reasoning_effort }),
            System.Text.Encoding.UTF8, 
            "application/json"
        );

        await httpClient.PostAsync($"https://api.openai.com/v1/assistants/{assistantId}", content);

        CurrentModel = model;
    }
}
