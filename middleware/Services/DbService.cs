using Dapper;
using AIAssistant.Models;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Logging;

namespace AIAssistant.Services;

public class DbService(ILogger<DbService> logger)
{
    private readonly ILogger<DbService> _logger = logger;
    private readonly SqliteConnection _connection = new($"Data Source={Environment.GetEnvironmentVariable("DB_PATH")}");

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
            var results = await _connection.QueryAsync<ChatMessage>(command);

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
            await _connection.ExecuteAsync(command, message);
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
            await _connection.ExecuteAsync(command, new { ThreadId = threadId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete chat history for threadId {ThreadId} from the database.", threadId);
        }
    }

    public void InitializeDatabase()
    {
        _logger.LogInformation("Initializing the database.");

        var command = 
        @"
            CREATE TABLE IF NOT EXISTS ChatMessages (
                ThreadId TEXT NOT NULL,
                Role TEXT NOT NULL,
                Text TEXT NOT NULL,
                Timestamp TIMESTAMP NOT NULL
            )
        ";

        try
        {
            _connection.Execute(command);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize the database.");
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
            await _connection.ExecuteAsync(command, new { OldThreadId = oldThreadId, NewThreadId = newThreadId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update chat history for expired threadId {ThreadId} in the database.", oldThreadId);
        }
    }
}
