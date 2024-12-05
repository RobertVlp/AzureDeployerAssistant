import { Form, FormGroup } from 'react-bootstrap';
import React, { useState } from 'react';
import ChatBox from "./ChatBox";
import './style.css';

const ChatInterface = () => {
    const [subscriptionId, setSubscriptionId] = useState('');

    return (
        <>
            <div className="App">
                <h1 className="page-heading">Azure Deployer Assistant</h1>
            </div>

            <Form className="d-flex justify-content-center">
                <FormGroup className="input-group-width mb-3">
                    <Form.Label>Subscription ID</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Enter your subscription ID here"
                        value={subscriptionId}
                        onChange={(e) => setSubscriptionId(e.target.value)}
                    />
                </FormGroup>
            </Form>
        
            <ChatBox subscriptionId={subscriptionId}/>
        </>
    );
}

export default ChatInterface;
