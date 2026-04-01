#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum LoadBalanceStrategy {
    RoundRobin,
    Weighted,
    LeastLatency,
}
