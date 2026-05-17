import XCTest
@testable import TermiPetCore

final class PetChatModelConfigTests: XCTestCase {
    func testDefaultConfigUsesDownloadedLocalModelSelection() {
        let config = PetChatModelConfig()

        XCTAssertEqual(config.provider, .local)
        XCTAssertEqual(config.localModelId, "qwen2.5:1.5b")
        XCTAssertTrue(config.canSelectLocalModel("qwen2.5:1.5b", downloadedIds: ["qwen2.5:1.5b"]))
        XCTAssertFalse(config.canSelectLocalModel("gemma3:1b", downloadedIds: ["qwen2.5:1.5b"]))
    }

    func testOnlineProviderConfigRoundTrips() throws {
        let config = PetChatModelConfig(
            provider: .online,
            localModelId: "gemma3:1b",
            onlineProvider: .google,
            openAIModel: "gpt-4o-mini",
            googleModel: "gemini-1.5-flash",
            customBaseURL: "https://api.example.com/v1",
            customModel: "custom-chat"
        )

        let data = try JSONEncoder().encode(config)
        let decoded = try JSONDecoder().decode(PetChatModelConfig.self, from: data)

        XCTAssertEqual(decoded, config)
    }

    func testProviderDefaultsExposeUsableModelNames() {
        XCTAssertEqual(PetOnlineProvider.openAI.defaultModel, "gpt-4o-mini")
        XCTAssertEqual(PetOnlineProvider.google.defaultModel, "gemini-2.5-flash")
        XCTAssertEqual(PetOnlineProvider.custom.defaultModel, "")
    }

    func testLocalSetupStateSummarizesOllamaAndRecommendedModelReadiness() {
        let recommended = PetChatModelConfig.defaultLocalModelId

        XCTAssertEqual(
            PetLocalModelSetupState.resolve(
                ollamaRunning: false,
                recommendedModelId: recommended,
                downloadedIds: [],
                downloadStatus: .notDownloaded
            ),
            .notInstalledOrNotRunning
        )

        XCTAssertEqual(
            PetLocalModelSetupState.resolve(
                ollamaRunning: true,
                recommendedModelId: recommended,
                downloadedIds: [],
                downloadStatus: .notDownloaded
            ),
            .runningNoModel
        )

        XCTAssertEqual(
            PetLocalModelSetupState.resolve(
                ollamaRunning: true,
                recommendedModelId: recommended,
                downloadedIds: [],
                downloadStatus: .downloading(progress: 0.3)
            ),
            .downloadingModel
        )

        XCTAssertEqual(
            PetLocalModelSetupState.resolve(
                ollamaRunning: true,
                recommendedModelId: recommended,
                downloadedIds: ["qwen2.5:0.5b"],
                downloadStatus: .notDownloaded
            ),
            .ready
        )

        XCTAssertEqual(
            PetLocalModelSetupState.resolve(
                ollamaRunning: true,
                recommendedModelId: recommended,
                downloadedIds: [],
                downloadStatus: .error("network")
            ),
            .error
        )
    }
}
