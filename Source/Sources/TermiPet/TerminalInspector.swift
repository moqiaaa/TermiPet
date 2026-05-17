import AppKit
import ApplicationServices
import TermiPetCore

struct CodingContext {
    var app: CodingAppInfo?
    var windowTitle: String?
    var fileHint: String?
    var projectHint: String?
}

@MainActor
final class TerminalInspector {
    private let targetTracker: TargetApplicationTracker

    init(targetTracker: TargetApplicationTracker) {
        self.targetTracker = targetTracker
    }

    // MARK: - Terminal full-text inspection (existing slow path)

    func inspectForegroundTerminal() -> TerminalPreview {
        guard let app = targetTracker.currentTargetApplication() else {
            return .unavailable(appName: nil)
        }

        let appName = app.localizedName
        guard AXIsProcessTrusted() else {
            return .accessibilityPermissionRequired(appName: appName)
        }

        let appElement = AXUIElementCreateApplication(app.processIdentifier)
        let windowTitle = focusedWindowTitle(from: appElement)
        let text = collectText(from: appElement)

        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return .unavailable(appName: appName)
        }

        return .extract(appName: appName, windowTitle: windowTitle, text: text)
    }

    func inspectForegroundApprovalPrompt() -> ApprovalPrompt? {
        guard let app = targetTracker.currentTargetApplication() else { return nil }
        guard AXIsProcessTrusted() else { return nil }

        let appElement = AXUIElementCreateApplication(app.processIdentifier)
        let windowTitle = focusedWindowTitle(from: appElement)
        let text = collectText(from: appElement)
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }

        var prompt = TerminalApprovalDetector.detect(appName: app.localizedName, windowTitle: windowTitle, text: text)
        prompt?.targetBundleIdentifier = app.bundleIdentifier
        return prompt
    }

    func inspectTerminalWindows() -> [WorkspacePreviewItem] {
        guard AXIsProcessTrusted() else { return [] }

        var items: [WorkspacePreviewItem] = []
        for app in NSWorkspace.shared.runningApplications where !app.isTerminated {
            let info = CodingApplication.classify(
                bundleIdentifier: app.bundleIdentifier,
                localizedName: app.localizedName
            )
            guard info.kind == .terminal else { continue }

            let appElement = AXUIElementCreateApplication(app.processIdentifier)
            let windows = windowElements(from: appElement)
            if windows.isEmpty {
                let preview = inspectTerminalAppElement(appElement, appName: info.displayName, fallback: "\(app.processIdentifier)")
                if preview.status != .unavailable {
                    items.append(WorkspacePreviewItem(
                        id: WorkspacePreviewItem.terminalID(appName: info.displayName, windowTitle: preview.detail, fallback: "\(app.processIdentifier)"),
                        source: .terminal,
                        preview: preview,
                        targetAppName: app.localizedName,
                        targetBundleIdentifier: app.bundleIdentifier,
                        targetProcessIdentifier: app.processIdentifier,
                        targetWindowTitle: preview.detail
                    ))
                }
                continue
            }

            for (index, window) in windows.enumerated() {
                let title = windowTitle(from: window)
                let text = collectText(from: window)
                guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { continue }
                let preview = TerminalPreview.extract(appName: info.displayName, windowTitle: title, text: text)
                items.append(WorkspacePreviewItem(
                    id: WorkspacePreviewItem.terminalID(appName: info.displayName, windowTitle: title, fallback: "\(app.processIdentifier)-\(index)"),
                    source: .terminal,
                    preview: preview,
                    targetAppName: app.localizedName,
                    targetBundleIdentifier: app.bundleIdentifier,
                    targetProcessIdentifier: app.processIdentifier,
                    targetWindowTitle: title
                ))
            }
        }

        return items
    }

    // MARK: - Coding context (cheap path)

    /// 读取当前前台 app 的分类 + 窗口标题，并尝试解析出文件名 / 项目名。
    /// 不读取窗口全文，开销极低。需要辅助功能权限时返回标题为 nil。
    func inspectCodingContext() -> CodingContext {
        guard let app = NSWorkspace.shared.frontmostApplication,
              app.processIdentifier != NSRunningApplication.current.processIdentifier
        else {
            return CodingContext(app: nil, windowTitle: nil, fileHint: nil, projectHint: nil)
        }

        let info = CodingApplication.classify(
            bundleIdentifier: app.bundleIdentifier,
            localizedName: app.localizedName
        )

        guard info.kind != .unknown else {
            return CodingContext(app: info, windowTitle: nil, fileHint: nil, projectHint: nil)
        }

        let title = focusedWindowTitle(from: AXUIElementCreateApplication(app.processIdentifier))
        let docPath = focusedDocumentPath(from: AXUIElementCreateApplication(app.processIdentifier))

        let parsed = parseTitle(
            title: title,
            documentPath: docPath,
            kind: info.kind,
            bundleIdentifier: app.bundleIdentifier?.lowercased(),
            appName: info.displayName
        )

        return CodingContext(
            app: info,
            windowTitle: title,
            fileHint: parsed.file,
            projectHint: parsed.project
        )
    }

    // MARK: - Title parsing

    private func parseTitle(
        title: String?,
        documentPath: String?,
        kind: CodingAppKind,
        bundleIdentifier: String?,
        appName: String
    ) -> (file: String?, project: String?) {
        guard kind == .editor else { return (nil, nil) }

        // Xcode 优先用 AXDocument URL
        if bundleIdentifier == "com.apple.dt.xcode" {
            let file = documentPath.flatMap { URL(string: $0)?.lastPathComponent }
                ?? title.flatMap(Self.firstSegment(by: " — "))
            let project = title.flatMap(Self.lastSegment(by: " — "))
            return (cleanFileName(file), normalizeProject(project, appName: appName))
        }

        guard let raw = title?.trimmingCharacters(in: .whitespacesAndNewlines), !raw.isEmpty else {
            return (nil, nil)
        }

        // JetBrains 系：`filename [projectName] – IDE`
        if let bundleIdentifier, bundleIdentifier.hasPrefix("com.jetbrains.") || bundleIdentifier == "com.google.android.studio" {
            if let match = raw.range(of: #"^(.+?)\s*\[(.+?)\]"#, options: .regularExpression) {
                let chunk = String(raw[match])
                let bracketRange = chunk.range(of: "[")!
                let file = chunk[..<bracketRange.lowerBound].trimmingCharacters(in: .whitespaces)
                let project = chunk[chunk.index(after: bracketRange.lowerBound)..<chunk.index(before: chunk.endIndex)]
                return (cleanFileName(file), normalizeProject(String(project), appName: appName))
            }
        }

        // 通用：按 ` — ` / ` – ` / ` - ` 拆分；末尾若是 app 名则剥掉
        let separators = [" — ", " – ", " - "]
        var segments = [raw]
        for sep in separators where raw.contains(sep) {
            segments = raw.components(separatedBy: sep)
            break
        }

        // 末尾段如果是 app 自身名字（如 "Cursor" / "Visual Studio Code"）则剥掉
        if segments.count >= 2, isAppNameSegment(segments.last ?? "", appName: appName) {
            segments.removeLast()
        }

        let file = segments.first.map(cleanFileName) ?? nil
        let project = segments.count >= 2 ? normalizeProject(segments.last, appName: appName) : nil

        return (file, project)
    }

    private func isAppNameSegment(_ segment: String, appName: String) -> Bool {
        let norm = segment.lowercased().filter { $0.isLetter || $0.isNumber }
        let appNorm = appName.lowercased().filter { $0.isLetter || $0.isNumber }
        if norm == appNorm { return true }
        let known = ["cursor", "visualstudiocode", "code", "codeinsiders", "xcode", "zed", "sublimetext", "nova", "windsurf"]
        return known.contains(norm)
    }

    private func cleanFileName(_ value: String?) -> String? {
        guard var name = value?.trimmingCharacters(in: .whitespaces), !name.isEmpty else { return nil }
        // 去掉未保存标记 "●" / "•"
        for marker in ["●", "•"] {
            name = name.replacingOccurrences(of: marker, with: "").trimmingCharacters(in: .whitespaces)
        }
        return name.isEmpty ? nil : name
    }

    private func normalizeProject(_ value: String?, appName: String) -> String? {
        guard let raw = value?.trimmingCharacters(in: .whitespaces), !raw.isEmpty else { return nil }
        if isAppNameSegment(raw, appName: appName) { return nil }
        return raw
    }

    private static func firstSegment(by separator: String) -> (String) -> String? {
        { input in
            input.components(separatedBy: separator).first?.trimmingCharacters(in: .whitespaces)
        }
    }

    private static func lastSegment(by separator: String) -> (String) -> String? {
        { input in
            let parts = input.components(separatedBy: separator)
            return parts.count >= 2 ? parts.last?.trimmingCharacters(in: .whitespaces) : nil
        }
    }

    // MARK: - AX helpers

    private func focusedWindowTitle(from element: AXUIElement) -> String? {
        guard AXIsProcessTrusted() else { return nil }
        guard let window = copyAttribute(kAXFocusedWindowAttribute, from: element),
              CFGetTypeID(window as CFTypeRef) == AXUIElementGetTypeID() else {
            return nil
        }

        if let title = copyAttribute(kAXTitleAttribute, from: window as! AXUIElement) as? String,
           !title.isEmpty {
            return title
        }
        return nil
    }

    private func windowTitle(from window: AXUIElement) -> String? {
        if let title = copyAttribute(kAXTitleAttribute, from: window) as? String,
           !title.isEmpty {
            return title
        }
        return nil
    }

    private func windowElements(from appElement: AXUIElement) -> [AXUIElement] {
        guard let windows = copyAttribute(kAXWindowsAttribute, from: appElement) as? [Any] else { return [] }
        return windows.compactMap { value in
            guard CFGetTypeID(value as CFTypeRef) == AXUIElementGetTypeID() else { return nil }
            return (value as! AXUIElement)
        }
    }

    private func inspectTerminalAppElement(_ appElement: AXUIElement, appName: String, fallback: String) -> TerminalPreview {
        let windowTitle = focusedWindowTitle(from: appElement)
        let text = collectText(from: appElement)
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return .unavailable(appName: appName)
        }
        return .extract(appName: appName, windowTitle: windowTitle ?? fallback, text: text)
    }

    private func focusedDocumentPath(from element: AXUIElement) -> String? {
        guard AXIsProcessTrusted() else { return nil }
        guard let window = copyAttribute(kAXFocusedWindowAttribute, from: element),
              CFGetTypeID(window as CFTypeRef) == AXUIElementGetTypeID() else {
            return nil
        }
        if let doc = copyAttribute(kAXDocumentAttribute, from: window as! AXUIElement) as? String,
           !doc.isEmpty {
            return doc
        }
        return nil
    }

    private func collectText(from element: AXUIElement) -> String {
        var result = ""
        var visited = Set<CFHashCode>()
        collectText(from: element, depth: 0, result: &result, visited: &visited)
        return result
    }

    private func collectText(from element: AXUIElement, depth: Int, result: inout String, visited: inout Set<CFHashCode>) {
        guard depth <= 7, result.count < 6000 else { return }

        let key = CFHash(element)
        guard !visited.contains(key) else { return }
        visited.insert(key)

        for attribute in [
            kAXValueAttribute,
            kAXTitleAttribute,
            kAXDescriptionAttribute,
        ] {
            if let string = copyAttribute(attribute, from: element) as? String,
               !string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                result += string
                result += "\n"
                if result.count >= 6000 { return }
            }
        }

        for attribute in [
            kAXFocusedWindowAttribute,
            kAXWindowsAttribute,
            kAXChildrenAttribute,
            kAXVisibleChildrenAttribute,
            kAXRowsAttribute,
            kAXColumnsAttribute,
        ] {
            guard let value = copyAttribute(attribute, from: element) else { continue }
            collectText(from: value, depth: depth + 1, result: &result, visited: &visited)
            if result.count >= 6000 { return }
        }
    }

    private func collectText(from value: Any, depth: Int, result: inout String, visited: inout Set<CFHashCode>) {
        if let string = value as? String {
            result += string
            result += "\n"
            return
        }

        if CFGetTypeID(value as CFTypeRef) == AXUIElementGetTypeID() {
            collectText(from: value as! AXUIElement, depth: depth, result: &result, visited: &visited)
            return
        }

        guard let values = value as? [Any] else { return }
        for child in values {
            collectText(from: child, depth: depth, result: &result, visited: &visited)
            if result.count >= 6000 { return }
        }
    }

    private func copyAttribute(_ attribute: String, from element: AXUIElement) -> Any? {
        var value: CFTypeRef?
        let result = AXUIElementCopyAttributeValue(element, attribute as CFString, &value)
        guard result == .success else { return nil }
        return value
    }
}
