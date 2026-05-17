import XCTest
@testable import TermiPetCore

final class UsageQuotaTests: XCTestCase {
    func testParsesClaudeCodeQuotaTiers() throws {
        let json = """
        {
          "five_hour": { "utilization": 45.2, "resets_at": "2026-05-14T10:00:00Z" },
          "seven_day": { "utilization": 62.1, "resets_at": "2026-05-21T00:00:00Z" },
          "seven_day_opus": { "utilization": 30.0, "resets_at": "2026-05-21T00:00:00Z" },
          "seven_day_sonnet": { "utilization": 50.0, "resets_at": "2026-05-21T00:00:00Z" }
        }
        """.data(using: .utf8)!

        let quota = try UsageQuotaParser.parseClaudeCodeQuota(data: json, fetchedAt: Date(timeIntervalSince1970: 0))

        XCTAssertEqual(quota.service, .claudeCode)
        XCTAssertEqual(quota.status, .valid)
        XCTAssertEqual(quota.tiers.map(\.windowLabel), ["5小时", "7天", "7天 Opus", "7天 Sonnet"])
        XCTAssertEqual(quota.tiers.map(\.utilization), [45.2, 62.1, 30.0, 50.0])
        XCTAssertEqual(quota.tiers.first?.resetsAt, ISO8601DateFormatter().date(from: "2026-05-14T10:00:00Z"))
    }

    func testParsesCodexQuotaWindows() throws {
        let json = """
        {
          "rate_limit": {
            "primary_window": {
              "used_percent": 71.5,
              "reset_at": 1778752800,
              "limit_window_seconds": 18000
            },
            "secondary_window": {
              "used_percent": 33.0,
              "reset_at": 1779235200,
              "limit_window_seconds": 604800
            }
          }
        }
        """.data(using: .utf8)!

        let quota = try UsageQuotaParser.parseCodexQuota(data: json, fetchedAt: Date(timeIntervalSince1970: 0))

        XCTAssertEqual(quota.service, .codex)
        XCTAssertEqual(quota.status, .valid)
        XCTAssertEqual(quota.tiers.map(\.windowLabel), ["5小时", "7天"])
        XCTAssertEqual(quota.tiers.map(\.utilization), [71.5, 33.0])
        XCTAssertEqual(quota.tiers.first?.resetsAt, Date(timeIntervalSince1970: 1_778_752_800))
    }

    func testParsesCopilotPremiumInteractionsQuota() throws {
        let json = """
        {
          "copilot_plan": "Copilot Pro",
          "quota_reset_date": "2026-05-21",
          "quota_snapshots": {
            "premium_interactions": {
              "entitlement": 500,
              "remaining": 125,
              "percent_remaining": 25.0,
              "unlimited": false
            }
          }
        }
        """.data(using: .utf8)!

        let quota = try UsageQuotaParser.parseCopilotQuota(data: json, fetchedAt: Date(timeIntervalSince1970: 0))

        XCTAssertEqual(quota.service, .copilot)
        XCTAssertEqual(quota.status, .valid)
        XCTAssertEqual(quota.tiers.first?.windowLabel, "5小时")
        XCTAssertEqual(quota.tiers.first?.utilization, 75.0)
        XCTAssertEqual(quota.tiers.first?.resetsAt, UsageQuotaParser.parseCopilotResetDate("2026-05-21"))
    }

    func testUsageQuotaPanelWidthFitsSplitRows() {
        let availableWidth = UsageQuotaLayout.panelWidth - UsageQuotaLayout.horizontalPadding * 2
        let headerRowWidth = UsageQuotaLayout.serviceNameWidth
            + UsageQuotaLayout.rowSpacing
            + UsageQuotaLayout.statusWidth
        let detailRowWidth = UsageQuotaLayout.detailIndent
            + UsageQuotaLayout.tierLabelWidth
            + UsageQuotaLayout.rowSpacing
            + UsageQuotaLayout.progressWidth
            + UsageQuotaLayout.rowSpacing
            + UsageQuotaLayout.percentWidth
            + UsageQuotaLayout.rowSpacing
            + UsageQuotaLayout.countdownWidth

        XCTAssertLessThanOrEqual(headerRowWidth, availableWidth)
        XCTAssertLessThanOrEqual(detailRowWidth, availableWidth)
    }

    func testFormatsResetCountdowns() {
        let now = Date(timeIntervalSince1970: 1_000)

        XCTAssertEqual(UsageQuotaFormatter.countdown(until: now.addingTimeInterval(3.5 * 24 * 60 * 60), now: now), "3d12h")
        XCTAssertEqual(UsageQuotaFormatter.countdown(until: now.addingTimeInterval(62 * 60), now: now), "1h2m")
        XCTAssertEqual(UsageQuotaFormatter.countdown(until: now.addingTimeInterval(30), now: now), "<1m")
        XCTAssertEqual(UsageQuotaFormatter.countdown(until: now.addingTimeInterval(-1), now: now), "已重置")
        XCTAssertEqual(UsageQuotaFormatter.countdown(until: now.addingTimeInterval(-1), now: now, resetText: "Reset"), "Reset")
    }

    func testParsesClaudeCredentialsFromBothKnownKeys() throws {
        let firstShape = """
        { "claudeAiOauth": { "accessToken": "claude-token", "expiresAt": 4102444800000 } }
        """.data(using: .utf8)!
        let secondShape = """
        { "claude.ai_oauth": { "accessToken": "legacy-token", "expiresAt": "2099-01-01T00:00:00Z" } }
        """.data(using: .utf8)!

        let first = try UsageCredentialParser.parseClaudeCredentials(data: firstShape, now: Date(timeIntervalSince1970: 0))
        let second = try UsageCredentialParser.parseClaudeCredentials(data: secondShape, now: Date(timeIntervalSince1970: 0))

        XCTAssertEqual(first.token, "claude-token")
        XCTAssertEqual(first.status, .valid)
        XCTAssertEqual(second.token, "legacy-token")
        XCTAssertEqual(second.status, .valid)
    }

    func testExpiredClaudeCredentialsKeepTokenAndMarkExpired() throws {
        let json = """
        { "claudeAiOauth": { "accessToken": "old-token", "expiresAt": 1000 } }
        """.data(using: .utf8)!

        let result = try UsageCredentialParser.parseClaudeCredentials(data: json, now: Date(timeIntervalSince1970: 2_000))

        XCTAssertEqual(result.token, "old-token")
        XCTAssertEqual(result.status, .expired)
    }

    func testParsesCodexChatGPTCredentials() throws {
        let json = """
        {
          "auth_mode": "chatgpt",
          "last_refresh": "2099-01-01T00:00:00Z",
          "tokens": {
            "access_token": "codex-token",
            "account_id": "account-123"
          }
        }
        """.data(using: .utf8)!

        let result = try UsageCredentialParser.parseCodexCredentials(data: json, now: Date(timeIntervalSince1970: 0))

        XCTAssertEqual(result.token, "codex-token")
        XCTAssertEqual(result.accountID, "account-123")
        XCTAssertEqual(result.status, .valid)
    }

    func testCodexApiKeyModeIsNotFoundForUsageQuery() throws {
        let json = """
        { "auth_mode": "api_key", "tokens": { "access_token": "ignored" } }
        """.data(using: .utf8)!

        let result = try UsageCredentialParser.parseCodexCredentials(data: json, now: Date(timeIntervalSince1970: 0))

        XCTAssertNil(result.token)
        XCTAssertEqual(result.status, .notFound)
    }
}
