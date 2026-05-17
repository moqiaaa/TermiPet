import Foundation

struct HoverVisibilityState: Equatable {
    var isPetHovered = false
    var isPanelHovered = false
    var isPinned = false
    var isModalPresented = false
    var isVisible = false
    var pendingHideToken: UUID?

    var shouldRemainVisible: Bool {
        isPetHovered || isPanelHovered || isPinned || isModalPresented
    }
}

enum HoverVisibilityEvent: Equatable {
    case petEntered
    case petExited
    case panelEntered
    case panelExited
    case pinChanged(Bool)
    case modalPresentationChanged(Bool)
    case hideDelayElapsed(UUID)
}

struct HoverVisibilityController: Equatable {
    private(set) var state = HoverVisibilityState()

    mutating func handle(_ event: HoverVisibilityEvent) -> UUID? {
        switch event {
        case .petEntered:
            state.isPetHovered = true
            state.isVisible = true
            state.pendingHideToken = nil
            return nil

        case .petExited:
            state.isPetHovered = false
            return scheduleHideIfNeeded()

        case .panelEntered:
            state.isPanelHovered = true
            state.isVisible = true
            state.pendingHideToken = nil
            return nil

        case .panelExited:
            state.isPanelHovered = false
            return scheduleHideIfNeeded()

        case .pinChanged(let isPinned):
            state.isPinned = isPinned
            if isPinned {
                state.isVisible = true
                state.pendingHideToken = nil
                return nil
            }
            return scheduleHideIfNeeded()

        case .modalPresentationChanged(let isPresented):
            state.isModalPresented = isPresented
            if isPresented {
                state.isVisible = true
                state.pendingHideToken = nil
                return nil
            }
            return scheduleHideIfNeeded()

        case .hideDelayElapsed(let token):
            guard state.pendingHideToken == token else { return nil }
            state.pendingHideToken = nil
            if !state.shouldRemainVisible {
                state.isVisible = false
            }
            return nil
        }
    }

    private mutating func scheduleHideIfNeeded() -> UUID? {
        if state.shouldRemainVisible {
            state.isVisible = true
            state.pendingHideToken = nil
            return nil
        }

        let token = UUID()
        state.pendingHideToken = token
        return token
    }
}
