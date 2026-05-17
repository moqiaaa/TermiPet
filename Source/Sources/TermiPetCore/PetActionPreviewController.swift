import Foundation

public struct PetActionPreviewController: Sendable, Equatable {
    public private(set) var currentAction: Int?
    private var currentToken: UUID?

    public init(currentAction: Int? = nil) {
        self.currentAction = currentAction
    }

    public mutating func trigger(action: Int) -> UUID {
        let token = UUID()
        currentAction = action
        currentToken = token
        return token
    }

    @discardableResult
    public mutating func expire(token: UUID) -> Bool {
        guard currentToken == token else { return false }
        currentAction = nil
        currentToken = nil
        return true
    }

    public mutating func clear() {
        currentAction = nil
        currentToken = nil
    }
}
