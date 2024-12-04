import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Form, Button, InputGroup, ListGroup, Spinner } from 'react-bootstrap';
import { FaPaperPlane } from 'react-icons/fa';
import './ChatBox.css';

function ChatBox() {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatContainerRef = useRef(null);
    const textareaRef = useRef(null);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);

        const newMessages = [...messages, { text: inputMessage, type: 'user' }];
        setMessages(newMessages);
        setInputMessage('');

        const tempMessages = [...newMessages, { text: '', type: 'assistant', isLoading: true }];
        setMessages(tempMessages);

        try {
            const response = await fetch('http://localhost:5000/send_message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: inputMessage }),
            });

            if (!response.ok) {
                throw new Error('Error processing message' + response.statusText);
            }

            const data = await response.json();
            setMessages([...newMessages, { text: data['response'][0], type: 'assistant' }]);
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(newMessages);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
        }
    }, [inputMessage]);

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSubmit(event);
        }
    };

    return (
        <Container>
            <Row className="justify-content-md-center">
                <Container className="chat-box justify-content-md-center" style={{ width: "50%", maxHeight: "400px", overflowY: "auto" }} ref={chatContainerRef}>
                    <ListGroup>
                        {messages.map((msg, index) => (
                            <ListGroup.Item key={index} className={msg.type === 'user' ? 'user-message' : 'assistant-message'}>
                                <strong>{msg.type === 'user' ? 'You:' : 'Assistant:'}</strong> {msg.text}
                                {msg.isLoading && (
                                    <Spinner animation="border" size="sm" />
                                )}
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                </Container>
            </Row>
            <Row className="justify-content-md-center">
                <Form onSubmit={handleSubmit} className="d-flex justify-content-center">
                    <InputGroup className="input-group-width">
                        <Form.Control
                            as="textarea"
                            rows={1}
                            name="prompt"
                            placeholder="Enter your message here"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            ref={textareaRef}
                            style={{ overflowY: 'auto' }}
                            onKeyDown={handleKeyDown}
                        />
                        <Button type="submit" variant="primary">
                            <FaPaperPlane />
                        </Button>
                    </InputGroup>
                </Form>
            </Row>
        </Container>
    );
}

export default ChatBox;
