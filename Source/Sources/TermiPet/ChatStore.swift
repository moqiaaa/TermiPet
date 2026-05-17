import Foundation
import TermiPetCore

@MainActor
final class ChatStore: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var isStreaming = false
    @Published var streamingContent = ""

    private let service = PetChatService()
    private var streamingTask: Task<Void, Never>?

    func send(text: String, personality: PetPersonalityConfig, modelConfig: PetChatModelConfig) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !isStreaming else { return }

        messages.append(ChatMessage(role: .user, content: trimmed))
        isStreaming = true
        streamingContent = ""

        let systemPrompt = personality.systemPrompt()
        var apiMessages: [OllamaChatMessage] = [.init(role: "system", content: systemPrompt)]
        for msg in messages {
            apiMessages.append(.init(role: msg.role.rawValue, content: msg.content))
        }

        streamingTask = Task {
            do {
                for try await chunk in service.chat(config: modelConfig, messages: apiMessages) {
                    guard !Task.isCancelled else { break }
                    streamingContent += chunk
                }
                let content = streamingContent
                if !content.isEmpty {
                    messages.append(ChatMessage(role: .assistant, content: content))
                }
                streamingContent = ""
            } catch {
                messages.append(ChatMessage(role: .assistant, content: "出错了：\(error.localizedDescription)"))
                streamingContent = ""
            }
            isStreaming = false
        }
    }

    func cancelStreaming() {
        streamingTask?.cancel()
        if !streamingContent.isEmpty {
            messages.append(ChatMessage(role: .assistant, content: streamingContent))
        }
        streamingContent = ""
        isStreaming = false
    }

    func clearHistory() {
        cancelStreaming()
        messages = []
    }
}
