namespace AIAssistant.Models
{
    public class ChatMessage(string threadId, string role, string text, DateTime timestamp)
    {
        public string ThreadId { get; set; } = threadId;
        public string Role { get; set; } = role;
        public string Text { get; set; } = text;
        public DateTime Timestamp { get; set; } = timestamp;
    }
}
