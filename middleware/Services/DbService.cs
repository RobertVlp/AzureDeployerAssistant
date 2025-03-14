using Npgsql;
using Dapper;
using AIAssistant.Models;
using Microsoft.Extensions.Logging;

namespace AIAssistant.Services;

public class DbService(ILogger<DbService> logger)
{
    private readonly ILogger<DbService> _logger = logger;
    private readonly string _connectionString = Environment.GetEnvironmentVariable("DB_CONNECTION_STRING")
        ?? throw new ArgumentNullException("DB_CONNECTION_STRING environment variable is not set.");

    public async Task<Dictionary<string, List<dynamic>>> GetChatHistoryAsync()
    {
        _logger.LogInformation("Getting chat history from the database.");

        Dictionary<string, List<dynamic>> chatHistory = [];

        var command = 
        @"
            SELECT * FROM ChatMessages
            ORDER BY ThreadId, Timestamp
        ";

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();
            var results = await connection.QueryAsync<ChatMessage>(command);

            foreach (ChatMessage message in results)
            {
                var threadId = message.ThreadId;

                if (!chatHistory.TryGetValue(threadId, out List<dynamic>? value))
                {
                    value = [];
                    chatHistory[threadId] = value;
                }

                value.Add(new { message.Role, message.Text, message.Timestamp });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get chat history from the database.");
        }

        return chatHistory;
    }

    public async Task SaveChatMessageAsync(ChatMessage message)
    {
        _logger.LogInformation("Saving a new chat message to the database.");

        var command = 
        @"
            INSERT INTO ChatMessages (ThreadId, Role, Text, Timestamp)
            VALUES (@ThreadId, @Role, @Text, @Timestamp)
        ";

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();
            await connection.ExecuteAsync(command, message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save the chat message to the database.");
        }
    }

    public async Task DeleteChatHistoryAsync(string threadId)
    {
        _logger.LogInformation("Deleting chat history for threadId {ThreadId} from the database.", threadId);

        var command = 
        @"
            DELETE FROM ChatMessages
            WHERE ThreadId = @ThreadId
        ";

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();
            await connection.ExecuteAsync(command, new { ThreadId = threadId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete chat history for threadId {ThreadId} from the database.", threadId);
        }
    }

    public async Task UpdateChatThreadsAsync(string oldThreadId, string newThreadId)
    {
        _logger.LogInformation("Updating chat history for expired threadId {ThreadId} in the database.", oldThreadId);

        var command = 
        @"
            UPDATE ChatMessages
            SET ThreadId = @NewThreadId
            WHERE ThreadId = @OldThreadId
        ";

        try
        {
            using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync();
            await connection.ExecuteAsync(command, new { OldThreadId = oldThreadId, NewThreadId = newThreadId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update chat history for expired threadId {ThreadId} in the database.", oldThreadId);
        }
    }
}
