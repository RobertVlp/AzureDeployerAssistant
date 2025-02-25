using System.ClientModel;
using System.Text;
using AIAssistant.Models;
using Microsoft.Extensions.Logging;
using OpenAI.Assistants;
using Newtonsoft.Json.Linq;
using System.Text.Json;
using System.Net;

namespace AIAssistant.Assistants
{
    #pragma warning disable OPENAI001 // Type is for evaluation purposes only and is subject to change or removal in future updates. Suppress this diagnostic to proceed.
    public class OpenAIAssistant : IAssistant
    {
        private readonly ILogger<IAssistant> _logger;
        private readonly AssistantClient _client;
        private readonly Assistant _assistant;
        private readonly Dictionary<string, (string, Queue<RequiredActionUpdate>)> _pendingRequests;
        private readonly HashSet<string> _activeThreads;
        private static readonly JsonSerializerOptions _jsonSerializerOptions = new() { WriteIndented = true };

        public OpenAIAssistant(ILogger<IAssistant> logger)
        {
            _logger = logger;
            _client = new(Environment.GetEnvironmentVariable("OPENAI_API_KEY"));
            _assistant = _client.GetAssistant(Environment.GetEnvironmentVariable("ASSISTANT_ID"));
            _pendingRequests = [];
            _activeThreads = [];
        }

        public async Task<string> CreateThreadAsync()
        {
            AssistantThread thread = await _client.CreateThreadAsync();
            _activeThreads.Add(thread.Id);
            return thread.Id;
        }

        public async Task<List<string>> DeleteThreadAsync(AssistantRequest request)
        {
            (string threadId, _) = request;
            _activeThreads.Remove(threadId);
            await CancelPendingActionsAsync(threadId);
            await _client.DeleteThreadAsync(threadId);

            return [$"The thread with id {threadId} has been deleted."];
        }

        private async Task<List<string>> HandleStreamingUpdatesAsync(AsyncCollectionResult<StreamingUpdate> updates)
        {
            StringBuilder response = new();
            Queue<RequiredActionUpdate> pendingRequests = [];
            List<RequiredActionUpdate> allActions = [];

            try
            {
                ThreadRun? currentRun = null;

                do
                {
                    (currentRun, bool hasConfirmationActions) = await ProcessUpdatesAsync(updates, response, allActions);

                    if (currentRun != null && allActions.Count > 0)
                    {
                        if (hasConfirmationActions)
                        {
                            // If there are any confirmation actions, all actions need to wait for confirmation
                            allActions.ForEach(pendingRequests.Enqueue);
                            break;
                        }
                        else
                        {
                            // If no confirmation actions, process all actions immediately
                            List<ToolOutput> outputs = [];

                            foreach (var action in allActions)
                            {
                                string output = await CallToolAsync(action.FunctionName, action.FunctionArguments);
                                outputs.Add(new ToolOutput(action.ToolCallId, output));
                            }

                            allActions.Clear();

                            if (!_activeThreads.Contains(currentRun.ThreadId))
                            {
                                break;
                            }

                            updates = _client.SubmitToolOutputsToRunStreamingAsync(currentRun.ThreadId, currentRun.Id, outputs);
                        }
                    }
                    else
                    {
                        break;
                    }
                }
                while (currentRun?.Status.IsTerminal == false);

                return BuildResponse(response, pendingRequests, currentRun);
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Request timed out.");
                return ["The request timed out. Please try again."];
            }
        }

        private static async Task<(ThreadRun? currentRun, bool hasConfirmationActions)> ProcessUpdatesAsync(
            AsyncCollectionResult<StreamingUpdate> updates,
            StringBuilder response,
            List<RequiredActionUpdate> allActions
        )
        {
            ThreadRun? currentRun = null;
            bool hasConfirmationActions = false;

            if (updates != null)
            {
                await foreach (StreamingUpdate update in updates)
                {
                    switch (update)
                    {
                        case RequiredActionUpdate requiredActionUpdate:
                            string functionName = requiredActionUpdate.FunctionName;
                            allActions.Add(requiredActionUpdate);

                            if (functionName.StartsWith("create") || functionName.StartsWith("delete"))
                            {
                                hasConfirmationActions = true;
                            }
                            break;

                        case RunUpdate runUpdate:
                            currentRun = runUpdate;
                            break;

                        case MessageContentUpdate messageContentUpdate:
                            response.Append(messageContentUpdate.Text);
                            break;

                        default:
                            break;
                    }
                }
            }

            return (currentRun, hasConfirmationActions);
        }

        private List<string> BuildResponse(StringBuilder response, Queue<RequiredActionUpdate> pendingRequests, ThreadRun? currentRun)
        {
            List<string> responses = [];

            if (!string.IsNullOrEmpty(response.ToString()))
            {
                responses.Add(response.ToString());
            }

            if (pendingRequests.Count > 0 && currentRun != null)
            {
                _pendingRequests[currentRun.ThreadId] = (currentRun.Id, pendingRequests);
                StringBuilder builder = new();

                builder.Append("The following actions will be performed:\n");

                foreach (RequiredActionUpdate action in pendingRequests)
                {
                    string functionArguments = JsonSerializer.Serialize(
                        JsonSerializer.Deserialize<object>(action.FunctionArguments),
                        _jsonSerializerOptions
                    );
                    builder.Append($"{action.FunctionName} with arguments:\n{functionArguments}\n");
                }

                builder.Append("Do you want to proceed?");
                responses.Add(builder.ToString());
            }

            return responses;
        }

        public async Task<List<string>> ProcessRequestAsync(AssistantRequest request)
        {
            (string threadId, string prompt) = request;
            await CancelPendingActionsAsync(threadId);

            await _client.CreateMessageAsync(threadId, MessageRole.User, [prompt]);

            List<string> responses = await HandleStreamingUpdatesAsync(
                _client.CreateRunStreamingAsync(threadId, _assistant.Id)
            );

            return responses;
        }

        public async Task<List<string>> ConfirmActionAsync(AssistantRequest request)
        {
            (string threadId, string prompt) = request;
            (string runId, Queue<RequiredActionUpdate> pendingRequests) = _pendingRequests[threadId];
            List<ToolOutput> outputs = [];

            var run = await _client.GetRunAsync(threadId, runId);

            if (run.Value.Status == RunStatus.Expired)
            {
                _ = _client.CreateMessageAsync(threadId, MessageRole.Assistant, ["The action has expired. Please try again."]);
                return ["The action has expired. Please try again."];
            }

            if (prompt.Trim().ToLower().Equals("yes"))
            {
                while (pendingRequests.Count > 0)
                {
                    RequiredActionUpdate actionUpdate = pendingRequests.Dequeue();
                    string output = await CallToolAsync(actionUpdate.FunctionName, actionUpdate.FunctionArguments);
                    outputs.Add(new ToolOutput(actionUpdate.ToolCallId, output));
                }
                
                _pendingRequests.Remove(threadId);

                if (!_activeThreads.Contains(threadId))
                {
                    return ["The thread has been deleted."];
                }

                return await HandleStreamingUpdatesAsync(
                    _client.SubmitToolOutputsToRunStreamingAsync(threadId, runId, outputs)
                );
            }
            else
            {
                await CancelPendingActionsAsync(threadId);
                return ["No actions were executed. Try again or provide more specific instructions."];
            }
        }

        private async Task CancelPendingActionsAsync(string threadId)
        {
            if (_pendingRequests.TryGetValue(threadId, out (string, Queue<RequiredActionUpdate>) value))
            {
                _logger.LogInformation("Cancelling pending actions for thread {threadId}.", threadId);

                (string runId, _) = value;
                _pendingRequests.Remove(threadId);

                await _client.CancelRunAsync(threadId, runId);
                await _client.CreateMessageAsync(threadId, MessageRole.Assistant, ["The action has been cancelled."]);
            }
        }

        private async Task<string> CallToolAsync(string name, string arguments)
        {
            _logger.LogInformation("Calling tool {name} with arguments {arguments}.", name, arguments);

            HttpClient client = new();
            string body = JsonSerializer.Serialize(new { name, arguments });

            HttpRequestMessage request = new(HttpMethod.Get, "http://localhost:5000/api/v1/tools")
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json")
            };

            HttpResponseMessage response = await client.SendAsync(request);

            if (response.StatusCode != HttpStatusCode.OK && response.StatusCode != HttpStatusCode.InternalServerError)
            {
                throw new Exception($"Failed to call tool {name}: {response.ReasonPhrase}");
            }

            var jsonResponse = JObject.Parse(await response.Content.ReadAsStringAsync());

            return response.StatusCode switch
            {
                HttpStatusCode.OK => jsonResponse["response"]?.ToString() ?? string.Empty,
                _ => throw new Exception(jsonResponse["error"]?.ToString())
            };
        }
    }
}
