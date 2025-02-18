namespace AIAssistant.Models
{
    public interface IAssistant
    {
        Task<string> CreateThreadAsync();

        Task<List<string>> DeleteThreadAsync(AssistantRequest request);
        
        Task<List<string>> ProcessRequestAsync(AssistantRequest request);

        Task<List<string>> ConfirmActionAsync(AssistantRequest request);
    }
}
