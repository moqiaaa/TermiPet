import Foundation

public enum AgentState: String, Sendable, Equatable {
    case idle
    case working
    case waiting
    case compacting
    case stopped
    case error
}

public extension AgentState {
    var previewStatus: TerminalPreview.Status {
        switch self {
        case .idle, .stopped:
            return .idle
        case .working:
            return .running
        case .waiting, .compacting:
            return .warning
        case .error:
            return .error
        }
    }
}
