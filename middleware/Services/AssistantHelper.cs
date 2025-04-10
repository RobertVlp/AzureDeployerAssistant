using OpenAI.Assistants;
using Newtonsoft.Json.Linq;
using System.Text.Json;
using System.ClientModel;
using System.Net;
using System.Collections.Concurrent;

namespace AIAssistant.Services;

public class AssistantHelper
{
    #pragma warning disable OPENAI001
    private static readonly string _apiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY")
        ?? throw new InvalidOperationException("OPENAI_API_KEY is not set.");
    private static readonly AssistantClient _client = new(_apiKey);
    private static readonly ConcurrentDictionary<string, (string id, string model)> _assistants = GetAssistants();

    public static ConcurrentDictionary<string, (string id, string model)> Assistants => _assistants;

    public static void InitializeAssistant()
    {
        if (_assistants.IsEmpty)
        {
            string[] directories = Directory.GetDirectories("..\\..\\configs");
            List<string> allFunctionFiles = [];
            bool hasRunKqlScript = false;

            if (directories.Length == 0)
            {
                throw new InvalidOperationException("No configuration directories found.");
            }

            foreach (string directory in directories)
            {
                string directoryName = Path.GetFileName(directory);

                if (!directoryName.Equals("default"))
                {
                    string configFile = Path.Combine(directory, "config.json");

                    if (!File.Exists(configFile))
                    {
                        throw new FileNotFoundException($"Configuration file not found: {configFile}");
                    }

                    string[] functionFiles = Directory.GetFiles(Path.Combine(directory, "functions"));
                    AddFunctionFiles(functionFiles, allFunctionFiles, ref hasRunKqlScript);

                    if (functionFiles.Length == 0)
                    {
                        throw new FileNotFoundException($"No function files found in: {Path.Combine(directory, "functions")}");
                    }

                    CreateAssistant(configFile, functionFiles);
                }
            }

            // Create default assistant
            string defaultConfigFile = Path.Combine("..\\..\\configs", "default", "config.json");
            CreateAssistant(defaultConfigFile, [.. allFunctionFiles]);
        }
    }

    private static void AddFunctionFiles(string[] functionFiles, List<string> allFunctionFiles, ref bool hasRunKqlScript)
    {
        foreach (var file in functionFiles)
        {
            var fileName = Path.GetFileName(file);

            if (fileName.Equals("run_kql_script.json"))
            {
                if (!hasRunKqlScript)
                {
                    allFunctionFiles.Add(file);
                    hasRunKqlScript = true;
                }
            }
            else
            {
                allFunctionFiles.Add(file);
            }
        }
    }

    private static void CreateAssistant(string configFile, string[] functionFiles)
    {
        var config = File.ReadAllText(configFile);
        var assistantConfig = JObject.Parse(config);

        var assistantOptions = new AssistantCreationOptions()
        {
            Name = assistantConfig["name"]!.ToString(),
            Instructions = assistantConfig["instructions"]!.ToString(),
            Temperature = assistantConfig["temperature"]!.ToObject<float>()
        };

        foreach (string file in functionFiles)
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

        try
        {
            var assistant = _client.CreateAssistant(assistantConfig["model"]!.ToString(), assistantOptions).Value;
            _assistants.TryAdd(assistant.Name, (assistant.Id, assistant.Model));
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Exception while creating assistant: {ex.Message}", ex);
        }
    }

    public static Task<HttpResponseMessage> UpdateAssistantModelAsync(string assistantId, string model)
    {
        var httpClient = new HttpClient();
        httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_apiKey}");
        httpClient.DefaultRequestHeaders.Add("OpenAI-Beta", "assistants=v2");
        var reasoning_effort = model.StartsWith('o') ? "high" : null;
        int? temperature = model.StartsWith('o') ? null : 1;
        int? top_p = model.StartsWith('o') ? null : 1;
        
        var content = new StringContent(
            JsonSerializer.Serialize(new { model, reasoning_effort, temperature, top_p }),
            System.Text.Encoding.UTF8, 
            "application/json"
        );

        return httpClient.PostAsync($"https://api.openai.com/v1/assistants/{assistantId}", content);
    }

    public static async Task UpdateChatHistoryThreadsAsync(Dictionary<string, List<dynamic>> chatHistory, DbService dbClient)
    {
        var expiredThreads = new List<string>();
        Dictionary<string, List<dynamic>> updatedThreads = [];

        foreach (var (threadId, messages) in chatHistory)
        {
            try
            {
                await _client.GetThreadAsync(threadId);
            }
            catch (ClientResultException ex) when (ex.Status == (int) HttpStatusCode.NotFound)
            {
                var newThread = await _client.CreateThreadAsync();

                messages.ForEach(async message =>
                {
                    await _client.CreateMessageAsync(
                        newThread.Value.Id,
                        message.Role.Equals("user") ? MessageRole.User : MessageRole.Assistant,
                        [message.Text]
                    );
                });

                expiredThreads.Add(threadId);
                updatedThreads.Add(newThread.Value.Id, messages);
                await dbClient.UpdateChatThreadsAsync(threadId, newThread.Value.Id);
            }
            catch (Exception)
            {
                throw;
            }
        }

        expiredThreads.ForEach(threadId => chatHistory.Remove(threadId));
        
        foreach (var (threadId, messages) in updatedThreads)
        {
            chatHistory.Add(threadId, messages);
        }
    }

    private static ConcurrentDictionary<string, (string id, string model)> GetAssistants()
    {
        var assistants = new ConcurrentDictionary<string, (string id, string model)>();
        var assistantsList = _client.GetAssistants();

        foreach (var assistant in assistantsList)
        {
            assistants.TryAdd(assistant.Name, (assistant.Id, assistant.Model));
        }

        return assistants;
    }
}
