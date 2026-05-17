import Foundation

public enum AIService: String, Sendable, Equatable, Hashable, CaseIterable {
    case claudeCode
    case codex
    case copilot
}

public enum CredentialStatus: Sendable, Equatable {
    case valid
    case expired
    case notFound
    case parseError
}

public struct QuotaTier: Sendable, Equatable {
    public let windowLabel: String
    public let utilization: Double
    public let resetsAt: Date?

    public init(windowLabel: String, utilization: Double, resetsAt: Date? = nil) {
        self.windowLabel = windowLabel
        self.utilization = utilization
        self.resetsAt = resetsAt
    }
}

public struct ServiceQuota: Sendable, Equatable {
    public let service: AIService
    public let status: CredentialStatus
    public let tiers: [QuotaTier]
    public let fetchedAt: Date
    public let errorMessage: String?

    public init(
        service: AIService,
        status: CredentialStatus,
        tiers: [QuotaTier] = [],
        fetchedAt: Date = Date(),
        errorMessage: String? = nil
    ) {
        self.service = service
        self.status = status
        self.tiers = tiers
        self.fetchedAt = fetchedAt
        self.errorMessage = errorMessage
    }
}

public struct UsageCredential: Sendable, Equatable {
    public let token: String?
    public let accountID: String?
    public let status: CredentialStatus
    public let message: String?

    public init(token: String?, accountID: String? = nil, status: CredentialStatus, message: String? = nil) {
        self.token = token
        self.accountID = accountID
        self.status = status
        self.message = message
    }
}

public enum UsageCredentialParser {
    public static func parseClaudeCredentials(data: Data, now: Date = Date()) throws -> UsageCredential {
        let object = try JSONSerialization.jsonObject(with: data)
        guard let root = object as? [String: Any] else {
            return UsageCredential(token: nil, status: .parseError, message: "Claude credentials JSON is not an object")
        }
        guard let entry = (root["claudeAiOauth"] ?? root["claude.ai_oauth"]) as? [String: Any] else {
            return UsageCredential(token: nil, status: .parseError, message: "No OAuth entry found in Claude credentials")
        }
        guard let token = entry["accessToken"] as? String, !token.isEmpty else {
            return UsageCredential(token: nil, status: .parseError, message: "accessToken is empty or missing")
        }
        if let expiresAt = entry["expiresAt"], isExpired(expiresAt, now: now) {
            return UsageCredential(token: token, status: .expired, message: "OAuth token has expired")
        }
        return UsageCredential(token: token, status: .valid)
    }

    public static func parseCodexCredentials(data: Data, now: Date = Date()) throws -> UsageCredential {
        let auth = try JSONDecoder().decode(CodexAuthFile.self, from: data)
        guard auth.authMode == "chatgpt" else {
            return UsageCredential(token: nil, status: .notFound, message: "Codex not using OAuth mode")
        }
        guard let token = auth.tokens?.accessToken, !token.isEmpty else {
            return UsageCredential(token: nil, status: .parseError, message: "access_token is empty or missing")
        }
        if let lastRefresh = auth.lastRefresh, isStaleCodexRefresh(lastRefresh, now: now) {
            return UsageCredential(token: token, accountID: auth.tokens?.accountID, status: .expired, message: "Codex token may be stale")
        }
        return UsageCredential(token: token, accountID: auth.tokens?.accountID, status: .valid)
    }

    private static func isExpired(_ value: Any, now: Date) -> Bool {
        if let timestamp = value as? Double {
            return date(fromTimestamp: timestamp) < now
        }
        if let timestamp = value as? Int {
            return date(fromTimestamp: Double(timestamp)) < now
        }
        if let string = value as? String, let date = parseDateTime(string) {
            return date < now
        }
        return false
    }

    private static func isStaleCodexRefresh(_ value: String, now: Date) -> Bool {
        guard let lastRefresh = parseDateTime(value) else { return false }
        return now.timeIntervalSince(lastRefresh) > 8 * 24 * 60 * 60
    }

    private static func date(fromTimestamp timestamp: Double) -> Date {
        let seconds = timestamp > 1_000_000_000_000 ? timestamp / 1_000 : timestamp
        return Date(timeIntervalSince1970: seconds)
    }

    private static func parseDateTime(_ value: String) -> Date? {
        if let date = ISO8601DateFormatter().date(from: value) {
            return date
        }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS"
        if let date = formatter.date(from: value) {
            return date
        }
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        return formatter.date(from: value)
    }
}

public enum UsageQuotaParser {
    public static func parseClaudeCodeQuota(data: Data, fetchedAt: Date = Date()) throws -> ServiceQuota {
        let response = try JSONDecoder().decode(ClaudeUsageResponse.self, from: data)
        let tiers = [
            response.fiveHour.map { tier(label: "5小时", source: $0) },
            response.sevenDay.map { tier(label: "7天", source: $0) },
            response.sevenDayOpus.map { tier(label: "7天 Opus", source: $0) },
            response.sevenDaySonnet.map { tier(label: "7天 Sonnet", source: $0) },
        ].compactMap { $0 }

        return ServiceQuota(service: .claudeCode, status: .valid, tiers: tiers, fetchedAt: fetchedAt)
    }

    public static func parseCodexQuota(data: Data, fetchedAt: Date = Date()) throws -> ServiceQuota {
        let response = try JSONDecoder().decode(CodexUsageResponse.self, from: data)
        let windows = [response.rateLimit?.primaryWindow, response.rateLimit?.secondaryWindow]
        let tiers = windows.compactMap { window -> QuotaTier? in
            guard let window, let utilization = window.usedPercent else { return nil }
            return QuotaTier(
                windowLabel: codexWindowLabel(seconds: window.limitWindowSeconds),
                utilization: utilization,
                resetsAt: window.resetAt.map { Date(timeIntervalSince1970: TimeInterval($0)) }
            )
        }

        return ServiceQuota(service: .codex, status: .valid, tiers: tiers, fetchedAt: fetchedAt)
    }

    public static func parseCopilotQuota(data: Data, fetchedAt: Date = Date()) throws -> ServiceQuota {
        let response = try JSONDecoder().decode(CopilotUsageResponse.self, from: data)
        let premium = response.quotaSnapshots.premiumInteractions
        let utilization = premium.unlimited == true ? 0 : max(0, min(100, 100 - premium.percentRemaining))
        let tier = QuotaTier(
            windowLabel: "5小时",
            utilization: utilization,
            resetsAt: parseCopilotResetDate(response.quotaResetDate)
        )

        return ServiceQuota(service: .copilot, status: .valid, tiers: [tier], fetchedAt: fetchedAt)
    }

    public static func parseCopilotResetDate(_ value: String) -> Date? {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0) ?? .current
        let parts = value.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        return calendar.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2]))
    }

    private static func tier(label: String, source: ClaudeUsageTier) -> QuotaTier {
        QuotaTier(
            windowLabel: label,
            utilization: source.utilization,
            resetsAt: source.resetsAt.flatMap { ISO8601DateFormatter().date(from: $0) }
        )
    }

    private static func codexWindowLabel(seconds: Int?) -> String {
        switch seconds {
        case 18_000:
            "5小时"
        case 604_800:
            "7天"
        case .some(let value):
            "\(value)秒"
        case nil:
            "未知"
        }
    }
}

public enum UsageQuotaLayout {
    public static let panelWidth: Double = 300
    public static let horizontalPadding: Double = 13
    public static let rowSpacing: Double = 6
    public static let serviceNameWidth: Double = 116
    public static let statusWidth: Double = 44
    public static let detailIndent: Double = 12
    public static let tierLabelWidth: Double = 54
    public static let progressWidth: Double = 88
    public static let percentWidth: Double = 34
    public static let countdownWidth: Double = 42
}

public enum UsageQuotaFormatter {
    public static func countdown(until target: Date, now: Date = Date(), resetText: String = "已重置") -> String {
        let seconds = Int(target.timeIntervalSince(now))
        guard seconds > 0 else { return resetText }
        guard seconds >= 60 else { return "<1m" }

        let days = seconds / 86_400
        let hours = (seconds % 86_400) / 3_600
        let minutes = (seconds % 3_600) / 60

        if days > 0 {
            return hours > 0 ? "\(days)d\(hours)h" : "\(days)d"
        }
        if hours > 0 {
            return minutes > 0 ? "\(hours)h\(minutes)m" : "\(hours)h"
        }
        return "\(minutes)m"
    }
}

private struct CodexAuthFile: Decodable {
    let authMode: String?
    let lastRefresh: String?
    let tokens: CodexAuthTokens?

    enum CodingKeys: String, CodingKey {
        case authMode = "auth_mode"
        case lastRefresh = "last_refresh"
        case tokens
    }
}

private struct CodexAuthTokens: Decodable {
    let accessToken: String?
    let accountID: String?

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case accountID = "account_id"
    }
}

private struct ClaudeUsageResponse: Decodable {
    let fiveHour: ClaudeUsageTier?
    let sevenDay: ClaudeUsageTier?
    let sevenDayOpus: ClaudeUsageTier?
    let sevenDaySonnet: ClaudeUsageTier?

    enum CodingKeys: String, CodingKey {
        case fiveHour = "five_hour"
        case sevenDay = "seven_day"
        case sevenDayOpus = "seven_day_opus"
        case sevenDaySonnet = "seven_day_sonnet"
    }
}

private struct ClaudeUsageTier: Decodable {
    let utilization: Double
    let resetsAt: String?

    enum CodingKeys: String, CodingKey {
        case utilization
        case resetsAt = "resets_at"
    }
}

private struct CodexUsageResponse: Decodable {
    let rateLimit: CodexRateLimit?

    enum CodingKeys: String, CodingKey {
        case rateLimit = "rate_limit"
    }
}

private struct CodexRateLimit: Decodable {
    let primaryWindow: CodexWindow?
    let secondaryWindow: CodexWindow?

    enum CodingKeys: String, CodingKey {
        case primaryWindow = "primary_window"
        case secondaryWindow = "secondary_window"
    }
}

private struct CodexWindow: Decodable {
    let usedPercent: Double?
    let resetAt: Int?
    let limitWindowSeconds: Int?

    enum CodingKeys: String, CodingKey {
        case usedPercent = "used_percent"
        case resetAt = "reset_at"
        case limitWindowSeconds = "limit_window_seconds"
    }
}

private struct CopilotUsageResponse: Decodable {
    let quotaResetDate: String
    let quotaSnapshots: CopilotQuotaSnapshots

    enum CodingKeys: String, CodingKey {
        case quotaResetDate = "quota_reset_date"
        case quotaSnapshots = "quota_snapshots"
    }
}

private struct CopilotQuotaSnapshots: Decodable {
    let premiumInteractions: CopilotQuotaDetail

    enum CodingKeys: String, CodingKey {
        case premiumInteractions = "premium_interactions"
    }
}

private struct CopilotQuotaDetail: Decodable {
    let percentRemaining: Double
    let unlimited: Bool?

    enum CodingKeys: String, CodingKey {
        case percentRemaining = "percent_remaining"
        case unlimited
    }
}
