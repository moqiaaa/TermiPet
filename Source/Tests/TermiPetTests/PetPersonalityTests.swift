import XCTest
@testable import TermiPetCore

final class PetPersonalityTests: XCTestCase {
    func testLoadsLegacyConfigWithoutOwnerName() throws {
        let legacyJSON = """
        {
          "petName": "团子",
          "selectedPreset": "happy",
          "customPrompt": "回答要短。",
          "constraints": ["只说中文"]
        }
        """.data(using: .utf8)!

        let config = try JSONDecoder().decode(PetPersonalityConfig.self, from: legacyJSON)

        XCTAssertEqual(config.petName, "团子")
        XCTAssertEqual(config.ownerName, "主人")
        XCTAssertEqual(config.customPrompt, "回答要短。")
    }

    func testPresetPromptCanPopulateEditablePrompt() {
        var config = PetPersonalityConfig(petName: "团子", ownerName: "小明")

        config.applyPreset(.codingPartner)

        XCTAssertEqual(config.selectedPreset, .codingPartner)
        XCTAssertEqual(config.customPrompt, PersonalityPreset.codingPartner.systemPrompt)
    }

    func testCustomPresetDoesNotOverwritePrompt() {
        var config = PetPersonalityConfig(selectedPreset: .happy, customPrompt: "保留这段。")

        config.applyPreset(.custom)

        XCTAssertEqual(config.selectedPreset, .custom)
        XCTAssertEqual(config.customPrompt, "保留这段。")
    }

    func testSystemPromptIncludesPetOwnerPresetAndConstraints() {
        let config = PetPersonalityConfig(
            petName: "团子",
            ownerName: "小明",
            selectedPreset: .custom,
            customPrompt: "你喜欢鼓励主人继续写代码。",
            constraints: ["只说中文", "每次回答不超过两句话"]
        )

        let prompt = config.systemPrompt()

        XCTAssertTrue(prompt.contains("你的名字是团子。"))
        XCTAssertTrue(prompt.contains("主人的名字是小明。"))
        XCTAssertTrue(prompt.contains("你喜欢鼓励主人继续写代码。"))
        XCTAssertTrue(prompt.contains("只说中文；每次回答不超过两句话"))
    }
}
