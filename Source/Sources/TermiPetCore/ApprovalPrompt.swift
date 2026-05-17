import Foundation

public enum ApprovalAction: String, Sendable, Equatable, Codable {
    case claudeAllow
    case claudeDeny
    case pressEnter
    case typeYesEnter
    case selectHighlightedAllow
}

public struct ApprovalPrompt: Identifiable, Sendable, Equatable {
    public enum Source: String, Sendable, Equatable, Codable {
        case terminal
        case claude
    }

    public var id: String
    public var source: Source
    public var title: String
    public var summary: String
    public var detail: String?
    public var action: ApprovalAction
    public var denyAction: ApprovalAction?
    public var executionHint: String
    public var targetAppName: String?
    public var targetBundleIdentifier: String?

    public init(
        id: String,
        source: Source,
        title: String,
        summary: String,
        detail: String? = nil,
        action: ApprovalAction,
        denyAction: ApprovalAction? = nil,
        executionHint: String,
        targetAppName: String? = nil,
        targetBundleIdentifier: String? = nil
    ) {
        self.id = id
        self.source = source
        self.title = title
        self.summary = summary
        self.detail = detail
        self.action = action
        self.denyAction = denyAction
        self.executionHint = executionHint
        self.targetAppName = targetAppName
        self.targetBundleIdentifier = targetBundleIdentifier
    }
}

public enum TerminalApprovalDetector {
    public static func detect(appName: String?, windowTitle: String?, text: String) -> ApprovalPrompt? {
        let normalized = text.lowercased()
        let lines = text
            .split(whereSeparator: \.isNewline)
            .map { String($0).trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        let tail = lines.suffix(12).joined(separator: "\n")
        let normalizedTail = tail.lowercased()

        if containsYesNoPrompt(normalizedTail) {
            return prompt(
                appName: appName,
                windowTitle: windowTitle,
                summary: bestSummary(from: lines) ?? "终端正在请求确认",
                action: .typeYesEnter,
                hint: "Y + Enter"
            )
        }

        if containsPressEnterPrompt(normalizedTail) {
            return prompt(
                appName: appName,
                windowTitle: windowTitle,
                summary: bestSummary(from: lines) ?? "终端等待继续",
                action: .pressEnter,
                hint: "Enter"
            )
        }

        if containsAllowChoice(normalizedTail) || containsHighlightedAllow(lines) || containsClaudePermissionText(normalized) {
            return prompt(
                appName: appName,
                windowTitle: windowTitle,
                summary: bestSummary(from: lines) ?? "终端正在等待 Allow",
                action: .selectHighlightedAllow,
                hint: "Enter"
            )
        }

        return nil
    }

    private static func prompt(
        appName: String?,
        windowTitle: String?,
        summary: String,
        action: ApprovalAction,
        hint: String
    ) -> ApprovalPrompt {
        let title = appName ?? "Terminal"
        let id = ["terminal-approval", title, windowTitle ?? ""].joined(separator: ":")
        return ApprovalPrompt(
            id: id,
            source: .terminal,
            title: title,
            summary: summary,
            detail: windowTitle,
            action: action,
            executionHint: hint,
            targetAppName: appName
        )
    }

    private static func containsYesNoPrompt(_ text: String) -> Bool {
        let patterns = [
            #"\(y/n\)"#,
            #"\[y/n\]"#,
            #"\(y/N\)"#.lowercased(),
            #"\[y/N\]"#.lowercased(),
            #"yes/no"#,
            #"proceed\?"#,
            #"continue\?"#,
        ]
        guard patterns.contains(where: { text.range(of: $0, options: .regularExpression) != nil }) else {
            return false
        }
        return text.contains(" y") || text.contains("yes") || text.contains("(y") || text.contains("[y")
    }

    private static func containsPressEnterPrompt(_ text: String) -> Bool {
        text.contains("press enter")
            || text.contains("hit enter")
            || text.contains("return to continue")
            || text.contains("enter to continue")
    }

    private static func containsAllowChoice(_ text: String) -> Bool {
        (text.contains("allow") || text.contains("允许"))
            && (text.contains("deny") || text.contains("拒绝") || text.contains("don't allow"))
    }

    private static func containsHighlightedAllow(_ lines: [String]) -> Bool {
        lines.contains { line in
            let lower = line.lowercased()
            let marker = lower.hasPrefix(">") || lower.hasPrefix("❯") || lower.hasPrefix("➜") || lower.hasPrefix("▸")
            return marker && (lower.contains("allow") || lower.contains("允许"))
        }
    }

    private static func containsClaudePermissionText(_ text: String) -> Bool {
        (text.contains("claude") || text.contains("tool"))
            && (text.contains("permission") || text.contains("permissions") || text.contains("权限") || text.contains("授权"))
            && (text.contains("allow") || text.contains("允许"))
    }

    private static func bestSummary(from lines: [String]) -> String? {
        for line in lines.reversed() {
            let lower = line.lowercased()
            if lower.contains("allow") || lower.contains("permission") || lower.contains("proceed") || lower.contains("continue") || lower.contains("press enter") {
                return line.count > 90 ? String(line.prefix(90)) + "..." : line
            }
        }
        return lines.last.map { $0.count > 90 ? String($0.prefix(90)) + "..." : $0 }
    }
}
