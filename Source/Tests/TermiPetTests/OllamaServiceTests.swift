import XCTest
@testable import TermiPet

final class OllamaServiceTests: XCTestCase {
    func testChatStreamLineThrowsOllamaErrorInsteadOfDroppingIt() throws {
        XCTAssertThrowsError(try OllamaService.parseChatStreamLine(#"{"error":"invalid digest format"}"#)) { error in
            XCTAssertEqual(error.localizedDescription, "invalid digest format")
        }
    }

    func testResolvedLocalModelKeepsDownloadedPreferredModel() throws {
        let resolved = try PetChatService.resolvedLocalModel(
            preferred: "qwen2.5:1.5b",
            downloadedIds: ["qwen2.5:1.5b", "qwen2.5:0.5b"]
        )

        XCTAssertEqual(resolved, "qwen2.5:1.5b")
    }

    func testResolvedLocalModelFallsBackToDownloadedCatalogModel() throws {
        let resolved = try PetChatService.resolvedLocalModel(
            preferred: "qwen2.5:1.5b",
            downloadedIds: ["qwen2.5:0.5b", "qwen2.5vl:7b"]
        )

        XCTAssertEqual(resolved, "qwen2.5:0.5b")
    }

    func testLocalModelCandidatesIncludeNonCatalogTextModelsAfterCatalogModels() throws {
        let candidates = try PetChatService.localModelCandidates(
            preferred: "missing",
            downloadedIds: ["llama3.2:3b", "qwen2.5vl:7b", "qwen2.5:0.5b"]
        )

        XCTAssertEqual(candidates, ["qwen2.5:0.5b", "llama3.2:3b"])
    }

    func testResolvedLocalModelThrowsWhenNoModelIsDownloaded() {
        XCTAssertThrowsError(try PetChatService.resolvedLocalModel(preferred: "qwen2.5:1.5b", downloadedIds: [])) { error in
            XCTAssertEqual(error.localizedDescription, "还没有下载可用的本地模型。请在模型设置里下载一个模型后再对话。")
        }
    }
}
