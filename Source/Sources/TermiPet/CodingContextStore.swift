import TermiPetCore
import Foundation

@MainActor
final class CodingContextStore: ObservableObject {
    @Published private(set) var currentApp: CodingAppInfo?
    @Published private(set) var windowTitle: String?
    @Published private(set) var fileHint: String?
    @Published private(set) var projectHint: String?
    @Published private(set) var agentState: AgentState = .idle
    @Published private(set) var agentSummary: String?
    @Published private(set) var agentLastSeen: Date?
    @Published private(set) var agentLastSource: AgentSource = .none
    @Published private(set) var agentPreviewItems: [WorkspacePreviewItem] = []
    @Published private(set) var approvalPrompt: ApprovalPrompt?
    private var agentItemsByID: [WorkspacePreviewItem.ID: WorkspacePreviewItem] = [:]

    enum AgentSource: String { case none, hook, jsonl }

    func updateFrontmost(app: CodingAppInfo?, title: String?, file: String?, project: String?) {
        currentApp = app
        windowTitle = title
        fileHint = file
        projectHint = project
    }

    /// Hook 数据视为权威来源；5 秒滑窗内同源覆盖
    func applyHookEvent(
        state: AgentState,
        summary: String?,
        sessionID: String? = nil,
        cwd: String? = nil,
        targetAppName: String? = nil,
        targetBundleIdentifier: String? = nil,
        targetProcessIdentifier: Int32? = nil,
        targetWindowTitle: String? = nil
    ) {
        agentState = state
        agentSummary = summary
        agentLastSeen = Date()
        agentLastSource = .hook
        upsertAgentItem(
            state: state,
            summary: summary,
            sessionID: sessionID,
            cwd: cwd,
            targetAppName: targetAppName,
            targetBundleIdentifier: targetBundleIdentifier,
            targetProcessIdentifier: targetProcessIdentifier,
            targetWindowTitle: targetWindowTitle,
            source: .hook
        )
    }

    func presentApprovalPrompt(
        _ prompt: ApprovalPrompt,
        sessionID: String? = nil,
        cwd: String? = nil,
        targetAppName: String? = nil,
        targetBundleIdentifier: String? = nil,
        targetProcessIdentifier: Int32? = nil,
        targetWindowTitle: String? = nil
    ) {
        approvalPrompt = prompt
        agentState = .waiting
        agentSummary = prompt.summary
        agentLastSeen = Date()
        agentLastSource = .hook
        upsertAgentItem(
            state: .waiting,
            summary: prompt.summary,
            sessionID: sessionID,
            cwd: cwd,
            targetAppName: targetAppName,
            targetBundleIdentifier: targetBundleIdentifier,
            targetProcessIdentifier: targetProcessIdentifier,
            targetWindowTitle: targetWindowTitle,
            source: .hook
        )
    }

    func updateTerminalApprovalPrompt(_ prompt: ApprovalPrompt?) {
        if approvalPrompt?.source == .claude { return }
        approvalPrompt = prompt
    }

    func clearApprovalPrompt(id: ApprovalPrompt.ID? = nil) {
        guard id == nil || approvalPrompt?.id == id else { return }
        approvalPrompt = nil
    }

    func markApprovalResolved(id: ApprovalPrompt.ID? = nil, allowed: Bool) {
        guard id == nil || approvalPrompt?.id == id else { return }
        approvalPrompt = nil
        agentState = .working
        agentSummary = allowed ? "已允许，Claude 继续处理" : "已拒绝授权"
        agentLastSeen = Date()
        agentLastSource = .hook
    }

    /// JSONL 兜底：仅在最近 5 秒没有 hook 事件时生效，避免覆盖更精准的 hook 数据
    func applyJSONLObservation(
        state: AgentState,
        summary: String?,
        sessionID: String? = nil,
        cwd: String? = nil,
        targetAppName: String? = nil,
        targetBundleIdentifier: String? = nil,
        targetProcessIdentifier: Int32? = nil,
        targetWindowTitle: String? = nil
    ) {
        if agentLastSource == .hook, let last = agentLastSeen, Date().timeIntervalSince(last) < 5 {
            return
        }
        agentState = state
        agentSummary = summary
        agentLastSeen = Date()
        agentLastSource = .jsonl
        upsertAgentItem(
            state: state,
            summary: summary,
            sessionID: sessionID,
            cwd: cwd,
            targetAppName: targetAppName,
            targetBundleIdentifier: targetBundleIdentifier,
            targetProcessIdentifier: targetProcessIdentifier,
            targetWindowTitle: targetWindowTitle,
            source: .jsonl
        )
    }

    /// 长时间没有任何 agent 事件 → 降级为 idle，避免卡住
    func decayIfStale(window: TimeInterval = 30) {
        guard agentState != .idle && agentState != .stopped else { return }
        guard let last = agentLastSeen, Date().timeIntervalSince(last) > window else { return }
        agentState = .idle
        agentSummary = nil
        pruneAgentItems(maxAge: window)
    }

    func resetAgent() {
        agentState = .idle
        agentSummary = nil
        agentLastSeen = nil
        agentLastSource = .none
        agentItemsByID.removeAll()
        agentPreviewItems = []
        approvalPrompt = nil
    }

    func dismissAgentItem(id: WorkspacePreviewItem.ID) {
        agentItemsByID.removeValue(forKey: id)
        agentPreviewItems = agentItemsByID.values.sorted { $0.lastSeen > $1.lastSeen }
        if agentPreviewItems.isEmpty {
            agentState = .idle
            agentSummary = nil
            agentLastSeen = nil
            agentLastSource = .none
            approvalPrompt = nil
        }
    }

    func attachCurrentTargetToAgentItems(
        appName: String?,
        bundleIdentifier: String?,
        processIdentifier: Int32?,
        windowTitle: String?
    ) {
        guard agentState != .idle else { return }
        guard let bundleIdentifier, !bundleIdentifier.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }

        var updated: [WorkspacePreviewItem.ID: WorkspacePreviewItem] = [:]
        for var item in agentItemsByID.values {
            guard item.targetBundleIdentifier == nil,
                  item.targetProcessIdentifier == nil,
                  item.targetWindowTitle == nil else {
                updated[item.id] = item
                continue
            }

            item.targetAppName = appName
            item.targetBundleIdentifier = bundleIdentifier
            item.targetProcessIdentifier = processIdentifier
            item.targetWindowTitle = windowTitle
            item.id = WorkspacePreviewItem.claudeID(
                sessionID: nil,
                cwd: item.detail,
                targetBundleIdentifier: bundleIdentifier,
                targetProcessIdentifier: processIdentifier,
                targetWindowTitle: windowTitle
            )

            if let existing = updated[item.id], existing.lastSeen > item.lastSeen {
                continue
            }
            updated[item.id] = item
        }

        agentItemsByID = updated
        agentPreviewItems = agentItemsByID.values.sorted { $0.lastSeen > $1.lastSeen }
    }

    /// 综合考虑 agent 状态、当前 app、终端预览状态推断宠物动作索引（0..8）
    func suggestedPetAction(currentTerminalStatus: TerminalPreview.Status) -> Int {
        switch agentState {
        case .error: return 5
        case .waiting: return 4
        case .working: return 1
        case .compacting: return 7
        case .stopped, .idle: break
        }

        switch currentApp?.kind {
        case .aiChat: return 3
        case .editor: return fileHint != nil ? 0 : 6
        case .terminal:
            switch currentTerminalStatus {
            case .error: return 5
            case .warning: return 4
            case .running: return 1
            case .idle: return 0
            case .unavailable: return 6
            }
        case .unknown, .none: return 6
        }
    }

    private func upsertAgentItem(
        state: AgentState,
        summary: String?,
        sessionID: String?,
        cwd: String?,
        targetAppName: String?,
        targetBundleIdentifier: String?,
        targetProcessIdentifier: Int32?,
        targetWindowTitle: String?,
        source: AgentSource
    ) {
        let now = Date()
        let id = WorkspacePreviewItem.claudeID(
            sessionID: sessionID,
            cwd: cwd,
            targetBundleIdentifier: targetBundleIdentifier,
            targetProcessIdentifier: targetProcessIdentifier,
            targetWindowTitle: targetWindowTitle
        )
        let projectName = cwd.flatMap { URL(fileURLWithPath: $0).lastPathComponent }.flatMap { $0.isEmpty ? nil : $0 }
        let title = projectName.map { "Claude Code · \($0)" } ?? "Claude Code"
        let item = WorkspacePreviewItem(
            id: id,
            source: .claude,
            status: state.previewStatus,
            title: title,
            summary: summary ?? fallbackSummary(for: state),
            detail: cwd,
            lastSeen: now,
            targetAppName: targetAppName,
            targetBundleIdentifier: targetBundleIdentifier,
            targetProcessIdentifier: targetProcessIdentifier,
            targetWindowTitle: targetWindowTitle
        )
        agentItemsByID[id] = item
        pruneAgentItems(maxAge: 300)
    }

    private func pruneAgentItems(maxAge: TimeInterval) {
        let cutoff = Date().addingTimeInterval(-maxAge)
        agentItemsByID = agentItemsByID.filter { $0.value.lastSeen >= cutoff }
        agentPreviewItems = agentItemsByID.values.sorted { $0.lastSeen > $1.lastSeen }
    }

    private func fallbackSummary(for state: AgentState) -> String {
        switch state {
        case .idle: return "会话空闲"
        case .working: return "Claude 正在处理"
        case .waiting: return "等待你回复"
        case .compacting: return "正在压缩上下文"
        case .stopped: return "轮次完成"
        case .error: return "Claude 遇到错误"
        }
    }
}
