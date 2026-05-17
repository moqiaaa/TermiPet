import Foundation

@MainActor
final class HoverState: ObservableObject {
    @Published var isHovering = false
}
