use std::sync::Arc;

pub struct TraceClient;

impl TraceClient {
    pub fn new() -> Self {
        Self
    }

    pub fn from_env() -> Option<Arc<Self>> {
        None
    }
}
