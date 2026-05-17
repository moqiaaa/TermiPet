import Foundation

public struct WorkspacePreviewItem: Identifiable, Equatable, Sendable {
    public enum Source: String, Sendable {
        case terminal
        case claude
    }

    public var id: String
    public var source: Source
    public var status: TerminalPreview.Status
    public var title: String
    public var summary: String
    public var detail: String?
    public var lastSeen: Date
    public var targetAppName: String?
    public var targetBundleIdentifier: String?
    public var targetProcessIdentifier: Int32?
    public var targetWindowTitle: String?

    public init(
        id: String,
        source: Source,
        status: TerminalPreview.Status,
        title: String,
        summary: String,
        detail: String? = nil,
        lastSeen: Date = Date(),
        targetAppName: String? = nil,
        targetBundleIdentifier: String? = nil,
        targetProcessIdentifier: Int32? = nil,
        targetWindowTitle: String? = nil
    ) {
        self.id = id
        self.source = source
        self.status = status
        self.title = title
        self.summary = summary
        self.detail = detail
        self.lastSeen = lastSeen
        self.targetAppName = targetAppName
        self.targetBundleIdentifier = targetBundleIdentifier
        self.targetProcessIdentifier = targetProcessIdentifier
        self.targetWindowTitle = targetWindowTitle
    }

    public init(
        id: String,
        source: Source,
        preview: TerminalPreview,
        lastSeen: Date = Date(),
        targetAppName: String? = nil,
        targetBundleIdentifier: String? = nil,
        targetProcessIdentifier: Int32? = nil,
        targetWindowTitle: String? = nil
    ) {
        self.init(
            id: id,
            source: source,
            status: preview.status,
            title: preview.title,
            summary: preview.summary,
            detail: preview.detail,
            lastSeen: lastSeen,
            targetAppName: targetAppName,
            targetBundleIdentifier: targetBundleIdentifier,
            targetProcessIdentifier: targetProcessIdentifier,
            targetWindowTitle: targetWindowTitle
        )
    }

    public var preview: TerminalPreview {
        TerminalPreview(status: status, title: title, summary: summary, detail: detail)
    }

    public var isActive: Bool {
        switch status {
        case .running, .warning, .error:
            return true
        case .idle:
            return source == .claude
        case .unavailable:
            return false
        }
    }

    public static func claudeID(
        sessionID: String?,
        cwd: String?,
        targetBundleIdentifier: String? = nil,
        targetProcessIdentifier: Int32? = nil,
        targetWindowTitle: String? = nil
    ) -> String {
        let trimmedCWD = cwd?.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedBundle = targetBundleIdentifier?.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedTitle = targetWindowTitle?.trimmingCharacters(in: .whitespacesAndNewlines)

        if let bundle = trimmedBundle, !bundle.isEmpty,
           let pid = targetProcessIdentifier,
           let title = trimmedTitle, !title.isEmpty {
            return "claude:window:\(bundle):\(pid):\(title)"
        }
        if let bundle = trimmedBundle, !bundle.isEmpty,
           let pid = targetProcessIdentifier {
            return "claude:app:\(bundle):\(pid)"
        }
        if let cwd = trimmedCWD, !cwd.isEmpty {
            return "claude:cwd:\(cwd)"
        }
        return "claude:unknown"
    }

    public static func terminalID(appName: String?, windowTitle: String?, fallback: String) -> String {
        let app = appName?.trimmingCharacters(in: .whitespacesAndNewlines)
        let title = windowTitle?.trimmingCharacters(in: .whitespacesAndNewlines)
        let parts = [app, title, fallback]
            .compactMap { $0 }
            .filter { !$0.isEmpty }
        return "terminal:\(parts.joined(separator: ":"))"
    }
}

public struct PreviewCardTapAction: Equatable, Sendable {
    public var shouldActivateTarget: Bool
    public var shouldDismissPreview: Bool

    public init(shouldActivateTarget: Bool, shouldDismissPreview: Bool) {
        self.shouldActivateTarget = shouldActivateTarget
        self.shouldDismissPreview = shouldDismissPreview
    }
}

public enum PreviewCardTapPolicy {
    public static func action(for item: WorkspacePreviewItem) -> PreviewCardTapAction {
        PreviewCardTapAction(shouldActivateTarget: true, shouldDismissPreview: false)
    }
}
