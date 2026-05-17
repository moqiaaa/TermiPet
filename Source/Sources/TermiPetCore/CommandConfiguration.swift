import Foundation

public struct CommandConfiguration: Codable, Equatable, Sendable {
    public var primaryAction: CommandPrimaryAction
    public var userCommands: [FloatingCommand]
    public var pinnedCommandIDs: [FloatingCommand.ID]
    public var commandOrder: [FloatingCommand.ID]

    public var commands: [FloatingCommand] {
        let availableCommands = FloatingCommand.defaults + userCommands
        let commandsByID = Self.commandsByID(availableCommands)
        var orderedIDs = Self.stableUnique(commandOrder)
        orderedIDs.append(contentsOf: availableCommands.map(\.id).filter { !orderedIDs.contains($0) })

        let orderedCommands = orderedIDs.compactMap { commandsByID[$0] }
        let pinnedIDs = Self.stableUnique(pinnedCommandIDs)
        let pinnedIDSet = Set(pinnedIDs)
        let pinnedCommands = pinnedIDs.compactMap { id in
            orderedCommands.first { $0.id == id }
        }
        let unpinnedCommands = orderedCommands.filter { !pinnedIDSet.contains($0.id) }

        return pinnedCommands + unpinnedCommands
    }

    private enum CodingKeys: String, CodingKey {
        case primaryAction
        case commands
        case userCommands
        case pinnedCommandIDs
        case commandOrder
    }

    public init(
        primaryAction: CommandPrimaryAction = .toggleCommands,
        userCommands: [FloatingCommand] = [],
        pinnedCommandIDs: [FloatingCommand.ID] = [],
        commandOrder: [FloatingCommand.ID] = []
    ) {
        self.primaryAction = primaryAction
        self.userCommands = Self.filterDefaultCommands(userCommands.map { $0.asCustom() })
        let availableIDs = (FloatingCommand.defaults + self.userCommands).map(\.id)
        self.commandOrder = Self.sanitizedOrder(commandOrder, availableIDs: availableIDs)
        self.pinnedCommandIDs = Self.sanitizedPinnedIDs(pinnedCommandIDs, availableIDs: availableIDs)
    }

    public init(
        primaryAction: CommandPrimaryAction = .toggleCommands,
        commands: [FloatingCommand]
    ) {
        self.primaryAction = primaryAction
        self.userCommands = Self.filterDefaultCommands(commands.map { $0.asCustom() })
        let availableIDs = (FloatingCommand.defaults + self.userCommands).map(\.id)
        self.commandOrder = Self.sanitizedOrder(commands.map(\.id), availableIDs: availableIDs)
        self.pinnedCommandIDs = []
    }

    public init(from decoder: Decoder) throws {
        if let commands = try? [FloatingCommand](from: decoder) {
            self.init(commands: commands)
            return
        }

        let container = try decoder.container(keyedBy: CodingKeys.self)
        let primaryAction = try container.decodeIfPresent(
            CommandPrimaryAction.self,
            forKey: .primaryAction
        ) ?? .toggleCommands

        let decodedUserCommands: [FloatingCommand]
        if let userCommands = try container.decodeIfPresent([FloatingCommand].self, forKey: .userCommands) {
            decodedUserCommands = userCommands
        } else if let commands = try container.decodeIfPresent([FloatingCommand].self, forKey: .commands) {
            decodedUserCommands = commands
        } else {
            decodedUserCommands = []
        }

        let pinnedCommandIDs = try container.decodeIfPresent([FloatingCommand.ID].self, forKey: .pinnedCommandIDs) ?? []
        let commandOrder = try container.decodeIfPresent([FloatingCommand.ID].self, forKey: .commandOrder) ?? []

        self.init(
            primaryAction: primaryAction,
            userCommands: decodedUserCommands,
            pinnedCommandIDs: pinnedCommandIDs,
            commandOrder: commandOrder
        )
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(primaryAction, forKey: .primaryAction)
        try container.encode(userCommands, forKey: .userCommands)
        try container.encode(pinnedCommandIDs, forKey: .pinnedCommandIDs)
        try container.encode(commandOrder, forKey: .commandOrder)
    }

    private static func filterDefaultCommands(_ commands: [FloatingCommand]) -> [FloatingCommand] {
        let defaultTexts = Set(FloatingCommand.defaults.map(\.text))
        return commands.filter { !defaultTexts.contains($0.text) }
    }

    private static func commandsByID(_ commands: [FloatingCommand]) -> [FloatingCommand.ID: FloatingCommand] {
        commands.reduce(into: [:]) { result, command in
            result[command.id] = command
        }
    }

    private static func sanitizedOrder(
        _ order: [FloatingCommand.ID],
        availableIDs: [FloatingCommand.ID]
    ) -> [FloatingCommand.ID] {
        let availableIDSet = Set(availableIDs)
        var sanitized = stableUnique(order).filter { availableIDSet.contains($0) }
        sanitized.append(contentsOf: availableIDs.filter { !sanitized.contains($0) })
        return sanitized
    }

    private static func sanitizedPinnedIDs(
        _ pinnedIDs: [FloatingCommand.ID],
        availableIDs: [FloatingCommand.ID]
    ) -> [FloatingCommand.ID] {
        let availableIDSet = Set(availableIDs)
        return stableUnique(pinnedIDs).filter { availableIDSet.contains($0) }
    }

    private static func stableUnique(_ ids: [FloatingCommand.ID]) -> [FloatingCommand.ID] {
        var seen = Set<FloatingCommand.ID>()
        return ids.filter { seen.insert($0).inserted }
    }
}

public enum CommandPrimaryAction: Codable, Equatable, Sendable {
    case toggleCommands
    case insertText(FloatingCommand)

    private enum CodingKeys: String, CodingKey {
        case kind
        case title
        case text
        case summary
    }

    private enum Kind: String, Codable {
        case toggleCommands
        case insertText
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let kind = try container.decodeIfPresent(Kind.self, forKey: .kind) ?? .toggleCommands

        switch kind {
        case .toggleCommands:
            self = .toggleCommands
        case .insertText:
            let text = try container.decode(String.self, forKey: .text)
            let title = try container.decodeIfPresent(String.self, forKey: .title)
            let summary = try container.decodeIfPresent(String.self, forKey: .summary) ?? ""
            self = .insertText(.init(title: title, text: text, summary: summary))
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .toggleCommands:
            try container.encode(Kind.toggleCommands, forKey: .kind)
        case .insertText(let command):
            try container.encode(Kind.insertText, forKey: .kind)
            try container.encode(command.title, forKey: .title)
            try container.encode(command.text, forKey: .text)
            try container.encode(command.summary, forKey: .summary)
        }
    }
}
