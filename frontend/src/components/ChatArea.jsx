import React from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

function ChatArea({ messages, setMessages, handleActionAsync, isWaitingReply, darkMode }) {
    const apiUrl = `${import.meta.env.VITE_API_URL}` || '';  

    const handleSubmitAsync = async (inputMessage, model) => {
        if (inputMessage) {
            const serverUrl = `${apiUrl}/InvokeAssistant`;

            if (messages.length > 0 && messages[messages.length - 1].isPending) {
                messages[messages.length - 1].isPending = false;
                setMessages([...messages]);
            }
            
            setMessages([...messages, { text: inputMessage, type: 'user' }]);
            await handleActionAsync(inputMessage, serverUrl, model);
        }
    };

    const handleConfirmActionAsync = async (action) => {
        const serverUrl = `${apiUrl}}/ConfirmAction`;
        messages[messages.length - 1].isPending = false;
        setMessages([...messages]);
        await handleActionAsync(action, serverUrl, "");
    };

    return (
        <div className="chat-container-main">
            <div className="chat-box">
                <MessageList 
                    messages={messages}
                    onConfirmAction={handleConfirmActionAsync}
                />
                <ChatInput 
                    onSubmit={handleSubmitAsync}
                    isWaitingReply={isWaitingReply}
                    darkMode={darkMode}
                />
            </div>
        </div>
    );
}

export default ChatArea;