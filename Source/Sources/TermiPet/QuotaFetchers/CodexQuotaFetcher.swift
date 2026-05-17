import Foundation
import TermiPetCore

struct CodexQuotaFetcher: Sendable {
    private let keychainReader: KeychainReader
    private let httpClient: QuotaHTTPClient
    private let authURL: URL

    init(
        keychainReader: KeychainReader = KeychainReader(),
        httpClient: QuotaHTTPClient = QuotaHTTPClient(),
        authURL: URL = quotaConfigFile(".codex", "auth.json")
    ) {
        self.keychainReader = keychainReader
        self.httpClient = httpClient
        self.authURL = authURL
    }

    func fetch() async -> ServiceQuota {
        let fetchedAt = Date()
        let credential = readCredential(now: fetchedAt)
        guard let token = credential.token else {
            return ServiceQuota(service: .codex, status: credential.status, fetchedAt: fetchedAt, errorMessage: credential.message)
        }
        if credential.status == .expired {
            return ServiceQuota(service: .codex, status: .expired, fetchedAt: fetchedAt, errorMessage: credential.message ?? "Codex 需要重新登录")
        }

        guard let url = URL(string: "https://chatgpt.com/backend-api/wham/usage") else {
            return serviceQuotaError(service: .codex, status: .parseError, message: "Codex 用量接口地址无效", fetchedAt: fetchedAt)
        }

        var request = URLRequest(url: url, timeoutInterval: 10)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("codex-cli", forHTTPHeaderField: "User-Agent")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let accountID = credential.accountID, !accountID.isEmpty {
            request.setValue(accountID, forHTTPHeaderField: "ChatGPT-Account-Id")
        }

        do {
            let (data, response) = try await httpClient.data(for: request)
            if response.isUnauthorizedForQuota {
                return serviceQuotaError(service: .codex, status: .expired, message: "Codex 需要重新登录", fetchedAt: fetchedAt)
            }
            guard (200..<300).contains(response.statusCode) else {
                return serviceQuotaError(service: .codex, status: .valid, message: "Codex API 错误：HTTP \(response.statusCode)", fetchedAt: fetchedAt)
            }
            return try UsageQuotaParser.parseCodexQuota(data: data, fetchedAt: fetchedAt)
        } catch {
            return serviceQuotaError(service: .codex, status: .valid, message: "Codex 用量读取失败：\(error.localizedDescription)", fetchedAt: fetchedAt)
        }
    }

    private func readCredential(now: Date) -> UsageCredential {
        if let data = keychainReader.genericPassword(service: "Codex Auth"),
           let credential = try? UsageCredentialParser.parseCodexCredentials(data: data, now: now) {
            return credential
        }

        guard FileManager.default.fileExists(atPath: authURL.path) else {
            return UsageCredential(token: nil, status: .notFound)
        }

        do {
            let data = try Data(contentsOf: authURL)
            return try UsageCredentialParser.parseCodexCredentials(data: data, now: now)
        } catch {
            return UsageCredential(token: nil, status: .parseError, message: "Codex 凭证读取失败：\(error.localizedDescription)")
        }
    }
}
