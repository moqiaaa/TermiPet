import Foundation
import TermiPetCore

struct OllamaService: Sendable {
    let baseURL: URL

    init(baseURL: URL = URL(string: "http://localhost:11434")!) {
        self.baseURL = baseURL
    }

    func checkRunning() async -> Bool {
        let url = baseURL.appendingPathComponent("api/tags")
        var request = URLRequest(url: url)
        request.timeoutInterval = 2
        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            return (response as? HTTPURLResponse)?.statusCode == 200
        } catch {
            return false
        }
    }

    func listDownloadedModelIds() async throws -> Set<String> {
        let url = baseURL.appendingPathComponent("api/tags")
        let (data, _) = try await URLSession.shared.data(from: url)
        let response = try JSONDecoder().decode(TagsResponse.self, from: data)
        return Set(response.models.map { $0.name })
    }

    func pullModel(id: String) -> AsyncThrowingStream<Double, Error> {
        AsyncThrowingStream { continuation in
            Task {
                do {
                    let url = baseURL.appendingPathComponent("api/pull")
                    var request = URLRequest(url: url)
                    request.httpMethod = "POST"
                    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                    let body = PullRequest(name: id, stream: true)
                    request.httpBody = try JSONEncoder().encode(body)

                    let (bytes, _) = try await URLSession.shared.bytes(for: request)
                    for try await line in bytes.lines {
                        guard !line.isEmpty,
                              let data = line.data(using: .utf8),
                              let chunk = try? JSONDecoder().decode(PullProgressLine.self, from: data)
                        else { continue }

                        if chunk.status == "success" {
                            continuation.yield(1.0)
                            break
                        }
                        if let completed = chunk.completed, let total = chunk.total, total > 0 {
                            continuation.yield(Double(completed) / Double(total))
                        }
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
        }
    }

    func deleteModel(id: String) async throws {
        let url = baseURL.appendingPathComponent("api/delete")
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.timeoutInterval = 30
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(DeleteRequest(name: id))

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { return }
        guard (200..<300).contains(http.statusCode) else {
            if let error = try? JSONDecoder().decode(OllamaErrorLine.self, from: data) {
                throw PetChatServiceError.requestFailed(error.error)
            }
            let body = String(data: data, encoding: .utf8)
            throw PetChatServiceError.requestFailed(body?.isEmpty == false ? body! : "HTTP \(http.statusCode)")
        }
    }

    func chat(model: String, messages: [OllamaChatMessage]) -> AsyncThrowingStream<String, Error> {
        AsyncThrowingStream { continuation in
            Task {
                do {
                    let url = baseURL.appendingPathComponent("api/chat")
                    var request = URLRequest(url: url)
                    request.httpMethod = "POST"
                    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                    let body = ChatRequest(model: model, messages: messages, stream: true)
                    request.httpBody = try JSONEncoder().encode(body)

                    let (bytes, _) = try await URLSession.shared.bytes(for: request)
                    for try await line in bytes.lines {
                        guard !line.isEmpty,
                              let chunk = try Self.parseChatStreamLine(line)
                        else { continue }

                        if let content = chunk.message?.content, !content.isEmpty {
                            continuation.yield(content)
                        }
                        if chunk.done { break }
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
        }
    }

    static func parseChatStreamLine(_ line: String) throws -> ChatChunkLine? {
        guard let data = line.data(using: .utf8) else { return nil }
        if let error = try? JSONDecoder().decode(OllamaErrorLine.self, from: data) {
            throw PetChatServiceError.requestFailed(error.error)
        }
        return try? JSONDecoder().decode(ChatChunkLine.self, from: data)
    }
}

private struct TagsResponse: Decodable {
    let models: [ModelEntry]
    struct ModelEntry: Decodable {
        let name: String
    }
}

private struct PullRequest: Encodable {
    let name: String
    let stream: Bool
}

private struct DeleteRequest: Encodable {
    let name: String
}

private struct PullProgressLine: Decodable {
    let status: String
    let completed: Int64?
    let total: Int64?
}

private struct ChatRequest: Encodable {
    let model: String
    let messages: [OllamaChatMessage]
    let stream: Bool
}

struct ChatChunkLine: Decodable {
    let message: MessageChunk?
    let done: Bool

    struct MessageChunk: Decodable {
        let content: String
    }
}

private struct OllamaErrorLine: Decodable {
    let error: String
}
