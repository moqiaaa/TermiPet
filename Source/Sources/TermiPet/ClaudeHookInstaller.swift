import Foundation

@MainActor
enum ClaudeHookInstaller {
    private static let hookFileName = "floating-pet-hook.sh"
    private static let portFileName = "floating-pet-port"
    private static let signature = "# floating-pet-hook"

    private static let hookEventNames = [
        "UserPromptSubmit",
        "PreToolUse",
        "PostToolUse",
        "Stop",
        "SubagentStop",
        "SessionStart",
        "SessionEnd",
        "PermissionRequest",
        "PreCompact",
    ]

    static var claudeHome: URL {
        URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent(".claude", isDirectory: true)
    }

    static var hooksDir: URL { claudeHome.appendingPathComponent("hooks", isDirectory: true) }
    static var hookFile: URL { hooksDir.appendingPathComponent(hookFileName) }
    static var portFile: URL { hooksDir.appendingPathComponent(portFileName) }
    static var settingsFile: URL { claudeHome.appendingPathComponent("settings.json") }
    static var backupFile: URL { claudeHome.appendingPathComponent("settings.json.floating-pet.bak") }

    static func updatePort(_ port: UInt16) {
        try? FileManager.default.createDirectory(at: hooksDir, withIntermediateDirectories: true)
        try? String(port).write(to: portFile, atomically: true, encoding: .utf8)
    }

    static var isInstalled: Bool {
        FileManager.default.fileExists(atPath: hookFile.path) && settingsContainsOurHook()
    }

    static var needsScriptRefresh: Bool {
        guard FileManager.default.fileExists(atPath: hookFile.path),
              let current = try? String(contentsOf: hookFile, encoding: .utf8) else {
            return false
        }
        return current != hookScriptContent
    }

    static var hookScriptContent: String {
        """
        #!/bin/bash
        \(signature)
        PORT_FILE="$HOME/.claude/hooks/\(portFileName)"
        PORT=$(cat "$PORT_FILE" 2>/dev/null || echo 23456)
        BODY=$(cat)
        EVENT_NAME=$(printf "%s" "$BODY" | sed -nE 's/.*"hook_event_name"[[:space:]]*:[[:space:]]*"([^"]*)".*/\\1/p' | head -n 1)

        if [[ "$EVENT_NAME" == "PermissionRequest" ]]; then
            RESPONSE=$(curl -s -X POST "http://127.0.0.1:$PORT/hook" \\
                -H "Content-Type: application/json" \\
                --data-binary "$BODY" \\
                --max-time 30 2>/dev/null || true)
            if [[ -n "$RESPONSE" ]]; then
                printf "%s" "$RESPONSE"
            fi
            exit 0
        fi

        # 静默转发；任何失败都不影响 Claude Code
        curl -s -X POST "http://127.0.0.1:$PORT/hook" \\
            -H "Content-Type: application/json" \\
            --data-binary "$BODY" \\
            --max-time 1 >/dev/null 2>&1 || true
        exit 0
        """
    }

    static func install() throws {
        try FileManager.default.createDirectory(at: hooksDir, withIntermediateDirectories: true)
        try writeHookScript()
        try mergeIntoSettings()
    }

    static func refreshInstalledScriptIfNeeded() throws {
        guard isInstalled, needsScriptRefresh else { return }
        try writeHookScript()
    }

    static func uninstall() throws {
        try removeFromSettings()
        try? FileManager.default.removeItem(at: hookFile)
        try? FileManager.default.removeItem(at: portFile)
    }

    // MARK: - script

    private static func writeHookScript() throws {
        try hookScriptContent.write(to: hookFile, atomically: true, encoding: .utf8)
        try FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: hookFile.path)
    }

    // MARK: - settings.json

    private static func loadSettings() throws -> [String: Any] {
        guard FileManager.default.fileExists(atPath: settingsFile.path) else {
            return [:]
        }
        let data = try Data(contentsOf: settingsFile)
        let obj = try JSONSerialization.jsonObject(with: data, options: [])
        return obj as? [String: Any] ?? [:]
    }

    private static func writeSettings(_ dict: [String: Any]) throws {
        let data = try JSONSerialization.data(withJSONObject: dict, options: [.prettyPrinted, .sortedKeys])
        try data.write(to: settingsFile, options: .atomic)
    }

    private static func settingsContainsOurHook() -> Bool {
        guard let settings = try? loadSettings(),
              let hooks = settings["hooks"] as? [String: Any] else {
            return false
        }
        let path = hookFile.path
        for value in hooks.values {
            guard let matchers = value as? [[String: Any]] else { continue }
            for matcher in matchers {
                guard let nested = matcher["hooks"] as? [[String: Any]] else { continue }
                for hookEntry in nested {
                    if (hookEntry["command"] as? String)?.contains(path) == true {
                        return true
                    }
                }
            }
        }
        return false
    }

    private static func mergeIntoSettings() throws {
        var settings = try loadSettings()

        // 备份一次原文（仅在没有备份时）
        if !FileManager.default.fileExists(atPath: backupFile.path),
           FileManager.default.fileExists(atPath: settingsFile.path) {
            try? FileManager.default.copyItem(at: settingsFile, to: backupFile)
        }

        var hooks = settings["hooks"] as? [String: Any] ?? [:]

        for event in hookEventNames {
            var matchers = hooks[event] as? [[String: Any]] ?? []

            // 找一个我们自己的 matcher（matcher 字段为 "*" 或缺失），若已存在则跳过
            var foundOurs = false
            for index in matchers.indices {
                if let nested = matchers[index]["hooks"] as? [[String: Any]] {
                    let alreadyHas = nested.contains { ($0["command"] as? String)?.contains(hookFile.path) == true }
                    if alreadyHas { foundOurs = true; break }
                }
            }
            if foundOurs { hooks[event] = matchers; continue }

            // 追加我们的 entry。matcher: "*" 让所有工具都触发
            let ourEntry: [String: Any] = [
                "matcher": "*",
                "hooks": [
                    [
                        "type": "command",
                        "command": hookFile.path,
                    ]
                ],
            ]
            matchers.append(ourEntry)
            hooks[event] = matchers
        }

        settings["hooks"] = hooks
        try writeSettings(settings)
    }

    private static func removeFromSettings() throws {
        guard FileManager.default.fileExists(atPath: settingsFile.path) else { return }
        var settings = try loadSettings()
        guard var hooks = settings["hooks"] as? [String: Any] else { return }

        for event in hookEventNames {
            guard var matchers = hooks[event] as? [[String: Any]] else { continue }
            matchers = matchers.compactMap { matcher in
                guard var nested = matcher["hooks"] as? [[String: Any]] else { return matcher }
                nested.removeAll { ($0["command"] as? String)?.contains(hookFile.path) == true }
                if nested.isEmpty { return nil }
                var updated = matcher
                updated["hooks"] = nested
                return updated
            }
            if matchers.isEmpty {
                hooks.removeValue(forKey: event)
            } else {
                hooks[event] = matchers
            }
        }

        if hooks.isEmpty {
            settings.removeValue(forKey: "hooks")
        } else {
            settings["hooks"] = hooks
        }
        try writeSettings(settings)
    }
}
