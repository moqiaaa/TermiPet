import Foundation

public enum FloatingCommandSource: String, Codable, Sendable {
    case `default`
    case custom
}

public struct FloatingCommand: Codable, Equatable, Identifiable, Sendable {
    public var id: String
    public var title: String
    public var text: String
    public var summary: String
    public var source: FloatingCommandSource

    public var isCustom: Bool { source == .custom }

    public init(
        id: String? = nil,
        title: String? = nil,
        text: String,
        summary: String = "",
        source: FloatingCommandSource = .custom
    ) {
        self.id = id ?? text
        self.title = title ?? text
        self.text = text
        self.summary = summary
        self.source = source
    }

    public static func custom(id: String = UUID().uuidString, title: String, text: String, summary: String = "") -> FloatingCommand {
        FloatingCommand(id: id, title: title, text: text, summary: summary, source: .custom)
    }

    public func asCustom(id: String? = nil) -> FloatingCommand {
        FloatingCommand(id: id ?? self.id, title: title, text: text, summary: summary, source: .custom)
    }

    private enum CodingKeys: String, CodingKey {
        case id
        case title
        case text
        case summary
        case source
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let text = try container.decode(String.self, forKey: .text)
        let id = try container.decodeIfPresent(String.self, forKey: .id) ?? text
        let title = try container.decodeIfPresent(String.self, forKey: .title) ?? text
        let summary = try container.decodeIfPresent(String.self, forKey: .summary) ?? ""
        let source = try container.decodeIfPresent(FloatingCommandSource.self, forKey: .source) ?? .custom
        self.init(id: id, title: title, text: text, summary: summary, source: source)
    }

    private static func defaultCommand(title: String? = nil, text: String, summary: String) -> FloatingCommand {
        FloatingCommand(id: "default:\(text)", title: title, text: text, summary: summary, source: .default)
    }

    public static let defaults: [FloatingCommand] = [
        defaultCommand(title: "Claude", text: "claude", summary: "启动 Claude Code 交互会话"),
        defaultCommand(title: "Claude Auto", text: "claude --enable-auto-mode", summary: "开启自动模式，减少手动确认"),
        defaultCommand(title: "Claude Danger", text: "claude --dangerously-skip-permissions", summary: "跳过权限提示，适合受控环境"),
        defaultCommand(text: "/compact", summary: "压缩上下文，保留当前任务重点"),
        defaultCommand(text: "/init", summary: "生成或更新项目说明文件"),
        defaultCommand(text: "/clear", summary: "清空当前对话上下文"),
        defaultCommand(text: "/memory", summary: "查看或管理 Claude 记忆"),
        defaultCommand(text: "/model", summary: "切换当前使用的模型"),
        defaultCommand(text: "/help", summary: "查看 Claude Code 帮助"),
        defaultCommand(text: "/review", summary: "请求代码审查建议"),
        defaultCommand(text: "/status", summary: "查看当前会话和工具状态"),
        defaultCommand(text: "/diff", summary: "查看本次修改差异"),
        defaultCommand(text: "/cost", summary: "查看当前会话消耗"),
        defaultCommand(text: "/login", summary: "登录或切换账号"),
        defaultCommand(text: "/config", summary: "打开配置相关选项"),
        defaultCommand(text: "/mcp", summary: "管理 MCP 服务器连接"),
        defaultCommand(text: "/doctor", summary: "检查本地环境问题"),
        defaultCommand(text: "/terminal-setup", summary: "配置终端集成能力"),
    ]

    private static let defaultSummaryKeys: [String: AppTextKey] = [
        "default:claude": .cmdSummaryClaude,
        "default:claude --enable-auto-mode": .cmdSummaryClaudeAuto,
        "default:claude --dangerously-skip-permissions": .cmdSummaryClaudeDanger,
        "default:/compact": .cmdSummaryCompact,
        "default:/init": .cmdSummaryInit,
        "default:/clear": .cmdSummaryClear,
        "default:/memory": .cmdSummaryMemory,
        "default:/model": .cmdSummaryModel,
        "default:/help": .cmdSummaryHelp,
        "default:/review": .cmdSummaryReview,
        "default:/status": .cmdSummaryStatus,
        "default:/diff": .cmdSummaryDiff,
        "default:/cost": .cmdSummaryCost,
        "default:/login": .cmdSummaryLogin,
        "default:/config": .cmdSummaryConfig,
        "default:/mcp": .cmdSummaryMcp,
        "default:/doctor": .cmdSummaryDoctor,
        "default:/terminal-setup": .cmdSummaryTerminalSetup,
    ]

    public func localizedSummary(_ localizer: AppLocalizer) -> String {
        if source == .default, let key = Self.defaultSummaryKeys[id] {
            return localizer.text(key)
        }
        return summary
    }
}
