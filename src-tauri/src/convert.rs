use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

// ---------------------------------------------------------------------------
// 1. Responses API request types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponsesRequest {
    pub model: String,
    pub input: Vec<InputItem>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<ResponseTool>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_choice: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_output_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
    #[serde(flatten)]
    pub extra: HashMap<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum InputItem {
    #[serde(rename = "message")]
    Message {
        role: String,
        content: Vec<ContentPart>,
    },
    #[serde(rename = "function_call")]
    FunctionCall {
        id: String,
        call_id: String,
        name: String,
        arguments: String,
    },
    #[serde(rename = "function_call_output")]
    FunctionCallOutput {
        call_id: String,
        output: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ContentPart {
    #[serde(rename = "input_text")]
    InputText { text: String },
    #[serde(rename = "output_text")]
    OutputText { text: String },
    #[serde(rename = "input_image")]
    InputImage { image_url: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponseTool {
    #[serde(rename = "type")]
    pub tool_type: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parameters: Option<Value>,
}

// ---------------------------------------------------------------------------
// 2. Chat Completions request types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatCompletionRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<ChatTool>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_choice: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<ChatToolCall>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatToolCall {
    pub id: String,
    #[serde(rename = "type")]
    pub call_type: String,
    pub function: ChatFunction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatFunction {
    pub name: String,
    pub arguments: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatTool {
    #[serde(rename = "type")]
    pub tool_type: String,
    pub function: ChatToolFunction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatToolFunction {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parameters: Option<Value>,
}

// ---------------------------------------------------------------------------
// 3. Conversion: Responses API -> Chat Completions API
// ---------------------------------------------------------------------------

/// Convert a Responses API request into a Chat Completions API request.
pub fn responses_to_chat(req: &ResponsesRequest) -> ChatCompletionRequest {
    let mut messages: Vec<ChatMessage> = Vec::new();

    for item in &req.input {
        match item {
            InputItem::Message { role, content } => {
                // Concatenate text parts into a single content string
                let text = content
                    .iter()
                    .filter_map(|part| match part {
                        ContentPart::InputText { text }
                        | ContentPart::OutputText { text } => Some(text.as_str()),
                        ContentPart::InputImage { .. } => None,
                    })
                    .collect::<Vec<_>>()
                    .join("");

                messages.push(ChatMessage {
                    role: role.clone(),
                    content: if text.is_empty() { None } else { Some(text) },
                    tool_calls: None,
                    tool_call_id: None,
                });
            }
            InputItem::FunctionCall {
                id,
                call_id: _,
                name,
                arguments,
            } => {
                messages.push(ChatMessage {
                    role: "assistant".to_string(),
                    content: None,
                    tool_calls: Some(vec![ChatToolCall {
                        id: id.clone(),
                        call_type: "function".to_string(),
                        function: ChatFunction {
                            name: name.clone(),
                            arguments: arguments.clone(),
                        },
                    }]),
                    tool_call_id: None,
                });
            }
            InputItem::FunctionCallOutput { call_id, output } => {
                messages.push(ChatMessage {
                    role: "tool".to_string(),
                    content: Some(output.clone()),
                    tool_calls: None,
                    tool_call_id: Some(call_id.clone()),
                });
            }
        }
    }

    let tools = req.tools.as_ref().map(|ts| {
        ts.iter()
            .map(|t| ChatTool {
                tool_type: "function".to_string(),
                function: ChatToolFunction {
                    name: t.name.clone(),
                    description: t.description.clone(),
                    parameters: t.parameters.clone(),
                },
            })
            .collect()
    });

    ChatCompletionRequest {
        model: req.model.clone(),
        messages,
        tools,
        tool_choice: req.tool_choice.clone(),
        max_tokens: req.max_output_tokens,
        temperature: req.temperature,
        stream: req.stream,
    }
}

// ---------------------------------------------------------------------------
// 4. Chat Completions response types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatCompletionResponse {
    pub id: String,
    pub object: String,
    pub created: u64,
    pub model: String,
    pub choices: Vec<ChatChoice>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub usage: Option<Usage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatChoice {
    pub index: u32,
    pub message: ChatMessage,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub finish_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Usage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

// ---------------------------------------------------------------------------
// 5. Responses API response types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponsesResponse {
    pub id: String,
    pub object: String,
    pub created_at: u64,
    pub model: String,
    pub output: Vec<OutputItem>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub usage: Option<ResponseUsage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum OutputItem {
    #[serde(rename = "message")]
    Message {
        id: String,
        role: String,
        content: Vec<OutputContent>,
    },
    #[serde(rename = "function_call")]
    FunctionCall {
        id: String,
        call_id: String,
        name: String,
        arguments: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum OutputContent {
    #[serde(rename = "output_text")]
    OutputText { text: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponseUsage {
    pub input_tokens: u32,
    pub output_tokens: u32,
    pub total_tokens: u32,
}

// ---------------------------------------------------------------------------
// 6. Conversion: Chat Completions response -> Responses API response
// ---------------------------------------------------------------------------

/// Convert a Chat Completions API response into a Responses API response.
pub fn chat_to_responses(resp: &ChatCompletionResponse) -> ResponsesResponse {
    let mut output: Vec<OutputItem> = Vec::new();

    for choice in &resp.choices {
        let msg = &choice.message;

        // If the message has tool_calls, emit FunctionCall output items
        if let Some(tool_calls) = &msg.tool_calls {
            for tc in tool_calls {
                output.push(OutputItem::FunctionCall {
                    id: tc.id.clone(),
                    call_id: tc.id.clone(), // Chat Completions reuses id as call_id
                    name: tc.function.name.clone(),
                    arguments: tc.function.arguments.clone(),
                });
            }
        }

        // If the message has content, emit a Message output item
        if let Some(text) = &msg.content {
            output.push(OutputItem::Message {
                id: format!("msg_{}", uuid::Uuid::new_v4().to_string().replace('-', "")),
                role: msg.role.clone(),
                content: vec![OutputContent::OutputText { text: text.clone() }],
            });
        }
    }

    let usage = resp.usage.as_ref().map(|u| ResponseUsage {
        input_tokens: u.prompt_tokens,
        output_tokens: u.completion_tokens,
        total_tokens: u.total_tokens,
    });

    ResponsesResponse {
        id: resp.id.clone(),
        object: "response".to_string(),
        created_at: resp.created,
        model: resp.model.clone(),
        output,
        usage,
    }
}

// ---------------------------------------------------------------------------
// 7. Streaming types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatCompletionChunk {
    pub id: String,
    pub object: String,
    pub created: u64,
    pub model: String,
    pub choices: Vec<ChatChunkChoice>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatChunkChoice {
    pub index: u64,
    pub delta: ChatDelta,
    pub finish_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatDelta {
    pub role: Option<String>,
    pub content: Option<String>,
    pub tool_calls: Option<Vec<ChatToolCallDelta>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatToolCallDelta {
    pub index: u64,
    pub id: Option<String>,
    #[serde(rename = "type")]
    pub call_type: Option<String>,
    pub function: Option<ChatFunctionDelta>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatFunctionDelta {
    pub name: Option<String>,
    pub arguments: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponsesStreamEvent {
    pub event: String,
    pub data: Value,
}

// ---------------------------------------------------------------------------
// 8. Conversion: Chat Completions chunk -> Responses API stream events
// ---------------------------------------------------------------------------

/// Convert a Chat Completions streaming chunk into one or more Responses API
/// stream events.
pub fn chat_chunk_to_responses_event(chunk: &ChatCompletionChunk) -> Vec<ResponsesStreamEvent> {
    let mut events = Vec::new();

    for choice in &chunk.choices {
        let output_index = choice.index;

        // Emit text delta if content is present and non-empty
        if let Some(ref content) = choice.delta.content {
            if !content.is_empty() {
                events.push(ResponsesStreamEvent {
                    event: "response.output_text.delta".to_string(),
                    data: serde_json::json!({
                        "type": "response.output_text.delta",
                        "output_index": output_index,
                        "content_index": 0,
                        "delta": content,
                    }),
                });
            }
        }

        // Emit tool call deltas
        if let Some(ref tool_calls) = choice.delta.tool_calls {
            for tc in tool_calls {
                events.push(ResponsesStreamEvent {
                    event: "response.output_function_call.delta".to_string(),
                    data: serde_json::json!({
                        "type": "response.output_function_call.delta",
                        "output_index": output_index,
                        "call_id": tc.id,
                        "name": tc.function.as_ref().and_then(|f| f.name.as_ref()),
                        "arguments": tc.function.as_ref().and_then(|f| f.arguments.as_ref()),
                    }),
                });
            }
        }

        // Emit completion event if finish_reason is set
        if choice.finish_reason.is_some() {
            events.push(ResponsesStreamEvent {
                event: "response.done".to_string(),
                data: serde_json::json!({
                    "type": "response.done",
                    "response": {
                        "id": chunk.id,
                        "object": "response",
                        "created_at": chunk.created,
                        "model": chunk.model,
                        "output": [],
                        "status": "completed",
                    }
                }),
            });
        }
    }

    events
}

// ---------------------------------------------------------------------------
// 9. Unit tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_message_conversion() {
        let req = ResponsesRequest {
            model: "test-model".to_string(),
            input: vec![InputItem::Message {
                role: "user".to_string(),
                content: vec![ContentPart::InputText {
                    text: "Hello, world!".to_string(),
                }],
            }],
            tools: None,
            tool_choice: None,
            max_output_tokens: None,
            temperature: None,
            stream: None,
            extra: HashMap::new(),
        };

        let chat = responses_to_chat(&req);
        assert_eq!(chat.model, "test-model");
        assert_eq!(chat.messages.len(), 1);
        assert_eq!(chat.messages[0].role, "user");
        assert_eq!(
            chat.messages[0].content.as_deref(),
            Some("Hello, world!")
        );
        assert!(chat.messages[0].tool_calls.is_none());
        assert!(chat.messages[0].tool_call_id.is_none());
    }

    #[test]
    fn test_function_call_conversion() {
        // Simulate: assistant makes a function call, then user provides the output
        let req = ResponsesRequest {
            model: "test-model".to_string(),
            input: vec![
                InputItem::Message {
                    role: "user".to_string(),
                    content: vec![ContentPart::InputText {
                        text: "What is the weather?".to_string(),
                    }],
                },
                InputItem::FunctionCall {
                    id: "call_001".to_string(),
                    call_id: "call_001".to_string(),
                    name: "get_weather".to_string(),
                    arguments: r#"{"city":"Beijing"}"#.to_string(),
                },
                InputItem::FunctionCallOutput {
                    call_id: "call_001".to_string(),
                    output: "Sunny, 25°C".to_string(),
                },
            ],
            tools: None,
            tool_choice: None,
            max_output_tokens: None,
            temperature: None,
            stream: None,
            extra: HashMap::new(),
        };

        let chat = responses_to_chat(&req);
        assert_eq!(chat.messages.len(), 3);

        // First message: user
        assert_eq!(chat.messages[0].role, "user");
        assert_eq!(
            chat.messages[0].content.as_deref(),
            Some("What is the weather?")
        );

        // Second message: assistant with tool_calls
        assert_eq!(chat.messages[1].role, "assistant");
        assert!(chat.messages[1].content.is_none());
        let tool_calls = chat.messages[1].tool_calls.as_ref().unwrap();
        assert_eq!(tool_calls.len(), 1);
        assert_eq!(tool_calls[0].id, "call_001");
        assert_eq!(tool_calls[0].call_type, "function");
        assert_eq!(tool_calls[0].function.name, "get_weather");
        assert_eq!(tool_calls[0].function.arguments, r#"{"city":"Beijing"}"#);

        // Third message: tool response
        assert_eq!(chat.messages[2].role, "tool");
        assert_eq!(chat.messages[2].content.as_deref(), Some("Sunny, 25°C"));
        assert_eq!(
            chat.messages[2].tool_call_id.as_deref(),
            Some("call_001")
        );
    }

    #[test]
    fn test_tools_conversion() {
        let params: Value = serde_json::json!({
            "type": "object",
            "properties": {
                "city": { "type": "string" }
            },
            "required": ["city"]
        });

        let req = ResponsesRequest {
            model: "test-model".to_string(),
            input: vec![InputItem::Message {
                role: "user".to_string(),
                content: vec![ContentPart::InputText {
                    text: "Hello".to_string(),
                }],
            }],
            tools: Some(vec![ResponseTool {
                tool_type: "function".to_string(),
                name: "get_weather".to_string(),
                description: Some("Get weather info".to_string()),
                parameters: Some(params.clone()),
            }]),
            tool_choice: None,
            max_output_tokens: None,
            temperature: None,
            stream: None,
            extra: HashMap::new(),
        };

        let chat = responses_to_chat(&req);
        let tools = chat.tools.unwrap();
        assert_eq!(tools.len(), 1);
        assert_eq!(tools[0].tool_type, "function");
        assert_eq!(tools[0].function.name, "get_weather");
        assert_eq!(
            tools[0].function.description.as_deref(),
            Some("Get weather info")
        );
        assert_eq!(tools[0].function.parameters.as_ref(), Some(&params));
    }

    #[test]
    fn test_response_conversion_with_tool_calls() {
        let resp = ChatCompletionResponse {
            id: "chatcmpl-123".to_string(),
            object: "chat.completion".to_string(),
            created: 1700000000,
            model: "test-model".to_string(),
            choices: vec![ChatChoice {
                index: 0,
                message: ChatMessage {
                    role: "assistant".to_string(),
                    content: None,
                    tool_calls: Some(vec![ChatToolCall {
                        id: "call_abc".to_string(),
                        call_type: "function".to_string(),
                        function: ChatFunction {
                            name: "get_weather".to_string(),
                            arguments: r#"{"city":"Beijing"}"#.to_string(),
                        },
                    }]),
                    tool_call_id: None,
                },
                finish_reason: Some("tool_calls".to_string()),
            }],
            usage: Some(Usage {
                prompt_tokens: 10,
                completion_tokens: 20,
                total_tokens: 30,
            }),
        };

        let responses = chat_to_responses(&resp);
        assert_eq!(responses.id, "chatcmpl-123");
        assert_eq!(responses.object, "response");
        assert_eq!(responses.model, "test-model");
        assert_eq!(responses.output.len(), 1);

        match &responses.output[0] {
            OutputItem::FunctionCall {
                id,
                call_id,
                name,
                arguments,
            } => {
                assert_eq!(id, "call_abc");
                assert_eq!(call_id, "call_abc");
                assert_eq!(name, "get_weather");
                assert_eq!(arguments, r#"{"city":"Beijing"}"#);
            }
            _ => panic!("Expected FunctionCall output item"),
        }

        let usage = responses.usage.unwrap();
        assert_eq!(usage.input_tokens, 10);
        assert_eq!(usage.output_tokens, 20);
        assert_eq!(usage.total_tokens, 30);
    }

    #[test]
    fn test_response_conversion_with_text() {
        let resp = ChatCompletionResponse {
            id: "chatcmpl-456".to_string(),
            object: "chat.completion".to_string(),
            created: 1700000000,
            model: "test-model".to_string(),
            choices: vec![ChatChoice {
                index: 0,
                message: ChatMessage {
                    role: "assistant".to_string(),
                    content: Some("Hello! How can I help you today?".to_string()),
                    tool_calls: None,
                    tool_call_id: None,
                },
                finish_reason: Some("stop".to_string()),
            }],
            usage: Some(Usage {
                prompt_tokens: 5,
                completion_tokens: 8,
                total_tokens: 13,
            }),
        };

        let responses = chat_to_responses(&resp);
        assert_eq!(responses.output.len(), 1);

        match &responses.output[0] {
            OutputItem::Message { role, content, .. } => {
                assert_eq!(role, "assistant");
                assert_eq!(content.len(), 1);
                match &content[0] {
                    OutputContent::OutputText { text } => {
                        assert_eq!(text, "Hello! How can I help you today?");
                    }
                }
            }
            _ => panic!("Expected Message output item"),
        }

        let usage = responses.usage.unwrap();
        assert_eq!(usage.input_tokens, 5);
        assert_eq!(usage.output_tokens, 8);
        assert_eq!(usage.total_tokens, 13);
    }
}
