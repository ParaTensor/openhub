mod chat;
mod embeddings;

#[cfg(test)]
mod tests;

pub use chat::{into_core_chat_request, PermissiveChatMessage, PermissiveChatRequest};
pub use embeddings::{into_core_embeddings_request, PermissiveEmbeddingsRequest};
