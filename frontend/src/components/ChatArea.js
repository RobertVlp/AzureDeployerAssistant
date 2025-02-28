import React, { useState } from 'react';
import { Row, Container } from 'react-bootstrap';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

function ChatArea({ messages, setMessages, handleActionAsync, isWaitingReply, darkMode }) {
    const [waitingForReply, setWaitingForReply] = useState(isWaitingReply);

    const handleSubmitAsync = async (inputMessage) => {
        if (inputMessage) {
            const serverUrl = 'http://localhost:7151/api/InvokeAssistant';

            if (messages.length > 0 && messages[messages.length - 1].isPending) {
                messages[messages.length - 1].isPending = false;
                setMessages([...messages]);
            }
            
            setMessages([...messages, { text: inputMessage, type: 'user' }]);
            setWaitingForReply(true);
            await handleActionAsync(inputMessage, serverUrl);
            setWaitingForReply(false);
        }
    };

    const handleConfirmActionAsync = async (action) => {
        const serverUrl = 'http://localhost:7151/api/ConfirmAction';
        messages[messages.length - 1].isPending = false;
        setMessages([...messages]);
        setWaitingForReply(true);
        await handleActionAsync(action, serverUrl);
        setWaitingForReply(false);
    };

    return (
        <div className="chat-container-main">
            <Row className="justify-content-md-center" style={{ width: '75%', margin: 'auto 128px' }}>
                <Container className="chat-box">
                    <MessageList 
                        messages={messages}
                        onConfirmAction={handleConfirmActionAsync}
                    />
                    <ChatInput 
                        onSubmit={handleSubmitAsync}
                        isWaitingReply={waitingForReply}
                        darkMode={darkMode}
                    />
                </Container>
            </Row>
        </div>
    );
}

export default ChatArea;