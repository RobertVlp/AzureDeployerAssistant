using System.ClientModel;
using System.Text;
using AIAssistant.Models;
using Microsoft.Extensions.Logging;
using OpenAI.Assistants;
using Newtonsoft.Json.Linq;
using System.Text.Json;
using System.Net;
using AIAssistant.Services;
using System.Collections.Concurrent;

namespace AIAssistant.Assistants
{
    #pragma warning disable OPENAI001 // Type is for evaluation purposes only and is subject to change or removal in future updates. Suppress this diagnostic to proceed.
    public class OpenAIAssistant(ILogger<IAssistant> logger) : IAssistant
    {
        private readonly ILogger<IAssistant> _logger = logger;
        private readonly AssistantClient _client = new(Environment.GetEnvironmentVariable("OPENAI_API_KEY"));
        private readonly ConcurrentDictionary<string, (string runId, Queue<RequiredActionUpdate> pendingActions)> _pendingRequests = [];
        private readonly ConcurrentDictionary<string, byte> _deletedThreads = [];
        private static readonly JsonSerializerOptions _jsonSerializerOptions = new() { WriteIndented = true };
        private readonly ConcurrentDictionary<string, (string id, string model)> _assistants = AssistantHelper.Assistants;

        public ConcurrentDictionary<string, byte> DeletedThreads => _deletedThreads;

        public async Task<string> CreateThreadAsync()
        {
            AssistantThread thread = await _client.CreateThreadAsync();
            return thread.Id;
        }

        public async Task<string> DeleteThreadAsync(AssistantRequest request)
        {
            (string threadId, _) = request;
            _deletedThreads[threadId] = 0;
            await CancelPendingActionsAsync(threadId);
            await _client.DeleteThreadAsync(threadId);

            return $"The thread with id {threadId} has been deleted.";
        }

        public async Task StreamResponseAsync(AssistantRequest request, Stream responseStream)
        {
            (string threadId, string prompt) = request;

            await CancelPendingActionsAsync(threadId);
            await _client.CreateMessageAsync(threadId, MessageRole.User, [prompt]);

            string assistantId = await GetAssistantIdAsync(request);
            var updates = _client.CreateRunStreamingAsync(threadId, assistantId);

            try
            {
                await HandleUpdatesAsync(responseStream, updates);
            }
            catch (Exception ex)
            {
                await HandleExceptionOnUpdatesAsync(responseStream, threadId, ex);
            }
            finally
            {
                await responseStream.FlushAsync();
            }
        }

        private async ValueTask<string> GetAssistantIdAsync(AssistantRequest request)
        {
            (string assistantId, string model) = _assistants[request.Assistant];

            if (!model.Equals(request.Model))
            {
                _logger.LogInformation("Updating model for assistant '{assistant}' to '{model}'.", request.Assistant, request.Model);
                var res = await AssistantHelper.UpdateAssistantModelAsync(assistantId, request.Model);

                if (res.StatusCode != HttpStatusCode.OK)
                {
                    throw new InvalidOperationException($"Failed to update assistant model: {res.ReasonPhrase}");
                }

                _assistants[request.Assistant] = (assistantId, request.Model);
            }

            return assistantId;
        }

        public async Task ConfirmActionAsync(AssistantRequest request, Stream responseStream)
        {
            (string threadId, string prompt) = request;
            (string runId, Queue<RequiredActionUpdate> pendingRequests) = _pendingRequests[threadId];

            var run = await _client.GetRunAsync(threadId, runId);

            if (run.Value.Status == RunStatus.Expired)
            {
                _ = _client.CreateMessageAsync(threadId, MessageRole.Assistant, ["The action has expired. Please try again."]);
                string message = "The action has expired. Please try again.";
                await WriteMessageAsync(responseStream, message);
                return;
            }

            if (prompt.Trim().ToLower().Equals("yes"))
            {
                List<Task<ToolOutput>> tasks = [];

                while (pendingRequests.Count > 0)
                {
                    RequiredActionUpdate actionUpdate = pendingRequests.Dequeue();
                    tasks.Add(CallToolAsync(actionUpdate));
                }
                
                _pendingRequests.TryRemove(threadId, out _);

                if (_deletedThreads.ContainsKey(threadId))
                {
                    return;
                }

                List<ToolOutput> outputs = [.. await Task.WhenAll(tasks)];

                var updates = _client.SubmitToolOutputsToRunStreamingAsync(threadId, runId, outputs);

                try
                {
                    await HandleUpdatesAsync(responseStream, updates);
                }
                catch (Exception ex)
                {
                    await HandleExceptionOnUpdatesAsync(responseStream, threadId, ex);
                }
            }
            else
            {
                await CancelPendingActionsAsync(threadId);
                string message = "No actions were executed. Try again or provide more specific instructions.";
                await WriteMessageAsync(responseStream, message);
            }
        }

        private async ValueTask CancelPendingActionsAsync(string threadId)
        {
            if (_pendingRequests.TryGetValue(threadId, out (string, Queue<RequiredActionUpdate>) value))
            {
                _logger.LogInformation("Cancelling pending actions for thread {threadId}.", threadId);

                (string runId, _) = value;
                _pendingRequests.TryRemove(threadId, out _);

                var run = await _client.GetRunAsync(threadId, runId);

                if (run.Value.Status != RunStatus.Expired)
                {
                    await _client.CancelRunAsync(threadId, runId);
                    await _client.CreateMessageAsync(threadId, MessageRole.Assistant, ["The action has been cancelled."]);
                }
            }
        }

        private async Task<ToolOutput> CallToolAsync(RequiredActionUpdate actionUpdate)
        {
            string name = actionUpdate.FunctionName;
            string arguments = actionUpdate.FunctionArguments;

            _logger.LogInformation("Calling tool {name} with arguments {arguments}.", name, arguments);

            HttpClient client = new()
            {
                Timeout = TimeSpan.FromSeconds(600),
            };

            string body = JsonSerializer.Serialize(new { name, arguments });

            HttpRequestMessage request = new(HttpMethod.Post, Environment.GetEnvironmentVariable("BACKEND_ENDPOINT"))
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json"),
            };

            HttpResponseMessage response = await client.SendAsync(request);

            if (response.StatusCode != HttpStatusCode.OK && response.StatusCode != HttpStatusCode.InternalServerError)
            {
                return new ToolOutput(actionUpdate.ToolCallId, $"Failed to call tool {name}: {response.ReasonPhrase}");
            }

            var jsonResponse = JObject.Parse(await response.Content.ReadAsStringAsync());

            return response.StatusCode switch
            {
                HttpStatusCode.OK => new ToolOutput(actionUpdate.ToolCallId, jsonResponse["response"]?.ToString()),
                _ => new ToolOutput(actionUpdate.ToolCallId, jsonResponse["error"]?.ToString())
            };
        }

        private async Task HandleExceptionOnUpdatesAsync(Stream responseStream, string threadId, Exception ex)
        {
            await CancelThreadRunsAsync(threadId);

            if (ex is OperationCanceledException || ex is TaskCanceledException)
            {
                var timeoutMessage = Encoding.UTF8.GetBytes("\nSomething went wrong, the request timed out.");
                await responseStream.WriteAsync(timeoutMessage);
                _logger.LogWarning("Request timed out.");
            }
            else
            {
                throw ex;
            }
        }

        private async Task CancelThreadRunsAsync(string threadId)
        {
            _logger.LogInformation("Exception was thrown, cancelling all runs for thread {threadId}.", threadId);

            var runs = _client.GetRunsAsync(threadId);

            if (runs != null)
            {
                await foreach (ThreadRun run in runs)
                {
                    if (run.Status == RunStatus.InProgress || run.Status == RunStatus.Queued)
                    {
                        await _client.CancelRunAsync(threadId, run.Id);
                    }
                }
            }
        }

        private async Task HandleUpdatesAsync(Stream responseStream, AsyncCollectionResult<StreamingUpdate> updates)
        {            
            Queue<RequiredActionUpdate> pendingRequests = [];
            List<RequiredActionUpdate> allActions = [];
            ThreadRun? currentRun = null;

            do
            {
                (currentRun, bool hasConfirmationActions) = await ProcessStreamingUpdatesAsync(updates, responseStream, allActions);

                if (currentRun != null && allActions.Count > 0)
                {
                    if (hasConfirmationActions)
                    {
                        allActions.ForEach(pendingRequests.Enqueue);
                        await WriteConfirmationMessageAsync(responseStream, pendingRequests);
                        _pendingRequests[currentRun.ThreadId] = (currentRun.Id, pendingRequests);
                        break;
                    }
                    else
                    {
                        List<Task<ToolOutput>> tasks = [.. allActions.Select(CallToolAsync)];
                        allActions.Clear();

                        if (_deletedThreads.ContainsKey(currentRun.ThreadId))
                        {
                            break;
                        }

                        List<ToolOutput> outputs = [.. await Task.WhenAll(tasks)];
                        updates = _client.SubmitToolOutputsToRunStreamingAsync(currentRun.ThreadId, currentRun.Id, outputs);
                    }
                }
                else
                {
                    break;
                }
            }
            while (currentRun?.Status.IsTerminal == false);
        }

        private static async Task<(ThreadRun? currentRun, bool hasConfirmationActions)> ProcessStreamingUpdatesAsync(
            AsyncCollectionResult<StreamingUpdate> updates,
            Stream responseStream,
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
                            await WriteMessageAsync(responseStream, messageContentUpdate.Text);
                            break;

                        default:
                            break;
                    }
                }
            }

            return (currentRun, hasConfirmationActions);
        }

        private static async Task WriteConfirmationMessageAsync(Stream responseStream, Queue<RequiredActionUpdate> pendingRequests)
        {
            string header = "\nThe following actions will be performed:\n";
            await responseStream.WriteAsync(Encoding.UTF8.GetBytes(header));

            foreach (RequiredActionUpdate action in pendingRequests)
            {
                string functionArguments = JsonSerializer.Serialize(
                    JsonSerializer.Deserialize<object>(action.FunctionArguments),
                    _jsonSerializerOptions
                );
                string line = $"{action.FunctionName} with arguments:\n{functionArguments}\n";
                await responseStream.WriteAsync(Encoding.UTF8.GetBytes(line));
            }

            string footer = "Do you want to proceed?\n";
            await WriteMessageAsync(responseStream, footer);
        }

        private static async Task WriteMessageAsync(Stream responseStream, string message)
        {
            await responseStream.WriteAsync(Encoding.UTF8.GetBytes(message));
            await responseStream.FlushAsync();
        }
    }
}
