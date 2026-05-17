import Foundation

public struct CommandConfigurationStore {
    public let configURL: URL

    public init(configURL: URL = Self.defaultConfigURL()) {
        self.configURL = configURL
    }

    public func configuration() -> CommandConfiguration {
        for url in [configURL, Self.ghosttyConfigURL()] {
            guard let data = try? Data(contentsOf: url),
                  let configuration = try? JSONDecoder().decode(CommandConfiguration.self, from: data) else {
                continue
            }

            return configuration
        }

        return .init()
    }

    public func save(_ configuration: CommandConfiguration) throws {
        let parent = configURL.deletingLastPathComponent()
        try FileManager.default.createDirectory(at: parent, withIntermediateDirectories: true)

        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        let data = try encoder.encode(configuration)
        try data.write(to: configURL, options: .atomic)
    }

    public func saveUserCommands(
        _ userCommands: [FloatingCommand],
        primaryAction: CommandPrimaryAction = .toggleCommands,
        pinnedCommandIDs: [FloatingCommand.ID] = [],
        commandOrder: [FloatingCommand.ID] = []
    ) throws {
        try save(
            CommandConfiguration(
                primaryAction: primaryAction,
                userCommands: userCommands,
                pinnedCommandIDs: pinnedCommandIDs,
                commandOrder: commandOrder
            )
        )
    }

    public static func defaultConfigURL() -> URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent("Library/Application Support")
        return base.appendingPathComponent("TermiPet/config.json")
    }

    private static func ghosttyConfigURL() -> URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent("Library/Application Support")
        return base.appendingPathComponent("com.mitchellh.ghostty/floating-commands.json")
    }
}
