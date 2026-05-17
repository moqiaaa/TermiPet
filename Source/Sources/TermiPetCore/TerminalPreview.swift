import Foundation

public struct TerminalPreview: Equatable, Sendable {
    public enum Status: String, Sendable {
        case idle
        case running
        case error
        case warning
        case unavailable
    }

    public var status: Status
    public var title: String
    public var summary: String
    public var detail: String?

    public init(status: Status, title: String, summary: String, detail: String? = nil) {
        self.status = status
        self.title = title
        self.summary = summary
        self.detail = detail
    }

    public static func unavailable(appName: String?) -> TerminalPreview {
        TerminalPreview(
            status: .unavailable,
            title: appName ?? "Terminal",
            summary: "Cannot read this terminal.",
            detail: "Check Accessibility permission or try another terminal."
        )
    }

    public static func accessibilityPermissionRequired(appName: String?) -> TerminalPreview {
        TerminalPreview(
            status: .unavailable,
            title: appName ?? "Terminal",
            summary: "Accessibility permission is required.",
            detail: "Allow TermiPet in System Settings."
        )
    }

    public static func extract(appName: String?, windowTitle: String?, text: String) -> TerminalPreview {
        let lines = text
            .split(whereSeparator: \.isNewline)
            .map { String($0).trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        let title = appName ?? windowTitle ?? "Terminal"
        let lastCommand = lines.last(where: { $0.hasPrefix("$ ") || $0.hasPrefix("> ") })
            .map { String($0.dropFirst(2)) }
        let detail = lastCommand.map { "Last command: \($0)" }

        if let error = lines.last(where: { $0.range(of: "error", options: .caseInsensitive) != nil }) {
            return TerminalPreview(
                status: .error,
                title: title,
                summary: cleaned(prefix: "Error", line: error),
                detail: detail
            )
        }

        if let warning = lines.last(where: { $0.range(of: "warning", options: .caseInsensitive) != nil }) {
            return TerminalPreview(
                status: .warning,
                title: title,
                summary: cleaned(prefix: "Warning", line: warning),
                detail: detail
            )
        }

        if let lastCommand {
            return TerminalPreview(
                status: .running,
                title: title,
                summary: "Running: \(lastCommand)",
                detail: windowTitle
            )
        }

        return TerminalPreview(
            status: .idle,
            title: title,
            summary: "No active terminal output detected.",
            detail: windowTitle
        )
    }

    private static func cleaned(prefix: String, line: String) -> String {
        var value = line
        if let range = value.range(of: "\(prefix):", options: .caseInsensitive) {
            value.removeSubrange(value.startIndex..<range.upperBound)
            value = value.trimmingCharacters(in: .whitespacesAndNewlines)
        }

        return "\(prefix): \(value)"
    }
}

public enum PreviewPanelPolicy {
    public static func shouldShowStickyPreview(preview: TerminalPreview, agentState: AgentState) -> Bool {
        switch agentState {
        case .working, .waiting, .compacting, .stopped, .error:
            return true
        case .idle:
            break
        }

        switch preview.status {
        case .running, .warning, .error:
            return true
        case .idle, .unavailable:
            return false
        }
    }
}
