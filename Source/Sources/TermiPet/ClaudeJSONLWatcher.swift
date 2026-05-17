import Foundation
import TermiPetCore

@MainActor
final class ClaudeJSONLWatcher {
    private let store: CodingContextStore
    private let projectsDir: URL
    private var currentFileURL: URL?
    private var currentSource: DispatchSourceFileSystemObject?
    private var dirSource: DispatchSourceFileSystemObject?
    private var pollTimer: Timer?
    private var cwdCache: [URL: String] = [:]

    init(store: CodingContextStore,
         projectsDir: URL = URL(fileURLWithPath: NSHomeDirectory())
            .appendingPathComponent(".claude/projects", isDirectory: true)) {
        self.store = store
        self.projectsDir = projectsDir
    }

    func start() {
        rescan()
        pollTimer?.invalidate()
        pollTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.rescan() }
        }
    }

    func stop() {
        pollTimer?.invalidate()
        pollTimer = nil
        teardownFileWatch()
        teardownDirWatch()
    }

    private func rescan() {
        guard FileManager.default.fileExists(atPath: projectsDir.path) else { return }

        let activeFiles = findActiveJSONL()
        let latest = activeFiles.first
        if latest?.path != currentFileURL?.path {
            currentFileURL = latest
            teardownFileWatch()
            if let latest { setupFileWatch(for: latest) }
        }
        if dirSource == nil {
            setupDirWatch()
        }
        for file in activeFiles.prefix(6) {
            parseTail(of: file)
        }
    }

    /// 找最近活跃的 jsonl（mtime 在 5 分钟内）。完全不活跃就返回 nil，避免把陈旧 session 错当成"正在跑"。
    private func findLatestJSONL() -> URL? {
        findActiveJSONL().first
    }

    private func findActiveJSONL() -> [URL] {
        let fm = FileManager.default
        guard let projects = try? fm.contentsOfDirectory(at: projectsDir, includingPropertiesForKeys: [.contentModificationDateKey]) else {
            return []
        }
        let cutoff = Date().addingTimeInterval(-300)

        var active: [(url: URL, date: Date)] = []
        for project in projects {
            guard let files = try? fm.contentsOfDirectory(at: project, includingPropertiesForKeys: [.contentModificationDateKey]) else { continue }
            for file in files where file.pathExtension == "jsonl" {
                let mtime = (try? file.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast
                if mtime > cutoff {
                    active.append((file, mtime))
                }
            }
        }
        return active.sorted { $0.date > $1.date }.map(\.url)
    }

    // MARK: - dispatch source helpers

    private func setupFileWatch(for url: URL) {
        let fd = open(url.path, O_EVTONLY)
        guard fd >= 0 else { return }
        let src = DispatchSource.makeFileSystemObjectSource(
            fileDescriptor: fd,
            eventMask: [.write, .extend, .delete, .rename],
            queue: .main
        )
        src.setEventHandler { [weak self] in
            Task { @MainActor in
                guard let self else { return }
                let events = src.data
                if events.contains(.delete) || events.contains(.rename) {
                    self.teardownFileWatch()
                    self.rescan()
                    return
                }
                self.parseTail(of: url)
            }
        }
        src.setCancelHandler { [fd] in
            close(fd)
        }
        src.resume()
        currentSource = src
    }

    private func teardownFileWatch() {
        currentSource?.cancel()
        currentSource = nil
    }

    private func setupDirWatch() {
        guard FileManager.default.fileExists(atPath: projectsDir.path) else { return }
        let fd = open(projectsDir.path, O_EVTONLY)
        guard fd >= 0 else { return }
        let src = DispatchSource.makeFileSystemObjectSource(
            fileDescriptor: fd,
            eventMask: [.write, .extend, .rename],
            queue: .main
        )
        src.setEventHandler { [weak self] in
            Task { @MainActor in self?.rescan() }
        }
        src.setCancelHandler { [fd] in
            close(fd)
        }
        src.resume()
        dirSource = src
    }

    private func teardownDirWatch() {
        dirSource?.cancel()
        dirSource = nil
    }

    // MARK: - tail parsing

    private func parseTail(of url: URL) {
        guard let handle = try? FileHandle(forReadingFrom: url) else { return }
        defer { try? handle.close() }

        let length = (try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? Int) ?? 0
        let chunkSize = 32 * 1024
        let offset = UInt64(max(0, length - chunkSize))
        try? handle.seek(toOffset: offset)
        guard var data = try? handle.readToEnd(), !data.isEmpty else { return }

        // 若起始 offset > 0，可能切到 UTF-8 多字节字符中间。回退到第一个非 continuation 字节。
        if offset > 0 {
            while let first = data.first, (first & 0xC0) == 0x80 {
                data.removeFirst()
            }
        }

        guard let text = String(data: data, encoding: .utf8) else { return }
        let lines = text.split(whereSeparator: \.isNewline).map(String.init)

        // 倒序找首条"有意义"的事件（user/assistant 之外的 metadata 跳过）
        for line in lines.reversed() {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            guard !trimmed.isEmpty else { continue }
            guard let kind = decodeKind(trimmed) else { continue }
            let mapped = Self.map(kind: kind)
            store.applyJSONLObservation(
                state: mapped.state,
                summary: mapped.summary,
                sessionID: url.deletingPathExtension().lastPathComponent,
                cwd: projectPath(from: url)
            )
            return
        }
    }

    private func projectPath(from url: URL) -> String? {
        if let cached = cwdCache[url] { return cached }
        if let head = readCWDFromHeader(of: url) {
            cwdCache[url] = head
            return head
        }
        // fallback：Claude 把路径中的 `/` 编码成 `-`，含 `-` 的路径会被误拆，但仍优于无路径
        let encoded = url.deletingLastPathComponent().lastPathComponent
        guard !encoded.isEmpty else { return nil }
        let decoded = encoded.replacingOccurrences(of: "-", with: "/")
        return decoded.hasPrefix("/") ? decoded : nil
    }

    private func readCWDFromHeader(of url: URL) -> String? {
        guard let handle = try? FileHandle(forReadingFrom: url) else { return nil }
        defer { try? handle.close() }
        // 读首部最多 16KB：metadata / 首条 user 事件里一般会带 cwd
        guard let data = try? handle.read(upToCount: 16 * 1024), !data.isEmpty else { return nil }
        guard let text = String(data: data, encoding: .utf8) else { return nil }
        for line in text.split(whereSeparator: \.isNewline) {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            guard !trimmed.isEmpty,
                  let lineData = trimmed.data(using: .utf8),
                  let obj = try? JSONSerialization.jsonObject(with: lineData) as? [String: Any] else { continue }
            if let cwd = obj["cwd"] as? String, !cwd.isEmpty { return cwd }
        }
        return nil
    }

    // MARK: - schema

    private enum EntryKind {
        case userPrompt
        case toolResult(isError: Bool)
        case assistantToolUse(toolName: String?)
        case assistantThinking
        case assistantText(stopReason: String?, lastText: String?)
    }

    private func decodeKind(_ line: String) -> EntryKind? {
        guard let data = line.data(using: .utf8),
              let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }

        // 只关心 user / assistant 顶层；其余 metadata 都跳过
        let topType = (obj["type"] as? String)?.lowercased() ?? ""
        guard topType == "user" || topType == "assistant" else { return nil }

        let message = obj["message"] as? [String: Any] ?? [:]
        let role = (message["role"] as? String)?.lowercased() ?? topType
        let stopReason = message["stop_reason"] as? String

        // content 可能是字符串或数组
        if let str = message["content"] as? String, !str.isEmpty {
            return role == "user" ? .userPrompt : .assistantText(stopReason: stopReason, lastText: str)
        }

        guard let items = message["content"] as? [[String: Any]] else { return nil }

        if role == "user" {
            for item in items {
                let type = (item["type"] as? String)?.lowercased() ?? ""
                if type == "tool_result" {
                    let err = (item["is_error"] as? Bool) ?? false
                    return .toolResult(isError: err)
                }
            }
            return .userPrompt
        }

        // assistant
        var hasToolUse = false
        var toolName: String?
        var hasThinking = false
        var hasText = false
        var lastText: String?
        for item in items {
            let type = (item["type"] as? String)?.lowercased() ?? ""
            switch type {
            case "tool_use":
                hasToolUse = true
                if let n = item["name"] as? String { toolName = n }
            case "thinking":
                hasThinking = true
            case "text":
                hasText = true
                if let t = item["text"] as? String, !t.isEmpty { lastText = t }
            default:
                break
            }
        }

        if hasToolUse {
            return .assistantToolUse(toolName: toolName)
        }
        if hasThinking && !hasText {
            return .assistantThinking
        }
        return .assistantText(stopReason: stopReason, lastText: lastText)
    }

    private static func map(kind: EntryKind) -> (state: AgentState, summary: String?) {
        switch kind {
        case .userPrompt:
            return (.working, "Claude 正在思考……")
        case .toolResult(let isError):
            return isError
                ? (.error, "工具失败")
                : (.working, "处理工具结果")
        case .assistantThinking:
            return (.working, "Claude 正在思考……")
        case .assistantToolUse(let toolName):
            return (.working, toolName.map { "Claude 正在调用 \($0)" } ?? "Claude 正在调用工具")
        case .assistantText(let stopReason, let lastText):
            if stopReason == "end_turn" {
                if let lastText {
                    let trimmed = lastText.replacingOccurrences(of: "\n", with: " ")
                    let preview = trimmed.count > 60 ? trimmed.prefix(60) + "…" : Substring(trimmed)
                    return (.stopped, String(preview))
                }
                return (.stopped, nil)
            }
            // 还在流式（stop_reason 为 nil 或 tool_use 中间态）
            return (.working, "Claude 正在回复……")
        }
    }
}
