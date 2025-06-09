import { useState, useEffect, useRef } from 'react';
import ChatArea from './ChatArea';

function ChatBox({ setChats, initializeChat, activeThreadRef, selectedAssistant, messages, setMessages }) {
    const [waitingReply, setWaitingReply] = useState({});
    const waitingFirstMessageRef = useRef(false);

    const handleActionAsync = async (action, url, model) => {
        if (!activeThreadRef.current) {
            waitingFirstMessageRef.current = true;
            await initializeChat();
            waitingFirstMessageRef.current = false;
        }

        const threadId = activeThreadRef.current;
        setWaitingReply(prev => ({ ...prev, [threadId]: true }));

        const streamingMessage = { text: '', type: 'assistant', isLoading: true, isThinking: model === 'o3-mini' };
        setMessages(prev => [...prev, streamingMessage]);

        try {
            await handleChatResponseStream(url, threadId, action, streamingMessage, model);
        } catch (error) {
            streamingMessage.isLoading = false;
            streamingMessage.text = `An error occurred while processing your request: ${error}`;
            setMessages(prev => [...prev]);
        } finally {
            setWaitingReply(prev => ({ ...prev, [threadId]: false }));
        }
    };

    const handleChatResponseStream = async (url, threadId, action, streamingMessage, model) => {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                threadId: threadId,
                prompt: action,
                model: model,
                assistant: selectedAssistant
            })
        });

        if (!response.ok) throw new Error(response.status + response.statusText);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        streamingMessage.isLoading = false;
        setMessages(prev => [...prev]);

        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                break;
            }

            const chunk = decoder.decode(value, { stream: true });
            streamingMessage.text += chunk;

            setMessages(prev => [...prev]);
        }

        if (streamingMessage.text.includes('The following actions will be performed:')) {
            streamingMessage.isPending = true;
        }
    }

    useEffect(() => {
        if (activeThreadRef.current && messages.length > 0) {
            setChats(prevChats => ({
                ...prevChats,
                [activeThreadRef.current]: [...messages]
            }));
        }
    }, [messages]);

    return (
        <div fluid="true" className="chat-layout">
            <ChatArea
                messages={messages}
                setMessages={setMessages}
                handleActionAsync={handleActionAsync}
                isWaitingReply={waitingReply[activeThreadRef.current] || waitingFirstMessageRef.current}
            />
        </div>
    );
}

export default ChatBox;