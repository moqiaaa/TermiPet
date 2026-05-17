import Foundation

public enum ClaudePermissionDecision: String, Sendable, Equatable {
    case allow
    case deny
    case ask
}

public enum ClaudePermissionDecisionResponse {
    public static func encode(_ decision: ClaudePermissionDecision) throws -> Data {
        let behavior: String
        switch decision {
        case .allow:
            behavior = "allow"
        case .deny:
            behavior = "deny"
        case .ask:
            behavior = "ask"
        }

        var decisionObject: [String: Any] = ["behavior": behavior]
        if decision == .deny {
            decisionObject["message"] = "TermiPet denied this permission request."
        }

        let object: [String: Any] = [
            "hookSpecificOutput": [
                "hookEventName": "PermissionRequest",
                "decision": decisionObject,
            ]
        ]
        return try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])
    }
}
