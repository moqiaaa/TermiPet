import Foundation
import TermiPetCore

struct PetChatService: Sendable {
    private let ollama = OllamaService()
    private let keychain = KeychainStore()

    func chat(config: PetChatModelConfig, messages: [OllamaChatMessage]) -> AsyncThrowingStream<String, Error> {
        switch config.provider {
        case .local:
            return localChat(config: config, messages: messages)
        case .online:
            return onlineChat(config: config, messages: messages)
        }
    }

    func testConnection(config: PetChatModelConfig) async throws -> String {
        let messages = [
            OllamaChatMessage(role: "system", content: "Reply with OK."),
            OllamaChatMessage(role: "user", content: "ping"),
        ]
        var result = ""
        for try await chunk in chat(config: config, messages: messages) {
            result += chunk
            if result.count >= 80 { break }
        }
        return result.isEmpty ? "连接成功，但模型没有返回文本。" : "连接成功：\(result)"
    }

    func listModels(config: PetChatModelConfig, apiKey: String) async throws -> [PetOnlineModelOption] {
        switch config.onlineProvider {
        case .openAI:
            return try await listOpenAICompatibleModels(baseURLString: config.openAIBaseURL, apiKey: apiKey)
        case .google:
            return try await listGoogleModels(baseURLString: config.googleBaseURL, apiKey: apiKey)
        case .custom:
            return try await listOpenAICompatibleModels(baseURLString: config.customBaseURL, apiKey: apiKey)
        }
    }

    private func onlineChat(config: PetChatModelConfig, messages: [OllamaChatMessage]) -> AsyncThrowingStream<String, Error> {
        AsyncThrowingStream { continuation in
            Task {
                do {
                    switch config.onlineProvider {
                    case .openAI:
                        try await sendOpenAICompatible(
                            baseURLString: config.openAIBaseURL,
                            model: config.openAIModel,
                            apiKey: keychain.string(service: keychainService(for: .openAI)),
                            messages: messages,
                            continuation: continuation
                        )
                    case .custom:
                        try await sendOpenAICompatible(
                            baseURLString: config.customBaseURL,
                            model: config.customModel,
                            apiKey: keychain.string(service: keychainService(for: .custom)),
                            messages: messages,
                            continuation: continuation
                        )
                    case .google:
                        try await sendGoogle(
                            baseURLString: config.googleBaseURL,
                            model: config.googleModel,
                            apiKey: keychain.string(service: keychainService(for: .google)),
                            messages: messages,
                            continuation: continuation
                        )
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
        }
    }

    private func localChat(config: PetChatModelConfig, messages: [OllamaChatMessage]) -> AsyncThrowingStream<String, Error> {
        AsyncThrowingStream { continuation in
            Task {
                do {
                    let downloadedIds = try await ollama.listDownloadedModelIds()
                    let candidates = try Self.localModelCandidates(preferred: config.localModelId, downloadedIds: downloadedIds)
                    var lastError: Error?

                    for model in candidates {
                        do {
                            for try await chunk in ollama.chat(model: model, messages: messages) {
                                continuation.yield(chunk)
                            }
                            continuation.finish()
                            return
                        } catch {
                            lastError = error
                            guard Self.canTryNextLocalModel(after: error) else {
                                throw error
                            }
                        }
                    }

                    throw PetChatServiceError.localModelsUnavailable(lastError?.localizedDescription)
                } catch {
                    continuation.finish(throwing: error)
                }
            }
        }
    }

    static func resolvedLocalModel(preferred: String, downloadedIds: Set<String>) throws -> String {
        try localModelCandidates(preferred: preferred, downloadedIds: downloadedIds).first!
    }

    static func localModelCandidates(preferred: String, downloadedIds: Set<String>) throws -> [String] {
        let trimmed = preferred.trimmingCharacters(in: .whitespacesAndNewlines)
        var candidates: [String] = []
        if !trimmed.isEmpty, downloadedIds.contains(trimmed) {
            candidates.append(trimmed)
        }

        for model in OllamaModelDefinition.catalog where downloadedIds.contains(model.id) && !candidates.contains(model.id) {
            candidates.append(model.id)
        }
        for model in downloadedIds.sorted() where Self.isLikelyLocalChatModel(model) && !candidates.contains(model) {
            candidates.append(model)
        }

        guard !candidates.isEmpty else {
            throw PetChatServiceError.noLocalModelDownloaded
        }
        return candidates
    }

    private static func canTryNextLocalModel(after error: Error) -> Bool {
        let message = error.localizedDescription
        return message.localizedCaseInsensitiveContains("not found") ||
            message.localizedCaseInsensitiveContains("invalid digest") ||
            message.localizedCaseInsensitiveContains("does not support")
    }

    private static func isLikelyLocalChatModel(_ model: String) -> Bool {
        let lowercased = model.lowercased()
        let blockedTokens = ["embed", "embedding", "vision", "audio", "whisper", "tts", "vl"]
        if blockedTokens.contains(where: { lowercased.contains($0) }) {
            return false
        }
        let tokens = lowercased.split(whereSeparator: { !$0.isLetter && !$0.isNumber }).map(String.init)
        return !tokens.contains("vl")
    }

    private func sendOpenAICompatible(
        baseURLString: String,
        model: String,
        apiKey: String,
        messages: [OllamaChatMessage],
        continuation: AsyncThrowingStream<String, Error>.Continuation
    ) async throws {
        guard !apiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw PetChatServiceError.missingAPIKey
        }
        guard !model.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw PetChatServiceError.missingModel
        }
        guard let baseURL = URL(string: baseURLString.trimmingCharacters(in: .whitespacesAndNewlines)) else {
            throw PetChatServiceError.invalidBaseURL
        }

        let url = baseURL.appendingPathComponent("chat/completions")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 45
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        request.httpBody = try JSONEncoder().encode(OpenAIChatRequest(model: model, messages: messages, stream: true))

        let (bytes, response) = try await URLSession.shared.bytes(for: request)
        try await validateStreamingResponse(response, bytes: bytes)
        for try await line in bytes.lines {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            guard trimmed.hasPrefix("data:") else { continue }
            let payload = trimmed.dropFirst("data:".count).trimmingCharacters(in: .whitespaces)
            if payload == "[DONE]" { break }
            guard let data = payload.data(using: .utf8),
                  let chunk = try? JSONDecoder().decode(OpenAIChatStreamChunk.self, from: data)
            else { continue }
            if let content = chunk.choices.first?.delta?.content, !content.isEmpty {
                continuation.yield(content)
            }
        }
    }

    private func sendGoogle(
        baseURLString: String,
        model: String,
        apiKey: String,
        messages: [OllamaChatMessage],
        continuation: AsyncThrowingStream<String, Error>.Continuation
    ) async throws {
        guard !apiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw PetChatServiceError.missingAPIKey
        }
        guard !model.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw PetChatServiceError.missingModel
        }
        guard let baseURL = URL(string: baseURLString.trimmingCharacters(in: .whitespacesAndNewlines)) else {
            throw PetChatServiceError.invalidBaseURL
        }

        let url = baseURL
            .appendingPathComponent("models")
            .appendingPathComponent("\(model):streamGenerateContent")
            .appending(queryItems: [
                URLQueryItem(name: "key", value: apiKey),
                URLQueryItem(name: "alt", value: "sse"),
            ])
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 45
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        request.httpBody = try JSONEncoder().encode(GoogleChatRequest(messages: messages))

        let (bytes, response) = try await URLSession.shared.bytes(for: request)
        try await validateStreamingResponse(response, bytes: bytes)
        for try await line in bytes.lines {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            guard trimmed.hasPrefix("data:") else { continue }
            let payload = trimmed.dropFirst("data:".count).trimmingCharacters(in: .whitespaces)
            if payload == "[DONE]" { break }
            guard let data = payload.data(using: .utf8),
                  let chunk = try? JSONDecoder().decode(GoogleChatResponse.self, from: data)
            else { continue }
            let text = chunk.candidates.first?.content.parts.compactMap(\.text).joined() ?? ""
            if !text.isEmpty {
                continuation.yield(text)
            }
        }
    }

    private func listOpenAICompatibleModels(baseURLString: String, apiKey: String) async throws -> [PetOnlineModelOption] {
        guard !apiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw PetChatServiceError.missingAPIKey
        }
        guard let baseURL = URL(string: baseURLString.trimmingCharacters(in: .whitespacesAndNewlines)) else {
            throw PetChatServiceError.invalidBaseURL
        }

        var request = URLRequest(url: baseURL.appendingPathComponent("models"))
        request.timeoutInterval = 30
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        let (data, response) = try await URLSession.shared.data(for: request)
        try validate(response: response, data: data)
        let decoded = try JSONDecoder().decode(OpenAIModelsResponse.self, from: data)
        let options = decoded.data
            .map { PetOnlineModelOption(id: $0.id, displayName: $0.id) }
            .filter { isLikelyTextModel($0.id) }
            .sorted { $0.displayName.localizedStandardCompare($1.displayName) == .orderedAscending }
        return options.isEmpty
            ? decoded.data.map { PetOnlineModelOption(id: $0.id, displayName: $0.id) }
            : options
    }

    private func listGoogleModels(baseURLString: String, apiKey: String) async throws -> [PetOnlineModelOption] {
        guard !apiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw PetChatServiceError.missingAPIKey
        }
        guard let baseURL = URL(string: baseURLString.trimmingCharacters(in: .whitespacesAndNewlines)) else {
            throw PetChatServiceError.invalidBaseURL
        }

        let url = baseURL
            .appendingPathComponent("models")
            .appending(queryItems: [URLQueryItem(name: "key", value: apiKey)])
        let (data, response) = try await URLSession.shared.data(from: url)
        try validate(response: response, data: data)
        let decoded = try JSONDecoder().decode(GoogleModelsResponse.self, from: data)
        return decoded.models
            .filter { $0.supportedGenerationMethods.contains("generateContent") }
            .filter { isLikelyTextModel($0.name) && isLikelyTextModel($0.displayName) }
            .map {
                let id = $0.name.replacingOccurrences(of: "models/", with: "")
                return PetOnlineModelOption(id: id, displayName: $0.displayName.isEmpty ? id : $0.displayName)
            }
            .sorted { $0.displayName.localizedStandardCompare($1.displayName) == .orderedAscending }
    }

    private func validate(response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse else { return }
        guard (200..<300).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? "HTTP \(http.statusCode)"
            throw PetChatServiceError.requestFailed(body)
        }
    }

    private func validateStreamingResponse(_ response: URLResponse, bytes: URLSession.AsyncBytes) async throws {
        guard let http = response as? HTTPURLResponse else { return }
        guard (200..<300).contains(http.statusCode) else {
            var data = Data()
            for try await byte in bytes {
                data.append(byte)
                if data.count >= 64 * 1024 { break }
            }
            let body = String(data: data, encoding: .utf8) ?? "HTTP \(http.statusCode)"
            throw PetChatServiceError.requestFailed(body.isEmpty ? "HTTP \(http.statusCode)" : body)
        }
    }

    private func isLikelyTextModel(_ value: String) -> Bool {
        let blacklist: Set<String> = ["embedding", "embeddings", "imagen", "image", "vision", "veo", "audio", "tts", "speech"]
        let tokens = value.lowercased().split(whereSeparator: { !$0.isLetter && !$0.isNumber }).map(String.init)
        return !tokens.contains(where: { blacklist.contains($0) })
    }
}

struct PetOnlineModelOption: Identifiable, Equatable, Sendable {
    var id: String
    var displayName: String
}

func keychainService(for provider: PetOnlineProvider) -> String {
    "TermiPet.\(provider.rawValue).apiKey"
}

enum PetChatServiceError: LocalizedError {
    case missingAPIKey
    case missingModel
    case invalidBaseURL
    case noLocalModelDownloaded
    case localModelsUnavailable(String?)
    case requestFailed(String)

    var errorDescription: String? {
        switch self {
        case .missingAPIKey:
            return "请先填写 API Key。"
        case .missingModel:
            return "请先填写模型名称。"
        case .invalidBaseURL:
            return "Base URL 无效。"
        case .noLocalModelDownloaded:
            return "还没有下载可用的本地模型。请在模型设置里下载一个模型后再对话。"
        case .localModelsUnavailable(let message):
            let detail = message.map { "（\($0)）" } ?? ""
            return "已下载的本地模型暂时无法使用\(detail)。请在模型设置里重新下载推荐模型后再试。"
        case .requestFailed(let message):
            return message
        }
    }
}

private struct OpenAIChatRequest: Encodable {
    let model: String
    let messages: [OllamaChatMessage]
    let stream: Bool
}

private struct OpenAIChatStreamChunk: Decodable {
    let choices: [Choice]

    struct Choice: Decodable {
        let delta: Delta?
    }

    struct Delta: Decodable {
        let content: String?
    }
}

private struct OpenAIModelsResponse: Decodable {
    let data: [Model]

    struct Model: Decodable {
        let id: String
    }
}

private struct GoogleChatRequest: Encodable {
    let contents: [Content]
    let systemInstruction: Content?

    init(messages: [OllamaChatMessage]) {
        let system = messages.first(where: { $0.role == "system" })?.content
        systemInstruction = system.map { Content(role: nil, parts: [Part(text: $0)]) }
        contents = messages
            .filter { $0.role != "system" }
            .map { message in
                Content(
                    role: message.role == "assistant" ? "model" : "user",
                    parts: [Part(text: message.content)]
                )
            }
    }

    struct Content: Encodable {
        let role: String?
        let parts: [Part]
    }

    struct Part: Encodable {
        let text: String
    }
}

private struct GoogleChatResponse: Decodable {
    let candidates: [Candidate]

    struct Candidate: Decodable {
        let content: Content
    }

    struct Content: Decodable {
        let parts: [Part]
    }

    struct Part: Decodable {
        let text: String?
    }
}

private struct GoogleModelsResponse: Decodable {
    let models: [Model]

    struct Model: Decodable {
        let name: String
        let displayName: String
        let supportedGenerationMethods: [String]
    }
}
