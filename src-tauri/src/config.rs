use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub api_key: String,
    pub target_url: String,
    pub model: String,
    pub proxy_port: u16,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            api_key: String::new(),
            target_url: "https://api.openai.com".to_string(),
            model: "gpt-4".to_string(),
            proxy_port: 8742,
        }
    }
}
