using System.Net;
using System.Text;
using System.Text.Json;
using AIAssistant.Services;
using AIAssistant.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace AIAssistant
{
    public class AIAssistant
    {
        private readonly ILogger<AIAssistant> _logger;
        private readonly IAssistant _assistant;
        private readonly DbService _dbClient;

        public AIAssistant(ILogger<AIAssistant> logger, IAssistant assistant, DbService dbClient)
        {
            _logger = logger;
            _assistant = assistant;
            _dbClient = dbClient;
            _dbClient.InitializeDatabase();
        }

        [Function("CreateThread")]
        public async Task<ContentResult> CreateThreadAsync([HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequest req)
        {
            _logger.LogInformation("Creating a new thread.");

            try
            {
                string threadId = await _assistant.CreateThreadAsync();
                return CreateResponse(HttpStatusCode.OK, JsonSerializer.Serialize(new { threadId }));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create a new thread.");
                string error = $"Failed to create a new thread: {ex.Message}";
                return CreateResponse(HttpStatusCode.BadRequest, JsonSerializer.Serialize(new { error }));
            }
        }

        [Function("DeleteThread")]
        public async Task<ContentResult> DeleteThreadAsync([HttpTrigger(AuthorizationLevel.Anonymous, "delete")] HttpRequestData req)
        {
            _logger.LogInformation("Deleting an existing thread.");
            
            try
            {
                AssistantRequest data = await ParseRequestBodyAsync(req);
                string message = await _assistant.DeleteThreadAsync(data);
                await _dbClient.DeleteChatHistoryAsync(data.ThreadId!);
                return CreateResponse(HttpStatusCode.OK, JsonSerializer.Serialize(message));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to delete the thread.");
                string error = $"Failed to delete the thread: {ex.Message}";
                return CreateResponse(HttpStatusCode.BadRequest, JsonSerializer.Serialize(new { error }));
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
        public async Task<ContentResult> GetChatHistoryAsync([HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequest req)
        {
            _logger.LogInformation("Retrieving chat history.");

            try
            {
                var chatHistory = await _dbClient.GetChatHistoryAsync();
                return CreateResponse(HttpStatusCode.OK, JsonSerializer.Serialize(chatHistory));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve chat history.");
                string error = $"Failed to retrieve chat history: {ex.Message}";
                return CreateResponse(HttpStatusCode.BadRequest, JsonSerializer.Serialize(new { error }));
            }
        }

        private async Task<HttpResponseData> RunAssistantAsync(HttpRequestData req, Func<AssistantRequest, Stream, Task> RunAction)
        {
            AssistantRequest data = await ParseRequestBodyAsync(req);
            await SaveChatMessagesAsync(data.ThreadId!, "user", data.Prompt!);
            HttpResponseData response = req.CreateResponse();

            response.Headers.Add("Content-Type", "text/event-stream");
            response.Headers.Add("Cache-Control", "no-cache");
            response.Headers.Add("Connection", "keep-alive");
            response.StatusCode = HttpStatusCode.OK;

            try
            {
                using var capturingStream = new CapturingStream(response.Body);
                await RunAction(data, capturingStream);
                await SaveChatMessagesAsync(data.ThreadId!, "assistant", capturingStream.CapturedData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during streaming.");
                var errorMessage = $"Error during streaming: {ex.Message}\n";
                await response.Body.WriteAsync(Encoding.UTF8.GetBytes(errorMessage));
            }

            return response;
        }

        private async Task SaveChatMessagesAsync(string threadId, string role, string message)
        {
            await _dbClient.SaveChatMessageAsync(
                new ChatMessage()
                {
                    ThreadId = threadId,
                    Role = role,
                    Message = message,
                    Timestamp = DateTime.Now.ToString("o")
                }
            );
        }

        private static async Task<AssistantRequest> ParseRequestBodyAsync(HttpRequestData req)
        {
            string requestBody = await new StreamReader(req.Body).ReadToEndAsync();

            AssistantRequest data = JsonSerializer.Deserialize<AssistantRequest>(requestBody)
                ?? throw new BadHttpRequestException("Invalid request: body is empty.");

            return data;
        }

        private static ContentResult CreateResponse(HttpStatusCode statusCode, string message)
        {
            return new()
            {
                StatusCode = (int)statusCode,
                Content = message,
                ContentType = "application/json"
            };
        }
    }
}
