import AppKit
import Foundation
import TermiPetCore

@MainActor
final class OllamaModelStoreVM: ObservableObject {
    @Published var ollamaRunning = false
    @Published var isStartingOllama = false
    @Published var downloadedIds: Set<String> = []
    @Published var downloadStatuses: [String: OllamaModelStatus] = [:]
    @Published var config: PetChatModelConfig
    @Published var apiKeys: [PetOnlineProvider: String] = [:]
    @Published var testState: TestState = .idle
    @Published var saveState: SaveState = .idle
    @Published var modelListState: ModelListState = .idle
    @Published var onlineModels: [PetOnlineProvider: [PetOnlineModelOption]] = [:]
    @Published var deletingModelIds: Set<String> = []

    private let service = OllamaService()
    private let chatService = PetChatService()
    private let configStore = PetChatModelConfigStore()
    private let keychainStore = KeychainStore()
    private let ollamaDownloadURL = URL(string: "https://ollama.com/download")!
    private let ollamaAppURL = URL(fileURLWithPath: "/Applications/Ollama.app")

    var recommendedModel: OllamaModelDefinition {
        OllamaModelDefinition.catalog.first { $0.id == PetChatModelConfig.defaultLocalModelId }
            ?? OllamaModelDefinition.catalog[0]
    }

    var setupState: PetLocalModelSetupState {
        PetLocalModelSetupState.resolve(
            ollamaRunning: ollamaRunning,
            isStarting: isStartingOllama,
            recommendedModelId: recommendedModel.id,
            downloadedIds: downloadedIds,
            downloadStatus: downloadStatuses[recommendedModel.id] ?? .notDownloaded
        )
    }

    init() {
        let loaded = PetChatModelConfigStore().load()
        _config = Published(initialValue: loaded)
        _apiKeys = Published(initialValue: Dictionary(
            uniqueKeysWithValues: PetOnlineProvider.allCases.map {
                ($0, KeychainStore().string(service: keychainService(for: $0)))
            }
        ))
    }

    func refresh() async {
        async let running = service.checkRunning()
        async let ids = (try? service.listDownloadedModelIds()) ?? []
        let (r, i) = await (running, ids)
        ollamaRunning = r
        isStartingOllama = false
        downloadedIds = i

        for model in OllamaModelDefinition.catalog {
            if downloadStatuses[model.id] == nil || downloadStatuses[model.id] == .notDownloaded || downloadStatuses[model.id] == .ready {
                downloadStatuses[model.id] = i.contains(model.id) ? .ready : .notDownloaded
            }
        }

        selectAvailableLocalModelIfNeeded()
    }

    func downloadModel(id: String) {
        guard ollamaRunning else {
            downloadStatuses[id] = .error("Ollama 还没有运行。请先安装并启动 Ollama，然后重新检测。")
            return
        }

        downloadStatuses[id] = .downloading(progress: 0)
        Task {
            do {
                for try await progress in service.pullModel(id: id) {
                    downloadStatuses[id] = .downloading(progress: progress)
                }
                downloadStatuses[id] = .ready
                downloadedIds.insert(id)
                selectAvailableLocalModelIfNeeded()
            } catch {
                downloadStatuses[id] = .error(Self.userFacingDownloadError(error))
            }
        }
    }

    func downloadRecommendedModel() {
        downloadModel(id: recommendedModel.id)
    }

    func deleteModel(id: String) {
        guard ollamaRunning, downloadedIds.contains(id), !deletingModelIds.contains(id) else {
            return
        }

        deletingModelIds.insert(id)
        Task {
            do {
                try await service.deleteModel(id: id)
                downloadedIds.remove(id)
                downloadStatuses[id] = .notDownloaded
                deletingModelIds.remove(id)
                selectAvailableLocalModelIfNeeded()
            } catch {
                deletingModelIds.remove(id)
                downloadStatuses[id] = .error("删除模型失败：\(error.localizedDescription)")
            }
        }
    }

    func openOllamaDownloadPage() {
        NSWorkspace.shared.open(ollamaDownloadURL)
    }

    func startOllama() {
        isStartingOllama = true
        let opened = NSWorkspace.shared.open(ollamaAppURL)
        guard opened else {
            isStartingOllama = false
            downloadStatuses[recommendedModel.id] = .error("没有找到 Ollama。请先安装 Ollama，然后回到这里重新检测。")
            openOllamaDownloadPage()
            return
        }

        Task {
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            await refresh()
        }
    }

    func selectModel(id: String) {
        guard config.canSelectLocalModel(id, downloadedIds: downloadedIds) else { return }
        config.provider = .local
        config.localModelId = id
        saveConfig()
    }

    func saveConfig() {
        try? configStore.save(config)
    }

    func saveAPIKey(for provider: PetOnlineProvider) {
        try? keychainStore.save(apiKeys[provider] ?? "", service: keychainService(for: provider))
    }

    func saveOnlineSettings() {
        do {
            try configStore.save(config)
            try keychainStore.save(apiKeys[config.onlineProvider] ?? "", service: keychainService(for: config.onlineProvider))
            saveState = .saved("已保存")
        } catch {
            saveState = .failed(error.localizedDescription)
        }
    }

    func testConnection() {
        testState = .testing
        saveOnlineSettings()
        let snapshot = config
        Task {
            do {
                let message = try await chatService.testConnection(config: snapshot)
                testState = .success(message)
            } catch {
                testState = .failure(error.localizedDescription)
            }
        }
    }

    func fetchOnlineModels() {
        modelListState = .loading
        saveOnlineSettings()
        let snapshot = config
        let key = apiKeys[snapshot.onlineProvider] ?? ""
        Task {
            do {
                let models = try await chatService.listModels(config: snapshot, apiKey: key)
                onlineModels[snapshot.onlineProvider] = models
                applyDefaultOnlineModelIfNeeded(models, provider: snapshot.onlineProvider)
                modelListState = models.isEmpty ? .failed("没有读取到可用文字模型。") : .loaded("\(models.count) 个模型")
            } catch {
                modelListState = .failed(error.localizedDescription)
            }
        }
    }

    func selectOnlineModel(_ id: String) {
        switch config.onlineProvider {
        case .openAI:
            config.openAIModel = id
        case .google:
            config.googleModel = id
        case .custom:
            config.customModel = id
        }
        saveConfig()
    }

    enum TestState: Equatable {
        case idle
        case testing
        case success(String)
        case failure(String)
    }

    enum SaveState: Equatable {
        case idle
        case saved(String)
        case failed(String)
    }

    enum ModelListState: Equatable {
        case idle
        case loading
        case loaded(String)
        case failed(String)
    }

    private func selectAvailableLocalModelIfNeeded() {
        guard config.provider == .local else {
            return
        }

        do {
            let resolved = try PetChatService.resolvedLocalModel(
                preferred: config.localModelId,
                downloadedIds: downloadedIds
            )
            if config.localModelId != resolved {
                config.localModelId = resolved
                saveConfig()
            }
        } catch {
            if config.localModelId != recommendedModel.id {
                config.localModelId = recommendedModel.id
                saveConfig()
            }
            return
        }
    }

    private static func userFacingDownloadError(_ error: Error) -> String {
        let message = error.localizedDescription
        if message.localizedCaseInsensitiveContains("space") ||
            message.localizedCaseInsensitiveContains("disk") ||
            message.localizedCaseInsensitiveContains("No space") {
            return "磁盘空间不足，清理空间后可以重试下载。"
        }

        if message.localizedCaseInsensitiveContains("network") ||
            message.localizedCaseInsensitiveContains("internet") ||
            message.localizedCaseInsensitiveContains("timed out") ||
            message.localizedCaseInsensitiveContains("offline") {
            return "网络连接不稳定，检查网络后可以重试下载。"
        }

        return "模型下载没有完成。请确认 Ollama 正在运行，然后重试。"
    }

    private func applyDefaultOnlineModelIfNeeded(_ models: [PetOnlineModelOption], provider: PetOnlineProvider) {
        let current = config.modelName(for: provider)
        if models.contains(where: { $0.id == current }) {
            return
        }

        guard let preferred = models.first(where: { $0.id == provider.defaultModel }) ?? models.first else {
            return
        }
        selectOnlineModel(preferred.id)
    }
}
