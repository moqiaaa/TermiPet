import Foundation
import Network
import TermiPetCore

@MainActor
final class ClaudeHookServer {
    private let store: CodingContextStore
    private let currentTarget: @MainActor () -> ClaudeEventTarget?
    private var listener: NWListener?
    private(set) var boundPort: UInt16 = 0
    private var pendingDecisions: [String: CheckedContinuation<ClaudePermissionDecision, Never>] = [:]
    private var pendingTimeouts: [String: Task<Void, Never>] = [:]

    private static let preferredPorts: [UInt16] = [23456, 23457, 23458, 23459, 23460]

    init(store: CodingContextStore, currentTarget: @escaping @MainActor () -> ClaudeEventTarget? = { nil }) {
        self.store = store
        self.currentTarget = currentTarget
    }

    func start() {
        guard listener == nil else { return }
        let parameters = NWParameters.tcp
        parameters.allowLocalEndpointReuse = true
        parameters.requiredInterfaceType = .loopback

        for port in Self.preferredPorts {
            guard let nwPort = NWEndpoint.Port(rawValue: port) else { continue }
            do {
                let l = try NWListener(using: parameters, on: nwPort)
                self.listener = l
                self.boundPort = port
                l.newConnectionHandler = { [weak self] connection in
                    Task { @MainActor in
                        self?.accept(connection: connection)
                    }
                }
                l.stateUpdateHandler = { state in
                    if case .failed(let error) = state {
                        NSLog("[ClaudeHookServer] listener failed: \(error)")
                    }
                }
                l.start(queue: .main)
                NSLog("[ClaudeHookServer] listening on 127.0.0.1:\(port)")
                return
            } catch {
                continue
            }
        }
        NSLog("[ClaudeHookServer] failed to bind any port in \(Self.preferredPorts)")
    }

    func stop() {
        for continuation in pendingDecisions.values {
            continuation.resume(returning: .ask)
        }
        pendingDecisions.removeAll()
        for timeout in pendingTimeouts.values {
            timeout.cancel()
        }
        pendingTimeouts.removeAll()
        listener?.cancel()
        listener = nil
        boundPort = 0
    }

    func resolvePermissionRequest(id: ApprovalPrompt.ID, decision: ClaudePermissionDecision) {
        store.markApprovalResolved(id: id, allowed: decision == .allow)
        guard let continuation = pendingDecisions.removeValue(forKey: id) else { return }
        pendingTimeouts.removeValue(forKey: id)?.cancel()
        continuation.resume(returning: decision)
    }

    private func accept(connection: NWConnection) {
        connection.start(queue: .main)
        receive(connection: connection, buffer: Data())
    }

    nonisolated private func receive(connection: NWConnection, buffer initialBuffer: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 64 * 1024) { [weak self] data, _, isComplete, error in
            guard let self else { return }
            var buffer = initialBuffer
            if let data, !data.isEmpty {
                buffer.append(data)
            }

            switch Self.parseHTTPRequest(from: buffer, connectionClosed: isComplete) {
            case .complete(let body, let remainder):
                Task { @MainActor in
                    let responseBody = await self.handle(body: body)
                    Self.respond(connection: connection, body: responseBody)
                }
                // 粘包：剩余字节里可能还有下一个请求
                if !remainder.isEmpty {
                    self.receive(connection: connection, buffer: remainder)
                }
                return
            case .needMore:
                if isComplete || error != nil {
                    connection.cancel()
                    return
                }
                self.receive(connection: connection, buffer: buffer)
            }
        }
    }

    nonisolated private static func respond(connection: NWConnection, body: Data? = nil) {
        if let body, !body.isEmpty {
            let response = "HTTP/1.1 200 OK\r\nConnection: close\r\nContent-Type: application/json\r\nContent-Length: \(body.count)\r\n\r\n"
            var data = Data(response.utf8)
            data.append(body)
            connection.send(content: data, completion: .contentProcessed { _ in
                connection.cancel()
            })
            return
        }

        let response = Data("HTTP/1.1 204 No Content\r\nConnection: close\r\nContent-Length: 0\r\n\r\n".utf8)
        connection.send(content: response, completion: .contentProcessed { _ in
            connection.cancel()
        })
    }

    private enum HTTPParseResult {
        case needMore
        case complete(body: Data, remainder: Data)
    }

    nonisolated private static func parseHTTPRequest(from buffer: Data, connectionClosed: Bool) -> HTTPParseResult {
        let marker = Data([0x0d, 0x0a, 0x0d, 0x0a])
        guard let range = buffer.range(of: marker) else { return .needMore }
        let headerData = buffer.subdata(in: 0..<range.lowerBound)
        guard let headerString = String(data: headerData, encoding: .utf8) else { return .needMore }

        var contentLength: Int? = nil
        for line in headerString.components(separatedBy: "\r\n") {
            let lower = line.lowercased()
            if lower.hasPrefix("content-length:") {
                let value = line.dropFirst("content-length:".count).trimmingCharacters(in: .whitespaces)
                contentLength = Int(value)
            }
        }

        let bodyStart = range.upperBound
        let available = buffer.count - bodyStart

        if let cl = contentLength {
            guard available >= cl else { return .needMore }
            let body = buffer.subdata(in: bodyStart..<(bodyStart + cl))
            let remainder = buffer.subdata(in: (bodyStart + cl)..<buffer.count)
            return .complete(body: body, remainder: remainder)
        }

        // 无 Content-Length：按 HTTP/1.0 风格，等连接关闭后把剩余字节当 body
        if connectionClosed {
            let body = buffer.subdata(in: bodyStart..<buffer.count)
            return .complete(body: body, remainder: Data())
        }
        return .needMore
    }

    private struct HookEnvelope: Decodable {
        var hook_event_name: String?
        var tool_name: String?
        var tool_input: AnyDecodable?
        var tool_response: ToolResponse?
        var prompt: String?
        var last_assistant_message: String?
        var session_id: String?
        var cwd: String?
        var reason: String?
        var tool_use_id: String?

        struct ToolResponse: Decodable {
            var is_error: Bool?
        }
    }

    /// 一个能装下任意 JSON 的占位类型
    private struct AnyDecodable: Decodable { init(from decoder: Decoder) throws {} }

    private func handle(body: Data) async -> Data? {
        guard let envelope = try? JSONDecoder().decode(HookEnvelope.self, from: body) else {
            NSLog("[ClaudeHookServer] failed to decode payload (\(body.count) bytes)")
            return nil
        }

        if envelope.hook_event_name == "PermissionRequest" {
            let decision = await requestPermissionDecision(for: envelope)
            return try? ClaudePermissionDecisionResponse.encode(decision)
        }

        let mapped = Self.map(envelope: envelope)
        let target = currentTarget()
        store.applyHookEvent(
            state: mapped.state,
            summary: mapped.summary,
            sessionID: envelope.session_id,
            cwd: envelope.cwd,
            targetAppName: target?.appName,
            targetBundleIdentifier: target?.bundleIdentifier,
            targetProcessIdentifier: target?.processIdentifier,
            targetWindowTitle: target?.windowTitle
        )
        return nil
    }

    private func requestPermissionDecision(for envelope: HookEnvelope) async -> ClaudePermissionDecision {
        let id = approvalID(for: envelope)
        let target = currentTarget()
        let prompt = ApprovalPrompt(
            id: id,
            source: .claude,
            title: "Claude Code",
            summary: envelope.reason ?? envelope.tool_name.map { "Claude 请求允许 \($0)" } ?? "Claude 正在请求授权",
            detail: envelope.cwd,
            action: .claudeAllow,
            denyAction: .claudeDeny,
            executionHint: "Claude Hook",
            targetAppName: target?.appName,
            targetBundleIdentifier: target?.bundleIdentifier
        )
        store.presentApprovalPrompt(
            prompt,
            sessionID: envelope.session_id,
            cwd: envelope.cwd,
            targetAppName: target?.appName,
            targetBundleIdentifier: target?.bundleIdentifier,
            targetProcessIdentifier: target?.processIdentifier,
            targetWindowTitle: target?.windowTitle
        )

        return await withCheckedContinuation { continuation in
            pendingDecisions[id] = continuation
            pendingTimeouts[id]?.cancel()
            pendingTimeouts[id] = Task { @MainActor in
                try? await Task.sleep(for: .seconds(25))
                guard let continuation = pendingDecisions.removeValue(forKey: id) else { return }
                pendingTimeouts.removeValue(forKey: id)
                store.clearApprovalPrompt(id: id)
                continuation.resume(returning: .ask)
            }
        }
    }

    private func approvalID(for envelope: HookEnvelope) -> String {
        [
            "claude-permission",
            envelope.session_id,
            envelope.tool_use_id,
            envelope.cwd,
            envelope.tool_name,
        ]
        .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
        .filter { !$0.isEmpty }
        .joined(separator: ":")
    }

    private static func map(envelope: HookEnvelope) -> (state: AgentState, summary: String?) {
        let event = envelope.hook_event_name ?? ""
        let tool = envelope.tool_name

        switch event {
        case "UserPromptSubmit":
            return (.working, "Claude 正在思考……")

        case "PreToolUse":
            if tool == "AskQuestion" {
                return (.waiting, "等待你回复")
            }
            return (.working, tool.map { "Claude 正在调用 \($0)" } ?? "Claude 正在调用工具")

        case "PostToolUse":
            if envelope.tool_response?.is_error == true {
                return (.error, tool.map { "工具 \($0) 失败" } ?? "工具失败")
            }
            return (.working, tool.map { "工具 \($0) 完成" } ?? "工具完成")

        case "PermissionRequest":
            return (.waiting, "等待你授权")

        case "PreCompact":
            return (.compacting, "正在压缩上下文")

        case "Stop":
            if let msg = envelope.last_assistant_message {
                let trimmed = msg.replacingOccurrences(of: "\n", with: " ")
                let preview = trimmed.count > 80 ? trimmed.prefix(80) + "…" : Substring(trimmed)
                return (.stopped, String(preview))
            }
            return (.stopped, "轮次完成")

        case "SubagentStop":
            return (.working, "子 Agent 已停止")

        case "SessionStart":
            return (.idle, "会话已启动")

        case "SessionEnd":
            return (.idle, nil)

        default:
            return (.idle, nil)
        }
    }
}

struct ClaudeEventTarget: Sendable {
    var appName: String?
    var bundleIdentifier: String?
    var processIdentifier: Int32?
    var windowTitle: String?
}
