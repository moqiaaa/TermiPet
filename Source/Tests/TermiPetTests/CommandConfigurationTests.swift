import XCTest
@testable import TermiPetCore

final class CommandConfigurationTests: XCTestCase {
    func testDefaultCommandsAreMarkedDefault() {
        XCTAssertFalse(FloatingCommand.defaults.isEmpty)
        XCTAssertTrue(FloatingCommand.defaults.allSatisfy { !$0.isCustom })
    }

    func testCustomCommandHasStableExplicitId() throws {
        let command = FloatingCommand.custom(id: "custom-1", title: "测试", text: "echo hi", summary: "打印问候")
        let data = try JSONEncoder().encode(command)
        let decoded = try JSONDecoder().decode(FloatingCommand.self, from: data)

        XCTAssertEqual(decoded.id, "custom-1")
        XCTAssertEqual(decoded.source, .custom)
        XCTAssertTrue(decoded.isCustom)
    }

    func testConfigurationMergesDefaultsBeforeUserCommands() {
        let custom = FloatingCommand.custom(id: "custom-1", title: "测试", text: "echo hi", summary: "打印问候")
        let configuration = CommandConfiguration(userCommands: [custom])

        XCTAssertEqual(configuration.userCommands, [custom])
        XCTAssertEqual(configuration.commands.first, FloatingCommand.defaults.first)
        XCTAssertEqual(configuration.commands.last, custom)
        XCTAssertEqual(configuration.commands.count, FloatingCommand.defaults.count + 1)
    }

    func testConfigurationUsesSavedCommandOrderAcrossDefaultAndCustomCommands() throws {
        let json = """
        {
          "commandOrder": [
            "custom-1",
            "\(FloatingCommand.defaults[1].id)",
            "\(FloatingCommand.defaults[0].id)"
          ],
          "userCommands": [
            {
              "id": "custom-1",
              "title": "测试",
              "text": "echo hi",
              "summary": "打印问候",
              "source": "custom"
            }
          ]
        }
        """.data(using: .utf8)!

        let configuration = try JSONDecoder().decode(CommandConfiguration.self, from: json)

        XCTAssertEqual(configuration.commands.prefix(3).map(\.id), [
            "custom-1",
            FloatingCommand.defaults[1].id,
            FloatingCommand.defaults[0].id,
        ])
        XCTAssertEqual(Set(configuration.commands.map(\.id)).count, FloatingCommand.defaults.count + 1)
    }

    func testConfigurationPlacesPinnedCommandsBeforeOrderedCommands() throws {
        let json = """
        {
          "pinnedCommandIDs": [
            "custom-1",
            "\(FloatingCommand.defaults[2].id)"
          ],
          "commandOrder": [
            "\(FloatingCommand.defaults[1].id)",
            "custom-1",
            "\(FloatingCommand.defaults[0].id)"
          ],
          "userCommands": [
            {
              "id": "custom-1",
              "title": "测试",
              "text": "echo hi",
              "summary": "打印问候",
              "source": "custom"
            }
          ]
        }
        """.data(using: .utf8)!

        let configuration = try JSONDecoder().decode(CommandConfiguration.self, from: json)

        XCTAssertEqual(configuration.commands.prefix(3).map(\.id), [
            "custom-1",
            FloatingCommand.defaults[2].id,
            FloatingCommand.defaults[1].id,
        ])
    }

    func testEncodingDoesNotPersistDefaultCommands() throws {
        let custom = FloatingCommand.custom(id: "custom-1", title: "测试", text: "echo hi", summary: "打印问候")
        let configuration = CommandConfiguration(userCommands: [custom])
        let data = try JSONEncoder().encode(configuration)
        let object = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        let userCommands = object?["userCommands"] as? [[String: Any]]
        let commands = object?["commands"]

        XCTAssertNil(commands)
        XCTAssertEqual(userCommands?.count, 1)
        XCTAssertEqual(userCommands?.first?["id"] as? String, "custom-1")
        XCTAssertNotNil(object?["commandOrder"])
        XCTAssertNotNil(object?["pinnedCommandIDs"])
    }

    func testStoreSaveAndLoadUserCommands() throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        let configURL = directory.appendingPathComponent("config.json")
        let store = CommandConfigurationStore(configURL: configURL)
        let custom = FloatingCommand.custom(id: "custom-1", title: "测试", text: "echo hi", summary: "打印问候")

        try store.saveUserCommands([custom])
        let loaded = store.configuration()

        XCTAssertEqual(loaded.userCommands, [custom])
        XCTAssertEqual(loaded.commands.last, custom)
        XCTAssertEqual(loaded.commands.count, FloatingCommand.defaults.count + 1)
    }

    func testCommandPanelHeaderDragPaddingLeavesRoomForPlusAndPinButtons() {
        XCTAssertGreaterThanOrEqual(CommandPanelLayout.dragHandleTrailingPadding, CommandPanelLayout.headerActionReservedWidth)
    }

    func testDefaultCommandsIncludeClaudeShortcuts() {
        let commands = FloatingCommand.defaults.map(\.text)

        XCTAssertTrue(commands.contains("claude"))
        XCTAssertTrue(commands.contains("claude --enable-auto-mode"))
        XCTAssertTrue(commands.contains("claude --dangerously-skip-permissions"))
        XCTAssertTrue(commands.contains("/compact"))
    }

    func testDefaultCommandsIncludeChineseSummaries() {
        XCTAssertFalse(FloatingCommand.defaults.isEmpty)
        XCTAssertTrue(FloatingCommand.defaults.allSatisfy { !$0.summary.isEmpty })
    }

    func testCommandDecodesWithoutSummaryForBackwardCompatibility() throws {
        let json = """
        {
          "title": "查看状态",
          "text": "/status"
        }
        """.data(using: .utf8)!

        let command = try JSONDecoder().decode(FloatingCommand.self, from: json)

        XCTAssertEqual(command.title, "查看状态")
        XCTAssertEqual(command.text, "/status")
        XCTAssertEqual(command.summary, "")
    }

    func testCommandDecodesChineseSummary() throws {
        let json = """
        {
          "title": "查看目录",
          "text": "ls -la",
          "summary": "列出当前目录下的文件和文件夹"
        }
        """.data(using: .utf8)!

        let command = try JSONDecoder().decode(FloatingCommand.self, from: json)

        XCTAssertEqual(command.summary, "列出当前目录下的文件和文件夹")
    }

    func testDecodesPrimaryInsertTextAction() throws {
        let json = """
        {
          "primaryAction": {
            "kind": "insertText",
            "title": "Claude",
            "text": "claude"
          },
          "commands": [
            { "text": "/status" }
          ]
        }
        """.data(using: .utf8)!

        let configuration = try JSONDecoder().decode(CommandConfiguration.self, from: json)

        XCTAssertEqual(configuration.primaryAction, .insertText(.init(title: "Claude", text: "claude")))
        XCTAssertTrue(configuration.userCommands.isEmpty)
        XCTAssertTrue(configuration.commands.contains { $0.text == "/status" && !$0.isCustom })
    }

    func testFormatsFolderPathForCd() {
        XCTAssertEqual(ShellCommandFormatter.cdCommand(forPath: "/Users/bleet/My Project"), "cd '/Users/bleet/My Project'")
        XCTAssertEqual(ShellCommandFormatter.cdCommand(forPath: "/Users/bleet/code"), "cd /Users/bleet/code")
    }
}
