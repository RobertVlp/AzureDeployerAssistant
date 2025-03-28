using System.Net;
using System.Text;
using System.Text.Json;
using AIAssistant.Services;
using AIAssistant.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.ClientModel;

namespace AIAssistant
{
    public class AIAssistant(ILogger<AIAssistant> logger, IAssistant assistant, DbService dbClient)
    {
        private readonly ILogger<AIAssistant> _logger = logger;
        private readonly IAssistant _assistant = assistant;
        private readonly DbService _dbClient = dbClient;
        private readonly Dictionary<string, string> _assistants = AssistantHelper.GetAssistants();

        [Function("HandleOptionsRequest")]
        public static HttpResponseData HandleOptionsAsync([HttpTrigger(AuthorizationLevel.Anonymous, "options", Route = "{*route}")] HttpRequestData req)
        {
            var response = req.CreateResponse(HttpStatusCode.NoContent);
            return response;
        }

        [Function("CreateThread")]
        public async Task<HttpResponseData> CreateThreadAsync([HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequestData req)
        {
            _logger.LogInformation("Creating a new thread.");

            try
            {
                string threadId = await _assistant.CreateThreadAsync();
                return await CreateResponse(req, HttpStatusCode.OK, JsonSerializer.Serialize(new { threadId }));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create a new thread.");
                string error = $"Failed to create a new thread: {ex.Message}";
                return await CreateResponse(req, HttpStatusCode.BadRequest, JsonSerializer.Serialize(new { error }));
            }
        }

        [Function("DeleteThread")]
        public async Task<HttpResponseData> DeleteThreadAsync([HttpTrigger(AuthorizationLevel.Anonymous, "delete")] HttpRequestData req)
        {
            _logger.LogInformation("Deleting an existing thread.");

            try
            {
                AssistantRequest data = await ParseRequestBodyAsync(req);
                await _dbClient.DeleteChatHistoryAsync(data.ThreadId);
                string message = await _assistant.DeleteThreadAsync(data);
                return await CreateResponse(req, HttpStatusCode.OK, JsonSerializer.Serialize(message));
            }
            catch (ClientResultException ex) when (ex.Status == (int) HttpStatusCode.NotFound)
            {
                _logger.LogInformation("Thread already deleted.");
                return await CreateResponse(req, HttpStatusCode.OK, JsonSerializer.Serialize("Thread already deleted."));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to delete the thread.");
                string error = $"Failed to delete the thread: {ex.Message}";
                return await CreateResponse(req, HttpStatusCode.BadRequest, JsonSerializer.Serialize(new { error }));
            }
        }

        [Function("InvokeAssistant")]
        public async Task<HttpResponseData> InvokeAssistantAsync([HttpTrigger(AuthorizationLevel.Anonymous, "post")] HttpRequestData req)
        {
            _logger.LogInformation("Assistant received a new request.");
            return await RunAssistantAsync(req, _assistant.StreamResponseAsync);
        }

        [Function("ConfirmAction")]
        public async Task<HttpResponseData> ConfirmActionAsync([HttpTrigger(AuthorizationLevel.Anonymous, "post")] HttpRequestData req)
        {
            _logger.LogInformation("Assistant received an action confirmation.");
            return await RunAssistantAsync(req, _assistant.ConfirmActionAsync);
        }

        [Function("GetChatHistory")]
        public async Task<HttpResponseData> GetChatHistoryAsync([HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequestData req)
        {
            _logger.LogInformation("Retrieving chat history.");

            try
            {
                var chatHistory = await _dbClient.GetChatHistoryAsync();
                await AssistantHelper.UpdateChatHistoryThreadsAsync(chatHistory, _dbClient);
                return await CreateResponse(req, HttpStatusCode.OK, JsonSerializer.Serialize(chatHistory));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve chat history.");
                string error = $"Failed to retrieve chat history: {ex.Message}";
                return await CreateResponse(req, HttpStatusCode.BadRequest, JsonSerializer.Serialize(new { error }));
            }
        }

        private async Task<HttpResponseData> RunAssistantAsync(HttpRequestData req, Func<AssistantRequest, Stream, Task> RunAction)
        {
            AssistantRequest requestData = await ParseRequestBodyAsync(req);
            ChatMessage userMessage = new(requestData.ThreadId, "user", requestData.Prompt, DateTime.Now);
            ChatMessage? assistantMessage = null;
            HttpResponseData response = req.CreateResponse();

            if (RunAction != _assistant.ConfirmActionAsync)
            {
                await AssistantHelper.UpdateAssistantAsync(_assistant, _assistants[requestData.Assistant], requestData.Model);
                _logger.LogInformation("Current assistant is: {Assistant}, with model: {Model}", requestData.Assistant, requestData.Model);
            }

            response.Headers.Add("Content-Type", "text/event-stream");
            response.Headers.Add("Cache-Control", "no-cache");
            response.Headers.Add("Connection", "keep-alive");
            response.StatusCode = HttpStatusCode.OK;

            try
            {
                var capturingStream = new CapturingStream(response.Body);
                await RunAction(requestData, capturingStream);
                assistantMessage = new ChatMessage(requestData.ThreadId, "assistant", capturingStream.CapturedData, DateTime.Now);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during streaming.");
                var errorMessage = $"Error: {ex.Message}\n";

                assistantMessage = new ChatMessage(requestData.ThreadId, "assistant", errorMessage, DateTime.Now);
                await response.Body.WriteAsync(Encoding.UTF8.GetBytes(errorMessage));
            }
            finally
            {
                SaveChatMessages(userMessage, assistantMessage!);
            }

            return response;
        }

        private void SaveChatMessages(ChatMessage userMessage, ChatMessage assistantMessage)
        {
            if (!_assistant.DeletedThreads.Contains(userMessage.ThreadId))
            {
                Task.Run(async () => 
                {
                    await Task.WhenAll(
                        _dbClient.SaveChatMessageAsync(userMessage),
                        _dbClient.SaveChatMessageAsync(assistantMessage)
                    ).ConfigureAwait(false);
                });
            }
        }

        private static async Task<AssistantRequest> ParseRequestBodyAsync(HttpRequestData req)
        {
            string requestBody = await new StreamReader(req.Body).ReadToEndAsync();

            AssistantRequest requestData = JsonSerializer.Deserialize<AssistantRequest>(requestBody)
                ?? throw new BadHttpRequestException("Invalid request: body is empty.");

            return requestData;
        }

        private static async Task<HttpResponseData> CreateResponse(HttpRequestData req, HttpStatusCode statusCode, string message)
        {
            var response = req.CreateResponse(statusCode);
            response.Headers.Add("Content-Type", "application/json");
            await response.WriteStringAsync(message);
            return response;
        }
    }
}
