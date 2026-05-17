import Foundation
import TermiPetCore

struct ClaudeCodeQuotaFetcher: Sendable {
    private let keychainReader: KeychainReader
    private let httpClient: QuotaHTTPClient
    private let credentialsURL: URL

    init(
        keychainReader: KeychainReader = KeychainReader(),
        httpClient: QuotaHTTPClient = QuotaHTTPClient(),
        credentialsURL: URL = quotaConfigFile(".claude", ".credentials.json")
    ) {
        self.keychainReader = keychainReader
        self.httpClient = httpClient
        self.credentialsURL = credentialsURL
    }

    func fetch() async -> ServiceQuota {
        let fetchedAt = Date()
        let credential = readCredential(now: fetchedAt)
        guard let token = credential.token else {
            return ServiceQuota(
                service: .claudeCode,
                status: credential.status,
                fetchedAt: fetchedAt,
                errorMessage: credential.message
            )
        }
        if credential.status == .expired {
            return ServiceQuota(
                service: .claudeCode,
                status: .expired,
                fetchedAt: fetchedAt,
                errorMessage: credential.message ?? "Claude Code 需要重新登录"
            )
        }

        guard let url = URL(string: "https://api.anthropic.com/api/oauth/usage") else {
            return serviceQuotaError(service: .claudeCode, status: .parseError, message: "Claude Code 用量接口地址无效", fetchedAt: fetchedAt)
        }

        var request = URLRequest(url: url, timeoutInterval: 10)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("oauth-2025-04-20", forHTTPHeaderField: "anthropic-beta")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        do {
            let (data, response) = try await httpClient.data(for: request)
            if response.isUnauthorizedForQuota {
                return serviceQuotaError(service: .claudeCode, status: .expired, message: "Claude Code 需要重新登录", fetchedAt: fetchedAt)
            }
            guard (200..<300).contains(response.statusCode) else {
                return serviceQuotaError(service: .claudeCode, status: .valid, message: "Claude Code API 错误：HTTP \(response.statusCode)", fetchedAt: fetchedAt)
            }
            return try UsageQuotaParser.parseClaudeCodeQuota(data: data, fetchedAt: fetchedAt)
        } catch {
            return serviceQuotaError(service: .claudeCode, status: .valid, message: "Claude Code 用量读取失败：\(error.localizedDescription)", fetchedAt: fetchedAt)
        }
    }

    private func readCredential(now: Date) -> UsageCredential {
        if let data = keychainReader.genericPassword(service: "Claude Code-credentials"),
           let credential = try? UsageCredentialParser.parseClaudeCredentials(data: data, now: now) {
            return credential
        }

        guard FileManager.default.fileExists(atPath: credentialsURL.path) else {
            return UsageCredential(token: nil, status: .notFound)
        }

        do {
            let data = try Data(contentsOf: credentialsURL)
            return try UsageCredentialParser.parseClaudeCredentials(data: data, now: now)
        } catch {
            return UsageCredential(token: nil, status: .parseError, message: "Claude Code 凭证读取失败：\(error.localizedDescription)")
        }
    }
}
