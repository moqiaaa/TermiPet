import TermiPetCore
import Foundation

@MainActor
final class PreviewStore: ObservableObject {
    @Published var preview: TerminalPreview
    @Published private(set) var items: [WorkspacePreviewItem]

    /// 一个"瞬态"提示截止时间。在此之前，外部例行 refresh 不应覆盖当前 preview。
    private var transientUntil: Date?
    private var itemsByID: [WorkspacePreviewItem.ID: WorkspacePreviewItem] = [:]
    private var dismissedIDs: Set<WorkspacePreviewItem.ID> = []
    private var retainedCompletedClaudeIDs: Set<WorkspacePreviewItem.ID> = []
    private let now: () -> Date

    init(preview: TerminalPreview = .unavailable(appName: nil), now: @escaping () -> Date = Date.init) {
        self.preview = preview
        self.items = []
        self.now = now
    }

    /// 例行更新（前台 app 变化、终端状态轮询）。如果当前在瞬态期则不覆盖。
    func setRegular(_ preview: TerminalPreview) {
        if let until = transientUntil, until > Date() { return }
        transientUntil = nil
        self.preview = preview
    }

    func setSourceItems(_ newItems: [WorkspacePreviewItem], source: WorkspacePreviewItem.Source) {
        let previousIDs = Set(itemsByID.keys)
        itemsByID = itemsByID.filter { $0.value.source != source }
        for item in newItems {
            if item.status == .idle {
                dismissedIDs.remove(item.id)
            }
            if item.status == .idle, !previousIDs.contains(item.id), !dismissedIDs.contains(item.id) {
                continue
            }
            if dismissedIDs.contains(item.id) {
                continue
            }
            if item.status != .idle, item.source == .claude {
                retainedCompletedClaudeIDs.remove(item.id)
            }
            if item.source == .claude, item.status == .idle, previousIDs.contains(item.id) {
                retainedCompletedClaudeIDs.insert(item.id)
            }
            itemsByID[item.id] = item
        }
        publishItems()
        if transientUntil == nil || transientUntil ?? .distantPast <= now() {
            setRegular(items.first?.preview ?? .unavailable(appName: nil))
        }
    }

    func dismiss(id: WorkspacePreviewItem.ID) {
        dismissedIDs.insert(id)
        retainedCompletedClaudeIDs.remove(id)
        itemsByID.removeValue(forKey: id)
        publishItems()
        if transientUntil == nil || transientUntil ?? .distantPast <= now() {
            setRegular(items.first?.preview ?? .unavailable(appName: nil))
        }
    }

    func pruneExpired(maxAge: TimeInterval = 90) {
        let cutoff = now().addingTimeInterval(-maxAge)
        itemsByID = itemsByID.filter { $0.value.lastSeen >= cutoff }
        retainedCompletedClaudeIDs = retainedCompletedClaudeIDs.intersection(itemsByID.keys)
        publishItems()
        if transientUntil == nil || transientUntil ?? .distantPast <= now() {
            setRegular(items.first?.preview ?? .unavailable(appName: nil))
        }
    }

    /// 强提示，N 秒内不会被例行 refresh 覆盖。
    func setTransient(_ preview: TerminalPreview, duration: TimeInterval = 4) {
        self.preview = preview
        transientUntil = now().addingTimeInterval(duration)
    }

    func showClipboardFallback(appName: String?) {
        setTransient(TerminalPreview(
            status: .warning,
            title: appName ?? "Terminal",
            summary: "已复制到剪贴板",
            detail: "切到终端按 Cmd+V 粘贴（如需自动输入，请授予辅助功能权限）"
        ), duration: 5)
    }

    func showInjectionSuccess(appName: String?, command: String) {
        let trimmed = command.count > 40 ? String(command.prefix(40)) + "…" : command
        setTransient(TerminalPreview(
            status: .running,
            title: appName ?? "Terminal",
            summary: "已发送：\(trimmed)",
            detail: nil
        ), duration: 2)
    }

    private func publishItems() {
        items = itemsByID.values.filter { item in
            item.isActive || (item.source == .claude && retainedCompletedClaudeIDs.contains(item.id))
        }.sorted {
            if $0.status != $1.status {
                return priority(for: $0.status) > priority(for: $1.status)
            }
            return $0.lastSeen > $1.lastSeen
        }
    }

    private func priority(for status: TerminalPreview.Status) -> Int {
        switch status {
        case .error: return 4
        case .warning: return 3
        case .running: return 2
        case .idle: return 1
        case .unavailable: return 0
        }
    }
}
