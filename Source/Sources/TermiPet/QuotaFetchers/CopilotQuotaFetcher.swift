import Foundation
import TermiPetCore

struct CopilotQuotaFetcher: Sendable {
    private let httpClient: QuotaHTTPClient
    private let hostsURL: URL
    private let ccSwitchAuthURL: URL

    init(
        httpClient: QuotaHTTPClient = QuotaHTTPClient(),
        hostsURL: URL = quotaConfigFile(".config", "github-copilot", "hosts.json"),
        ccSwitchAuthURL: URL = FileManager.default
            .urls(for: .applicationSupportDirectory, in: .userDomainMask)
            .first?
            .appendingPathComponent("cc-switch")
            .appendingPathComponent("copilot_auth.json")
            ?? quotaConfigFile("Library", "Application Support", "cc-switch", "copilot_auth.json")
    ) {
        self.httpClient = httpClient
        self.hostsURL = hostsURL
        self.ccSwitchAuthURL = ccSwitchAuthURL
    }

    func fetch() async -> ServiceQuota {
        let fetchedAt = Date()
        let credential = readCredential()
        guard let token = credential.token else {
            return ServiceQuota(service: .copilot, status: credential.status, fetchedAt: fetchedAt, errorMessage: credential.message)
        }

        let domain = credential.domain ?? "github.com"
        guard let url = URL(string: copilotUsageURL(domain: domain)) else {
            return serviceQuotaError(service: .copilot, status: .parseError, message: "Copilot 用量接口地址无效", fetchedAt: fetchedAt)
        }

        var request = URLRequest(url: url, timeoutInterval: 10)
        request.httpMethod = "GET"
        request.setValue("token \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("vscode/1.110.1", forHTTPHeaderField: "editor-version")
        request.setValue("copilot-chat/0.38.2", forHTTPHeaderField: "editor-plugin-version")
        request.setValue("GitHubCopilotChat/0.38.2", forHTTPHeaderField: "user-agent")
        request.setValue("2025-10-01", forHTTPHeaderField: "x-github-api-version")

        do {
            let (data, response) = try await httpClient.data(for: request)
            if response.isUnauthorizedForQuota {
                return serviceQuotaError(service: .copilot, status: .expired, message: "GitHub Copilot 需要重新登录", fetchedAt: fetchedAt)
            }
            guard (200..<300).contains(response.statusCode) else {
                return serviceQuotaError(service: .copilot, status: .valid, message: "Copilot API 错误：HTTP \(response.statusCode)", fetchedAt: fetchedAt)
            }
            return try UsageQuotaParser.parseCopilotQuota(data: data, fetchedAt: fetchedAt)
        } catch {
            return serviceQuotaError(service: .copilot, status: .valid, message: "Copilot 用量读取失败：\(error.localizedDescription)", fetchedAt: fetchedAt)
        }
    }

    private func readCredential() -> CopilotCredential {
        if let credential = readHostsCredential() {
            return credential
        }
        if let credential = readCCSwitchCredential() {
            return credential
        }
        return CopilotCredential(token: nil, status: .notFound, message: nil, domain: nil)
    }

    private func readHostsCredential() -> CopilotCredential? {
        guard FileManager.default.fileExists(atPath: hostsURL.path) else { return nil }
        do {
            let data = try Data(contentsOf: hostsURL)
            let object = try JSONSerialization.jsonObject(with: data)
            guard let hosts = object as? [String: Any] else {
                return CopilotCredential(token: nil, status: .parseError, message: "Copilot hosts.json 格式无效", domain: nil)
            }
            for (domain, value) in hosts.sorted(by: { $0.key < $1.key }) {
                guard let host = value as? [String: Any] else { continue }
                if let token = (host["oauth_token"] ?? host["github_token"] ?? host["token"]) as? String, !token.isEmpty {
                    return CopilotCredential(token: token, status: .valid, message: nil, domain: normalizeGitHubDomain(domain))
                }
            }
            return CopilotCredential(token: nil, status: .notFound, message: "Copilot hosts.json 中没有可用 token", domain: nil)
        } catch {
            return CopilotCredential(token: nil, status: .parseError, message: "Copilot 凭证读取失败：\(error.localizedDescription)", domain: nil)
        }
    }

    private func readCCSwitchCredential() -> CopilotCredential? {
        guard FileManager.default.fileExists(atPath: ccSwitchAuthURL.path) else { return nil }
        do {
            let data = try Data(contentsOf: ccSwitchAuthURL)
            let object = try JSONSerialization.jsonObject(with: data)
            guard let root = object as? [String: Any], let accounts = root["accounts"] as? [String: Any] else {
                return CopilotCredential(token: nil, status: .parseError, message: "CC Switch Copilot 凭证格式无效", domain: nil)
            }
            let defaultID = root["default_account_id"] as? String
            let sortedAccounts = accounts.sorted { lhs, rhs in
                if lhs.key == defaultID { return true }
                if rhs.key == defaultID { return false }
                return lhs.key < rhs.key
            }
            for (_, value) in sortedAccounts {
                guard let account = value as? [String: Any] else { continue }
                guard let token = account["github_token"] as? String, !token.isEmpty else { continue }
                let domain = (account["github_domain"] as? String).map(normalizeGitHubDomain) ?? "github.com"
                return CopilotCredential(token: token, status: .valid, message: nil, domain: domain)
            }
            return CopilotCredential(token: nil, status: .notFound, message: "CC Switch Copilot 凭证中没有账号", domain: nil)
        } catch {
            return CopilotCredential(token: nil, status: .parseError, message: "CC Switch Copilot 凭证读取失败：\(error.localizedDescription)", domain: nil)
        }
    }

    private func copilotUsageURL(domain: String) -> String {
        if domain == "github.com" {
            return "https://api.github.com/copilot_internal/user"
        }
        return "https://\(domain)/api/v3/copilot_internal/user"
    }

    private func normalizeGitHubDomain(_ raw: String) -> String {
        raw
            .replacingOccurrences(of: "https://", with: "")
            .replacingOccurrences(of: "http://", with: "")
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            .isEmpty ? "github.com" : raw
                .replacingOccurrences(of: "https://", with: "")
                .replacingOccurrences(of: "http://", with: "")
                .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    }
}

private struct CopilotCredential: Sendable {
    let token: String?
    let status: CredentialStatus
    let message: String?
    let domain: String?
}
