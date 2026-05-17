import Foundation
import TermiPetCore

struct QuotaHTTPClient: Sendable {
    let session: URLSession

    init(session: URLSession = .shared) {
        self.session = session
    }

    func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw QuotaHTTPError.invalidResponse
        }
        return (data, httpResponse)
    }
}

enum QuotaHTTPError: Error {
    case invalidResponse
}

extension HTTPURLResponse {
    var isUnauthorizedForQuota: Bool {
        statusCode == 401 || statusCode == 403
    }
}

func quotaConfigFile(_ components: String...) -> URL {
    components.reduce(FileManager.default.homeDirectoryForCurrentUser) { url, component in
        url.appendingPathComponent(component)
    }
}

func serviceQuotaError(
    service: AIService,
    status: CredentialStatus,
    message: String,
    fetchedAt: Date = Date()
) -> ServiceQuota {
    ServiceQuota(service: service, status: status, fetchedAt: fetchedAt, errorMessage: message)
}
