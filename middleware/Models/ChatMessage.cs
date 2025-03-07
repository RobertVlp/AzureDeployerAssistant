namespace AIAssistant.Models
{
    public class ChatMessage
    {
        public string ThreadId { get; set; }
        public string Role { get; set; }
        public string Message { get; set; }
        public string Timestamp { get; set; }

        public ChatMessage(string threadId, string role, string message, string timestamp)
        {
            ThreadId = threadId;
            Role = role;
            Message = message;
            Timestamp = timestamp;
        }
    }
}
